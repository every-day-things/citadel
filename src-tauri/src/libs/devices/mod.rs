use self::external_drive::ThumbnailDetail;

mod external_drive;

#[derive(Debug)]
pub struct DeviceBook {
  title: String,
  authors: Vec<String>,
  thumbnail: Option<ThumbnailDetail>
}

pub trait Device {
  fn list_books(&self) -> Vec<DeviceBook>;
}

pub fn list_books_on_external_drive() -> Vec<DeviceBook> {
    let device = external_drive::ExternalDrive {
      path: String::from("/Volumes/NO NAME"),
    };
    device.list_books()
}