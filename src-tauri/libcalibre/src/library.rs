use std::{collections::HashMap, path::PathBuf};

use chrono::{NaiveDate, NaiveDateTime};
use diesel::SqliteConnection;

use crate::{persistence::establish_connection, types::{AuthorId, BookId}, util::ValidDbPath, CalibreError};

pub struct Library {
	db_path: ValidDbPath,
	conn: SqliteConnection,
}

pub struct Book {
		/// Identifier unique only within this library
		pub id: BookId,
		/// Cross-library identifier
		pub uuid: String,
		pub title: String,
    pub authors: Vec<Author>,
    pub tags: Vec<String>,
    pub series: Option<String>,
    pub series_index: Option<f32>,
    pub publisher: Option<String>,
    pub publication_date: Option<NaiveDate>,
    pub rating: Option<i32>,  // 0-10
    pub comments: Option<String>,
    // Identifiers are unique across type + value. For example, a book can have
    // only one ISBN.
    pub identifiers: HashMap<String, String>,  // {"isbn": "...", "amazon": "..."}

    pub has_cover: bool,
    pub file_formats: Vec<String>,  // e.g., ["epub", "pdf"]
    /// Calibre calls this `timestamp`. Set when book is first added.
    pub created_at: NaiveDateTime,
    /// Calibre calls this `last_modified`. Updated when book metadata changes.
    pub updated_at: NaiveDateTime,

    /// Relative to library root, what folder contains this book's files & cover
    /// Calibre calls this `path`.
    pub book_dir_path: String,
}

pub struct BookAdd {
		pub title: String,
		pub author_names: Vec<String>,
		pub tags: Option<Vec<String>>,
		pub series: Option<String>,
		pub series_index: Option<f32>,
		pub publisher: Option<String>,
		pub publication_date: Option<NaiveDate>,
		pub rating: Option<i32>,  // 0-10
		pub comments: Option<String>,
		pub identifiers: HashMap<String, String>,  // {"isbn": "...", "amazon": "..."}
}

pub struct BookUpdate {
		pub title: Option<String>,
		/// If provided, replaces all authors with the provided list. Authors
		/// not already in the database will be created. Removes any author not
		/// included in the list.
		/// **Do not use both `author_names` and `author_ids` at the same time.**
		pub author_names: Option<Vec<String>>,
		/// If provided, replaces all authors with the provided list of IDs. Authors
		/// not already in the database will cause an error. Removes any author not
		/// included in the list.
		/// **Do not use both `author_names` and `author_ids` at the same time.**
		pub author_ids: Option<Vec<AuthorId>>,
		pub tags: Option<Vec<String>>,
		pub series: Option<String>,
		pub series_index: Option<f32>,
		pub publisher: Option<String>,
		pub publication_date: Option<NaiveDate>,
		pub rating: Option<i32>,  // 0-10
		pub comments: Option<String>,
		pub identifiers: Option<HashMap<String, String>>,  // {"isbn": "...", "amazon": "..."}
}

pub struct Author {
    pub id: AuthorId,
    pub name: String,
    pub sort: String,
    pub link: Option<String>,
}

pub struct AuthorAdd {
		pub name: String,
		pub sort: Option<String>,
		pub link: Option<String>,
}

pub struct AuthorUpdate {
    pub name: Option<String>,
    pub sort: Option<String>,
    pub link: Option<String>,
}

impl Library {
  //    ooooo         o8o   .o8
  //    `888'         `"'  "888
  //     888         oooo   888oooo.  oooo d8b  .oooo.   oooo d8b oooo    ooo
  //     888         `888   d88' `88b `888""8P `P  )88b  `888""8P  `88.  .8'
  //     888          888   888   888  888      .oP"888   888       `88..8'
  //     888       o  888   888   888  888     d8(  888   888        `888'
  //    o888ooooood8 o888o  `Y8bod8P' d888b    `Y888""8o d888b        .8'
  //                                                              .o..P'
  //                                                              `Y8P'

  pub fn new(db_path: ValidDbPath) -> Result<Self, CalibreError> {
      let conn = establish_connection(&db_path.database_path)
                .map_err(|_| CalibreError::LibraryNotInitialized)?;

      Ok(Self { db_path, conn })
     }

	/// Create a new Calibre library in the provided folder.
	///
	/// Creates an empty Calibre sqlite database within the specific folder.
	pub fn create_library_at(path: &str) -> Result<Library, CalibreError> {
		todo!()
	}

	//    oooooooooo.                      oooo
	//    `888'   `Y8b                     `888
	//     888     888  .ooooo.   .ooooo.   888  oooo   .oooo.o
	//     888oooo888' d88' `88b d88' `88b  888 .8P'   d88(  "8
	//     888    `88b 888   888 888   888  888888.    `"Y88b.
	//     888    .88P 888   888 888   888  888 `88b.  o.  )88b
	//    o888bood8P'  `Y8bod8P' `Y8bod8P' o888o o888o 8""888P'
	//
	pub fn add_book(&mut self, book: BookAdd) -> Result<Book, CalibreError> {
		todo!()
	}

	pub fn books(&mut self) -> Result<Vec<Book>, CalibreError> {
		todo!()
	}

	// TODO: Add BookId / AuthorId types
	pub fn get_book(&mut self, book_id: BookId) -> Result<Book, CalibreError> {
		todo!()
	}

	pub fn update_book(&mut self, book_id: BookId, update: BookUpdate) -> Result<Book, CalibreError> {
		todo!()
	}

	/// Delete a set of books by their IDs. Returns the list of successfully
	/// deleted book IDs.
	pub fn remove_books(&mut self, book_ids: Vec<BookId>) -> Result<Vec<BookId>, CalibreError> {
		todo!()
	}

	//          .o.                                       .
	//         .888.                                    .o8
	//        .8"888.      .oooo.o  .oooo.o  .ooooo.  .o888oo  .oooo.o
	//       .8' `888.    d88(  "8 d88(  "8 d88' `88b   888   d88(  "8
	//      .88ooo8888.   `"Y88b.  `"Y88b.  888ooo888   888   `"Y88b.
	//     .8'     `888.  o.  )88b o.  )88b 888    .o   888 . o.  )88b
	//    o88o     o8888o 8""888P' 8""888P' `Y8bod8P'   "888" 8""888P'
	//

	//     __   __        ___  __   __
	//    /  ` /  \ \  / |__  |__) /__`
	//    \__, \__/  \/  |___ |  \ .__/

	/// We avoid including these in the Book entity b/c they are large binary blobs.
	pub fn get_book_cover(&mut self, book_id: BookId) -> Result<Vec<u8>, CalibreError> {
		todo!()
	}

	/// Upserts book cover data: if image file is missing, it is created
	pub fn set_book_cover(&mut self, book_id: BookId, cover_data: Vec<u8>) -> Result<(), CalibreError> {
		todo!()
	}

	pub fn remove_book_cover(&mut self, book_id: BookId) -> Result<(), CalibreError> {
		todo!()
		// TODO: call set_book_cover with empty data
	}

	//     __   __   __           ___         ___  __
	//    |__) /  \ /  \ |__/    |__  | |    |__  /__`
	//    |__) \__/ \__/ |  \    |    | |___ |___ .__/

	/// Read contents of a book file in a specific format (e.g., "epub", "mobi",
	/// etc)
	// TODO: find way to support streaming these bytes
	pub fn get_book_file(&mut self, book_id: BookId, format: &str) -> Result<Vec<u8>, CalibreError> {
		// Read contents from disk, based on book ID and format
		todo!()
	}

	pub fn get_book_file_path(&self, id: BookId, format: &str) -> Result<PathBuf, CalibreError> {
		todo!()
	}

	pub fn remove_book_file(&mut self, book_id: BookId, format: &str) -> Result<(), CalibreError> {
		todo!()
	}

	pub fn add_book_file(&mut self, book_id: BookId, format: &str, file_data: Vec<u8>) -> Result<(), CalibreError> {
		todo!()
	}

	#[deprecated(note = "Book files cannot be updated; they must be deleted and re-added")]
	pub fn update_book_file(&mut self, _book_id: BookId, _format: &str, _file_data: Vec<u8>) -> Result<(), CalibreError> {
		Err(CalibreError::BannedFunctionInvocation("Book files cannot be updated; they must be deleted and re-added".to_owned()))
	}

	//          .o.                       .   oooo
	//         .888.                    .o8   `888
	//        .8"888.     oooo  oooo  .o888oo  888 .oo.    .ooooo.  oooo d8b  .oooo.o
	//       .8' `888.    `888  `888    888    888P"Y88b  d88' `88b `888""8P d88(  "8
	//      .88ooo8888.    888   888    888    888   888  888   888  888     `"Y88b.
	//     .8'     `888.   888   888    888 .  888   888  888   888  888     o.  )88b
	//    o88o     o8888o  `V88V"V8P'   "888" o888o o888o `Y8bod8P' d888b    8""888P'
	//

	pub fn add_author(&mut self, author: &AuthorAdd) -> Result<AuthorId, CalibreError> {
		todo!()
	}

	pub fn authors(&mut self) -> Result<Vec<Author>, CalibreError> {
		todo!()
	}

	pub fn get_author(&mut self, author_id: AuthorId) -> Result<Author, CalibreError> {
		todo!()
	}

	/// Upsers an author by name, returning their ID.
	// Likely easier to lookup author by name and deduplicate by using this upsert
	// method than having create & updates, but maybe not...?
	pub fn update_author(&mut self, author_id: AuthorId, update: AuthorUpdate) -> Result<AuthorId, CalibreError> {
		todo!()
	}

	/// Delete an author by ID if they have no associated books.
	/// If they have no associated books and are deleted, returns their ID. An
	/// error is returned otherwise.
	pub fn remove_author(&mut self, author_id: AuthorId) -> Result<AuthorId, CalibreError> {
		todo!()
	}

	//     .oooooo..o                                        oooo
	//    d8P'    `Y8                                        `888
	//    Y88bo.       .ooooo.   .oooo.   oooo d8b  .ooooo.   888 .oo.
	//     `"Y8888o.  d88' `88b `P  )88b  `888""8P d88' `"Y8  888P"Y88b
	//         `"Y88b 888ooo888  .oP"888   888     888        888   888
	//    oo     .d8P 888    .o d8(  888   888     888   .o8  888   888
	//    8""88888P'  `Y8bod8P' `Y888""8o d888b    `Y8bod8P' o888o o888o
	//

	/// Extremely basic search, which finds any books that have a matching author
	/// or book name by substring.
	pub fn search_books(&mut self, query: &str) -> Result<Vec<Book>, CalibreError> {
		todo!()
	}
}
