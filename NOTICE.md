# Upstream and local changes

Community engine: https://github.com/tizbac/rustdesk
Revision: 814887b5e9704acd42ca90d505579042fd0a9f27
Vendored directory: flutter/web/js/src -> vendor/core
License: GNU Affero General Public License version 3; see LICENSE.

This distribution adds a custom HTML/TypeScript interface and same-origin iframe launcher. It does not include or redistribute RustDesk's proprietary Web Client V2 bundle.

Local engine changes (2026-11-16):
- Export configureServers() for validated, per-tab ID/relay/key configuration.
- Give the explicitly entered relay origin precedence over native TCP relay addresses returned by the ID server.
- Reject unverifiable remote identities rather than using the upstream plaintext-session fallback; surface handshake errors.
- Display the OSS zero-valued ID_NOT_EXIST response as an actionable error.

Generated protobufs, keyboard mappings, translations and protocol code remain from the pinned upstream revision. The package includes the vendored TypeScript sources and their source maps. Dependencies are locked by package-lock.json. The interface only exposes the subset of engine features documented in README.md.

Student deployment update: Nginx now proxies ID/relay WebSockets inside the app container. Startup settings preconfigure the server key and the page uses its own origin, hiding server fields from students. Editable static hosting remains available.
