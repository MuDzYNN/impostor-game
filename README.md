# Impostor

Imprezowa gra w skojarzenia: wszyscy znają hasło oprócz impostora. Skojarzenia padają na głos, aplikacja tylko rozdaje karty, ustala kolejność i liczy głosy.

## Struktura

- `packages/game` – logika gry (typy, losowanie ról, maszyna stanów, głosy, punkty) i protokół Socket.IO, wspólne dla frontu i serwera
- `apps/web` – Next.js 16 + shadcn/ui; tryb lokalny działa w całości w przeglądarce
- `apps/api` – NestJS 12 + Socket.IO + Prisma 7 (PostgreSQL); pokoje online w pamięci, w bazie konta, paczki słów i historia gier

## Uruchomienie

```bash
pnpm install
cp apps/api/.env.example apps/api/.env        # uzupełnij DATABASE_URL i JWT_SECRET
cp apps/web/.env.example apps/web/.env.local

pnpm db:up        # Postgres w Dockerze (albo własny serwer w DATABASE_URL)
pnpm db:migrate   # tabele
pnpm db:seed      # oficjalna paczka z wbudowanej listy słów
pnpm dev          # web :3000, api :4000
```

Bez bazy też da się grać: tryb lokalny i pokoje online użyją wbudowanej listy słów.

## Logowanie

OAuth przez Discord i Google, bez własnych haseł. Przycisk danego dostawcy pojawia się, gdy w `apps/api/.env` są jego `CLIENT_ID` i `CLIENT_SECRET`. Adresy zwrotne do wpisania w konsoli dostawcy:

- `http://localhost:4000/auth/discord/callback`
- `http://localhost:4000/auth/google/callback`

Admina nadaje się ręcznie: `UPDATE User SET isAdmin = 1 WHERE id = '...';`

## Testy

```bash
pnpm test   # reguły gry
```

## Deploy

Push na `master` buduje w GitHub Actions trzy obrazy (`-web`, `-api`, `-tools`), wrzuca je do GHCR i wdraża po SSH na serwer ([`docker-compose.yml`](docker-compose.yml), zmienne w [`.env.example`](.env.example)). `tools` przy każdym starcie robi migracje i seed oficjalnej paczki. Ruch wchodzi przez Cloudflare Tunnel.

Public hostnames w tunelu:

- `impostor.mudzyn.xyz` → `http://web:3000`
- `impostor-api.mudzyn.xyz` → `http://api:4000`

Adresy publiczne są wbudowywane w front przy buildzie, zmienia się je w `.github/workflows/deploy.yml`.

W repo na GitHubie, environment `production`:

- sekrety: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`
- zmienne: `DEPLOY_PATH`, opcjonalnie `SSH_PORT`

Adresy zwrotne OAuth na produkcji:

- `https://impostor-api.mudzyn.xyz/auth/discord/callback`
- `https://impostor-api.mudzyn.xyz/auth/google/callback`

Admin na serwerze:

```bash
docker compose exec db psql -U impostor -c "UPDATE \"User\" SET \"isAdmin\" = true WHERE id = '...';"
```

Pokoje online żyją w pamięci API, więc deploy przerywa trwające gry.
