import { useEffect, useState } from "react";
import type {
  DemoDataResponse,
  HealthResponse,
  LibrarySummaryResponse
} from "@plainbase/shared";

type HealthState =
  | { status: "loading" }
  | { status: "success"; data: HealthResponse }
  | { status: "error"; message: string };

type LibraryState =
  | { status: "loading" }
  | { status: "success"; data: LibrarySummaryResponse }
  | { status: "error"; message: string };

type DemoDataState =
  | { status: "loading" }
  | { status: "success"; data: DemoDataResponse }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string };

export function App() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });
  const [library, setLibrary] = useState<LibraryState>({ status: "loading" });
  const [demoData, setDemoData] = useState<DemoDataState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealth() {
      try {
        const response = await fetch("/api/health", {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Health check failed with status ${response.status}`);
        }

        const data = (await response.json()) as HealthResponse;
        setHealth({ status: "success", data });

        if (!data.database) {
          setDemoData({
            status: "unavailable",
            message:
              "Die verbundene API liefert noch keine SQLite-Informationen."
          });
          return;
        }

        void loadDemoData();
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Unknown error";
        setHealth({ status: "error", message });
        setDemoData({ status: "error", message });
      }
    }

    async function loadLibrary() {
      try {
        const response = await fetch("/api/library/summary", {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Library request failed with status ${response.status}`);
        }

        const data = (await response.json()) as LibrarySummaryResponse;
        setLibrary({ status: "success", data });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Unknown error";
        setLibrary({ status: "error", message });
      }
    }

    void loadLibrary();

    async function loadDemoData() {
      try {
        const response = await fetch("/api/demo-data", {
          signal: controller.signal
        });

        if (response.status === 404) {
          setDemoData({
            status: "unavailable",
            message:
              "Die verbundene API kennt den Endpunkt /api/demo-data noch nicht."
          });
          return;
        }

        if (!response.ok) {
          throw new Error(`Demo data request failed with status ${response.status}`);
        }

        const data = (await response.json()) as DemoDataResponse;
        setDemoData({ status: "success", data });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Unknown error";
        setDemoData({ status: "error", message });
      }
    }

    void loadHealth();

    return () => controller.abort();
  }, []);

  const database = health.status === "success" ? health.data.database : undefined;

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Markdown Knowledge Base</p>
        <h1>Plainbase</h1>
        <p className="lead">
          Erweiterbares Grundgeruest fuer eine browserbasierte Wissensdatenbank
          fuer Unternehmen.
        </p>
      </section>

      <section className="panel">
        <h2>Systemstatus</h2>
        {health.status === "loading" && <p>API-Healthcheck wird geladen...</p>}
        {health.status === "error" && (
          <p>Backend nicht erreichbar: {health.message}</p>
        )}
        {health.status === "success" && (
          <dl className="status-grid">
            <div>
              <dt>Status</dt>
              <dd>{health.data.status}</dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{health.data.service}</dd>
            </div>
            <div>
              <dt>Zeit</dt>
              <dd>{new Date(health.data.timestamp).toLocaleString("de-DE")}</dd>
            </div>
            <div>
              <dt>Datenquelle</dt>
              <dd>{health.data.storage.rootPath}</dd>
            </div>
            <div>
              <dt>SQLite-Datei</dt>
              <dd>{database?.path ?? "nicht verfuegbar"}</dd>
            </div>
            <div>
              <dt>Markdown-Dateien</dt>
              <dd>{health.data.storage.markdownFileCount}</dd>
            </div>
            <div>
              <dt>Ordner</dt>
              <dd>{health.data.storage.directoryCount}</dd>
            </div>
            <div>
              <dt>Scan</dt>
              <dd>{health.data.storage.scanCompleted ? "vollstaendig" : "teilweise"}</dd>
            </div>
            <div>
              <dt>Workspace</dt>
              <dd>{database?.workspaceCount ?? "n/a"}</dd>
            </div>
            <div>
              <dt>Dokumente</dt>
              <dd>{database?.documentCount ?? "n/a"}</dd>
            </div>
            <div>
              <dt>Tickets</dt>
              <dd>{database?.ticketCount ?? "n/a"}</dd>
            </div>
            <div>
              <dt>Benutzer</dt>
              <dd>{database?.userCount ?? "n/a"}</dd>
            </div>
            <div>
              <dt>Rollen</dt>
              <dd>{database?.roleCount ?? "n/a"}</dd>
            </div>
            <div>
              <dt>Add-ons</dt>
              <dd>{database?.addonCount ?? "n/a"}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="panel">
        <h2>Obsidian-Bibliothek</h2>
        <p className="lead compact">
          Der SMB-Ordner und seine Unterordner werden als dateibasierte
          Wissensdatenbank verwendet.
        </p>
        {library.status === "loading" && <p>Ordnerinhalt wird geladen...</p>}
        {library.status === "error" && (
          <p>Bibliothek nicht lesbar: {library.message}</p>
        )}
        {library.status === "success" && (
          <ul className="entry-list">
            {library.data.topLevelEntries.map((entry) => (
              <li key={entry.path}>
                <span className="entry-kind">{entry.kind}</span>
                <span>{entry.path}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>SQLite Seed-Daten</h2>
        <p className="lead compact">
          Die Demo-Daten liegen in einer getrennten SQLite-Schicht und werden
          ueber die API read-only ausgeliefert.
        </p>
        {demoData.status === "loading" && <p>Seed-Daten werden geladen...</p>}
        {demoData.status === "unavailable" && <p>{demoData.message}</p>}
        {demoData.status === "error" && (
          <p>Seed-Daten nicht lesbar: {demoData.message}</p>
        )}
        {demoData.status === "success" && (
          <>
            <dl className="status-grid compact-grid">
              <div>
                <dt>Workspace</dt>
                <dd>{demoData.data.workspaces[0]?.name ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Dokumente</dt>
                <dd>{demoData.data.documents.length}</dd>
              </div>
              <div>
                <dt>Tickets</dt>
                <dd>{demoData.data.tickets.length}</dd>
              </div>
            </dl>

            <div className="demo-columns">
              <div>
                <h3>Dokumente</h3>
                <ul className="entry-list">
                  {demoData.data.documents.map((document) => (
                    <li key={document.id}>
                      <span className="entry-kind">document</span>
                      <span>{document.title}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3>Tickets</h3>
                <ul className="entry-list">
                  {demoData.data.tickets.map((ticket) => (
                    <li key={ticket.id}>
                      <span className="entry-kind">{ticket.status}</span>
                      <span>{ticket.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
