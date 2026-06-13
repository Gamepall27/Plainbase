import type {
  Addon,
  AddonResponse,
  AddonsResponse,
  ApiErrorResponse,
  CreateWorkspaceRequest,
  CreateUserRequest,
  CreateDocumentRequest,
  DeleteDocumentResponse,
  DeleteUserResponse,
  DemoUserResponse,
  DocumentResponse,
  DocumentsResponse,
  Role,
  RolesResponse,
  SignInRequest,
  SwitchDemoUserRoleRequest,
  UpdateUserRequest,
  User,
  UserResponse,
  UsersResponse,
  TicketsResponse,
  UpdateDocumentRequest,
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
  getDemoUser: () =>
    request<DemoUserResponse>("/api/demo-user").then((response) => response.data),
  signInDemoUser: (payload: SignInRequest) =>
    request<DemoUserResponse>("/api/demo-user/sign-in", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    }).then((response) => response.data),
  switchDemoRole: (roleName: Role["name"]) =>
    request<DemoUserResponse>("/api/demo-user/switch-role", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ roleName } satisfies SwitchDemoUserRoleRequest)
    }).then((response) => response.data),
  signOutDemoUser: () =>
    request<DemoUserResponse>("/api/demo-user/sign-out", {
      method: "POST"
    }).then((response) => response.data),
  getRoles: () =>
    request<RolesResponse>("/api/roles").then((response) => response.data.roles),
  getUsers: () =>
    request<UsersResponse>("/api/users").then((response) => response.data.users),
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
  const response = await fetch(input, init);

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
