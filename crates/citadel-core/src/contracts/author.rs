use serde::{Deserialize, Serialize};

#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
#[derive(Serialize, specta::Type, Deserialize, Clone)]
pub struct NewAuthor {
    pub name: String,
    pub sortable_name: Option<String>,
}
