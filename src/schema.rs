// @generated automatically by Diesel CLI.

diesel::table! {
    annotations (id) {
        id -> Nullable<Integer>,
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
    annotations_dirtied (id) {
        id -> Nullable<Integer>,
        book -> Integer,
    }
}

diesel::table! {
    authors (id) {
        id -> Nullable<Integer>,
        name -> Text,
        sort -> Nullable<Text>,
        link -> Text,
    }
}

diesel::table! {
    books (id) {
        id -> Nullable<Integer>,
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
    books_authors_link (id) {
        id -> Nullable<Integer>,
        book -> Integer,
        author -> Integer,
    }
}

diesel::table! {
    books_languages_link (id) {
        id -> Nullable<Integer>,
        book -> Integer,
        lang_code -> Integer,
        item_order -> Integer,
    }
}

diesel::table! {
    books_plugin_data (id) {
        id -> Nullable<Integer>,
        book -> Integer,
        name -> Text,
        val -> Text,
    }
}

diesel::table! {
    books_publishers_link (id) {
        id -> Nullable<Integer>,
        book -> Integer,
        publisher -> Integer,
    }
}

diesel::table! {
    books_ratings_link (id) {
        id -> Nullable<Integer>,
        book -> Integer,
        rating -> Integer,
    }
}

diesel::table! {
    books_series_link (id) {
        id -> Nullable<Integer>,
        book -> Integer,
        series -> Integer,
    }
}

diesel::table! {
    books_tags_link (id) {
        id -> Nullable<Integer>,
        book -> Integer,
        tag -> Integer,
    }
}

diesel::table! {
    comments (id) {
        id -> Nullable<Integer>,
        book -> Integer,
        text -> Text,
    }
}

diesel::table! {
    conversion_options (id) {
        id -> Nullable<Integer>,
        format -> Text,
        book -> Nullable<Integer>,
        data -> Binary,
    }
}

diesel::table! {
    custom_column_1 (id) {
        id -> Nullable<Integer>,
        book -> Nullable<Integer>,
        value -> Bool,
    }
}

diesel::table! {
    custom_column_2 (id) {
        id -> Nullable<Integer>,
        book -> Nullable<Integer>,
        value -> Integer,
    }
}

diesel::table! {
    custom_columns (id) {
        id -> Nullable<Integer>,
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
        id -> Nullable<Integer>,
        book -> Integer,
        format -> Text,
        uncompressed_size -> Integer,
        name -> Text,
    }
}

diesel::table! {
    feeds (id) {
        id -> Nullable<Integer>,
        title -> Text,
        script -> Text,
    }
}

diesel::table! {
    identifiers (id) {
        id -> Nullable<Integer>,
        book -> Integer,
        #[sql_name = "type"]
        type_ -> Text,
        val -> Text,
    }
}

diesel::table! {
    languages (id) {
        id -> Nullable<Integer>,
        lang_code -> Text,
        link -> Text,
    }
}

diesel::table! {
    last_read_positions (id) {
        id -> Nullable<Integer>,
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
        id -> Nullable<Integer>,
        uuid -> Text,
    }
}

diesel::table! {
    metadata_dirtied (id) {
        id -> Nullable<Integer>,
        book -> Integer,
    }
}

diesel::table! {
    preferences (id) {
        id -> Nullable<Integer>,
        key -> Text,
        val -> Text,
    }
}

diesel::table! {
    publishers (id) {
        id -> Nullable<Integer>,
        name -> Text,
        sort -> Nullable<Text>,
        link -> Text,
    }
}

diesel::table! {
    ratings (id) {
        id -> Nullable<Integer>,
        rating -> Nullable<Integer>,
        link -> Text,
    }
}

diesel::table! {
    series (id) {
        id -> Nullable<Integer>,
        name -> Text,
        sort -> Nullable<Text>,
        link -> Text,
    }
}

diesel::table! {
    tags (id) {
        id -> Nullable<Integer>,
        name -> Text,
        link -> Text,
    }
}

diesel::allow_tables_to_appear_in_same_query!(
    annotations,
    annotations_dirtied,
    authors,
    books,
    books_authors_link,
    books_languages_link,
    books_plugin_data,
    books_publishers_link,
    books_ratings_link,
    books_series_link,
    books_tags_link,
    comments,
    conversion_options,
    custom_column_1,
    custom_column_2,
    custom_columns,
    data,
    feeds,
    identifiers,
    languages,
    last_read_positions,
    library_id,
    metadata_dirtied,
    preferences,
    publishers,
    ratings,
    series,
    tags,
);
