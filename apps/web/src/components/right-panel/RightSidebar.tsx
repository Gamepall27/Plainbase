import type { SidebarPanelContext, SidebarPanelExtension } from "@plainbase/addon-sdk";
import type { Document, Ticket } from "@plainbase/shared";
import type { ReactNode } from "react";
import type { LoadState, RightPanelTab, TicketFilter } from "../../app/types";
import { formatTimestamp } from "../../lib/formatters";
import {
  countTicketsByStatus,
  formatTicketFilterLabel,
  getPriorityClassName,
  getPriorityLabel,
  getTicketDocumentTitle,
  getTicketStatusClassName
} from "../../lib/ticket-format";

type RightSidebarProps = {
  activePanelTab: RightPanelTab;
  addonPanelContext: SidebarPanelContext;
  addonRegistryState: LoadState<unknown>;
  addonWarnings: string[];
  documents: Document[];
  linkedDocuments: Document[];
  mayCreateTicket: boolean;
  rightSidebarPanels: SidebarPanelExtension<ReactNode>[];
  showTicketUi: boolean;
  ticketFilter: TicketFilter;
  tickets: Ticket[];
  onDocumentSelect: (documentId: string) => void;
  onPanelTabChange: (tab: RightPanelTab) => void;
  onTicketFilterChange: (status: TicketFilter) => void;
};

const rightPanelTabs: Array<{
  id: RightPanelTab;
  label: string;
}> = [
  { id: "tickets", label: "Tickets" },
  { id: "links", label: "Verknuepfungen" },
  { id: "notes", label: "Notizen" }
];

export function RightSidebar({
  activePanelTab,
  addonPanelContext,
  addonRegistryState,
  addonWarnings,
  documents,
  linkedDocuments,
  mayCreateTicket,
  rightSidebarPanels,
  showTicketUi,
  ticketFilter,
  tickets,
  onDocumentSelect,
  onPanelTabChange,
  onTicketFilterChange
}: RightSidebarProps) {
  const visibleTabs = showTicketUi
    ? rightPanelTabs
    : rightPanelTabs.filter((tab) => tab.id !== "tickets");
  const visibleSidebarPanels = showTicketUi
    ? rightSidebarPanels
    : rightSidebarPanels.filter((panel) => !isTicketPanel(panel.id));

  return (
    <aside className="right-sidebar">
      <div className="context-tabs">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activePanelTab ? "context-tab active" : "context-tab"}
            onClick={() => onPanelTabChange(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.id === "tickets" && (
              <span className="tab-count">
                {countTicketsByStatus(tickets, "Open")}
              </span>
            )}
          </button>
        ))}
        <button type="button" className="context-close-button">
          x
        </button>
      </div>

      {showTicketUi && activePanelTab === "tickets" && (
        <TicketPanel
          documents={documents}
          mayCreateTicket={mayCreateTicket}
          ticketFilter={ticketFilter}
          tickets={tickets}
          onTicketFilterChange={onTicketFilterChange}
        />
      )}

      {activePanelTab === "links" && (
        <LinksPanel
          linkedDocuments={linkedDocuments}
          onDocumentSelect={onDocumentSelect}
        />
      )}

      {activePanelTab === "notes" && (
        <NotesPanel
          addonPanelContext={addonPanelContext}
          addonRegistryState={addonRegistryState}
          addonWarnings={addonWarnings}
          rightSidebarPanels={visibleSidebarPanels}
        />
      )}
    </aside>
  );
}

function isTicketPanel(panelId: string) {
  return panelId.startsWith("tickets.");
}

type TicketPanelProps = {
  documents: Document[];
  mayCreateTicket: boolean;
  ticketFilter: TicketFilter;
  tickets: Ticket[];
  onTicketFilterChange: (status: TicketFilter) => void;
};

function TicketPanel({
  documents,
  mayCreateTicket,
  ticketFilter,
  tickets,
  onTicketFilterChange
}: TicketPanelProps) {
  const activeTickets = tickets.filter((ticket) => ticket.status === ticketFilter);

  return (
    <div className="right-panel-section">
      <div className="ticket-filter-row">
        {(["Open", "In Progress", "Done"] as TicketFilter[]).map((status) => (
          <button
            key={status}
            type="button"
            className={
              status === ticketFilter
                ? "ticket-filter-chip active"
                : "ticket-filter-chip"
            }
            onClick={() => onTicketFilterChange(status)}
          >
            {formatTicketFilterLabel(status)} {countTicketsByStatus(tickets, status)}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="new-ticket-button"
        disabled={!mayCreateTicket}
      >
        + Neues Ticket
      </button>

      <div className="ticket-card-list">
        {activeTickets.length === 0 && (
          <div className="empty-ticket-state">
            Keine Tickets fuer diesen Status vorhanden.
          </div>
        )}
        {activeTickets.map((ticket, index) => (
          <article key={ticket.id} className="ticket-card">
            <div className="ticket-card-head">
              <h3>{ticket.title}</h3>
              <span className={getTicketStatusClassName(ticket.status)}>
                {formatTicketFilterLabel(ticket.status)}
              </span>
            </div>
            <p className="ticket-code">#T-{1001 + index}</p>
            <dl className="ticket-meta-list">
              <div>
                <dt>Dokument:</dt>
                <dd>{getTicketDocumentTitle(ticket, documents)}</dd>
              </div>
              <div>
                <dt>Beschreibung:</dt>
                <dd>{ticket.description}</dd>
              </div>
            </dl>
            <div className="ticket-card-footer">
              <span>{formatTimestamp(ticket.updatedAt)}</span>
              <span className={getPriorityClassName(index)}>
                {getPriorityLabel(index)}
              </span>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className="inline-link-button">
        Alle Tickets anzeigen
      </button>
    </div>
  );
}

type LinksPanelProps = {
  linkedDocuments: Document[];
  onDocumentSelect: (documentId: string) => void;
};

function LinksPanel({ linkedDocuments, onDocumentSelect }: LinksPanelProps) {
  return (
    <div className="right-panel-section">
      <div className="link-card">
        <h3>Verknuepfungen</h3>
        <div className="link-list">
          {linkedDocuments.map((document) => (
            <button
              key={document.id}
              type="button"
              className="linked-document-row"
              onClick={() => onDocumentSelect(document.id)}
            >
              <span>{document.title}</span>
              <span>oeffnen</span>
            </button>
          ))}
          {linkedDocuments.length === 0 && (
            <p className="sidebar-copy">Noch keine Verknuepfungen verfuegbar.</p>
          )}
        </div>
      </div>
    </div>
  );
}

type NotesPanelProps = {
  addonPanelContext: SidebarPanelContext;
  addonRegistryState: LoadState<unknown>;
  addonWarnings: string[];
  rightSidebarPanels: SidebarPanelExtension<ReactNode>[];
};

function NotesPanel({
  addonPanelContext,
  addonRegistryState,
  addonWarnings,
  rightSidebarPanels
}: NotesPanelProps) {
  return (
    <div className="right-panel-section">
      {addonRegistryState.status === "error" && (
        <p className="feedback error">{addonRegistryState.message}</p>
      )}
      {addonWarnings.map((warning) => (
        <p key={warning} className="feedback error">
          {warning}
        </p>
      ))}

      {rightSidebarPanels.map((panel) => (
        <section key={panel.id} className="addon-panel-card">
          <h3>{panel.title}</h3>
          {panel.render(addonPanelContext)}
        </section>
      ))}

      {rightSidebarPanels.length === 0 && (
        <div className="empty-ticket-state">Keine Add-on-Panels aktiv.</div>
      )}
    </div>
  );
}
