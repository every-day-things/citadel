pub enum MIMETYPE {
    EPUB,
    MOBI,
    PDF,
    KF7, // Kindle Format 7 — AZW files
    KF8, // Kindle Format 8 — AZW3 files
    TXT,
    UNKNOWN,
}

impl MIMETYPE {
    #[allow(dead_code)]
    pub fn as_str(&self) -> &'static str {
        match *self {
            MIMETYPE::EPUB => "application/epub+zip",
            MIMETYPE::MOBI => "application/x-mobipocket-ebook",
            MIMETYPE::PDF => "application/pdf",
            MIMETYPE::KF7 => "application/vnd.amazon.ebook",
            MIMETYPE::KF8 => "application/vnd.amazon.ebook-kf8", // Not a real MIME type, Amazon hasn't registered it
            MIMETYPE::TXT => "text/plain",
            MIMETYPE::UNKNOWN => "application/octet-stream",
        }
    }

    #[allow(dead_code)]
    pub fn from_str(mimetype: &str) -> Option<Self> {
        match mimetype {
            "application/epub+zip" => Some(MIMETYPE::EPUB),
            "application/x-mobipocket-ebook" => Some(MIMETYPE::MOBI),
            "application/vnd.amazon.ebook" => Some(MIMETYPE::KF7),
            "application/pdf" => Some(MIMETYPE::PDF),
            "application/octet-stream" => Some(MIMETYPE::UNKNOWN),
            "text/plain" => Some(MIMETYPE::TXT),
            _ => None,
        }
    }

    pub fn to_file_extension(&self) -> &'static str {
        match *self {
            MIMETYPE::EPUB => "epub",
            MIMETYPE::MOBI => "mobi",
            MIMETYPE::PDF => "pdf",
            MIMETYPE::KF7 => "azw",
            MIMETYPE::KF8 => "azw3",
            MIMETYPE::TXT => "txt",
            MIMETYPE::UNKNOWN => "",
        }
    }

    pub fn from_file_extension(extension: &str) -> Option<Self> {
        match extension.to_lowercase().as_str() {
            "epub" => Some(MIMETYPE::EPUB),
            "mobi" => Some(MIMETYPE::MOBI),
            "pdf" => Some(MIMETYPE::PDF),
            "azw" => Some(MIMETYPE::KF7),
            "azw3" => Some(MIMETYPE::KF8),
            "txt" => Some(MIMETYPE::TXT),
            _ => None,
        }
    }
}

impl PartialEq for MIMETYPE {
    fn eq(&self, other: &Self) -> bool {
        matches!(
            (self, other),
            (MIMETYPE::EPUB, MIMETYPE::EPUB)
                | (MIMETYPE::MOBI, MIMETYPE::MOBI)
                | (MIMETYPE::PDF, MIMETYPE::PDF)
                | (MIMETYPE::KF7, MIMETYPE::KF7)
                | (MIMETYPE::KF8, MIMETYPE::KF8)
                | (MIMETYPE::TXT, MIMETYPE::TXT)
                | (MIMETYPE::UNKNOWN, MIMETYPE::UNKNOWN)
        )
    }
}
