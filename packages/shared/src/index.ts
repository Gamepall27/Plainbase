export type HealthResponse = {
  status: "ok";
  service: string;
  timestamp: string;
  storage: {
    type: "filesystem";
    rootPath: string;
    markdownFileCount: number;
    directoryCount: number;
    scanCompleted: boolean;
  };
  database?: DatabaseSummary;
};

export type LibraryEntry = {
  name: string;
  path: string;
  kind: "directory" | "file";
};

export type LibrarySummaryResponse = {
  rootPath: string;
  markdownFileCount: number;
  directoryCount: number;
  scanCompleted: boolean;
  topLevelEntries: LibraryEntry[];
};

export type RoleName = "Admin" | "Editor" | "Viewer";

export type TicketStatus = "Open" | "In Progress" | "Done";

export type DatabaseSummary = {
  type: "sqlite";
  path: string;
  seeded: boolean;
  workspaceCount: number;
  documentCount: number;
  userCount: number;
  roleCount: number;
  addonCount: number;
  ticketCount: number;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type Document = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  title: string;
  slug: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  roleId: string;
};

export type Role = {
  id: string;
  name: RoleName;
};

export type Addon = {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  manifestJson: string;
};

export type Ticket = {
  id: string;
  workspaceId: string;
  documentId: string | null;
  title: string;
  description: string;
  status: TicketStatus;
  creatorId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DemoDataResponse = {
  workspaces: Workspace[];
  documents: Document[];
  users: User[];
  roles: Role[];
  addons: Addon[];
  tickets: Ticket[];
};
