# Plainbase

Plainbase ist ein lokales Browser-Tool fuer Markdown-Wissensseiten, Tickets und Add-ons. Das MVP verbindet ein React-Frontend, eine Express-API, eine SQLite-Datenbank und einen kleinen Add-on-Runner fuer Sidebar-Panels, Markdown-Renderer und Backend-Routen.

## Was die App ist

- Eine browserbasierte Workspace-App mit Dokumenten, Tickets und Demo-Rollen.
- Ein Editor mit Live-Vorschau fuer Markdown-Inhalte.
- Eine API, die Daten aus dem Dateisystem und aus SQLite zusammenfuert.
- Ein Add-on-System, das aktive Add-ons in Frontend und Backend registriert.

Die App ist aktuell als MVP fuer lokale Entwicklung gedacht, nicht als produktionsreifes Multi-User-System.

## Self-Hosted Auslieferung

Fuer reproduzierbare Kundeninstallationen gibt es jetzt einen definierten Self-Hosted-Pfad auf Linux mit Release-Bundle, `systemd` und `nginx`.

Bundle erzeugen:

```bash
npm run package:self-hosted
```

Danach liegen die Artefakte unter `artifacts/plainbase-self-hosted/`.
Die komplette Installations-, Betriebs- und Update-Dokumentation steht in `docs/self-hosted.md`.

## Schnellstart

Voraussetzungen:

- Node.js 24 oder neuer
- npm 11 oder neuer

```bash
npm install
npm run dev
```

Danach laufen:

- Frontend: `http://localhost:5173`
- API: `http://127.0.0.1:3001`

Wenn ein Port schon belegt ist, nimmt `scripts/dev.mjs` automatisch den naechsten freien Port und gibt beide URLs im Terminal aus.

Zum Ueberpruefen des Builds:

```bash
npm run build
```

Zum lokalen Ausfuehren der Qualitaets-Gates:

```bash
npm test
```

Einzeln:

```bash
npm run test:unit
npm run test:api
npm run test:e2e
```

Beim ersten E2E-Lauf muss zusaetzlich der Playwright-Browser installiert werden:

```bash
npx playwright install chromium
```

Die E2E-Tests starten Frontend und API selbst. Du musst davor also nicht separat `npm run dev` starten.

### Wichtige Environment-Variablen

| Variable | Default | Zweck |
| --- | --- | --- |
| `PLAINBASE_CONTENT_ROOT` | `/Volumes/files/Obsidian` | Root fuer die Markdown-Inhalte |
| `PLAINBASE_DB_PATH` | `apps/api/data/plainbase.sqlite` | Pfad der SQLite-Datei |
| `PLAINBASE_WEB_PORT` | `5173` | Port des Vite-Frontends |
| `PLAINBASE_API_PORT` | `3001` | Port der Express-API |
| `HOST` | `127.0.0.1` | Host der API |

## Projektstruktur

```text
apps/
  web/    React + Vite UI, Editor, Preview, Add-on-UI
  api/    Express API, SQLite, Auth, Services, Add-on-Backend
packages/
  shared/     Geteilte Typen und API-Contracts
  addon-sdk/  Manifest- und Extension-Typen fuer Add-ons
scripts/
  dev.mjs    Startet Web und API gemeinsam und waehlt freie Ports
```

Die wichtigen Abhaengigkeiten:

- `packages/shared` definiert die Datentypen fuer Dokumente, Tickets, Rollen, Add-ons und Responses.
- `packages/addon-sdk` definiert Add-on-Manifeste und Extension-Typen.
- `apps/api` liest und schreibt SQLite, fuehrt Validierung aus und stellt die REST API bereit.
- `apps/web` holt die Daten ueber die API, rendert die UI und bindet aktive Add-ons ein.

## Frontend

Das Frontend liegt in `apps/web` und ist eine React-App mit Vite.

So laeuft der Datenfluss:

1. Beim Start lädt die App Workspaces, Add-ons, Rollen und den aktiven Demo-User.
2. Nach der Workspace-Wahl werden Dokumente und Tickets fuer diesen Workspace geladen.
3. Das aktuell geoeffnete Dokument wird in einen Editor-Draft ueberfuehrt.
4. Die Add-on-Registry filtert aktive Add-ons und stellt Sidebar-Panels und Markdown-Renderer bereit.
5. Die Markdown-Vorschau rendert HTML mit `marked` und bereinigt es mit `DOMPurify`.

Wichtige UI-Bereiche:

- linke Sidebar: Workspaces, Dokumente, Add-ons
- Mitte: Markdown-Editor plus Live-Vorschau
- rechte Sidebar: kontextuelle Panels der aktiven Add-ons

Der Editor bietet einfache Markdown-Formatierungsaktionen, Slug-Autovervollstaendigung und Rollenpruefungen im UI. Schreibaktionen sind aber zusaetzlich serverseitig abgesichert.

## Backend

Das Backend liegt in `apps/api` und basiert auf Express.

Start und Wiring:

- `src/index.ts` initialisiert SQLite, baut den Content-Store auf und startet Express.
- `src/routes/register-routes.ts` haengt alle Basisrouten ein.
- `src/middleware/attach-demo-auth.ts` legt pro Request den aktiven Demo-User in `request.auth` ab.
- `src/middleware/require-permission.ts` sperrt Mutationsrouten serverseitig.

Wichtige API-Bereiche:

- `GET /api/health` liefert Health, Filesystem- und DB-Status.
- `GET /api/library/summary` liefert die Content-Root-Uebersicht.
- `GET /api/demo-data` liefert die Seed-Daten gesammelt.
- `GET /api/workspaces`, `POST /api/workspaces`
- `GET /api/workspaces/:workspaceId/documents`
- `GET /api/documents/:documentId`, `POST /api/documents`, `PUT /api/documents/:documentId`, `DELETE /api/documents/:documentId`
- `GET /api/users`
- `GET /api/roles`
- `GET /api/demo-user`, `POST /api/demo-user/switch-role`
- `GET /api/addons`, `PUT /api/addons/:addonId/toggle`
- `GET /api/workspaces/:workspaceId/tickets`, `POST /api/tickets`, `PUT /api/tickets/:ticketId`
- `GET /api/addons/tickets`, `GET /api/addons/diagrams` fuer die Add-on-Backend-Routen

Die API verwendet fuer erfolgreiche Antworten das Schema `{ success: true, data: ... }`. Fehler kommen als strukturierte API-Fehler mit Code, Nachricht und optionalen Details zurueck.

## Tests und CI

Plainbase hat jetzt drei Testebenen:

- Unit-Tests fuer Kernlogik
- API-Tests fuer Rechte, Demo-Auth, Workspaces, Dokumente und Tickets
- E2E-Smoke-Tests fuer kritische UI-Flows wie Anmeldung, Theme-Umschaltung, Kanban und Ticket-Ansicht

Die GitHub-CI unter `.github/workflows/ci.yml` fuehrt diese Gates in folgender Reihenfolge aus:

1. `npm run build`
2. `npm run test:unit`
3. `npm run test:api`
4. `npm run test:e2e`

## SQLite-Datenbank

Die SQLite-Datenbank wird beim Start automatisch erstellt bzw. geoeffnet und mit Schema plus Seed-Daten initialisiert.

Standardpfad:

- `apps/api/data/plainbase.sqlite`

Tabellen:

| Tabelle | Zweck |
| --- | --- |
| `workspaces` | Workspace-Stammdaten |
| `roles` | Die drei Demo-Rollen |
| `users` | Demo-Benutzer mit Rollenbezug |
| `documents` | Markdown-Dokumente mit Parent-Bezug |
| `app_state` | Kleine App-Zustandswerte wie den aktiven Demo-User |
| `addons` | Add-on-Metadaten, Manifest und Aktivierungsstatus |
| `tickets` | Tickets pro Workspace und optionalem Dokument |

Wichtige Eigenschaften:

- Seeds laufen idempotent und koennen beim Neustart erneut angewendet werden.
- Dokument-Slugs sind pro Workspace eindeutig.
- Tickets koennen optional auf Dokumente verweisen, muessen aber zum gleichen Workspace passen.
- Der aktive Demo-User wird in `app_state` unter `demo_user_id` gespeichert.

## Rollen und Berechtigungen

Plainbase hat drei Rollen:

| Rolle | Darf |
| --- | --- |
| `Admin` | Alles, inkl. Workspace-Erstellung, Dokument-Loeschen und Add-on-Verwaltung |
| `Editor` | Dokumente erstellen und bearbeiten, Tickets erstellen und bearbeiten |
| `Viewer` | Lesen, aber keine Schreib- oder Verwaltungsaktionen |

Die UI blendet verbotene Aktionen aus oder deaktiviert sie. Die eigentliche Absicherung passiert aber immer auch im Backend ueber `requirePermission`.

## Demo-User-System

Plainbase nutzt aktuell noch kein echtes Login. Stattdessen gibt es einen aktiven Demo-User, der fuer jeden Request in den Auth-Context geladen wird.

So funktioniert es:

- `GET /api/demo-user` liefert den aktuell aktiven Demo-User.
- `POST /api/demo-user/switch-role` wechselt zwischen `Admin`, `Editor` und `Viewer`.
- Der aktive User wird in SQLite gespeichert und bleibt deshalb nach einem Neustart erhalten.
- Wenn kein gueltiger aktiver User vorhanden ist, faellt die App auf den Admin-User zurueck.

Das ist bewusst ein Demo-Mechanismus, damit UI, API und Berechtigungen schon ohne echtes Auth-System getestet werden koennen.

## Add-on-System

Add-ons werden ueber Manifestdaten in der Datenbank beschrieben und dann in zwei Registern geladen:

- Frontend-Registry: aktiviert UI-Erweiterungen in der React-App
- Backend-Registry: aktiviert Backend-Routen fuer aktive Add-ons

Aktuell erkennt Plainbase drei gelebte Extension-Typen:

- `sidebar-panel`
- `markdown-block-renderer`
- `backend-route`

Im SDK sind noch weitere Typen vorbereitet, aber im MVP nicht voll in der App verdrahtet.

### Wie ein Add-on geladen wird

1. Ein Add-on-Record wird aus der SQLite-Tabelle `addons` geladen.
2. Nur aktivierte Add-ons werden in Frontend und Backend registriert.
3. Das Manifest-`entry` muessen Frontend und Backend im jeweiligen Catalog kennen.
4. Aus den Extensions werden Sidebar-Panels, Markdown-Renderer oder Backend-Routen gebaut.

### Wie man ein neues Add-on erstellt

Wenn du ein neues Add-on hinzufuegen willst, brauchst du aktuell Code in beiden Apps:

1. Manifest in der Datenbank oder im Seed anlegen.
2. Frontend-Addon in `apps/web/src/addons/builtin/` bauen.
3. Das Frontend-Addon in `apps/web/src/addons/addon-registry.ts` registrieren.
4. Backend-Addon in `apps/api/src/addons/builtin/` bauen.
5. Das Backend-Addon in `apps/api/src/addons/backend-addon-registry.ts` registrieren.
6. Falls das Add-on neue Kontextdaten braucht, die Typen im SDK oder in `packages/shared` erweitern.

Wichtig: Es gibt hier noch kein dynamisches Plugin-Loading von aussen. Add-ons sind im MVP bewusst hart verdrahtet und muessen in den Catalogs bekannt sein.

### Add-on-Manifest in kurz

Ein Add-on braucht mindestens:

- eindeutige `id`
- `name`
- `version`
- `entry`
- optionale `capabilities`
- optionale `extensions`

Das `entry`-Feld ist der Schluessel fuer die Zuordnung zu Frontend- und Backend-Code.

## Das Tickets-Add-on

Das Tickets-Add-on zeigt, wie ein einfaches fachliches Add-on im MVP aussieht.

Frontend:

- erscheint als Add-on in der linken Sidebar
- rendert rechts ein Panel mit einer kurzen Ticket-Uebersicht
- zeigt aktuell nur die ersten vier Tickets des aktiven Workspaces
- nutzt die Add-on-Kontextdaten mit Workspace, Tickets und Demo-Rolle

Backend:

- stellt `GET /api/addons/tickets` bereit
- liefert dort nur Metadaten und eine Ready-to-use-Antwort
- ist aktuell noch kein vollwertiges Ticket-Backend, sondern ein Beispiel fuer die Route-Integration

Fachlich:

- Tickets koennen einem Workspace und optional einem Dokument zugeordnet werden
- Statuswerte sind `Open`, `In Progress` und `Done`
- Admin und Editor koennen Tickets erstellen und bearbeiten

## Das Diagramm-Add-on

Das Diagramm-Add-on erweitert die Markdown-Vorschau um einfache Diagramm-Bloecke.

Frontend:

- erkennt Fenced Code Blocks mit der Sprache `diagram`
- rendert einfache Ketten wie `A -> B`
- zeigt bei ungueltigem Input eine Fallback-Darstellung mit dem Rohcode
- liefert zusaetzlich ein Hilfspanel mit einem Beispiel

Beispiel:

```diagram
A -> B
B -> C
```

Backend:

- stellt `GET /api/addons/diagrams` bereit
- liefert dort Metadaten und eine kleine Statusantwort

Wichtig: Das ist noch kein vollwertiger Diagramm-Renderer mit Layout-Engine. Es ist bewusst eine einfache MVP-Implementierung fuer lineare Flows.

## Aktuelle Grenzen des MVP

- Kein echtes Login, keine Sessions und kein Identity-Provider
- Add-ons sind hart verdrahtet statt dynamisch discoverbar
- Nur zwei Beispiel-Add-ons sind eingebaut
- Das Ticket-System ist einfach und kein vollwertiges Issue-Tracking
- Keine Suche, keine Versionierung und keine Zusammenarbeit in Echtzeit
- SQLite wird lokal verwendet; es gibt keine Migrations- oder Backup-Story im Produkt
- Die Diagramme sind einfache Text-Flows, keine grafische Modellierung
- Dokumente sind Markdown-Dateien mit metadatenbasierter Verwaltung, aber kein komplettes CMS

## Naechste sinnvolle Entwicklungsschritte

1. Echtes Auth-System mit Sessions oder OIDC einfuehren.
2. Add-ons dynamisch laden statt sie hart im Code zu registrieren.
3. Tickets als richtige Arbeitsflaeche ausbauen, mit Detailansicht, Filtern und Zuweisungen.
4. Dokumentsuche, Versionierung und bessere Navigationsstrukturen hinzufuegen.
5. SQLite-Migrationen und Testabdeckung fuer Auth, Berechtigungen und Add-ons aufbauen.
6. Produktionsfaehige Konfiguration, Observability und Backup/Restore fuer Daten ergaenzen.

## Relevante Dateien

- `scripts/dev.mjs`
- `apps/web/src/App.tsx`
- `apps/web/src/addons/addon-registry.ts`
- `apps/web/src/addons/builtin/tickets-addon.tsx`
- `apps/web/src/addons/builtin/diagrams-addon.tsx`
- `apps/api/src/index.ts`
- `apps/api/src/routes/register-routes.ts`
- `apps/api/src/addons/backend-addon-registry.ts`
- `apps/api/src/addons/builtin/tickets-backend-addon.ts`
- `apps/api/src/addons/builtin/diagrams-backend-addon.ts`
- `apps/api/src/db/schema.ts`
- `apps/api/src/db/seed.ts`
- `packages/shared/src/index.ts`
- `packages/addon-sdk/src/index.ts`
