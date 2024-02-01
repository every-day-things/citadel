pub enum MIMETYPE {
    EPUB,
    MOBI,
    UNKNOWN,
}

impl MIMETYPE {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &'static str {
        match *self {
            MIMETYPE::EPUB => "application/epub+zip",
            MIMETYPE::MOBI => "application/x-mobipocket-ebook",
            MIMETYPE::UNKNOWN => "application/octet-stream",
        }
    }

    #[allow(dead_code)]
    pub fn from_str(mimetype: &str) -> Option<Self> {
        match mimetype {
            "application/epub+zip" => Some(MIMETYPE::EPUB),
            "application/x-mobipocket-ebook" => Some(MIMETYPE::MOBI),
            "application/octet-stream" => Some(MIMETYPE::UNKNOWN),
            _ => None,
        }
    }

    pub fn to_file_extension(&self) -> &'static str {
        match *self {
            MIMETYPE::EPUB => "epub",
            MIMETYPE::MOBI => "mobi",
            MIMETYPE::UNKNOWN => "",
        }
    }

    pub fn from_file_extension(extension: &str) -> Option<Self> {
        match extension.to_lowercase().as_str() {
            "epub" => Some(MIMETYPE::EPUB),
            "mobi" => Some(MIMETYPE::MOBI),
            _ => None,
        }
    }
}

impl PartialEq for MIMETYPE {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (MIMETYPE::EPUB, MIMETYPE::EPUB) => true,
            (MIMETYPE::UNKNOWN, MIMETYPE::UNKNOWN) => true,
            _ => false,
        }
    }
}