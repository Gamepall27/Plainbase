import assert from "node:assert/strict";
import test from "node:test";
import type { Document, Ticket } from "@plainbase/shared";
import {
  countTicketsByStatus,
  formatTicketFilterLabel,
  getPriorityClassName,
  getPriorityLabel,
  getTicketDocumentTitle,
  getTicketStatusClassName
} from "../../apps/web/src/lib/ticket-format.ts";

const documents: Document[] = [
  {
    id: "document-1",
    workspaceId: "workspace-1",
    parentId: null,
    kind: "document",
    sortOrder: 0,
    title: "Produktvision",
    slug: "produktvision",
    content: "# Vision",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdByUserId: "user-admin",
    updatedByUserId: "user-admin"
  }
];

const tickets: Ticket[] = [
  {
    id: "ticket-1",
    workspaceId: "workspace-1",
    documentId: "document-1",
    title: "Offenes Ticket",
    description: "Beschreibung",
    status: "Open",
    creatorId: "user-admin",
    assigneeId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "ticket-2",
    workspaceId: "workspace-1",
    documentId: null,
    title: "In Arbeit",
    description: "Beschreibung",
    status: "In Progress",
    creatorId: "user-admin",
    assigneeId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "ticket-3",
    workspaceId: "workspace-1",
    documentId: "missing-document",
    title: "Erledigt",
    description: "Beschreibung",
    status: "Done",
    creatorId: "user-admin",
    assigneeId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];

test("ticket helpers count and translate statuses", () => {
  assert.equal(countTicketsByStatus(tickets, "Open"), 1);
  assert.equal(countTicketsByStatus(tickets, "In Progress"), 1);
  assert.equal(countTicketsByStatus(tickets, "Done"), 1);

  assert.equal(formatTicketFilterLabel("Open"), "Offen");
  assert.equal(formatTicketFilterLabel("In Progress"), "In Progress");
  assert.equal(formatTicketFilterLabel("Done"), "Erledigt");
});

test("ticket helpers resolve linked and unlinked document titles", () => {
  assert.equal(getTicketDocumentTitle(tickets[0]!, documents), "Produktvision");
  assert.equal(getTicketDocumentTitle(tickets[1]!, documents), "Kein Dokument");
  assert.equal(getTicketDocumentTitle(tickets[2]!, documents), "Nicht verknuepft");
});

test("ticket helpers map statuses and priorities to classes and labels", () => {
  assert.equal(getTicketStatusClassName("Open"), "ticket-badge open");
  assert.equal(getTicketStatusClassName("In Progress"), "ticket-badge progress");
  assert.equal(getTicketStatusClassName("Done"), "ticket-badge done");

  assert.equal(getPriorityClassName(0), "ticket-priority high");
  assert.equal(getPriorityClassName(1), "ticket-priority medium");
  assert.equal(getPriorityClassName(3), "ticket-priority low");

  assert.equal(getPriorityLabel(0), "Hoch");
  assert.equal(getPriorityLabel(1), "Mittel");
  assert.equal(getPriorityLabel(9), "Normal");
});
