# Headless OPDS server

`citadel-server` serves one Calibre library over the same OPDS runtime used by
the desktop application. It has no desktop, WebView, or remote management UI.

Copy `crates/citadel-server/example-config.toml`, use absolute paths for the
library, then run:

```sh
CITADEL_OPDS_USERS='["alice:choose-a-password","bob:another-password"]' cargo run -p citadel-server -- \
  --config /absolute/path/to/citadel-server.toml
```

`CITADEL_OPDS_USERS` is a JSON array of `USER:PASSWORD` strings. Split is at
the first colon, so passwords may contain colons. Usernames must be nonempty,
unique (after trimming), and contain no colon; passwords must be nonempty.
Every user has the same read access to the configured library.

Credentials are read from the environment once at startup and held only in
memory. Restart the server to change them. The headless host never loads or
writes credential files and does not load `.env` or secret files. Authentication
enabled with a missing or empty list fails closed. Desktop credential persistence
and password reveal are unchanged.

`stateDirectory` is optional. On Unix it defaults to `$XDG_STATE_HOME/citadel`
when XDG_STATE_HOME is absolute, otherwise `~/.local/state/citadel`. On Windows
it defaults to the local application-data directory's `citadel` subdirectory.
An explicit override must be absolute. The directory is reserved for server
state; this version creates it but writes no files there.

The process logs lifecycle state and every concrete OPDS URL. It remains in the
foreground until SIGINT or SIGTERM, then gracefully closes its listeners.
The localNetworks and allInterfaces targets use the desktop IPv4/IPv6 policy;
allInterfaces requires reader sign-in.

For a reverse proxy on the same host, the target can instead use explicit
concrete addresses without depending on interface discovery:

```toml
[sharing.target.addresses]
addresses = ["127.0.0.1", "::1"]
```

Wildcard, link-local and non-unicast addresses are rejected. Public addresses
require reader sign-in. Configure every
concrete address on which the process should listen.

Citadel serves plain HTTP. For access beyond a trusted local network, place it
behind an externally managed TLS reverse proxy and firewall. Service
supervision, certificates, public-exposure controls, and container or operating
system packages are not provided by this initial server.
