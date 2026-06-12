import type { DatabaseSync } from "node:sqlite";
import type { Ticket } from "@plainbase/shared";

export class TicketRepository {
  constructor(private readonly database: DatabaseSync) {}

  listByWorkspaceId(workspaceId: string) {
    return this.database
      .prepare(
        `
          SELECT
            id,
            workspace_id AS workspaceId,
            document_id AS documentId,
            title,
            description,
            status,
            creator_id AS creatorId,
            assignee_id AS assigneeId,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM tickets
          WHERE workspace_id = ?
          ORDER BY created_at, title
        `
      )
      .all(workspaceId) as Ticket[];
  }

  listAll() {
    return this.database
      .prepare(
        `
          SELECT
            id,
            workspace_id AS workspaceId,
            document_id AS documentId,
            title,
            description,
            status,
            creator_id AS creatorId,
            assignee_id AS assigneeId,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM tickets
          ORDER BY created_at, title
        `
      )
      .all() as Ticket[];
  }

  findById(id: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            workspace_id AS workspaceId,
            document_id AS documentId,
            title,
            description,
            status,
            creator_id AS creatorId,
            assignee_id AS assigneeId,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM tickets
          WHERE id = ?
        `
      )
      .get(id) as Ticket | undefined;

    return row ?? null;
  }

  create(ticket: Ticket) {
    this.database
      .prepare(
        `
          INSERT INTO tickets (
            id,
            workspace_id,
            document_id,
            title,
            description,
            status,
            creator_id,
            assignee_id,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        ticket.id,
        ticket.workspaceId,
        ticket.documentId,
        ticket.title,
        ticket.description,
        ticket.status,
        ticket.creatorId,
        ticket.assigneeId,
        ticket.createdAt,
        ticket.updatedAt
      );

    return ticket;
  }

  update(ticket: Ticket) {
    this.database
      .prepare(
        `
          UPDATE tickets
          SET
            document_id = ?,
            title = ?,
            description = ?,
            status = ?,
            assignee_id = ?,
            updated_at = ?
          WHERE id = ?
        `
      )
      .run(
        ticket.documentId,
        ticket.title,
        ticket.description,
        ticket.status,
        ticket.assigneeId,
        ticket.updatedAt,
        ticket.id
      );

    return ticket;
  }

  countByCreatorId(userId: string) {
    const row = this.database
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM tickets
          WHERE creator_id = ?
        `
      )
      .get(userId) as { total: number };

    return row.total;
  }
}
