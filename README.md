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
- Pro-Suche-Intervall (Default 24h) + optionale **Uhrzeit** (Anker-Zeit, z. B. täglich 08:00,
  Zeitzone via `NUXT_TZ`) + manueller „Jetzt aktualisieren"-Button
- **Zusammenfassungen per Telegram / WhatsApp** nach jedem geplanten Lauf (pro Suche
  aktivierbar): neue Anzeigen, Preissenkungen und Median/Min/Max. Telegram über die Bot-API,
  WhatsApp über CallMeBot; pro Benutzer in den Einstellungen konfigurierbar inkl. Test-Button
- Dashboard: KPIs (Anzahl, Median/Ø/Min/Max), Markt-Preiskurve, Anzeigen-Tabelle
  mit Preis-Badges („Neu" / „Preis gesenkt" / „erhöht") und Preis-Sparklines
- Einzelne Anzeigen **aus der Statistik streichen** (und wieder zurückholen): gestrichene
  Anzeigen zählen sofort nicht mehr zu Median/Ø/Min/Max und werden in künftigen Läufen ignoriert
- **Vollständige Datenhaltung:** nichts wird gelöscht. Entfernte/verkaufte Anzeigen bleiben
  samt Preis-Historie dauerhaft erhalten. Statistik-Basis pro Dashboard umschaltbar zwischen
  **Aktuell verfügbar** und **Gesamt inkl. entfernte** (Langzeit-Auswertung über Jahre)
- **Multi-User:** jeder Benutzer hinterlegt seinen **eigenen API-Token** und sieht nur
  seine eigenen Suchen/Daten
- **Admin-Nutzerverwaltung:** Admins verwalten unter `/admin/users` alle Konten
  (anlegen, Rolle/Verifizierung umschalten, Passwort zurücksetzen, löschen) — mit
  Schutz gegen Selbst-Löschen und Entzug des letzten Admins. Der erste/seeded User ist Admin
- **Sichere Accountverwaltung:** Registrierung mit **E-Mail-Verifizierung** (Login erst
  nach Bestätigung), **Passwort-Reset** und **E-Mail/Passwort ändern** per E-Mail-Link;
  gehashte Single-Use-Tokens mit Ablauf, Rate-Limiting und Anti-Enumeration. E-Mail-Versand
  per SMTP (ohne SMTP-Config werden Links in der Konsole geloggt — praktisch für Dev)

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

## Deployment (Production, Debian vServer)

Automatisiert über **GitHub Actions**: ein Git-Tag `vX.Y.Z` baut das Docker-Image,
pusht es nach **GHCR** und deployt per SSH auf den Server. Dort läuft der Stack aus
**Caddy (Auto-HTTPS) → App → PostgreSQL** (`docker-compose.prod.yml`).

### Einmalige Server-Vorbereitung (Debian)
```bash
# 1) Docker + Compose-Plugin
curl -fsSL https://get.docker.com | sh

# 2) Deploy-Verzeichnis
sudo mkdir -p /opt/kleinanzeigen-watcher && sudo chown "$USER" /opt/kleinanzeigen-watcher
cd /opt/kleinanzeigen-watcher

# 3) .env anlegen (Vorlage aus dem Repo: .env.prod.example) und Werte setzen
#    DOMAIN, ACME_EMAIL, NUXT_SESSION_PASSWORD (openssl rand -base64 48),
#    NUXT_AUTH_PASSWORD, POSTGRES_PASSWORD …
nano .env

# 4) SSH-Key der Pipeline erlauben (siehe unten) und Ports 80/443 freigeben
sudo ufw allow 80,443/tcp   # falls ufw aktiv
```
- **DNS:** A-Record von `DOMAIN` auf die Server-IP zeigen lassen (für Let's Encrypt).
- `docker-compose.prod.yml` und `Caddyfile` müssen **nicht** manuell kopiert werden — die
  Pipeline lädt sie bei jedem Deploy per `scp` aktuell hoch.

### SSH-Deploy-Key
```bash
ssh-keygen -t ed25519 -f deploy_key -N ""
# deploy_key.pub auf den Server:
ssh-copy-id -i deploy_key.pub user@server   # oder manuell in ~/.ssh/authorized_keys
```

### GitHub Secrets (Repo → Settings → Secrets → Actions)
| Secret | Wert |
|---|---|
| `DEPLOY_HOST` | Server-IP/Hostname |
| `DEPLOY_USER` | SSH-Benutzer |
| `DEPLOY_SSH_KEY` | Inhalt von `deploy_key` (privat) |
| `DEPLOY_PATH` | z. B. `/opt/kleinanzeigen-watcher` |
| `DEPLOY_PORT` | optional, Default `22` |

Das Image wird nach `ghcr.io/melf11/kleinanzeigen-watcher` gepusht; der Server zieht es
während des Deploys mit dem temporären `GITHUB_TOKEN` (kein zusätzliches Secret nötig).

### Release / Deploy auslösen
```bash
git tag v1.0.0
git push origin v1.0.0      # → baut, pusht, deployt automatisch
```
Manuell: Actions → „Build & Deploy" → *Run workflow* (deployt das letzte Build).

### Rollback
`APP_IMAGE` in der `.env` auf einen früheren Tag setzen und neu starten:
```bash
sed -i 's|^APP_IMAGE=.*|APP_IMAGE=ghcr.io/melf11/kleinanzeigen-watcher:v0.9.0|' .env
docker compose -f docker-compose.prod.yml up -d
```

### Health-Check
`https://DOMAIN/api/health` → `{"ok":true,"db":true}` (auch als Container-Healthcheck genutzt).

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
| `NUXT_SMTP_*` | E-Mail-Versand (Host/Port/User/Pass/From/Secure). Leer = Konsolen-Log |
| `NUXT_PUBLIC_APP_URL` | Öffentliche Basis-URL für die Links in E-Mails |

### E-Mail über Netcup-Webhosting (Plesk)
Postfach im Webhosting anlegen (z. B. `noreply@deinedomain.de`). Die SMTP-Daten stehen in
Plesk unter *Mail → E-Mail-Adresse → E-Mail-Client einrichten*: Host meist
`mail.deinedomain.de`, Port **587** (STARTTLS, `NUXT_SMTP_SECURE=false`) oder **465**
(`=true`), Benutzer = volle Adresse, Passwort = Postfach-Passwort. Diese Werte gehören in
die **Server-`.env`** (nicht in GitHub Secrets) — wie DB-Passwort und Session-Secret.

## Credits
Jeder Suchlauf kostet **1 Credit pro abgefragter Seite** (`max_pages`). Default ist
1 Seite (= bis zu 100 Anzeigen) bei 24h-Intervall, also 1 Credit/Suche/Tag — schonend
für die Free-Version.
