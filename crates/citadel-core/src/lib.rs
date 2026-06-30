//! Platform-agnostic core for Citadel.
//!
//! Owns the frontend-facing DTOs ([`LibraryBook`], [`LibraryAuthor`],
//! [`LocalOrRemoteUrl`], the file list) and the conversion from a `libcalibre`
//! [`Book`](libcalibre::library::Book) into them. None of this depends on
//! Tauri: the cover/file URL scheme is injected through [`BookUrlBuilder`], so
//! the Tauri app supplies an [`AssetUrlBuilder`] (`asset://`) and a future
//! `citadel-server` supplies an [`HttpUrlBuilder`] (`https://…/api/…`).

mod author;
mod book;
mod url;

pub use author::LibraryAuthor;
pub use book::{
    BookFile, Identifier, LibraryBook, LocalFile, LocalOrRemote, LocalOrRemoteUrl, RemoteFile,
};
pub use url::{path_to_asset_url, AssetUrlBuilder, BookUrlBuilder, HttpUrlBuilder};
