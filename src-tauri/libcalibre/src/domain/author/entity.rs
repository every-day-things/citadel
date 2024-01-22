use std::collections::HashSet;
use std::ops::Not;

use diesel::prelude::*;
use diesel::query_builder::AsChangeset;
use regex::Regex;
use serde::Deserialize;

use crate::schema::authors;

/// These titles are moved to the end of an author's name when sorting.
pub static GENERATIONAL_TITLES: [&str; 10] = [
    "Jr.", "Sr.", "Jr", "Sr", "Junior", "Senior", "I", "II", "III", "IV",
];
/// These letters are removed from the end of an author's name when sorting.
pub static POST_NOMINAL_LETTERS: [&str; 43] = [
    "BA", "B.A", // Bachelor of Arts
    "MA", "M.A", "AM", "A.M.", // Master of Arts
    "BS", "BSc", "B. sc.", "B.sc", "SB", "ScB", // Bachelor of Science
    "MS", "M.S.", "MSc", "M.Sc.", "SM", "S.M.", "ScM", "Sc.M.", // Master of Science
    "PhD", "Ph.D", "DPhil", "D.Phil", // Doctor of Philosophy
    "MD", "M.D", // Doctor of Medicine
    "LLD", "LL.D", // Legum Doctor
    "JD", "J.D", // Juris Doctor
    "DSc", "D.Sc", "ScD", "Sc.D", // Doctor of Science
    "EdD", "Ed.D", "D.Ed", // Doctor of Education
    "EngD", "Eng.D", "D.Eng", "DEng", // Doctor of Engineering
    "Esq", "Esq.", // Esquire
];
/// These words are removed from the beginning of an author's name when sorting.
pub static PREFIX_TITLE: [&str; 10] = [
    "Mr", "Mrs", "Ms", "Dr", "Prof", "Mr.", "Mrs.", "Ms.", "Dr.", "Prof.",
];
/// If these words occur in an author name, the generated sort string will be
/// identical to the author's name.
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
    /// Academic degrees, licenses, and professional titles are omitted.
    /// ```
    /// use libcalibre::domain::author::entity::Author;
    /// let author = Author {
    ///    id: 1,
    ///    name: "John Doe BA Bsc M.S. PhD Esq".to_string(),
    ///    sort: None,
    ///    link: "".to_string()
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "Doe, John");
    /// ```
    ///
    /// Anything within brackets is removed.
    /// ```
    /// use libcalibre::domain::author::entity::Author;
    /// let author = Author {
    ///   id: 1,
    ///   name: "John Doe (Author) [Deceased] {Ed.: fictional character}".to_string(),
    ///   sort: None,
    ///   link: "".to_string()
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
            .is_disjoint(&HashSet::from_iter(
                name_lower.split_whitespace().map(str::to_string),
            ))
            .not()
    }

    fn sort_author_name_apa(name: &str) -> String {
        let sauthor = Author::remove_bracket_content(name);
        let mut tokens: Vec<String> = sauthor.split_whitespace().map(str::to_string).collect();

        // Short circuits that indicate we need not format at all
        if tokens.len() < 2 || Author::name_contains_verbatim_name_indicator(name) {
            return name.to_string();
        }

        let name_suffixes = Author::gen_name_suffixes();
        let prefixes = Author::gen_name_prefixes();

        if USE_FAMILY_NAME_PREFIXES {
            let author_surname_prefixes: Vec<String> = FAMILY_NAME_PREFIXES
                .iter()
                .map(|s| s.to_lowercase())
                .collect();
            if tokens.len() == 2 && author_surname_prefixes.contains(&tokens[0].to_lowercase()) {
                return name.to_string();
            }
        }

        // Remove all academic degrees, licenses, and professional titles
        let post_nominal_set: HashSet<String> = POST_NOMINAL_LETTERS.iter().map(|s| s.to_lowercase()).collect();
        tokens.retain(|token| !post_nominal_set.contains(&token.to_lowercase()));

        let first = tokens
            .iter()
            .position(|token| !prefixes.contains(&token.to_lowercase()))
            .unwrap_or(0);

        let last = tokens
            .iter()
            .rposition(|token| !name_suffixes.contains(&token.to_lowercase()))
            .unwrap_or_else(|| tokens.len() - 1);

        let suffix = tokens[(last + 1)..].join(" ");

        let token_before_last_is_prefix = USE_FAMILY_NAME_PREFIXES
            && last > first
            && FAMILY_NAME_PREFIXES
                .iter()
                .map(|s| s.to_lowercase())
                .any(|prefix| prefix == tokens[last - 1].to_lowercase());

        if token_before_last_is_prefix {
            tokens[last - 1] = format!("{} {}", tokens[last - 1], tokens[last]);
            tokens.remove(last);
        }

        let mut atokens = vec![tokens[last].clone()];
        atokens.extend_from_slice(&tokens[first..last]);
        if atokens.len() > 1 {
            atokens[0].push(',');
        }

        if suffix.is_empty() {
            atokens.join(" ")
        } else {
            format!("{}, {}", atokens.join(" "), suffix)
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
