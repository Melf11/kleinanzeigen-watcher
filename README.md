# Kleinanzeigen Preis-Watcher

Self-hosted Web-App zum **automatisierten Überwachen von Preisentwicklungen** auf
kleinanzeigen.de. Mehrere Suchen werden verwaltet; jede kombiniert einen Suchbegriff
mit zusätzlichen Schlagwörtern und zeigt ein Dashboard mit Anzeigen, aktuellen Preisen
und Preisverlauf.

Daten kommen über die [kleinanzeigen-agent.de](https://kleinanzeigen-agent.de) REST-API
(kein Scraping). Da die API nur Live-Daten liefert, baut die App die **Preis-Historie
selbst** auf, indem ein Scheduler die Suchen periodisch abfragt und Snapshots in
PostgreSQL speichert.

## Stack
- **Nuxt 4** + **Tailwind 4** (UI + Server-API)
- **PostgreSQL 16** (Daten + Historie)
- **nuxt-auth-utils** (schlanke Login-/Session-Auth, Token pro Benutzer)
- **@vite-pwa/nuxt** (installierbare PWA)
- **Chart.js** (Markt-Preiskurve)
- Alles in **Docker Compose** (App + DB)

## Features
- Mehrere Suchen anlegen, bearbeiten, pausieren, löschen
- Schlagwort-Filter pro Suche: **UND / ODER** + **Ausschluss-Wörter** (lokal, kostet keine Credits)
- API-Filter: **Kategorie** (kaskadierende Selects Haupt-/Unterkategorie), Standort/Umkreis,
  Preis, Anbieter, Bild/Versand, Angebot/Gesuch
- Pro-Suche-Intervall (Default 24h) + manueller „Jetzt aktualisieren"-Button
- Dashboard: KPIs (Anzahl, Median/Ø/Min/Max), Markt-Preiskurve, Anzeigen-Tabelle
  mit Preis-Badges („Neu" / „Preis gesenkt" / „erhöht") und Preis-Sparklines
- **Multi-User:** jeder Benutzer hinterlegt seinen **eigenen API-Token** und sieht nur
  seine eigenen Suchen/Daten

## Schnellstart (Docker)

```bash
cp .env.example .env       # Werte anpassen (mind. NUXT_SESSION_PASSWORD!)
docker compose up --build  # App auf http://localhost:3000
```

Login mit dem geseedeten Konto (Default `admin` / `admin`, via `.env` änderbar).
Danach unter **Einstellungen** den persönlichen kleinanzeigen-agent API-Token eintragen.

### Ports anpassen
Sind `3000` oder `5432` auf dem Host belegt:

```bash
APP_PORT=3010 DB_PORT=5440 docker compose up --build
```

### Daten zurücksetzen
```bash
docker compose down -v   # entfernt auch das Postgres-Volume
```

## Lokale Entwicklung
DB im Container, App lokal:

```bash
docker compose up -d db
# .env: NUXT_DATABASE_URL=postgres://watcher:watcher@localhost:5432/watcher
npm install
npm run dev                # http://localhost:3000
```

## Konfiguration (.env)
| Variable | Zweck |
|---|---|
| `NUXT_DATABASE_URL` | Postgres-Connection-String |
| `NUXT_AUTH_USERNAME` / `NUXT_AUTH_PASSWORD` | Geseedetes Admin-Konto |
| `NUXT_SESSION_PASSWORD` | ≥32 Zeichen, sichert das Session-Cookie |
| `NUXT_KLAZ_API_KEY` | Optional: Seed-Token für den Dev-Admin (sonst pro Benutzer unter /settings) |
| `POSTGRES_USER/PASSWORD/DB` | Postgres-Container |
| `APP_PORT` / `DB_PORT` | Host-Ports (Default 3000 / 5432) |

## Credits
Jeder Suchlauf kostet **1 Credit pro abgefragter Seite** (`max_pages`). Default ist
1 Seite (= bis zu 100 Anzeigen) bei 24h-Intervall, also 1 Credit/Suche/Tag — schonend
für die Free-Version.
