# Plainbase

Grundgeruest fuer eine browserbasierte React-App mit TypeScript, Node.js-Backend, Express, REST API, dateibasierter Markdown-Wissensdatenbank und einer getrennten SQLite-Datenhaltung fuer Anwendungsdaten.

## Struktur

```text
apps/
  web/        # React + Vite Frontend
  api/        # Express API fuer Dateisystem- und SQLite-Daten
packages/
  shared/     # geteilte Typen
  addon-sdk/  # Platzhalter fuer spaetere Erweiterungspunkte
```

## Voraussetzungen

- Node.js 24 oder neuer
- npm 11 oder neuer

## Start

```bash
npm install
npm run dev
```

Danach:

- Frontend: `http://localhost:5173`
- Backend Healthcheck: `http://127.0.0.1:3001/api/health`
- Bibliothekszusammenfassung: `http://127.0.0.1:3001/api/library/summary`
- Seed-Daten aus SQLite: `http://127.0.0.1:3001/api/demo-data`

Das Frontend nutzt im Dev-Modus einen Vite-Proxy auf `127.0.0.1:3001`, daher ist der Healthcheck auch ueber `http://localhost:5173/api/health` erreichbar.
Wenn `5173` oder `3001` bereits belegt sind, waehlt `npm run dev` automatisch den naechsten freien Web- bzw. API-Port und gibt beide URLs im Terminal aus.

## Hinweise

- Standard-Datenquelle ist `/Volumes/files/Obsidian`, also dein eingebundener SMB-Ordner `smb://100.117.112.24/files/Obsidian`.
- Du kannst den Pfad bei Bedarf ueber `PLAINBASE_CONTENT_ROOT` ueberschreiben.
- Fuer lokale Dev-Starts kannst du bevorzugte Ports bei Bedarf ueber `PLAINBASE_WEB_PORT` und `PLAINBASE_API_PORT` vorgeben.
- Die SQLite-Datenbank wird standardmaessig unter `apps/api/data/plainbase.sqlite` angelegt. Den Pfad kannst du ueber `PLAINBASE_DB_PATH` ueberschreiben.
- Die API liest den Ordner rekursiv und behandelt `.md`-Dateien in allen Unterordnern als Wissensbasis.
- Die Datenbanklogik liegt bewusst getrennt von den Express-Routen unter `apps/api/src/db`.
- Beim Start werden folgende Seed-Daten idempotent angelegt: Rollen `Admin`, `Editor`, `Viewer`; drei Demo-Benutzer; der Workspace `Demo Company Workspace`; die Dokumente `Welcome`, `Engineering Notes`, `Meeting Notes`; zwei Beispiel-Tickets; die Add-ons `Tickets` und `Diagrams`.

## REST API

Alle modellbezogenen Endpunkte liefern konsistente Response-Objekte:

```json
{
  "success": true,
  "data": {}
}
```

Fehler sehen so aus:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed."
  }
}
```

Verfuegbare Endpunkte:

- `GET /api/workspaces`
- `POST /api/workspaces`
- `GET /api/workspaces/:workspaceId/documents`
- `GET /api/documents/:documentId`
- `POST /api/documents`
- `PUT /api/documents/:documentId`
- `DELETE /api/documents/:documentId`
- `GET /api/users`
- `GET /api/demo-user`
- `POST /api/demo-user/switch-role`
- `GET /api/roles`
- `GET /api/addons`
- `PUT /api/addons/:addonId/toggle`
- `GET /api/workspaces/:workspaceId/tickets`
- `POST /api/tickets`
- `PUT /api/tickets/:ticketId`
