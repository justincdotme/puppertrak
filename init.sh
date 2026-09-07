#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

DOMAIN="${1:-${DOMAIN:-}}"
if [ -z "$DOMAIN" ]; then
  if [ -t 0 ]; then
    printf "Domain to serve over HTTPS [localhost]: "
    read -r DOMAIN
  fi
  DOMAIN="${DOMAIN:-localhost}"
fi

COMPOSE="docker compose -f docker-compose.yml"

set_env() {
  local key="$1" value="$2"
  if grep -qE "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >>.env
  fi
}

echo "==> TLS certificate"
TLS_CHOICE=1
if [ -f ../certs/dev.crt ]; then
  echo "    present, skipping (delete ../certs to renew)"
else
  if [ -t 0 ]; then
    echo ""
    echo "    TLS is strongly recommended. Even a self-signed certificate protects"
    echo "    session cookies and API traffic on your network."
    echo ""
    echo "    How would you like to handle TLS?"
    echo "      1) Generate a self-signed certificate (recommended)"
    echo "      2) Use your own certificate and key files"
    echo "      3) No TLS — serve over HTTP on port 80"
    echo ""
    while :; do
      printf "    Choice [1]: "
      read -r TLS_CHOICE
      TLS_CHOICE="${TLS_CHOICE:-1}"
      case "$TLS_CHOICE" in
        1|2|3) break ;;
        *) echo "    Enter 1, 2 or 3." ;;
      esac
    done
  fi
  case "$TLS_CHOICE" in
    1)
      docker/nginx/generate-certs.sh ../certs "$DOMAIN"
      ;;
    2)
      while :; do
        printf "    Path to certificate file (PEM): "
        read -r TLS_CERT_SRC
        printf "    Path to private key file: "
        read -r TLS_KEY_SRC
        if [ -f "$TLS_CERT_SRC" ] && [ -r "$TLS_CERT_SRC" ] \
          && [ -f "$TLS_KEY_SRC" ] && [ -r "$TLS_KEY_SRC" ]; then
          break
        fi
        echo "    Certificate or key not found or unreadable; try again."
      done
      mkdir -p ../certs
      cp "$TLS_KEY_SRC" ../certs/dev.key
      cp "$TLS_CERT_SRC" ../certs/dev.crt
      echo "    installed certificate and key into ../certs/"
      ;;
    3)
      echo "    WARNING: Running without TLS. Session cookies will be sent in"
      echo "    cleartext. This is not recommended for any network you do not"
      echo "    fully control."
      ;;
  esac
fi

if [ "$TLS_CHOICE" = 3 ]; then
  SCHEME=http
  SECURE_COOKIE=false
else
  SCHEME=https
  SECURE_COOKIE=true
fi

echo "==> Environment"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "    created .env from .env.example"
fi
set_env APP_URL "$SCHEME://$DOMAIN"
set_env NGINX_SERVER_NAME "$DOMAIN"
set_env SESSION_DOMAIN "$DOMAIN"
set_env SESSION_SECURE_COOKIE "$SECURE_COOKIE"
set_env PUPPERTRAK_UID "$(id -u)"
set_env PUPPERTRAK_GID "$(id -g)"
if [ "$SCHEME" = https ]; then
  echo "    pinned HTTPS settings for $DOMAIN"
else
  echo "    pinned HTTP settings for $DOMAIN"
fi

echo "==> Git identity"
git_user=$(git config user.name 2>/dev/null || true)
git_email=$(git config user.email 2>/dev/null || true)
if [ -n "$git_user" ] && [ -z "$(git config --local user.name 2>/dev/null || true)" ]; then
  git config --local user.name "$git_user"
  echo "    copied user.name to repo-local config"
fi
if [ -n "$git_email" ] && [ -z "$(git config --local user.email 2>/dev/null || true)" ]; then
  git config --local user.email "$git_email"
  echo "    copied user.email to repo-local config"
fi

echo "==> Building images"
$COMPOSE build

echo "==> Installing PHP dependencies"
$COMPOSE run --rm --no-deps app composer install

if ! grep -qE '^APP_KEY=base64:' .env; then
  echo "==> Generating APP_KEY"
  $COMPOSE run --rm --no-deps app php artisan key:generate
fi

echo "==> Building frontend assets"
docker run --rm \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -v "$PWD":/var/www/html \
  -w /var/www/html \
  node:22-alpine sh -c "npm install && npm run build"

echo "==> Starting the stack"
$COMPOSE up -d
$COMPOSE restart nginx

echo
echo "PupperTrak is starting at $SCHEME://$DOMAIN"
case "$TLS_CHOICE" in
  2)
    echo "The certificate was provided externally; replace"
    echo "../certs/dev.crt and dev.key to renew it."
    ;;
  3)
    echo "Serving over plain HTTP; re-run init.sh and pick a TLS option"
    echo "to enable HTTPS."
    ;;
  *)
    echo "The certificate is self-signed; accept the browser warning or trust"
    echo "../certs/dev.crt on your clients."
    ;;
esac
