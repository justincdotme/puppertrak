# PupperTrak

A dog-sitting tracker for vet info, feeding plans, feeding and supplement logs, and daily "not fed today" alerts. Self-hosted on your LAN with no accounts or external services required.

## Stack

- Laravel 13 API (PHP 8.4, MySQL 8)
- React 19 SPA (TypeScript, TanStack Query, shadcn/ui, Tailwind 4)
- Docker Compose (nginx, PHP-FPM, MySQL, Vite watcher)
- Caddy reverse proxy on the host

## Quick Start

**Prerequisites:** Docker and Docker Compose.

**Installation:**

```bash
git clone <repo-url> puppertrak
cd puppertrak
./init.sh dogs.example.com
```

`init.sh` takes the domain you will serve the app on. Run it with no argument to be prompted, and it defaults to `localhost`.

## License

AGPL-3.0
