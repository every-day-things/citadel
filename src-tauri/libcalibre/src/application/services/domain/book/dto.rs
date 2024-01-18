use chrono::NaiveDateTime;

use crate::domain::book::entity::{NewBook, UpdateBookData};

#[derive(Clone)]
pub struct NewBookDto {
    pub title: String,
    pub timestamp: Option<NaiveDateTime>,
    pub pubdate: Option<NaiveDateTime>,
    pub series_index: f32,
    pub isbn: Option<String>,
    pub lccn: Option<String>,
    pub flags: i32,
    pub has_cover: Option<bool>,
}

pub struct UpdateBookDto {
    pub author_sort: Option<String>,
    pub title: Option<String>,
    pub timestamp: Option<NaiveDateTime>,
    pub pubdate: Option<NaiveDateTime>,
    pub series_index: Option<f32>,
    pub isbn: Option<String>,
    pub lccn: Option<String>,
    pub path: Option<String>,
    pub flags: Option<i32>,
    pub has_cover: Option<bool>,
}

impl TryFrom<NewBookDto> for NewBook {
    type Error = ();

    fn try_from(dto: NewBookDto) -> Result<Self, Self::Error> {
        Ok(Self {
            title: dto.title,
            timestamp: dto.timestamp,
            pubdate: dto.pubdate,
            series_index: dto.series_index,
            isbn: dto.isbn,
            lccn: dto.lccn,
            flags: dto.flags,
            has_cover: dto.has_cover,
        })
    }
}

impl TryFrom<UpdateBookDto> for UpdateBookData {
    type Error = ();

    fn try_from(dto: UpdateBookDto) -> Result<Self, Self::Error> {
        Ok(Self {
            author_sort: dto.author_sort,
            title: dto.title,
            timestamp: dto.timestamp,
            pubdate: dto.pubdate,
            series_index: dto.series_index,
            isbn: dto.isbn,
            lccn: dto.lccn,
            path: dto.path,
            flags: dto.flags,
            has_cover: dto.has_cover,
        })
    }
}
