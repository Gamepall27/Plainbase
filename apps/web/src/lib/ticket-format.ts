import type { Document, Ticket } from "@plainbase/shared";
import type { TicketFilter } from "../app/types";

export function countTicketsByStatus(tickets: Ticket[], status: TicketFilter) {
  return tickets.filter((ticket) => ticket.status === status).length;
}

export function getTicketDocumentTitle(ticket: Ticket, documents: Document[]) {
  if (!ticket.documentId) {
    return "Kein Dokument";
  }

  return (
    documents.find((document) => document.id === ticket.documentId)?.title ??
    "Nicht verknuepft"
  );
}

export function formatTicketFilterLabel(status: TicketFilter) {
  if (status === "Open") {
    return "Offen";
  }

  if (status === "In Progress") {
    return "In Progress";
  }

  return "Erledigt";
}

export function getTicketStatusClassName(status: Ticket["status"]) {
  if (status === "Open") {
    return "ticket-badge open";
  }

  if (status === "In Progress") {
    return "ticket-badge progress";
  }

  return "ticket-badge done";
}

export function getPriorityClassName(index: number) {
  if (index === 0) {
    return "ticket-priority high";
  }

  if (index === 1) {
    return "ticket-priority medium";
  }

  return "ticket-priority low";
}

export function getPriorityLabel(index: number) {
  if (index === 0) {
    return "Hoch";
  }

  if (index === 1) {
    return "Mittel";
  }

  return "Normal";
}
