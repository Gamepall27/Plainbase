import type { Document, DocumentKind, Ticket, Workspace } from "@plainbase/shared";
import { formatTimestamp } from "../../lib/formatters";
import {
  formatTicketFilterLabel,
  getTicketStatusClassName
} from "../../lib/ticket-format";
import { CreateObjectMenuButton } from "../layout/CreateObjectMenuButton";

type TicketsWorkspaceViewProps = {
  documents: Document[];
  mayCreateDocument: boolean;
  selectedWorkspace: Workspace | null;
  tickets: Ticket[];
  onCreateEntry: (kind: DocumentKind) => void;
  onDocumentSelect: (documentId: string) => void;
};

export function TicketsWorkspaceView({
  documents,
  mayCreateDocument,
  selectedWorkspace,
  tickets,
  onCreateEntry,
  onDocumentSelect
}: TicketsWorkspaceViewProps) {
  const documentsWithTickets = documents
    .filter((document) => document.kind !== "folder")
    .map((document) => ({
      document,
      tickets: tickets.filter((ticket) => ticket.documentId === document.id)
    }))
    .filter((entry) => entry.tickets.length > 0)
    .sort((left, right) => right.tickets.length - left.tickets.length);
  const unlinkedTickets = tickets.filter((ticket) => ticket.documentId === null);
  const openTickets = tickets.filter((ticket) => ticket.status !== "Done").length;

  return (
    <section className="main-stage">
      <div className="document-tabs">
        <button type="button" className="document-tab active">
          <span>Tickets</span>
          <span className="document-tab-close">x</span>
        </button>
        <CreateObjectMenuButton
          ariaLabel="Neues Objekt anlegen"
          className="document-tab-add"
          disabled={!mayCreateDocument}
          label="+"
          onSelect={onCreateEntry}
        />
      </div>

      <div className="document-shell">
        <section className="document-canvas ticket-overview-canvas">
          <div className="document-preview-header">
            <div>
              <p className="canvas-eyebrow">
                {selectedWorkspace?.name ?? "Workspace"}
              </p>
              <h1 className="canvas-title">Tickets</h1>
              <p className="profile-dialog-copy ticket-overview-copy">
                Alle aktuellen Dokumente mit verknuepften Tickets auf einen Blick.
              </p>
            </div>
            <div className="ticket-overview-stats">
              <span className="role-pill">{documentsWithTickets.length} Objekte</span>
              <span className="unsaved-pill">{openTickets} offen</span>
            </div>
          </div>

          <div className="ticket-overview-grid">
            {documentsWithTickets.length === 0 && unlinkedTickets.length === 0 && (
              <div className="empty-ticket-state">
                Noch keine Tickets mit Dokumentbezug vorhanden.
              </div>
            )}

            {documentsWithTickets.map(({ document, tickets: documentTickets }) => (
              <article key={document.id} className="ticket-overview-card">
                <div className="ticket-overview-card-head">
                  <div>
                    <p className="canvas-eyebrow">
                      {document.kind === "kanban" ? "Kanban Board" : "Dokument"}
                    </p>
                    <h3>{document.title}</h3>
                  </div>
                  <button
                    type="button"
                    className="inline-link-button"
                    onClick={() => onDocumentSelect(document.id)}
                  >
                    Oeffnen
                  </button>
                </div>

                <div className="ticket-overview-ticket-list">
                  {documentTickets.map((ticket) => (
                    <div key={ticket.id} className="ticket-overview-ticket-row">
                      <div>
                        <strong>{ticket.title}</strong>
                        <p>{ticket.description}</p>
                      </div>
                      <div className="ticket-overview-ticket-meta">
                        <span className={getTicketStatusClassName(ticket.status)}>
                          {formatTicketFilterLabel(ticket.status)}
                        </span>
                        <span>{formatTimestamp(ticket.updatedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}

            {unlinkedTickets.length > 0 && (
              <article className="ticket-overview-card ticket-overview-card-muted">
                <div className="ticket-overview-card-head">
                  <div>
                    <p className="canvas-eyebrow">Ohne Dokument</p>
                    <h3>Unzugeordnete Tickets</h3>
                  </div>
                </div>

                <div className="ticket-overview-ticket-list">
                  {unlinkedTickets.map((ticket) => (
                    <div key={ticket.id} className="ticket-overview-ticket-row">
                      <div>
                        <strong>{ticket.title}</strong>
                        <p>{ticket.description}</p>
                      </div>
                      <div className="ticket-overview-ticket-meta">
                        <span className={getTicketStatusClassName(ticket.status)}>
                          {formatTicketFilterLabel(ticket.status)}
                        </span>
                        <span>{formatTimestamp(ticket.updatedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
