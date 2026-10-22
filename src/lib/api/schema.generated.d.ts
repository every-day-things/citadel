export interface paths {
    "/api/books/query": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Query the configured library. HTTP requires an explicit limit between 0 and 200; zero returns only the total. No arbitrary library paths are accepted. */
        post: operations["queryBooks"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/books/{book_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getBook"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        BookFile: {
            Local: components["schemas"]["LocalFile"];
        } | {
            Remote: components["schemas"]["RemoteFile"];
        };
        /** @enum {string} */
        BookSortOrder: "TitleAsc" | "TitleDesc" | "AuthorAsc" | "AuthorDesc";
        /** @description Book identifiers, such as ISBN, DOI, Google Books ID, etc. */
        Identifier: {
            /** Format: int32 */
            id: number;
            label: string;
            value: string;
        };
        LibraryAuthor: {
            /**
             * Format: int32
             * @description Number of books in the library linked to this author, from
             *     `Library::author_book_counts` (one GROUP BY pass over
             *     `books_authors_link`). The Authors page renders this directly
             *     instead of deriving counts from the whole book list.
             */
            book_count: number;
            id: string;
            name: string;
            sortable_name: string;
        };
        LibraryBook: {
            author_list: components["schemas"]["LibraryAuthor"][];
            cover_image: components["schemas"]["LocalOrRemoteUrl"] | null;
            description: string | null;
            file_list: components["schemas"]["BookFile"][];
            id: string;
            identifier_list: components["schemas"]["Identifier"][];
            is_read: boolean;
            /**
             * @description Canonical Calibre language codes (ISO 639-2/3, e.g. `eng`, `fra`),
             *     ordered. Empty when the book has no language metadata.
             */
            language_list: string[];
            series: string | null;
            /** Format: float */
            series_index: number | null;
            sortable_title: string | null;
            tag_list: string[];
            title: string;
            uuid: string | null;
        };
        LibraryBookPage: {
            items: components["schemas"]["LibraryBook"][];
            /**
             * Format: int32
             * @description Total number of books matching the filters, ignoring limit/offset.
             */
            total: number;
        };
        LibraryBookQuery: {
            author_id?: string | null;
            hide_read: boolean;
            /**
             * Format: int32
             * @description Page size. `None` returns all matches.
             */
            limit?: number | null;
            /** Format: int32 */
            offset: number;
            /** Format: int32 */
            publisher_id?: number | null;
            /** Format: int32 */
            series_id?: number | null;
            sort: components["schemas"]["BookSortOrder"];
            /** Format: int32 */
            tag_id?: number | null;
            /**
             * @description Substring match across title, author names, and series names.
             *     `None` or empty text matches all books.
             */
            text?: string | null;
        };
        LibraryError: {
            code: components["schemas"]["LibraryErrorCode"];
            message: string;
        };
        /** @enum {string} */
        LibraryErrorCode: "invalidArgument" | "unauthorized" | "rateLimited" | "notFound" | "unavailable" | "internal";
        LocalFile: {
            /** @description The MIME type of the file. Common values are `application/pdf` and `application/epub+zip`. */
            mime_type: string;
            /** @description The absolute path to the file, including extension. */
            path: string;
        };
        /** @enum {string} */
        LocalOrRemote: "Local" | "Remote";
        LocalOrRemoteUrl: {
            kind: components["schemas"]["LocalOrRemote"];
            local_path: string | null;
            url: string;
        };
        RemoteFile: {
            url: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    queryBooks: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LibraryBookQuery"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryBookPage"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryError"];
                };
            };
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryError"];
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryError"];
                };
            };
        };
    };
    getBook: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Library book ID */
                book_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryBook"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryError"];
                };
            };
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryError"];
                };
            };
        };
    };
}
