import type { DatabaseSync } from "node:sqlite";
import type { Document } from "@plainbase/shared";

export class DocumentRepository {
  constructor(private readonly database: DatabaseSync) {}

  listByWorkspaceId(workspaceId: string) {
    return this.database
      .prepare(
        `
          SELECT
            id,
            workspace_id AS workspaceId,
            parent_id AS parentId,
            title,
            slug,
            content,
            created_at AS createdAt,
            updated_at AS updatedAt,
            created_by_user_id AS createdByUserId,
            updated_by_user_id AS updatedByUserId
          FROM documents
          WHERE workspace_id = ?
          ORDER BY created_at, title
        `
      )
      .all(workspaceId) as Document[];
  }

  listAll() {
    return this.database
      .prepare(
        `
          SELECT
            id,
            workspace_id AS workspaceId,
            parent_id AS parentId,
            title,
            slug,
            content,
            created_at AS createdAt,
            updated_at AS updatedAt,
            created_by_user_id AS createdByUserId,
            updated_by_user_id AS updatedByUserId
          FROM documents
          ORDER BY created_at, title
        `
      )
      .all() as Document[];
  }

  findById(id: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            workspace_id AS workspaceId,
            parent_id AS parentId,
            title,
            slug,
            content,
            created_at AS createdAt,
            updated_at AS updatedAt,
            created_by_user_id AS createdByUserId,
            updated_by_user_id AS updatedByUserId
          FROM documents
          WHERE id = ?
        `
      )
      .get(id) as Document | undefined;

    return row ?? null;
  }

  findBySlugInWorkspace(workspaceId: string, slug: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            workspace_id AS workspaceId,
            parent_id AS parentId,
            title,
            slug,
            content,
            created_at AS createdAt,
            updated_at AS updatedAt,
            created_by_user_id AS createdByUserId,
            updated_by_user_id AS updatedByUserId
          FROM documents
          WHERE workspace_id = ? AND slug = ?
        `
      )
      .get(workspaceId, slug) as Document | undefined;

    return row ?? null;
  }

  create(document: Document) {
    this.database
      .prepare(
        `
          INSERT INTO documents (
            id,
            workspace_id,
            parent_id,
            title,
            slug,
            content,
            created_at,
            updated_at,
            created_by_user_id,
            updated_by_user_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        document.id,
        document.workspaceId,
        document.parentId,
        document.title,
        document.slug,
        document.content,
        document.createdAt,
        document.updatedAt,
        document.createdByUserId,
        document.updatedByUserId
      );

    return document;
  }

  update(document: Document) {
    this.database
      .prepare(
        `
          UPDATE documents
          SET
            parent_id = ?,
            title = ?,
            slug = ?,
            content = ?,
            updated_at = ?,
            updated_by_user_id = ?
          WHERE id = ?
        `
      )
      .run(
        document.parentId,
        document.title,
        document.slug,
        document.content,
        document.updatedAt,
        document.updatedByUserId,
        document.id
      );

    return document;
  }

  delete(id: string) {
    this.database
      .prepare(
        `
          DELETE FROM documents
          WHERE id = ?
        `
      )
      .run(id);
  }

  countByAuthorUserId(userId: string) {
    const row = this.database
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM documents
          WHERE created_by_user_id = ? OR updated_by_user_id = ?
        `
      )
      .get(userId, userId) as { total: number };

    return row.total;
  }
}
