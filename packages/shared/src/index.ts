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

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "CONFLICT"
  | "FORBIDDEN"
  | "INTERNAL_SERVER_ERROR"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export type ApiErrorDetails = Record<string, string>;

export type ApiErrorResponse = {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetails;
  };
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type CreateWorkspaceRequest = {
  name: string;
  slug: string;
};

export type WorkspacesResponse = ApiSuccessResponse<{
  workspaces: Workspace[];
}>;

export type WorkspaceResponse = ApiSuccessResponse<{
  workspace: Workspace;
}>;

export type CreateDocumentRequest = {
  workspaceId: string;
  parentId?: string | null;
  title: string;
  slug: string;
  content: string;
};

export type UpdateDocumentRequest = {
  parentId?: string | null;
  title?: string;
  slug?: string;
  content?: string;
};

export type DocumentsResponse = ApiSuccessResponse<{
  documents: Document[];
}>;

export type DocumentResponse = ApiSuccessResponse<{
  document: Document;
}>;

export type DeleteDocumentResponse = ApiSuccessResponse<{
  deletedDocumentId: string;
}>;

export type DemoUser = {
  authType: "demo";
  user: User;
  role: Role;
};

export type UsersResponse = ApiSuccessResponse<{
  users: User[];
}>;

export type DemoUserResponse = ApiSuccessResponse<DemoUser>;

export type SwitchDemoUserRoleRequest = {
  roleName: RoleName;
};

export type RolesResponse = ApiSuccessResponse<{
  roles: Role[];
}>;

export type AddonsResponse = ApiSuccessResponse<{
  addons: Addon[];
}>;

export type AddonResponse = ApiSuccessResponse<{
  addon: Addon;
}>;

export type CreateTicketRequest = {
  workspaceId: string;
  documentId?: string | null;
  title: string;
  description: string;
  status?: TicketStatus;
  assigneeId?: string | null;
};

export type UpdateTicketRequest = {
  documentId?: string | null;
  title?: string;
  description?: string;
  status?: TicketStatus;
  assigneeId?: string | null;
};

export type TicketsResponse = ApiSuccessResponse<{
  tickets: Ticket[];
}>;

export type TicketResponse = ApiSuccessResponse<{
  ticket: Ticket;
}>;
