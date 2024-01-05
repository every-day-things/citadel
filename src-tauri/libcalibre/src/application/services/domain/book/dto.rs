use chrono::NaiveDateTime;

use crate::domain::book::entity::NewBook;

pub struct NewBookDto {
  pub(crate) title: String,
  pub author_list: Vec<String>,
  pub timestamp: Option<NaiveDateTime>,
  pub pubdate: Option<NaiveDateTime>,
  pub series_index: f32,
  pub isbn: Option<String>,
  pub lccn: Option<String>,
  pub flags: i32,
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