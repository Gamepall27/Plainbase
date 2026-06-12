import type { DatabaseSync } from "node:sqlite";

const schemaStatements = [
  `
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE CHECK (name IN ('Admin', 'Editor', 'Viewer'))
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role_id TEXT NOT NULL,
      FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      parent_id TEXT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      updated_by_user_id TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES documents (id) ON DELETE SET NULL,
      FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
      FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
      UNIQUE (workspace_id, slug)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS addons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      version TEXT NOT NULL,
      description TEXT NOT NULL,
      enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
      manifest_json TEXT NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      document_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Open', 'In Progress', 'Done')),
      creator_id TEXT NOT NULL,
      assignee_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE SET NULL,
      FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE RESTRICT,
      FOREIGN KEY (assignee_id) REFERENCES users (id) ON DELETE SET NULL
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS documents_workspace_id_idx
    ON documents (workspace_id)
  `,
  `
    CREATE INDEX IF NOT EXISTS documents_parent_id_idx
    ON documents (parent_id)
  `,
  `
    CREATE INDEX IF NOT EXISTS tickets_workspace_id_idx
    ON tickets (workspace_id)
  `,
  `
    CREATE INDEX IF NOT EXISTS tickets_document_id_idx
    ON tickets (document_id)
  `
];

export function applySchema(database: DatabaseSync) {
  database.exec("PRAGMA foreign_keys = ON");

  for (const statement of schemaStatements) {
    database.exec(statement);
  }
}
