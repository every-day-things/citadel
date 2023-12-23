pub fn gen_book_folder_name(book_name: String, book_id: i32) -> String {
    "{title} ({id})"
        .replace("{title}", &book_name)
        .replace("{id}", &book_id.to_string())
}

pub fn gen_book_file_name(book_title: &String, author_name: &String) -> String {
    "{title} - {author}"
        .replace("{title}", book_title)
        .replace("{author}", author_name)
}
