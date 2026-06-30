use serde::{Deserialize, Serialize};

#[derive(Serialize, specta::Type, Deserialize, Clone)]
pub struct NewAuthor {
    pub name: String,
    pub sortable_name: Option<String>,
}
