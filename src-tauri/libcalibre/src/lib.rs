pub mod application;
mod domain;
pub mod infrastructure;
mod models;
mod persistence;
mod schema;

pub use domain::book::entity::Book;
pub use domain::file::entity::File;
pub use domain::book::aggregate::BookWithAuthorsAndFiles;
