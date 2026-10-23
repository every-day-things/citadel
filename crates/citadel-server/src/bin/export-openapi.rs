fn main() {
    println!(
        "{}",
        citadel_server::api::openapi()
            .to_pretty_json()
            .expect("OpenAPI is serializable")
    );
}
