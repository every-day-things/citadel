ARG WORKDIR=/build

FROM ivangabriele/tauri:fedora-37-18 AS build

ARG WORKDIR
WORKDIR ${WORKDIR}

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="${PATH}:/root/.bun/bin/"

COPY package.json bun.lockb "${WORKDIR}"
RUN bun install --frozen-lockfile

COPY . "${WORKDIR}"
RUN bun run build

FROM scratch AS artifacts

ARG WORKDIR
COPY --from=build \
    "${WORKDIR}/src-tauri/target/release/bundle/appimage/citadel_0.3.0_amd64.AppImage" \
    .
COPY --from=build \
    "${WORKDIR}/src-tauri/target/release/bundle/deb/citadel_0.3.0_amd64.deb" \
    .
