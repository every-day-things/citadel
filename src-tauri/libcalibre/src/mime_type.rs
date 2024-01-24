pub enum MIMETYPE {
    EPUB,
    UNKNOWN,
}

impl MIMETYPE {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &'static str {
        match *self {
            MIMETYPE::EPUB => "application/epub+zip",
            MIMETYPE::UNKNOWN => "application/octet-stream",
        }
    }

    #[allow(dead_code)]
    pub fn from_str(mimetype: &str) -> Option<Self> {
        match mimetype {
            "application/epub+zip" => Some(MIMETYPE::EPUB),
            "application/octet-stream" => Some(MIMETYPE::UNKNOWN),
            _ => None,
        }
    }

    pub fn to_file_extension(&self) -> &'static str {
        match *self {
            MIMETYPE::EPUB => "epub",
            MIMETYPE::UNKNOWN => "",
        }
    }

    pub fn from_file_extension(extension: &str) -> Option<Self> {
        match extension.to_lowercase().as_str() {
            "epub" => Some(MIMETYPE::EPUB),
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