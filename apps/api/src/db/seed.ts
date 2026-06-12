import type { DatabaseSync } from "node:sqlite";
import { defaultDemoPassword, hashPassword } from "../auth/passwords.js";
import type {
  Addon,
  Document,
  Role,
  Ticket,
  User,
  Workspace
} from "@plainbase/shared";

const workspaces: Workspace[] = [
  {
    id: "workspace-demo-company",
    name: "Demo Company Workspace",
    slug: "demo-company",
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-10T09:00:00.000Z"
  }
];

const roles: Role[] = [
  { id: "role-admin", name: "Admin" },
  { id: "role-editor", name: "Editor" },
  { id: "role-viewer", name: "Viewer" }
];

const users: User[] = [
  {
    id: "user-admin",
    name: "Admin User",
    username: "admin",
    email: "admin@demo-company.local",
    roleId: "role-admin",
    avatarUrl: "https://i.pravatar.cc/96?u=user-admin"
  },
  {
    id: "user-editor",
    name: "Editor User",
    username: "editor",
    email: "editor@demo-company.local",
    roleId: "role-editor",
    avatarUrl: "https://i.pravatar.cc/96?u=user-editor"
  },
  {
    id: "user-viewer",
    name: "Viewer User",
    username: "viewer",
    email: "viewer@demo-company.local",
    roleId: "role-viewer",
    avatarUrl: "https://i.pravatar.cc/96?u=user-viewer"
  }
];

const documents: Document[] = [];

const legacySeedDocumentIds = [
  "document-welcome",
  "document-engineering-notes",
  "document-meeting-notes"
];

const tickets: Ticket[] = [
  {
    id: "ticket-doc-review",
    workspaceId: "workspace-demo-company",
    documentId: null,
    title: "Review welcome document copy",
    description:
      "Polish the onboarding text and add links to the most important starter pages.",
    status: "Open",
    creatorId: "user-admin",
    assigneeId: "user-editor",
    createdAt: "2026-01-12T10:00:00.000Z",
    updatedAt: "2026-01-12T10:00:00.000Z"
  },
  {
    id: "ticket-diagram-addon",
    workspaceId: "workspace-demo-company",
    documentId: null,
    title: "Document diagram addon rollout",
    description:
      "Capture how the Diagrams addon should be enabled and referenced in engineering docs.",
    status: "In Progress",
    creatorId: "user-editor",
    assigneeId: "user-admin",
    createdAt: "2026-01-12T13:30:00.000Z",
    updatedAt: "2026-01-13T08:00:00.000Z"
  }
];

const addons: Addon[] = [
  {
    id: "addon-tickets",
    name: "Tickets",
    version: "1.0.0",
    description: "Adds issue tracking views and ticket-aware document links.",
    enabled: true,
    manifestJson: JSON.stringify(
      {
        name: "Tickets",
        id: "addon-tickets",
        version: "1.0.0",
        description: "Adds issue tracking views and ticket-aware document links.",
        entry: "tickets",
        capabilities: ["tickets", "document-links", "sidebar"],
        extensions: [
          {
            type: "sidebar-panel",
            id: "tickets.sidebar.summary",
            title: "Tickets Uebersicht",
            location: "right"
          },
          {
            type: "backend-route",
            id: "tickets.backend.routes",
            title: "Tickets Backend Routes",
            path: "/addons/tickets",
            method: "GET"
          }
        ]
      },
      null,
      2
    )
  },
  {
    id: "addon-diagrams",
    name: "Diagrams",
    version: "1.3.0",
    description: "Renders simple custom diagram blocks inside markdown documents.",
    enabled: true,
    manifestJson: JSON.stringify(
      {
        name: "Diagrams",
        id: "addon-diagrams",
        version: "1.3.0",
        description: "Renders simple custom diagram blocks inside markdown documents.",
        entry: "diagrams",
        capabilities: ["diagram", "diagrams", "markdown"],
        extensions: [
          {
            type: "sidebar-panel",
            id: "diagrams.sidebar.help",
            title: "Diagrams Hilfe",
            location: "right"
          },
          {
            type: "markdown-block-renderer",
            id: "diagrams.renderer.diagram",
            title: "Diagram Block Renderer",
            language: "diagram"
          },
          {
            type: "backend-route",
            id: "diagrams.backend.routes",
            title: "Diagrams Backend Routes",
            path: "/addons/diagrams",
            method: "GET"
          }
        ]
      },
      null,
      2
    )
  }
];

const appState = {
  key: "demo_user_id",
  value: "__guest__"
};

export function seedDatabase(database: DatabaseSync) {
  const insertWorkspace = database.prepare(`
    INSERT INTO workspaces (id, name, slug, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      slug = excluded.slug,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `);
  const insertRole = database.prepare(`
    INSERT INTO roles (id, name)
    VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name
  `);
  const insertUser = database.prepare(`
    INSERT INTO users (id, name, username, email, password_hash, role_id, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      username = excluded.username,
      email = excluded.email,
      password_hash = excluded.password_hash,
      role_id = excluded.role_id,
      avatar_url = excluded.avatar_url
  `);
  const insertDocument = database.prepare(`
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
    ON CONFLICT(id) DO UPDATE SET
      workspace_id = excluded.workspace_id,
      parent_id = excluded.parent_id,
      title = excluded.title,
      slug = excluded.slug,
      content = excluded.content,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      created_by_user_id = excluded.created_by_user_id,
      updated_by_user_id = excluded.updated_by_user_id
  `);
  const insertAddon = database.prepare(`
    INSERT INTO addons (id, name, version, description, enabled, manifest_json)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      version = excluded.version,
      description = excluded.description,
      enabled = excluded.enabled,
      manifest_json = excluded.manifest_json
  `);
  const insertAppState = database.prepare(`
    INSERT INTO app_state (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO NOTHING
  `);
  const insertTicket = database.prepare(`
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
    ON CONFLICT(id) DO UPDATE SET
      workspace_id = excluded.workspace_id,
      document_id = excluded.document_id,
      title = excluded.title,
      description = excluded.description,
      status = excluded.status,
      creator_id = excluded.creator_id,
      assignee_id = excluded.assignee_id,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `);
  const deleteLegacyDocument = database.prepare(`
    DELETE FROM documents
    WHERE id = ?
  `);

  database.exec("BEGIN");

  try {
    for (const workspace of workspaces) {
      insertWorkspace.run(
        workspace.id,
        workspace.name,
        workspace.slug,
        workspace.createdAt,
        workspace.updatedAt
      );
    }

    for (const role of roles) {
      insertRole.run(role.id, role.name);
    }

    for (const user of users) {
      insertUser.run(
        user.id,
        user.name,
        user.username,
        user.email,
        hashPassword(defaultDemoPassword),
        user.roleId,
        user.avatarUrl
      );
    }

    for (const documentId of legacySeedDocumentIds) {
      deleteLegacyDocument.run(documentId);
    }

    for (const document of documents) {
      insertDocument.run(
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
    }

    for (const addon of addons) {
      insertAddon.run(
        addon.id,
        addon.name,
        addon.version,
        addon.description,
        addon.enabled ? 1 : 0,
        addon.manifestJson
      );
    }

    insertAppState.run(appState.key, appState.value);

    for (const ticket of tickets) {
      insertTicket.run(
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
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
