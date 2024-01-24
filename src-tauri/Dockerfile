# FROM rust:1-bookworm as builder
FROM ivangabriele/tauri:fedora-37-18 AS builder
# FROM paketobuildpacks/builder-jammy-full as builder

WORKDIR /usr/src/app
COPY . .
# Will build and cache the binary and dependent crates in release mode
RUN --mount=type=cache,target=/usr/local/cargo,from=rust:latest,source=/usr/local/cargo \
    --mount=type=cache,target=target \
    cargo build --release && mv ./target/release/citadel-rs ./citadel

# Runtime image
FROM debian:bookworm-slim

# Install SQLite
RUN apt-get update && apt-get install -y libsqlite3-0 libwebkit2gtk-4.0-dev \
    && rm -rf /var/lib/apt/lists/*

# Run as "app" user
RUN useradd -ms /bin/bash app

USER app
WORKDIR /app

# Get compiled binaries from builder's cargo install directory
COPY --from=builder /usr/src/app/citadel /app/citadel

# Run the app
CMD ./citadel --server --calibre-library=/data/library
