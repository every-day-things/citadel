//! Book-metadata providers. Hardcover (GraphQL), Library of Congress and the
//! Deutsche Nationalbibliothek (SRU/MARCXML), and Open Library (JSON-REST) all
//! return the unified [`model::BookMetadata`] from a single search call.

pub mod commands;
pub mod model;

mod hardcover;
mod http;
mod marcxml;
mod openlibrary;
mod source;
mod sru;
