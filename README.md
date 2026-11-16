# Self-hosted RustDesk browser client

A static HTML portal with an embedded, same-origin JavaScript RustDesk client. ID server, relay server, and Ed25519 server public key are editable. It uses the community connection engine from tizbac/rustdesk, not RustDesk's proprietary hosted web client. No Server Pro API is required.

## Start the web container

The package includes a prebuilt `dist/`. From this directory:

```sh
docker compose up -d --build
```

This starts only the web frontend on `127.0.0.1:8080`. It does not create or replace your existing hbbs/hbbr containers or data volumes. Open http://localhost:8080 for a local check; use HTTPS for access from another computer.

For deployment, place a TLS reverse proxy in front of port 8080. `deploy/nginx-https.conf.example` is a host-installed Nginx example serving the website and both WebSocket routes on the same domain. Adapt it to your existing Nginx, Caddy, Traefik, or Nginx Proxy Manager setup.

## Connect the existing OSS server

Keep your existing `rustdesk/rustdesk-server:latest` containers and their persistent volume. You need **both** hbbs and hbbr. WebSocket listening ports are:

| Route on the HTTPS domain | Backend |
| --- | --- |
| `/` | web frontend, localhost:8080 |
| `/ws/id` | hbbs TCP 21118 |
| `/ws/relay` | hbbr TCP 21119 |

If your existing RustDesk containers use Docker bridge networking, publish these ports to loopback for a host-based reverse proxy. Add to the existing services, preserving all their other settings and volumes:

```yaml
# Under your existing hbbs service:
ports:
  - "127.0.0.1:21118:21118"
# Under your existing hbbr service:
ports:
  - "127.0.0.1:21119:21119"
```

These are additions, not a replacement Compose file. Your native RustDesk clients still need their existing TCP/UDP ports. If hbbs/hbbr already use host networking, do not add port mappings: the services already bind on the host. Check their existing firewall exposure.

If the reverse proxy is itself in Docker, `127.0.0.1` refers to that proxy container. Put it on a shared network with web/hbbs/hbbr and use service names as upstreams (web:80, hbbs:21118, hbbr:21119) instead of the loopback addresses in the example.

## Fill in the page

With the example domain `desk.example.com`, enter:

- ID server: `https://desk.example.com`
- Relay server: `https://desk.example.com`
- Public key: the contents of your existing `id_ed25519.pub`

Use the origin of the WSS reverse proxy, **not** the native TCP port 21116 or 21117, and do not append `/ws/id` or `/ws/relay`; the client adds those paths. ID and relay may use separate HTTPS origins if both expose the appropriate routes.

To read the public key, adjust the container name and data path for your installation:

```sh
docker exec YOUR_HBBS_CONTAINER cat /root/id_ed25519.pub
```

Do not use `id_ed25519`, which is the private key. The device being controlled must be running a native RustDesk client configured for the same server and public key. Enter that device's RustDesk ID and password, or approve the session on the device.

Click **Apply server settings**, then **Connect**. Saving settings in browser local storage is optional. Device passwords are cleared from form fields when submitted and are not stored by this interface. The upstream engine stores a generated browser UUID and session/quality preferences locally.

## Browser support and scope

Use a recent desktop Chrome or Edge with WebCodecs enabled, over HTTPS (localhost is allowed for testing). This version deliberately requires WebCodecs; it does not ship ffmpeg.wasm fallback assets. Features exposed by the HTML interface are remote video, mouse, keyboard, audio from the engine where supported, monitor switching, device password/2FA prompts, Ctrl+Alt+Del, fullscreen, and disconnect. File transfer, address books, clipboard sync, terminal, and Pro accounts are not exposed. Some OS/browser-reserved shortcuts cannot be sent. Mobile layout is responsive; mobile remote-control behavior is not certified.

Click the remote canvas to send keyboard input. Escape releases keyboard capture. The server public key is used for identity verification; this package refuses the upstream engine's plaintext-session fallback. Devices whose identities cannot be verified will fail to connect.

## Rebuild from source

Node.js 22 or newer:

```sh
npm ci
npm run check
npm run build
```

Or rebuild the entire Docker image from source:

```sh
docker build -f Dockerfile -t rustdesk-web .
docker run -d --name rustdesk-web -p 127.0.0.1:8080:80 rustdesk-web
```

The default Compose setup uses `Dockerfile.prebuilt` so Node.js is not required on the deployment host. After changing source files, rebuild `dist/` first, or use the source Dockerfile. To embed in another page hosted on this **same origin**, use `<iframe src="/client.html" allow="fullscreen; autoplay" allowfullscreen></iframe>` and the configuration message interface in `src/launcher.ts`. The included index.html already does this. Cross-origin embedding is disabled by default.

## Tests and limits

Verified on 2026-11-16:

- TypeScript check and production build.
- Docker prebuilt image build and Compose syntax.
- Headless Chromium loaded the embedded engine, without JavaScript errors or external asset requests.
- Invalid key rejection; applied settings survived a reload when opted in; clear settings removed the saved server profile.
- A real `/ws/id` WebSocket exchange with `rustdesk/rustdesk-server:latest`, image digest `sha256:8ecdab65deb7c84652a626380e31d11a8f1fbafd97916d57f95c20628f943c00`, returned the server's unknown-device response.
- Desktop and 390px mobile layouts checked for overflow.

A complete encrypted relay session with a registered device, video decoding, audio, remote input, monitor switching and 2FA were **not verified end to end**. These use the community engine and need testing against your actual remote device. This is a community integration, not an official RustDesk product. Container image tags may change; pin digests for repeatable production deployments.

## Source and license

This project is distributed under AGPL-3.0; see LICENSE, NOTICE.md, and THIRD_PARTY_NOTICES.txt. The page links to a downloadable `source.zip` containing its corresponding source and build instructions. Keep that source download available to users when hosting or modifying the client.
