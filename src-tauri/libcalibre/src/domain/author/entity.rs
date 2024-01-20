use std::collections::HashSet;
use std::ops::Not;

use diesel::prelude::*;
use diesel::query_builder::AsChangeset;
use regex::Regex;
use serde::Deserialize;

use crate::schema::authors;

// Author sort name algorithm
// The algorithm used to copy author to author_sort.
// Possible values are:
//  invert: use "fn ln" -> "ln, fn"
//  copy  : copy author to author_sort without modification
//  comma : use 'copy' if there is a ',' in the name, otherwise use 'invert'
//  nocomma : "fn ln" -> "ln fn" (without the comma)
// When this tweak is changed, the author_sort values stored with each author
// must be recomputed by right-clicking on an author in the left-hand tags
// panel, selecting 'Manage authors', and pressing
// 'Recalculate all author sort values'.
//
// The author_name_suffixes are words that are ignored when they occur at the
// end of an author name. The case of the suffix is ignored and trailing
// periods are automatically handled.
//
// The same is true for author_name_prefixes.
//
// The author_name_copywords are a set of words which, if they occur in an
// author name, cause the automatically generated author sort string to be
// identical to the author's name. This means that the sort for a string like
// "Acme Inc." will be "Acme Inc." instead of "Inc., Acme".
//
// If author_use_surname_prefixes is enabled, any of the words in
// author_surname_prefixes will be treated as a prefix to the surname, if they
// occur before the surname. So for example, "John von Neumann" would be sorted
// as "von Neumann, John" and not "Neumann, John von".
pub static GENERATIONAL_TITLES: [&str; 10] = [
    "Jr.", "Sr.", "Jr", "Sr", "Junior", "Senior", "I", "II", "III", "IV",
];
pub static POST_NOMINAL_LETTERS: [&str; 25] = [
    "BA", "B.A", "BSc", "B.Sc", "MA", "M.A", "MSc", "M.Sc", "PhD", "Ph.D", "MD", "M.D", "LLD",
    "LL.D", "JD", "J.D", "DPhil", "D.Phil", "DSc", "D.Sc", "EdD", "Ed.D", "EngD", "Eng.D", "Esq",
];
pub static PREFIX_TITLE: [&str; 10] = [
    "Mr", "Mrs", "Ms", "Dr", "Prof", "Mr.", "Mrs.", "Ms.", "Dr.", "Prof.",
];
pub static VERBATIM_NAME_INDICATORS: [&str; 17] = [
    "Agency",
    "Corporation",
    "Company",
    "Co.",
    "Council",
    "Committee",
    "Inc.",
    "Institute",
    "National",
    "Society",
    "Club",
    "Team",
    "Software",
    "Games",
    "Entertainment",
    "Media",
    "Studios",
];
pub static USE_FAMILY_NAME_PREFIXES: bool = false;
// https://en.wikipedia.org/wiki/List_of_family_name_affixes
// TODO: Expand this list to match Wikipedia
pub static FAMILY_NAME_PREFIXES: [&str; 7] = ["da", "de", "di", "la", "le", "van", "von"];

#[derive(Clone, Debug, Queryable, Selectable, Identifiable, AsChangeset)]
#[diesel(table_name = authors)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Author {
    pub id: i32,
    pub name: String,
    pub sort: Option<String>,
    pub link: String,
}
impl Author {
    /// Generate a sortable name for this author.
    ///
    /// Based on APA style (see https://blog.apastyle.org/apastyle/2012/03/jr-sr-and-other-suffixes-in-apa-style.html,
    /// and https://blog.apastyle.org/apastyle/2017/05/whats-in-a-name-names-with-titles-in-them.html)
    ///
    /// ## Examples
    /// ```
    /// use libcalibre::domain::author::entity::Author;
    /// let author = Author {
    ///    id: 1,
    ///    name: "John Doe".to_string(),
    ///    sort: None,
    ///    link: "".to_string(),
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "Doe, John");
    /// ```
    ///
    /// For Dr.'s and other titles, the title is removed.
    /// ```
    /// use libcalibre::domain::author::entity::Author;
    /// let author = Author {
    ///   id: 1,
    ///   name: "Dr. John Doe".to_string(),
    ///   sort: None,
    ///    link: "".to_string()
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "Doe, John");
    /// ```
    ///
    /// For Jr.'s and other generational titles, the title is moved to the end,
    /// with a comma before it.
    /// ```
    /// use libcalibre::domain::author::entity::Author;
    /// let author = Author {
    ///    id: 1,
    ///    name: "John Doe Jr.".to_string(),
    ///    sort: None,
    ///    link: "".to_string()
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "Doe, John, Jr.");
    /// ```
    ///
    /// Anything within brackets is removed.
    /// ```
    /// use libcalibre::domain::author::entity::Author;
    /// let author = Author {
    ///   id: 1,
    ///  name: "John Doe (Author) [Deceased] {Ed.: fictional character}".to_string(),
    ///  sort: None,
    /// link: "".to_string()
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "Doe, John");
    /// ```
    ///
    /// Organization names are not modified.
    /// ```
    /// use libcalibre::domain::author::entity::Author;
    /// let author = Author {
    ///   id: 1,
    ///  name: "Coca Cola Inc.".to_string(),
    ///  sort: None,
    /// link: "".to_string()
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "Coca Cola Inc.");
    /// ```
    pub fn sortable_name(&self) -> String {
        Author::sort_author_name_apa(&self.name)
    }

    /// Returns a lower-cased list of name suffixes, including generational
    /// titles and post-nominal letters.
    /// Generational titles are in Jr., Jr and Junior forms.
    fn gen_name_suffixes() -> Vec<String> {
        let mut suffixes = GENERATIONAL_TITLES.to_vec();
        suffixes.extend(POST_NOMINAL_LETTERS);
        suffixes.iter().map(|s| s.to_lowercase()).collect()
    }

    fn gen_name_prefixes() -> Vec<String> {
        PREFIX_TITLE.iter().map(|s| s.to_lowercase()).collect()
    }

    /// Removes content within and all sets of parentheses.
    fn remove_bracket_content(s: &str) -> String {
        let re = Regex::new(r"[\[\{\(].*?[\]\}\)]").unwrap();
        let result = re.replace_all(s, "");
        result.to_string()
    }

    fn name_contains_verbatim_name_indicator(name: &str) -> bool {
        let name_lower = name.to_lowercase();
        VERBATIM_NAME_INDICATORS
            .iter()
            .map(|s| s.to_lowercase())
            .collect::<HashSet<String>>()
            .is_disjoint(&HashSet::from_iter(name_lower.split_whitespace().map(str::to_string)))
            .not()
    }

    fn sort_author_name_apa(name: &str) -> String {
        let sauthor = Author::remove_bracket_content(name);
        let mut tokens: Vec<String> = sauthor.split_whitespace().map(str::to_string).collect();

        // Short circuits that indicate we need not format at all
        if tokens.len() < 2 {
            return name.to_string();
        } else if Author::name_contains_verbatim_name_indicator(name) {
            return name.to_string();
        }

        let name_suffixes = Author::gen_name_suffixes();
        let prefixes = Author::gen_name_prefixes();

        let author_use_surname_prefixes = USE_FAMILY_NAME_PREFIXES;
        if author_use_surname_prefixes {
            let author_surname_prefixes: Vec<String> = FAMILY_NAME_PREFIXES
                .iter()
                .map(|s| s.to_lowercase())
                .collect();
            if tokens.len() == 2 && author_surname_prefixes.contains(&tokens[0].to_lowercase()) {
                return name.to_string();
            }
        }

        let mut first = 0;
        for (i, token) in tokens.iter().enumerate() {
            if !prefixes.contains(&token.to_lowercase()) {
                first = i;
                break;
            }
        }

        let mut last = tokens.len() - 1;
        for i in (first..=last).rev() {
            if !name_suffixes.contains(&tokens[i].to_lowercase()) {
                last = i;
                break;
            }
        }

        let suffix = tokens[(last + 1)..].join(" ");

        let token_before_last_is_prefix = author_use_surname_prefixes
            && last > first
            && FAMILY_NAME_PREFIXES
                .iter()
                .map(|s| s.to_lowercase())
                .collect::<Vec<String>>()
                .contains(&tokens[last - 1].to_lowercase());

        if token_before_last_is_prefix {
            let last_token_prefix = tokens[last - 1].to_string();
            let last_token = tokens[last].to_string();
            let formatted = format!("{} {}", last_token_prefix, last_token);
            tokens[last - 1] = formatted;
            last -= 1;
        }

        let mut atokens = vec![tokens[last].clone()];
        atokens.extend_from_slice(&tokens[first..last]);
        let num_toks = atokens.len();

        if num_toks > 1 {
            atokens[0] = atokens[0].to_string() + ",";
        }

        match &suffix.is_empty() {
            true => atokens.join(" "),
            false => atokens.join(" ") + ", " + &suffix,
        }
    }
}

#[derive(Insertable)]
#[diesel(table_name = authors)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct NewAuthor {
    pub name: String,
    pub sort: Option<String>,
    pub link: Option<String>,
}

#[derive(Deserialize, AsChangeset, Default, Debug)]
#[diesel(table_name = authors)]
pub struct UpdateAuthorData {
    pub(crate) name: Option<String>,
    pub(crate) sort: Option<String>,
    pub(crate) link: Option<String>,
}
