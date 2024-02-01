use std::path::Path;

use chrono::{NaiveDate, NaiveDateTime};
use mobi::{headers::Language, Mobi};

pub struct MobiMetadata {
    pub title: String,
    pub author: String,
    pub contributor: String,
    pub isbn: String,
    pub publisher: String,
    pub pub_date: Option<NaiveDate>,
    pub cover_image_data: Option<Vec<u8>>,
    pub language: String,
    pub subjects: Vec<String>,

    pub desc: String,
}

fn language_to_string(lang: &Language) -> String {
    match lang {
        Language::Neutral => "Neutral".to_string(),
        Language::Afrikaans => "Afrikaans".to_string(),
        Language::Albanian => "Albanian".to_string(),
        Language::Arabic => "Arabic".to_string(),
        Language::Armenian => "Armenian".to_string(),
        Language::Assamese => "Assamese".to_string(),
        Language::Azeri => "Azeri".to_string(),
        Language::Basque => "Basque".to_string(),
        Language::Belarusian => "Belarusian".to_string(),
        Language::Bengali => "Bengali".to_string(),
        Language::Bulgarian => "Bulgarian".to_string(),
        Language::Catalan => "Catalan".to_string(),
        Language::Chinese => "Chinese".to_string(),
        Language::Czech => "Czech".to_string(),
        Language::Danish => "Danish".to_string(),
        Language::Dutch => "Dutch".to_string(),
        Language::English => "English".to_string(),
        Language::Estonian => "Estonian".to_string(),
        Language::Faeroese => "Faeroese".to_string(),
        Language::Farsi => "Farsi".to_string(),
        Language::Finnish => "Finnish".to_string(),
        Language::French => "French".to_string(),
        Language::Georgian => "Georgian".to_string(),
        Language::German => "German".to_string(),
        Language::Greek => "Greek".to_string(),
        Language::Gujarati => "Gujarati".to_string(),
        Language::Hebrew => "Hebrew".to_string(),
        Language::Hindi => "Hindi".to_string(),
        Language::Hungarian => "Hungarian".to_string(),
        Language::Icelandic => "Icelandic".to_string(),
        Language::Indonesian => "Indonesian".to_string(),
        Language::Italian => "Italian".to_string(),
        Language::Japanese => "Japanese".to_string(),
        Language::Kannada => "Kannada".to_string(),
        Language::Kazak => "Kazakh".to_string(),
        Language::Konkani => "Konkani".to_string(),
        Language::Korean => "Korean".to_string(),
        Language::Latvian => "Latvian".to_string(),
        Language::Lithuanian => "Lithuanian".to_string(),
        Language::Macedonian => "Macedonian".to_string(),
        Language::Malay => "Malay".to_string(),
        Language::Malayalam => "Malayalam".to_string(),
        Language::Maltese => "Maltese".to_string(),
        Language::Marathi => "Marathi".to_string(),
        Language::Nepali => "Nepali".to_string(),
        Language::Norwegian => "Norwegian".to_string(),
        Language::Oriya => "Oriya".to_string(),
        Language::Polish => "Polish".to_string(),
        Language::Portuguese => "Portuguese".to_string(),
        Language::Punjabi => "Punjabi".to_string(),
        Language::Rhaetoromanic => "Rhaetoromanic".to_string(),
        Language::Romanian => "Romanian".to_string(),
        Language::Russian => "Russian".to_string(),
        Language::Sami => "Sami".to_string(),
        Language::Sanskrit => "Sanskrit".to_string(),
        Language::Serbian => "Serbian".to_string(),
        Language::Slovak => "Slovak".to_string(),
        Language::Slovenian => "Slovenian".to_string(),
        Language::Sorbian => "Sorbian".to_string(),
        Language::Spanish => "Spanish".to_string(),
        Language::Sutu => "Sutu".to_string(),
        Language::Swahili => "Swahili".to_string(),
        Language::Swedish => "Swedish".to_string(),
        Language::Tamil => "Tamil".to_string(),
        Language::Tatar => "Tatar".to_string(),
        Language::Telugu => "Telugu".to_string(),
        Language::Thai => "Thai".to_string(),
        Language::Tsonga => "Tsonga".to_string(),
        Language::Tswana => "Tswana".to_string(),
        Language::Turkish => "Turkish".to_string(),
        Language::Ukrainian => "Ukrainian".to_string(),
        Language::Urdu => "Urdu".to_string(),
        Language::Uzbek => "Uzbek".to_string(),
        Language::Vietnamese => "Vietnamese".to_string(),
        Language::Xhosa => "Xhosa".to_string(),
        Language::Zulu => "Zulu".to_string(),
        Language::Unknown => "Unknown".to_string(),
    }
}

pub fn read_metadata(path: &Path) -> Option<MobiMetadata> {
    let m = Mobi::from_path(path);

    match m {
        Err(_) => None,
        Ok(m) => {
            let date: Option<NaiveDate> = NaiveDateTime::parse_from_str(
                &m.metadata.publish_date().unwrap_or_default(),
                "%Y-%m-%dT%H:%M:%S%z",
            ).map(|dt| dt.date()).ok();

            let cover_image = m.image_records().last().map(|i| i.content.to_vec());

            Some(MobiMetadata {
                title: m.title(),
                author: m.author().unwrap_or_default(),
                publisher: m.publisher().unwrap_or_default(),
                desc: m.description().unwrap_or_default(),
                isbn: m.isbn().unwrap_or_default(),
                pub_date: date,
                contributor: m.contributor().unwrap_or_default(),
                language: language_to_string(&m.language()),
                subjects: m.metadata.subjects().unwrap_or_default(),
                cover_image_data: cover_image,
            })
        }
    }
}
