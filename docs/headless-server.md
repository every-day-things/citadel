# Headless OPDS server

`citadel-server` serves one Calibre library over the same OPDS runtime used by
the desktop application. It has no desktop, WebView, or remote management UI.

Copy `crates/citadel-server/example-config.toml`, use absolute paths for the
library and state directory, then run:

```sh
CITADEL_OPDS_PASSWORD='choose-a-password' cargo run -p citadel-server -- \
  --config /absolute/path/to/citadel-server.toml
```

The password is read from the environment variable named by
`credentials.passwordEnvironment`; it is never stored in the TOML file or
printed. Citadel persists the username and password beneath the configured state
directory, using the same owner-only credential file as desktop sharing. After the first successful start, the
`credentials` section and password environment variable may be omitted while
`authenticationEnabled` remains true.

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
