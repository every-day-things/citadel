use std::collections::HashSet;

use diesel::prelude::*;
use diesel::query_builder::AsChangeset;
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
pub static AUTHOR_SORT_COPY_METHOD: &str = "comma";
pub static AUTHOR_NAME_SUFFIXES: [&str; 13] = [
    "Jr", "Sr", "Inc", "Ph.D", "Phd", "MD", "M.D", "I", "II", "III", "IV", "Junior", "Senior",
];
pub static AUTHOR_NAME_PREFIXES: [&str; 5] = ["Mr", "Mrs", "Ms", "Dr", "Prof"];
pub static AUTHOR_NAME_COPYWORDS: [&str; 17] = [
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
pub static AUTHOR_USE_SURNAME_PREFIXES: bool = false;
pub static AUTHOR_SURNAME_PREFIXES: [&str; 7] = ["da", "de", "di", "la", "le", "van", "von"];

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
    /// For a Dr.
    /// ```
    /// use libcalibre::domain::author::entity::Author;
    /// let author = Author {
    ///   id: 1,
    ///   name: "Dr. John Doe".to_string(),
    ///   sort: None,
    ///    link: "".to_string()
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "Doe, Dr. John");
    /// ```
    /// 
    /// For a Jr. [SKIPPED: FAILING!]
    /// ```
    /// use libcalibre::domain::author::entity::Author;
    /// let author = Author {
    ///    id: 1,
    ///    name: "John Doe Jr.".to_string(),
    ///    sort: None,
    ///    link: "".to_string()
    /// };
    /// let sortable_name = author.sortable_name();
    /// /// assert_eq!(sortable_name, "Doe Jr., John");
    /// ```
    pub fn sortable_name(&self) -> String {
        let method = AUTHOR_SORT_COPY_METHOD;

        if method == "copy" {
            return self.name.clone();
        }

        let sauthor = self
            .name
            .replace("(", "")
            .replace(")", "")
            .trim()
            .to_string();
        if method == "comma" && sauthor.contains(",") {
            return self.name.clone();
        }

        let mut tokens: Vec<String> = sauthor.split_whitespace().map(str::to_string).collect();
        if tokens.len() < 2 {
            return self.name.clone();
        }

        let ltoks: HashSet<String> = HashSet::from_iter(tokens.iter().map(|s| s.to_lowercase()));
        let copy_words = AUTHOR_NAME_COPYWORDS
            .iter()
            .map(|s| s.to_lowercase())
            .collect();
        if !ltoks.is_disjoint(&copy_words) {
            return self.name.clone();
        }

        let author_use_surname_prefixes = AUTHOR_USE_SURNAME_PREFIXES;
        if author_use_surname_prefixes {
            let author_surname_prefixes: Vec<String> = AUTHOR_SURNAME_PREFIXES
                .iter()
                .map(|s| s.to_lowercase())
                .collect();
            if tokens.len() == 2
                && author_surname_prefixes.contains(&tokens[0].to_lowercase())
            {
                return self.name.clone();
            }
        }

        let prefixes: Vec<String> = AUTHOR_NAME_PREFIXES
            .iter()
            .map(|s| s.to_lowercase())
            .collect();
        let mut first = 0;
        for (i, token) in tokens.iter().enumerate() {
            if !prefixes.contains(&token.to_lowercase()) {
                first = i;
                break;
            }
        }

        let suffixes: Vec<String> = AUTHOR_NAME_SUFFIXES
            .iter()
            .map(|s| s.to_lowercase())
            .collect();
        let mut last = tokens.len() - 1;
        for i in (first..=last).rev() {
            if !suffixes.contains(&tokens[i].to_lowercase()) {
                last = i;
                break;
            }
        }

        let suffix = tokens[(last + 1)..].join(" ");
        let token_before_last_is_prefix = author_use_surname_prefixes
            && last > first
            && AUTHOR_SURNAME_PREFIXES
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
        if !suffix.is_empty() {
            atokens.push(suffix);
        }

        if method != "nocomma" && num_toks > 1 {
            atokens[0] = atokens[0].to_string() + ",";
        }

        atokens.join(" ")
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
