# RustDesk browser client for students

A self-hosted HTML page with an embedded community JavaScript RustDesk client. The Docker deployment is preconfigured for the existing **vnc.edvlab.tuwien.ac.at** OSS RustDesk server. Students open the page and enter only the remote device ID and password, or approve the connection on the remote device. They do not install a controlling client or configure server addresses/keys.

The computer being controlled still needs the native RustDesk client, configured for your existing university server. This browser client is a controller, not an unattended host.

## Upgrade / deploy

From this repository's directory on your Docker host:

```sh
git pull --ff-only
cp .env.example .env
```

If upgrading and you already have a `.env`, edit it rather than replacing it. Edit `.env` and set:

```dotenv
RUSTDESK_SERVER_KEY=PASTE_THE_CONTENTS_OF_YOUR_EXISTING_id_ed25519.pub
RUSTDESK_ID_UPSTREAM=vnc.edvlab.tuwien.ac.at:21118
RUSTDESK_RELAY_UPSTREAM=vnc.edvlab.tuwien.ac.at:21119
```

Read the **public** key from your existing hbbs data volume. For example, adjusting the container name/path:

```sh
docker exec YOUR_HBBS_CONTAINER cat /root/id_ed25519.pub
```

Use `id_ed25519.pub`, never the private `id_ed25519` file. Do not generate a new server key or replace your RustDesk data volume. The settings provided so far do not contain the public key; the administrator must supply it once. This key is intentionally delivered to browsers for server identity verification and is not a secret. `.env` remains untracked so host configuration stays local.

Then start the updated frontend:

```sh
docker compose up -d --build
```

The frontend binds to `127.0.0.1:8080`. Existing hbbs/hbbr containers and their data are unchanged. `compose.yaml` uses the included prebuilt `dist/` and requires no Node.js on your host.

## Nginx HTTPS setup

Students need an **HTTPS frontend URL**, for example `https://studentdesk.example.com`. This can be a separate hostname from the existing ID server. The frontend domain must point to your HTTPS reverse proxy and have a certificate trusted by student browsers. Serve the frontend at the domain root.

The application container now proxies these routes itself:

| Browser URL on the frontend origin | Target reached by the web container |
| --- | --- |
| `/` | Embedded web client assets |
| `/ws/id` | `RUSTDESK_ID_UPSTREAM`, default `vnc.edvlab.tuwien.ac.at:21118` |
| `/ws/relay` | `RUSTDESK_RELAY_UPSTREAM`, default `vnc.edvlab.tuwien.ac.at:21119` |

**WSS** means WebSocket Secure: browsers use TLS-protected persistent connections over the frontend's HTTPS port 443. The frontend's Nginx then forwards WebSocket traffic to the existing hbbs/hbbr backend. Native TCP port **21116 is not a browser WebSocket endpoint**.

Your OUTER HTTPS Nginx must forward `/` and both WebSocket paths to the frontend container and preserve the upgrade headers. See `deploy/nginx-https.conf.example` for a complete server block. If that HTTPS server already has separate `/ws/id` or `/ws/relay` locations pointing elsewhere, update or remove those conflicting locations as well.

The upstream addresses must be reachable **from inside the web container**. On the same Docker network, prefer:

```dotenv
RUSTDESK_ID_UPSTREAM=hbbs:21118
RUSTDESK_RELAY_UPSTREAM=hbbr:21119
```

Replace those service names with your existing container/service names, and join the frontend to their existing network. `.env` changes addresses but does not join Docker networks. If you use the domain defaults, those backend ports must be reachable from the frontend container. A proxy container's `127.0.0.1` is that container, not the Docker host. Keep ordinary RustDesk ports and firewall rules needed by your native clients.

The app container serves HTTP; terminate public TLS at the outer proxy. The browser automatically uses the **frontend page's origin** for both WSS paths. It does not connect directly to port 21116 or require each student to enter the university server.

## Check deployment

```sh
docker compose logs --tail=80 web
docker compose exec web nginx -t
```

Opening the site should show **Your lab. In a browser.** with no server settings form and a ready Connect button. Only device ID/password fields are shown.

In browser developer tools, the `/ws/id` connection should upgrade to **101 Switching Protocols** when Connect is pressed. If it fails:

- **404 / ordinary HTML:** a proxy is sending the WebSocket path to a website instead of hbbs/hbbr.
- **502 / 504:** the web container or outer proxy cannot reach its upstream; check service names, shared Docker network and backend ports.
- **Certificate / DNS / timeout error:** check the frontend's DNS, certificate and firewall from the student's network.
- **Key mismatch:** use the existing hbbs public key and configure the controlled device for the same server/key.

Your native settings `rendezvous_server = 'vnc.edvlab.tuwien.ac.at:21116'`, `custom-rendezvous-server = 'vnc.edvlab.tuwien.ac.at'`, `relay-server = 'vnc.edvlab.tuwien.ac.at'` remain valid for native clients. The browser transport goes to the WebSocket backends on 21118/21119 instead.

## Editable mode and source builds

Managed student mode is the Docker default. To expose editable server settings again, set `RUSTDESK_MANAGED: "false"` in `compose.yaml`; remove the required-key interpolation if you no longer want Compose to require it. Static hosting of the prebuilt `dist/` also defaults to editable mode, because it does not run the Docker startup configuration script. The Docker entrypoint generates `portal-config.json` with managed settings each time the container starts. A student's old saved settings are ignored in managed mode.

Rebuild source using Node.js 22 or newer:

```sh
npm ci
npm run check
npm run build
```

Then rebuild the Compose container. Or use the multi-stage source Dockerfile:

```sh
docker build -f Dockerfile -t rustdesk-web .
```

`templates/default.conf.template` is the active container Nginx template. `docker-entrypoint.d/15-rustdesk-config.sh` validates startup configuration and generates the browser config before the official Nginx image renders that template. `.env` files are excluded from Docker build inputs and the downloadable source archive. The public config includes only the server **public** key; students still authenticate to their device.

## Browser support and verification limits

Use recent desktop Chrome or Edge with WebCodecs over HTTPS (localhost is allowed for local testing). The interface exposes remote video, mouse, keyboard, audio from the community engine where supported, monitor switching, password/2FA prompts, Ctrl+Alt+Del, fullscreen and disconnect. File transfer, address books, clipboard sync, terminal and Pro accounts are not exposed. OS/browser-reserved shortcuts may be unavailable. The public key is used to verify remote identities; unverifiable identities are rejected instead of falling back to plaintext sessions.

TypeScript/build checks, the Docker image and a real WebSocket exchange with a temporary `rustdesk/rustdesk-server:latest` OSS instance have been tested. Browser checks cover automatic managed configuration, ignoring stale student settings, editable fallback, validation/persistence, password clearing and responsive layout. Full remote video/input/audio/2FA sessions and the university's live deployment still need testing with your actual device and network. The backend public key and access to your Docker host have not been supplied, so this repository update does not change your running server automatically.

## Source and license

Community engine: https://github.com/tizbac/rustdesk, pinned revision `814887b5e9704acd42ca90d505579042fd0a9f27`. This integration does not redistribute RustDesk's proprietary Web Client V2. See LICENSE (AGPL-3.0), NOTICE.md and THIRD_PARTY_NOTICES.txt. The page links to a corresponding-source `source.zip`; keep the download available when hosting or modifying the client.
