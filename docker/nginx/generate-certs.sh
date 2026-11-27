#!/bin/sh
set -eu

CERT_DIR="${1:-../certs}"

DOMAIN="${2:-${DOMAIN:-}}"
if [ -z "$DOMAIN" ]; then
  printf "Domain or LAN IP for the certificate [localhost]: "
  read -r DOMAIN
  DOMAIN="${DOMAIN:-localhost}"
fi

# A hostname needs a DNS SAN and an address needs an IP SAN, or browsers reject
# the certificate regardless of the CN.
case "$DOMAIN" in
  *[!0-9.]*) SAN="DNS:$DOMAIN" ;;
  *)         SAN="IP:$DOMAIN" ;;
esac

mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/dev.key" \
  -out "$CERT_DIR/dev.crt" \
  -subj "/CN=$DOMAIN" \
  -addext "subjectAltName=$SAN"

echo "Self-signed certificate for $DOMAIN written to $CERT_DIR (dev.crt, dev.key)"
