import type {
  Addon,
  AddonResponse,
  AddonsResponse,
  AcceptInvitationRequest,
  AuthResponse,
  ApiErrorResponse,
  BootstrapInstallationRequest,
  CreateInvitationRequest,
  CreateWorkspaceRequest,
  CreateUserRequest,
  CreateDocumentRequest,
  DeleteDocumentResponse,
  DeleteWorkspaceResponse,
  DeleteUserResponse,
  DocumentResponse,
  DocumentsResponse,
  InvitationResponse,
  OnboardingResponse,
  PasswordResetRequest,
  PasswordResetRequestResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RolesResponse,
  SignInRequest,
  UpdateUserRequest,
  UserResponse,
  UsersResponse,
  TicketsResponse,
  UpdateDocumentRequest,
  UpdateWorkspaceRequest,
  WorkspaceResponse,
  WorkspacesResponse
} from "@plainbase/shared";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Record<string, string>;

  constructor(
    status: number,
    message: string,
    options?: {
      code?: string;
      details?: Record<string, string>;
    }
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

const jsonHeaders = {
  "content-type": "application/json"
};

export const apiClient = {
  getWorkspaces: () =>
    request<WorkspacesResponse>("/api/workspaces").then(
      (response) => response.data.workspaces
    ),
  createWorkspace: (payload: CreateWorkspaceRequest) =>
    request<WorkspaceResponse>("/api/workspaces", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }).then((response) => response.data.workspace),
  updateWorkspace: (workspaceId: string, payload: UpdateWorkspaceRequest) =>
    request<WorkspaceResponse>(`/api/workspaces/${workspaceId}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }).then((response) => response.data.workspace),
  deleteWorkspace: (workspaceId: string) =>
    request<DeleteWorkspaceResponse>(`/api/workspaces/${workspaceId}`, {
      method: "DELETE"
    }).then((response) => response.data.deletedWorkspaceId),
  getDocuments: (workspaceId: string) =>
    request<DocumentsResponse>(`/api/workspaces/${workspaceId}/documents`).then(
      (response) => response.data.documents
    ),
  getDocument: (documentId: string) =>
    request<DocumentResponse>(`/api/documents/${documentId}`).then(
      (response) => response.data.document
    ),
  createDocument: (payload: CreateDocumentRequest) =>
    request<DocumentResponse>("/api/documents", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }).then((response) => response.data.document),
  updateDocument: (documentId: string, payload: UpdateDocumentRequest) =>
    request<DocumentResponse>(`/api/documents/${documentId}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }).then((response) => response.data.document),
  deleteDocument: (documentId: string) =>
    request<DeleteDocumentResponse>(`/api/documents/${documentId}`, {
      method: "DELETE"
    }).then((response) => response.data.deletedDocumentId),
  getAddons: () =>
    request<AddonsResponse>("/api/addons").then((response) => response.data.addons),
  toggleAddon: (addonId: string) =>
    request<AddonResponse>(`/api/addons/${addonId}/toggle`, {
      method: "PUT"
    }).then((response) => response.data.addon),
  getAuthState: () =>
    request<AuthResponse>("/api/auth/me").then((response) => response.data),
  getOnboardingState: () =>
    request<OnboardingResponse>("/api/auth/onboarding").then(
      (response) => response.data.onboarding
    ),
  bootstrapInstallation: (payload: BootstrapInstallationRequest) =>
    request<AuthResponse>("/api/auth/bootstrap", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }).then((response) => response.data),
  signIn: (payload: SignInRequest) =>
    request<AuthResponse>("/api/auth/sign-in", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }).then((response) => response.data),
  signOut: () =>
    request<AuthResponse>("/api/auth/sign-out", {
      method: "POST"
    }).then((response) => response.data),
  requestPasswordReset: (payload: PasswordResetRequest) =>
    request<PasswordResetRequestResponse>("/api/auth/password-reset/request", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }).then((response) => response.data),
  resetPassword: (payload: ResetPasswordRequest) =>
    request<ResetPasswordResponse>("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }).then((response) => response.data),
  acceptInvitation: (payload: AcceptInvitationRequest) =>
    request<AuthResponse>("/api/auth/accept-invite", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }).then((response) => response.data),
  getRoles: () =>
    request<RolesResponse>("/api/roles").then((response) => response.data.roles),
  getUsers: () =>
    request<UsersResponse>("/api/users").then((response) => response.data.users),
  createInvitation: (payload: CreateInvitationRequest) =>
    request<InvitationResponse>("/api/invitations", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }).then((response) => response.data.invitation),
  createUser: (payload: CreateUserRequest) =>
    request<UserResponse>("/api/users", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }).then((response) => response.data.user),
  updateUser: (userId: string, payload: UpdateUserRequest) =>
    request<UserResponse>(`/api/users/${userId}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }).then((response) => response.data.user),
  deleteUser: (userId: string) =>
    request<DeleteUserResponse>(`/api/users/${userId}`, {
      method: "DELETE"
    }).then((response) => response.data.deletedUserId),
  getTickets: (workspaceId: string) =>
    request<TicketsResponse>(`/api/workspaces/${workspaceId}/tickets`).then(
      (response) => response.data.tickets
    )
};

async function request<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, {
    credentials: "same-origin",
    ...init
  });

  const payload = (await response.json()) as T | ApiErrorResponse;

  if (!response.ok) {
    throw createApiError(response.status, payload);
  }

  return payload as T;
}

function createApiError(status: number, payload: unknown) {
  if (isApiErrorResponse(payload)) {
    return new ApiClientError(status, payload.error.message, {
      code: payload.error.code,
      details: payload.error.details
    });
  }

  return new ApiClientError(status, `Request failed with status ${status}.`);
}

function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    payload.success === false
  );
}
