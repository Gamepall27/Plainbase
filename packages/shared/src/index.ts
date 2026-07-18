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

export function isAdmin(roleName: RoleName | null | undefined) {
  return hasRole(roleName, "Admin");
}

export function canCreateDocument(roleName: RoleName | null | undefined) {
  return hasRole(roleName, "Admin") || hasRole(roleName, "Editor");
}

export function canEditDocument(roleName: RoleName | null | undefined) {
  return hasRole(roleName, "Admin") || hasRole(roleName, "Editor");
}

export function canDeleteDocument(roleName: RoleName | null | undefined) {
  return isAdmin(roleName);
}

export function canManageAddons(roleName: RoleName | null | undefined) {
  return isAdmin(roleName);
}

export function canManageUsers(roleName: RoleName | null | undefined) {
  return isAdmin(roleName);
}

export function canCreateTicket(roleName: RoleName | null | undefined) {
  return isAdmin(roleName) || hasRole(roleName, "Editor");
}

export function canEditTicket(roleName: RoleName | null | undefined) {
  return isAdmin(roleName) || hasRole(roleName, "Editor");
}

export type TicketStatus = "Open" | "In Progress" | "Done";

export type DatabaseSummary = {
  type: "sqlite";
  path: string;
  seeded: boolean;
  tenantCount: number;
  workspaceCount: number;
  documentCount: number;
  userCount: number;
  roleCount: number;
  addonCount: number;
  ticketCount: number;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type Workspace = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  rootPath: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentKind = "document" | "folder" | "kanban";

export type Document = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  kind: DocumentKind;
  sortOrder: number;
  filePath?: string;
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
  tenantId: string;
  name: string;
  username: string;
  email: string;
  roleId: string;
  avatarUrl: string | null;
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
  tenants: Tenant[];
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
  rootPath?: string | null;
};

export type WorkspacesResponse = ApiSuccessResponse<{
  workspaces: Workspace[];
}>;

export type WorkspaceResponse = ApiSuccessResponse<{
  workspace: Workspace;
}>;

export type UpdateWorkspaceRequest = {
  rootPath?: string | null;
};

export type DeleteWorkspaceResponse = ApiSuccessResponse<{
  deletedWorkspaceId: string;
}>;

export type ImportWorkspaceResponse = ApiSuccessResponse<{
  documents: Document[];
}>;

export type CreateDocumentRequest = {
  workspaceId: string;
  parentId?: string | null;
  kind?: DocumentKind;
  sortOrder?: number;
  title: string;
  slug: string;
  content: string;
};

export type UpdateDocumentRequest = {
  parentId?: string | null;
  sortOrder?: number;
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

export type SessionAuth = {
  authType: "session";
  tenant: Tenant;
  user: User;
  role: Role;
  session: {
    expiresAt: string;
  };
};

export type GuestAuth = {
  authType: "guest";
  tenant: null;
  user: null;
  role: null;
  session: null;
};

export type AuthState = SessionAuth | GuestAuth;
export type DemoUser = SessionAuth;
export type DemoAuth = AuthState;
export type AuthResponse = ApiSuccessResponse<AuthState>;

export type UsersResponse = ApiSuccessResponse<{
  users: User[];
}>;

export type CreateUserRequest = {
  name: string;
  username: string;
  email: string;
  roleId: string;
  password: string;
  avatarUrl?: string | null;
};

export type UpdateUserRequest = {
  name?: string;
  username?: string;
  email?: string;
  roleId?: string;
  password?: string;
  avatarUrl?: string | null;
};

export type UserResponse = ApiSuccessResponse<{
  user: User;
}>;

export type DeleteUserResponse = ApiSuccessResponse<{
  deletedUserId: string;
}>;

export type DemoUserResponse = ApiSuccessResponse<DemoAuth>;
export type DeliveryMethod = "manual_link";
export type PasswordResetRequestResponse = ApiSuccessResponse<{
  accepted: true;
  deliveryMethod: DeliveryMethod;
  resetUrl: string | null;
}>;

export type ResetPasswordResponse = ApiSuccessResponse<{
  passwordUpdated: true;
}>;

export type Invitation = {
  id: string;
  tenantId: string;
  name: string;
  username: string;
  email: string;
  roleId: string;
  roleName: RoleName;
  avatarUrl: string | null;
  invitedByUserId: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptUrl: string;
};

export type InvitationResponse = ApiSuccessResponse<{
  invitation: Invitation;
}>;

export type SignInRequest = {
  identifier: string;
  password: string;
};

export type PasswordResetRequest = {
  identifier: string;
};

export type ResetPasswordRequest = {
  token: string;
  password: string;
};

export type CreateInvitationRequest = {
  name: string;
  username: string;
  email: string;
  roleId: string;
  avatarUrl?: string | null;
};

export type AcceptInvitationRequest = {
  token: string;
  password: string;
};

export type BootstrapInstallationRequest = {
  tenantName: string;
  tenantSlug: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceRootPath?: string | null;
  adminName: string;
  adminUsername: string;
  adminEmail: string;
  password: string;
};

export type OnboardingState =
  | {
      state: "bootstrap_required";
      deliveryMethod: DeliveryMethod;
      tenant: null;
      canManageUsers: false;
      workspaceCount: 0;
      userCount: 0;
      pendingInvitationCount: 0;
      steps: Array<{
        id: "create_first_admin" | "create_first_workspace" | "invite_teammates";
        title: string;
        description: string;
        completed: boolean;
      }>;
    }
  | {
      state: "onboarding";
      deliveryMethod: DeliveryMethod;
      tenant: Tenant;
      canManageUsers: boolean;
      workspaceCount: number;
      userCount: number;
      pendingInvitationCount: number;
      steps: Array<{
        id: "create_first_admin" | "create_first_workspace" | "invite_teammates";
        title: string;
        description: string;
        completed: boolean;
      }>;
    }
  | {
      state: "ready";
      deliveryMethod: DeliveryMethod;
      tenant: Tenant;
      canManageUsers: boolean;
      workspaceCount: number;
      userCount: number;
      pendingInvitationCount: number;
      steps: Array<{
        id: "create_first_admin" | "create_first_workspace" | "invite_teammates";
        title: string;
        description: string;
        completed: boolean;
      }>;
    };

export type OnboardingResponse = ApiSuccessResponse<{
  onboarding: OnboardingState;
}>;

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

function hasRole(roleName: RoleName | null | undefined, expectedRole: RoleName) {
  return roleName === expectedRole;
}
