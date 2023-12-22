pub fn format_calibre_metadata_opf(
    calibre_id: &str,
    calibre_uuid: &str,
    book_title: &str,
    author_sortable: &str,
    author: &str,
    pub_date: &str,
    language_iso_639_2: &str,
    tags: &[&str],
    now: &str,
    book_title_sortable: &str,
) -> String {
    let tags_string = tags
        .iter()
        .map(|tag| format!("<dc:subject>{}</dc:subject>", tag))
        .collect::<String>();

    format!(
        r#"<?xml version='1.0' encoding='utf-8'?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uuid_id" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier opf:scheme="calibre" id="calibre_id">{calibre_id}</dc:identifier>
    <dc:identifier opf:scheme="uuid" id="uuid_id">{calibre_uuid}</dc:identifier>
    <dc:title>{book_title}</dc:title>
    <dc:creator opf:file-as="{author_sortable}" opf:role="aut">{author}</dc:creator>
    <dc:contributor opf:file-as="calibre" opf:role="bkp">citadel (1.0.0) [https://github.com/every-day-things/citadel]</dc:contributor>
    <dc:date>{pub_date}</dc:date>
    <dc:language>{language_iso_639_2}</dc:language>
    {tags}
    <meta name="calibre:timestamp" content="{now}"/>
    <meta name="calibre:title_sort" content="{book_title_sortable}"/>
  </metadata>
  <guide>
    <reference type="cover" title="Cover" href="cover.jpg"/>
  </guide>
</package>"#,
        calibre_id = calibre_id,
        calibre_uuid = calibre_uuid,
        book_title = book_title,
        author_sortable = author_sortable,
        author = author,
        pub_date = pub_date,
        language_iso_639_2 = language_iso_639_2,
        tags = tags_string,
        now = now,
        book_title_sortable = book_title_sortable
    )
}
