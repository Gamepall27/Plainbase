import type { DatabaseSync } from "node:sqlite";
import { defaultDemoPassword, hashPassword } from "../auth/passwords.js";

const schemaStatements = [
  `
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      root_path TEXT NOT NULL DEFAULT '',
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
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role_id TEXT NOT NULL,
      FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      parent_id TEXT,
      kind TEXT NOT NULL DEFAULT 'document' CHECK (kind IN ('document', 'folder')),
      sort_order INTEGER NOT NULL DEFAULT -1,
      file_path TEXT NOT NULL DEFAULT '',
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
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
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

  ensureColumn(database, "users", "username", "TEXT");
  ensureColumn(database, "users", "password_hash", "TEXT");
  ensureColumn(database, "users", "avatar_url", "TEXT");
  ensureColumn(
    database,
    "workspaces",
    "root_path",
    "TEXT NOT NULL DEFAULT ''"
  );
  ensureColumn(
    database,
    "documents",
    "kind",
    "TEXT NOT NULL DEFAULT 'document' CHECK (kind IN ('document', 'folder'))"
  );
  ensureColumn(
    database,
    "documents",
    "sort_order",
    "INTEGER NOT NULL DEFAULT -1"
  );
  ensureColumn(
    database,
    "documents",
    "file_path",
    "TEXT NOT NULL DEFAULT ''"
  );
  database.exec(`
    UPDATE users
    SET username = LOWER(SUBSTR(email, 1, INSTR(email, '@') - 1))
    WHERE username IS NULL OR TRIM(username) = ''
  `);
  database.exec(`
    UPDATE users
    SET password_hash = '${hashPassword(defaultDemoPassword)}'
    WHERE password_hash IS NULL OR TRIM(password_hash) = ''
  `);
  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx
    ON users (username)
  `);
  database.exec(`
    CREATE INDEX IF NOT EXISTS workspaces_root_path_idx
    ON workspaces (root_path)
  `);
  database.exec(`
    UPDATE documents
    SET kind = 'document'
    WHERE kind IS NULL OR TRIM(kind) = ''
  `);
  database.exec(`
    WITH ordered_documents AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY workspace_id, COALESCE(parent_id, '__root__')
          ORDER BY created_at, title, id
        ) - 1 AS next_sort_order
      FROM documents
    )
    UPDATE documents
    SET sort_order = (
      SELECT next_sort_order
      FROM ordered_documents
      WHERE ordered_documents.id = documents.id
    )
    WHERE sort_order < 0
  `);
  database.exec(`
    CREATE INDEX IF NOT EXISTS documents_parent_sort_order_idx
    ON documents (workspace_id, parent_id, sort_order)
  `);
  database.exec(`
    CREATE INDEX IF NOT EXISTS documents_workspace_file_path_idx
    ON documents (workspace_id, file_path)
  `);
}

function ensureColumn(
  database: DatabaseSync,
  tableName: string,
  columnName: string,
  columnDefinition: string
) {
  const columns = database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  database.exec(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`
  );
}
