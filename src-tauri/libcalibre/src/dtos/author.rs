use crate::entities::author::{NewAuthor, UpdateAuthorData};

#[derive(Clone)]
pub struct NewAuthorDto {
    pub full_name: String,
    pub sortable_name: String,
    pub external_url: Option<String>,
}

pub struct UpdateAuthorDto {
    pub full_name: Option<String>,
    pub sortable_name: Option<String>,
    pub external_url: Option<String>,
}

impl TryFrom<NewAuthorDto> for NewAuthor {
    type Error = ();

    fn try_from(dto: NewAuthorDto) -> Result<Self, Self::Error> {
        Ok(Self {
            name: dto.full_name,
            sort: Some(dto.sortable_name),
            link: dto.external_url,
        })
    }
}

impl TryFrom<UpdateAuthorDto> for UpdateAuthorData {
    type Error = ();

    fn try_from(dto: UpdateAuthorDto) -> Result<Self, Self::Error> {
        Ok(Self {
            name: dto.full_name,
            sort: dto.sortable_name,
            link: dto.external_url,
        })
    }
}
