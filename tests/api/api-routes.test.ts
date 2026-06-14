import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  AuthState,
  Document,
  Invitation,
  Ticket,
  User,
  Workspace
} from "@plainbase/shared";
import { createPlainbaseApiApp } from "../../apps/api/src/app.ts";

type JsonResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

test("auth sign-in and sign-out lifecycle works with session cookies", async (t) => {
  const harness = await createApiHarness(t);
  const client = harness.createClient();

  const initialAuthResponse = await client.request<AuthState>("/auth/me");
  assert.equal(initialAuthResponse.status, 200);
  const initialAuthPayload = expectSuccess(initialAuthResponse.payload);
  assert.equal(initialAuthPayload.data.authType, "guest");

  const invalidSignInResponse = await client.request<AuthState>("/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({
      identifier: "editor",
      password: "wrong-password"
    })
  });
  assert.equal(invalidSignInResponse.status, 401);

  const signInResponse = await client.request<AuthState>("/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({
      identifier: "editor",
      password: "plainbase123"
    })
  });
  assert.equal(signInResponse.status, 200);
  const signInPayload = expectSuccess(signInResponse.payload);
  assert.equal(signInPayload.data.authType, "session");

  if (signInPayload.data.authType !== "session") {
    throw new Error("Expected authenticated session after sign-in.");
  }

  assert.equal(signInPayload.data.tenant.slug, "demo-company");
  assert.equal(signInPayload.data.user.tenantId, signInPayload.data.tenant.id);
  assert.equal(signInPayload.data.user.username, "editor");
  assert.equal(signInPayload.data.role.name, "Editor");

  const currentAuthResponse = await client.request<AuthState>("/auth/me");
  assert.equal(currentAuthResponse.status, 200);
  const currentAuthPayload = expectSuccess(currentAuthResponse.payload);
  assert.equal(currentAuthPayload.data.authType, "session");

  const signOutResponse = await client.request<AuthState>("/auth/sign-out", {
    method: "POST"
  });
  assert.equal(signOutResponse.status, 200);
  const signOutPayload = expectSuccess(signOutResponse.payload);
  assert.equal(signOutPayload.data.authType, "guest");

  const signedOutAuthResponse = await client.request<AuthState>("/auth/me");
  assert.equal(signedOutAuthResponse.status, 200);
  const signedOutAuthPayload = expectSuccess(signedOutAuthResponse.payload);
  assert.equal(signedOutAuthPayload.data.authType, "guest");
});

test("API enforces permissions and supports workspace, document and ticket flows", async (t) => {
  const { tempDir, createClient } = await createApiHarness(t);
  const guestClient = createClient();
  const adminClient = createClient();
  const editorClient = createClient();

  const guestWorkspaceAttempt = await guestClient.request<{ workspace: Workspace }>(
    "/workspaces",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Guest Workspace",
        slug: "guest-workspace",
        rootPath: join(tempDir, "guest-workspace")
      })
    }
  );
  assert.equal(guestWorkspaceAttempt.status, 403);

  await expectSuccessStatus(
    adminClient.request<AuthState>("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({
        identifier: "admin",
        password: "plainbase123"
      })
    }),
    200
  );

  const createdWorkspaceResponse = await adminClient.request<{ workspace: Workspace }>(
    "/workspaces",
    {
      method: "POST",
      body: JSON.stringify({
        name: "QA Workspace",
        slug: "qa-workspace",
        rootPath: join(tempDir, "qa-workspace")
      })
    }
  );
  assert.equal(createdWorkspaceResponse.status, 201);
  const createdWorkspacePayload = expectSuccess(createdWorkspaceResponse.payload);
  const workspaceId = createdWorkspacePayload.data.workspace.id;

  const secondWorkspaceResponse = await adminClient.request<{ workspace: Workspace }>(
    "/workspaces",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Release Workspace",
        slug: "release-workspace",
        rootPath: join(tempDir, "release-workspace")
      })
    }
  );
  assert.equal(secondWorkspaceResponse.status, 201);
  const secondWorkspacePayload = expectSuccess(secondWorkspaceResponse.payload);
  const secondWorkspaceId = secondWorkspacePayload.data.workspace.id;

  await expectSuccessStatus(
    editorClient.request<AuthState>("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({
        identifier: "editor",
        password: "plainbase123"
      })
    }),
    200
  );

  const createdKanbanResponse = await editorClient.request<{ document: Document }>(
    "/documents",
    {
      method: "POST",
      body: JSON.stringify({
        workspaceId,
        kind: "kanban",
        title: "QA Board",
        slug: "qa-board",
        content: "## Board-Notizen"
      })
    }
  );
  assert.equal(createdKanbanResponse.status, 201);
  const createdKanbanPayload = expectSuccess(createdKanbanResponse.payload);
  const kanbanDocument = createdKanbanPayload.data.document;

  const secondWorkspaceDocumentResponse = await editorClient.request<{
    document: Document;
  }>("/documents", {
    method: "POST",
    body: JSON.stringify({
      workspaceId: secondWorkspaceId,
      kind: "document",
      title: "Release Notes",
      slug: "release-notes",
      content: "# Release"
    })
  });
  assert.equal(secondWorkspaceDocumentResponse.status, 201);
  const secondWorkspaceDocumentPayload = expectSuccess(
    secondWorkspaceDocumentResponse.payload
  );
  const secondWorkspaceDocument = secondWorkspaceDocumentPayload.data.document;

  const duplicateSlugResponse = await editorClient.request<{ document: Document }>(
    "/documents",
    {
      method: "POST",
      body: JSON.stringify({
        workspaceId,
        title: "Duplicate QA Board",
        slug: "qa-board",
        content: "# Duplicate"
      })
    }
  );
  assert.equal(duplicateSlugResponse.status, 409);

  const documentsResponse = await guestClient.request<{ documents: Document[] }>(
    `/workspaces/${workspaceId}/documents`
  );
  assert.equal(documentsResponse.status, 401);

  const usersResponse = await adminClient.request<{ users: User[] }>("/users");
  assert.equal(usersResponse.status, 200);
  const usersPayload = expectSuccess(usersResponse.payload);
  const assignee = usersPayload.data.users.find((user) => user.username === "viewer");
  assert.ok(assignee, "Expected seeded viewer user to exist.");

  const createdTicketResponse = await editorClient.request<{ ticket: Ticket }>(
    "/tickets",
    {
      method: "POST",
      body: JSON.stringify({
        workspaceId,
        documentId: kanbanDocument.id,
        title: "Regression suite",
        description: "Add API and E2E checks for tickets.",
        status: "In Progress",
        assigneeId: assignee.id
      })
    }
  );
  assert.equal(createdTicketResponse.status, 201);
  const createdTicketPayload = expectSuccess(createdTicketResponse.payload);
  const ticketId = createdTicketPayload.data.ticket.id;
  assert.equal(createdTicketPayload.data.ticket.documentId, kanbanDocument.id);
  assert.equal(createdTicketPayload.data.ticket.assigneeId, assignee.id);

  const crossWorkspaceTicketResponse = await editorClient.request<{ ticket: Ticket }>(
    "/tickets",
    {
      method: "POST",
      body: JSON.stringify({
        workspaceId,
        documentId: secondWorkspaceDocument.id,
        title: "Invalid document link",
        description: "This should fail validation."
      })
    }
  );
  assert.equal(crossWorkspaceTicketResponse.status, 422);

  const updatedTicketResponse = await editorClient.request<{ ticket: Ticket }>(
    `/tickets/${ticketId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        status: "Done",
        assigneeId: null
      })
    }
  );
  assert.equal(updatedTicketResponse.status, 200);
  const updatedTicketPayload = expectSuccess(updatedTicketResponse.payload);
  assert.equal(updatedTicketPayload.data.ticket.status, "Done");
  assert.equal(updatedTicketPayload.data.ticket.assigneeId, null);

  const ticketsResponse = await guestClient.request<{ tickets: Ticket[] }>(
    `/workspaces/${workspaceId}/tickets`
  );
  assert.equal(ticketsResponse.status, 401);
});

test("invitation acceptance and password reset flow works end to end", async (t) => {
  const { createClient } = await createApiHarness(t);
  const adminClient = createClient();
  const inviteeClient = createClient();

  await expectSuccessStatus(
    adminClient.request<AuthState>("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({
        identifier: "admin",
        password: "plainbase123"
      })
    }),
    200
  );

  const rolesResponse = await adminClient.request<{ roles: { id: string; name: string }[] }>(
    "/roles"
  );
  const rolesPayload = expectSuccess(rolesResponse.payload);
  const viewerRole = rolesPayload.data.roles.find((role) => role.name === "Viewer");
  assert.ok(viewerRole, "Expected viewer role to exist.");

  const invitationResponse = await adminClient.request<{ invitation: Invitation }>(
    "/invitations",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Alicia Example",
        username: "alicia",
        email: "alicia@example.com",
        roleId: viewerRole.id
      })
    }
  );
  assert.equal(invitationResponse.status, 201);
  const invitationPayload = expectSuccess(invitationResponse.payload);
  const acceptToken = readTokenFromUrl(
    invitationPayload.data.invitation.acceptUrl,
    "invite"
  );

  const acceptedInvitationResponse = await inviteeClient.request<AuthState>(
    "/auth/accept-invite",
    {
      method: "POST",
      body: JSON.stringify({
        token: acceptToken,
        password: "newsecurepass"
      })
    }
  );
  assert.equal(acceptedInvitationResponse.status, 201);
  const acceptedInvitationPayload = expectSuccess(acceptedInvitationResponse.payload);
  assert.equal(acceptedInvitationPayload.data.authType, "session");

  const acceptedUserAuth = await inviteeClient.request<AuthState>("/auth/me");
  const acceptedUserPayload = expectSuccess(acceptedUserAuth.payload);
  assert.equal(acceptedUserPayload.data.authType, "session");

  if (acceptedUserPayload.data.authType !== "session") {
    throw new Error("Expected accepted invite to create an authenticated session.");
  }

  assert.equal(
    acceptedUserPayload.data.user.tenantId,
    acceptedUserPayload.data.tenant.id
  );
  assert.equal(acceptedUserPayload.data.user.email, "alicia@example.com");

  await expectSuccessStatus(
    inviteeClient.request<AuthState>("/auth/sign-out", {
      method: "POST"
    }),
    200
  );

  const passwordResetRequestResponse = await adminClient.request<{
    accepted: true;
    deliveryMethod: "manual_link";
    resetUrl: string | null;
  }>("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({
      identifier: "alicia@example.com"
    })
  });
  assert.equal(passwordResetRequestResponse.status, 200);
  const passwordResetRequestPayload = expectSuccess(
    passwordResetRequestResponse.payload
  );
  assert.ok(passwordResetRequestPayload.data.resetUrl);

  const resetToken = readTokenFromUrl(
    passwordResetRequestPayload.data.resetUrl!,
    "reset"
  );

  const passwordResetResponse = await inviteeClient.request<{
    passwordUpdated: true;
  }>("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({
      token: resetToken,
      password: "evenmoresecurepass"
    })
  });
  assert.equal(passwordResetResponse.status, 200);

  const oldPasswordResponse = await inviteeClient.request<AuthState>("/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({
      identifier: "alicia",
      password: "newsecurepass"
    })
  });
  assert.equal(oldPasswordResponse.status, 401);

  const newPasswordResponse = await inviteeClient.request<AuthState>("/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({
      identifier: "alicia",
      password: "evenmoresecurepass"
    })
  });
  assert.equal(newPasswordResponse.status, 200);
  const newPasswordPayload = expectSuccess(newPasswordResponse.payload);
  assert.equal(newPasswordPayload.data.authType, "session");
});

test("API isolates tenants across workspaces, users, documents and tickets", async (t) => {
  const { tempDir, createClient } = await createApiHarness(t);
  const demoAdminClient = createClient();
  const acmeAdminClient = createClient();

  await expectSuccessStatus(
    demoAdminClient.request<AuthState>("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({
        identifier: "admin",
        password: "plainbase123"
      })
    }),
    200
  );

  await expectSuccessStatus(
    acmeAdminClient.request<AuthState>("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({
        identifier: "acme-admin",
        password: "plainbase123"
      })
    }),
    200
  );

  const demoWorkspaceResponse = await demoAdminClient.request<{ workspace: Workspace }>(
    "/workspaces",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Demo Tenant Workspace",
        slug: "demo-tenant-workspace",
        rootPath: join(tempDir, "demo-tenant-workspace")
      })
    }
  );
  assert.equal(demoWorkspaceResponse.status, 201);
  const demoWorkspace = expectSuccess(demoWorkspaceResponse.payload).data.workspace;

  const demoDocumentResponse = await demoAdminClient.request<{ document: Document }>(
    "/documents",
    {
      method: "POST",
      body: JSON.stringify({
        workspaceId: demoWorkspace.id,
        title: "Tenant Secret",
        slug: "tenant-secret",
        content: "# Internal"
      })
    }
  );
  assert.equal(demoDocumentResponse.status, 201);
  const demoDocument = expectSuccess(demoDocumentResponse.payload).data.document;

  const demoUsersResponse = await demoAdminClient.request<{ users: User[] }>("/users");
  assert.equal(demoUsersResponse.status, 200);
  const demoUsers = expectSuccess(demoUsersResponse.payload).data.users;
  assert.ok(demoUsers.every((user) => user.tenantId === demoWorkspace.tenantId));
  const demoAssignee = demoUsers.find((user) => user.username === "viewer");
  assert.ok(demoAssignee);

  const demoTicketResponse = await demoAdminClient.request<{ ticket: Ticket }>(
    "/tickets",
    {
      method: "POST",
      body: JSON.stringify({
        workspaceId: demoWorkspace.id,
        documentId: demoDocument.id,
        title: "Tenant ticket",
        description: "Should stay isolated.",
        assigneeId: demoAssignee.id
      })
    }
  );
  assert.equal(demoTicketResponse.status, 201);
  const demoTicket = expectSuccess(demoTicketResponse.payload).data.ticket;

  const acmeWorkspacesResponse = await acmeAdminClient.request<{ workspaces: Workspace[] }>(
    "/workspaces"
  );
  assert.equal(acmeWorkspacesResponse.status, 200);
  const acmeWorkspaces = expectSuccess(acmeWorkspacesResponse.payload).data.workspaces;
  assert.ok(
    acmeWorkspaces.every((workspace) => workspace.tenantId !== demoWorkspace.tenantId)
  );
  assert.equal(
    acmeWorkspaces.some((workspace) => workspace.id === demoWorkspace.id),
    false
  );

  const acmeUsersResponse = await acmeAdminClient.request<{ users: User[] }>("/users");
  assert.equal(acmeUsersResponse.status, 200);
  const acmeUsers = expectSuccess(acmeUsersResponse.payload).data.users;
  assert.ok(acmeUsers.every((user) => user.tenantId !== demoWorkspace.tenantId));

  const acmeWorkspaceResponse = await acmeAdminClient.request<{ workspace: Workspace }>(
    "/workspaces",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Acme Workspace",
        slug: "acme-workspace",
        rootPath: join(tempDir, "acme-workspace")
      })
    }
  );
  assert.equal(acmeWorkspaceResponse.status, 201);
  const acmeWorkspace = expectSuccess(acmeWorkspaceResponse.payload).data.workspace;

  const forbiddenWorkspaceRead = await acmeAdminClient.request<{ documents: Document[] }>(
    `/workspaces/${demoWorkspace.id}/documents`
  );
  assert.equal(forbiddenWorkspaceRead.status, 404);

  const forbiddenDocumentRead = await acmeAdminClient.request<{ document: Document }>(
    `/documents/${demoDocument.id}`
  );
  assert.equal(forbiddenDocumentRead.status, 404);

  const forbiddenTicketRead = await acmeAdminClient.request<{ tickets: Ticket[] }>(
    `/workspaces/${demoWorkspace.id}/tickets`
  );
  assert.equal(forbiddenTicketRead.status, 404);

  const crossTenantTicketCreate = await acmeAdminClient.request<{ ticket: Ticket }>(
    "/tickets",
    {
      method: "POST",
      body: JSON.stringify({
        workspaceId: demoWorkspace.id,
        title: "Cross tenant attack",
        description: "Should not work."
      })
    }
  );
  assert.equal(crossTenantTicketCreate.status, 404);

  const crossTenantTicketUpdate = await acmeAdminClient.request<{ ticket: Ticket }>(
    `/tickets/${demoTicket.id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        status: "Done"
      })
    }
  );
  assert.equal(crossTenantTicketUpdate.status, 404);

  const crossTenantDocumentUpdate = await acmeAdminClient.request<{ document: Document }>(
    `/documents/${demoDocument.id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        title: "Compromised"
      })
    }
  );
  assert.equal(crossTenantDocumentUpdate.status, 404);

  const crossTenantUserDelete = await acmeAdminClient.request<{
    deletedUserId: string;
  }>(`/users/${demoAssignee.id}`, {
    method: "DELETE"
  });
  assert.equal(crossTenantUserDelete.status, 404);

  const crossTenantAssignment = await acmeAdminClient.request<{ ticket: Ticket }>(
    "/tickets",
    {
      method: "POST",
      body: JSON.stringify({
        workspaceId: acmeWorkspace.id,
        title: "Wrong assignee",
        description: "Should reject cross-tenant user ids.",
        assigneeId: demoAssignee.id
      })
    }
  );
  assert.equal(crossTenantAssignment.status, 404);
});

async function createApiHarness(t: TestContext) {
  const tempDir = mkdtempSync(join(tmpdir(), "plainbase-api-test-"));
  const databasePath = join(tempDir, "plainbase.sqlite");
  const contentRoot = join(tempDir, "content");
  const { app, database } = createPlainbaseApiApp({ databasePath, contentRoot });
  const server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    database.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  return {
    tempDir,
    createClient: () => createCookieClient(baseUrl)
  };
}

function createCookieClient(baseUrl: string) {
  let cookieHeader = "";

  return {
    async request<T>(
      path: string,
      init?: {
        method?: string;
        body?: string;
      }
    ) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: init?.method ?? "GET",
        headers: {
          "content-type": "application/json",
          ...(cookieHeader ? { cookie: cookieHeader } : {})
        },
        body: init?.body
      });

      updateCookieHeader(response.headers, (nextCookieHeader) => {
        cookieHeader = nextCookieHeader;
      });

      const payload = (await response.json()) as JsonResponse<T>;

      return {
        status: response.status,
        payload
      };
    }
  };
}

function updateCookieHeader(
  headers: IncomingHttpHeaders | Headers,
  setCookieHeader: (value: string) => void
) {
  const rawSetCookie =
    headers instanceof Headers
      ? headers.get("set-cookie")
      : headers["set-cookie"]?.[0] ?? null;

  if (!rawSetCookie) {
    return;
  }

  const nextCookie = rawSetCookie.split(";")[0] ?? "";
  const [, value = ""] = nextCookie.split("=");

  if (value === "") {
    setCookieHeader("");
    return;
  }

  setCookieHeader(nextCookie);
}

async function expectSuccessStatus<T>(
  responsePromise: Promise<{
    status: number;
    payload: JsonResponse<T>;
  }>,
  expectedStatus: number
) {
  const response = await responsePromise;
  assert.equal(response.status, expectedStatus);
  return expectSuccess(response.payload);
}

function expectSuccess<T>(payload: JsonResponse<T>) {
  assert.equal(payload.success, true);
  return payload as ApiSuccessResponse<T>;
}

function readTokenFromUrl(url: string, key: string) {
  const parsedUrl = new URL(url);
  const token = parsedUrl.searchParams.get(key);
  assert.ok(token, `Expected ${key} token in URL.`);
  return token;
}
