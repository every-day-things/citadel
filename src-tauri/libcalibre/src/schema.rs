diesel::table! {
    annotations (id) {
        id -> Integer,
        book -> Integer,
        format -> Text,
        user_type -> Text,
        user -> Text,
        timestamp -> Float,
        annot_id -> Text,
        annot_type -> Text,
        annot_data -> Text,
        searchable_text -> Text,
    }
}

diesel::table! {
    authors (id) {
        id -> Integer,
        name -> Text,
        sort -> Nullable<Text>,
        link -> Text,
    }
}

diesel::table! {
    books (id) {
        id -> Integer,
        title -> Text,
        sort -> Nullable<Text>,
        timestamp -> Nullable<Timestamp>,
        pubdate -> Nullable<Timestamp>,
        series_index -> Float,
        author_sort -> Nullable<Text>,
        isbn -> Nullable<Text>,
        lccn -> Nullable<Text>,
        path -> Text,
        flags -> Integer,
        uuid -> Nullable<Text>,
        has_cover -> Nullable<Bool>,
        last_modified -> Timestamp,
    }
}

diesel::table! {
    comments (id) {
        id -> Integer,
        book -> Integer,
        text -> Text,
    }
}

diesel::table! {
    conversion_options (id) {
        id -> Integer,
        format -> Text,
        book -> Nullable<Integer>,
        data -> Binary,
    }
}

diesel::table! {
    custom_columns (id) {
        id -> Integer,
        label -> Text,
        name -> Text,
        datatype -> Text,
        mark_for_delete -> Bool,
        editable -> Bool,
        display -> Text,
        is_multiple -> Bool,
        normalized -> Bool,
    }
}

diesel::table! {
    data (id) {
        id -> Integer,
        book -> Integer,
        format -> Text,
        uncompressed_size -> Integer,
        name -> Text,
    }
}

diesel::table! {
    feeds (id) {
        id -> Integer,
        title -> Text,
        script -> Text,
    }
}

diesel::table! {
    identifiers (id) {
        id -> Integer,
        book -> Integer,
        #[sql_name = "type"]
        type_ -> Text,
        val -> Text,
    }
}

diesel::table! {
    languages (id) {
        id -> Integer,
        lang_code -> Text,
    }
}

diesel::table! {
    last_read_positions (id) {
        id -> Integer,
        book -> Integer,
        format -> Text,
        user -> Text,
        device -> Text,
        cfi -> Text,
        epoch -> Float,
        pos_frac -> Float,
    }
}

diesel::table! {
    library_id (id) {
        id -> Integer,
        uuid -> Text,
    }
}

diesel::table! {
    metadata_dirtied (id) {
        id -> Integer,
        book -> Integer,
    }
}

diesel::table! {
    preferences (id) {
        id -> Integer,
        key -> Text,
        val -> Text,
    }
}

diesel::table! {
    publishers (id) {
        id -> Integer,
        name -> Text,
        sort -> Nullable<Text>,
    }
}

diesel::table! {
    ratings (id) {
        id -> Integer,
        rating -> Integer,
    }
}

diesel::table! {
    series (id) {
        id -> Integer,
        name -> Text,
        sort -> Nullable<Text>,
    }
}

diesel::table! {
    tags (id) {
        id -> Integer,
        name -> Text,
    }
}

diesel::table! {
    books_authors_link (id) {
        id -> Integer,
        book -> Integer,
        author -> Integer,
    }
}

diesel::table! {
    books_languages_link (id) {
        id -> Integer,
        book -> Integer,
        lang_code -> Integer,
        item_order -> Integer,
    }
}

diesel::table! {
    books_plugin_data (id) {
        id -> Integer,
        book -> Integer,
        name -> Text,
        val -> Text,
    }
}

diesel::table! {
    books_publishers_link (id) {
        id -> Integer,
        book -> Integer,
        publisher -> Integer,
    }
}

diesel::table! {
    books_ratings_link (id) {
        id -> Integer,
        book -> Integer,
        rating -> Integer,
    }
}

diesel::table! {
    books_series_link (id) {
        id -> Integer,
        book -> Integer,
        series -> Integer,
    }
}

diesel::table! {
    books_tags_link (id) {
        id -> Integer,
        book -> Integer,
        tag -> Integer,
    }
}

// ========================================================== //
// Relations
// ========================================================== //

diesel::joinable!(books_authors_link -> books (book));
diesel::joinable!(books_authors_link -> authors (author));

diesel::allow_tables_to_appear_in_same_query!(books_authors_link, books, authors);
