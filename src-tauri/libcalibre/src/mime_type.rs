pub enum MIMETYPE {
    EPUB,
    MOBI,
    PDF,
    UNKNOWN,
}

impl MIMETYPE {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &'static str {
        match *self {
            MIMETYPE::EPUB => "application/epub+zip",
            MIMETYPE::MOBI => "application/x-mobipocket-ebook",
            MIMETYPE::PDF => "application/pdf",
            MIMETYPE::UNKNOWN => "application/octet-stream",
        }
    }

    #[allow(dead_code)]
    pub fn from_str(mimetype: &str) -> Option<Self> {
        match mimetype {
            "application/epub+zip" => Some(MIMETYPE::EPUB),
            "application/x-mobipocket-ebook" => Some(MIMETYPE::MOBI),
            "application/pdf" => Some(MIMETYPE::PDF),
            "application/octet-stream" => Some(MIMETYPE::UNKNOWN),
            _ => None,
        }
    }

    pub fn to_file_extension(&self) -> &'static str {
        match *self {
            MIMETYPE::EPUB => "epub",
            MIMETYPE::MOBI => "mobi",
            MIMETYPE::PDF => "pdf",
            MIMETYPE::UNKNOWN => "",
        }
    }

    pub fn from_file_extension(extension: &str) -> Option<Self> {
        match extension.to_lowercase().as_str() {
            "epub" => Some(MIMETYPE::EPUB),
            "mobi" => Some(MIMETYPE::MOBI),
            "pdf" => Some(MIMETYPE::PDF),
            _ => None,
        }
    }
}

impl PartialEq for MIMETYPE {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (MIMETYPE::EPUB, MIMETYPE::EPUB) => true,
            (MIMETYPE::MOBI, MIMETYPE::MOBI) => true,
            (MIMETYPE::PDF, MIMETYPE::PDF) => true,
            (MIMETYPE::UNKNOWN, MIMETYPE::UNKNOWN) => true,
            _ => false,
        }
    }
}