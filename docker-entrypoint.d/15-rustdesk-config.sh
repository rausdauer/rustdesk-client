#!/bin/sh
set -eu
fail() { echo "RustDesk web configuration: $*" >&2; exit 1; }
for upstream in "$RUSTDESK_ID_UPSTREAM" "$RUSTDESK_RELAY_UPSTREAM"; do
    printf '%s\n' "$upstream" | grep -Eq '^[A-Za-z0-9._-]+:[0-9]+$' || fail 'Upstreams must be Docker service names or hostnames followed by :port.'
done
case "${RUSTDESK_MANAGED:-true}" in
    true)
        key="${RUSTDESK_SERVER_KEY:-}"
        printf '%s\n' "$key" | grep -Eq '^[A-Za-z0-9+/]{43}=$' || fail 'Set RUSTDESK_SERVER_KEY to the contents of the existing hbbs id_ed25519.pub file.'
        printf '{"managed":true,"serverKey":"%s"}\n' "$key" > /usr/share/nginx/html/portal-config.json
        ;;
    false) printf '{"managed":false}\n' > /usr/share/nginx/html/portal-config.json ;;
    *) fail 'RUSTDESK_MANAGED must be true or false.' ;;
esac
chmod a+r /usr/share/nginx/html/portal-config.json
