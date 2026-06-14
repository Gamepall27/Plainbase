# Self-Hosted Auslieferung

Dieses Dokument definiert den produktionsnahen Auslieferungsweg fuer Plainbase.
Der unterstuetzte Pfad ist ein Self-Hosted-Setup auf Linux mit:

- einem versionierten Release unter `/opt/plainbase/releases/<version>`
- persistenten Kundendaten unter `/var/lib/plainbase`
- Konfiguration unter `/etc/plainbase/plainbase.env`
- einem `systemd`-Service fuer die API
- `nginx` als Reverse Proxy und statischem Web-Server

## Zielbild

Plainbase wird nicht direkt aus einem Git-Checkout betrieben. Stattdessen wird aus dem Repository ein reproduzierbares Self-Hosted-Bundle erzeugt:

```bash
npm run package:self-hosted
```

Das Kommando baut alle Pakete und legt anschliessend zwei Artefakte ab:

- `artifacts/plainbase-self-hosted/plainbase-<version>/`
- `artifacts/plainbase-self-hosted/plainbase-self-hosted-<version>.tgz`

Das Bundle enthaelt:

- das gebaute API-Backend
- das gebaute Web-Frontend
- die zur Laufzeit benoetigten Workspace-Pakete
- Installations- und Upgrade-Skripte
- `systemd`- und `nginx`-Vorlagen

## Installationspfad

Empfohlene Zielpfade auf dem Kundenserver:

| Pfad | Zweck |
| --- | --- |
| `/opt/plainbase/releases/<version>` | unveraenderliche Release-Dateien |
| `/opt/plainbase/current` | Symlink auf das aktive Release |
| `/etc/plainbase/plainbase.env` | produktive Konfiguration |
| `/var/lib/plainbase/plainbase.sqlite` | persistente SQLite-Datenbank |
| `/var/lib/plainbase/content` | persistente Workspace-Inhalte |
| `/var/backups/plainbase` | Datenbank-Backups vor Upgrades |

## Produktionskonfiguration

Die Beispielkonfiguration liegt unter `ops/self-hosted/plainbase.env.example`.

Wichtige Werte:

| Variable | Empfohlener Wert | Zweck |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | API nur lokal an `nginx` binden |
| `PLAINBASE_API_PORT` | `3001` | interner API-Port |
| `PLAINBASE_CONTENT_ROOT` | `/var/lib/plainbase/content` | persistente Inhalte |
| `PLAINBASE_DB_PATH` | `/var/lib/plainbase/plainbase.sqlite` | persistente SQLite-Datei |

Wichtig:

- Die API soll nicht direkt ins Internet exponiert werden.
- Das Frontend wird aus `apps/web/dist` statisch ueber `nginx` ausgeliefert.
- Alle Browser-Requests an `/api/*` werden vom Reverse Proxy an die lokale API weitergereicht.

## Kundeninstallation

1. Bundle auf den Zielserver kopieren und entpacken.
2. Im entpackten Verzeichnis `sudo ./ops/self-hosted/install.sh` ausfuehren.
3. Falls noetig `/etc/plainbase/plainbase.env` anpassen.
4. Die `nginx`-Vorlage aus `ops/self-hosted/nginx.plainbase.conf` fuer die Ziel-Domain aktivieren.
5. `sudo systemctl restart nginx` ausfuehren.
6. Betriebsstart pruefen:

```bash
curl http://127.0.0.1:3001/api/health
systemctl status plainbase
```

## Upgrade- und Update-Strategie

Updates erfolgen release-basiert und ohne In-Place-Ueberschreiben:

1. Neues Bundle erzeugen.
2. Bundle auf den Zielserver kopieren und entpacken.
3. `sudo ./ops/self-hosted/upgrade.sh` aus dem neuen Bundle ausfuehren.

Das Upgrade-Skript fuehrt folgende Schritte aus:

- Backup der SQLite-Datei nach `/var/backups/plainbase`
- Kopie des neuen Releases nach `/opt/plainbase/releases/<version>`
- `npm ci --omit=dev` im neuen Release
- Umschalten des Symlinks `/opt/plainbase/current`
- Neustart des `plainbase`-Services
- Health-Check gegen `/api/health`
- automatischer Rollback auf das vorherige Release, falls der Health-Check fehlschlaegt

## Rollback

Falls ein Upgrade fehlschlaegt, wird automatisch auf den vorherigen Symlink-Stand zurueckgeschaltet.
Manuell ist ein Rollback ebenfalls moeglich:

```bash
sudo ln -sfn /opt/plainbase/releases/<vorherige-version> /opt/plainbase/current
sudo systemctl restart plainbase
```

## Betriebsstart fuer Kunden

Fuer einen ersten reproduzierbaren Start reichen diese Pruefpunkte:

1. `systemctl status plainbase` zeigt den Dienst als `active`.
2. `curl http://127.0.0.1:3001/api/health` liefert `status: "ok"`.
3. Die Ziel-Domain liefert das Frontend aus.
4. Browser-Aufrufe gegen `/api/workspaces` funktionieren ueber `nginx`.

## Bekannte Leitplanken

- Plainbase bleibt aktuell ein Single-Node-Setup mit SQLite.
- Das Release-Verfahren setzt Node.js 24 und `npm` auf dem Zielsystem voraus.
- Schema-Migrationen werden derzeit beim API-Start ausgefuehrt. Vor jedem Upgrade ist deshalb das Datenbank-Backup Pflicht und im Skript eingebaut.
