import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  DemoAuth,
  Document,
  Ticket,
  User,
  Workspace
} from "@plainbase/shared";
import { createPlainbaseApiApp } from "../../apps/api/src/app.ts";

type JsonResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

test("demo auth sign-in and sign-out lifecycle works", async (t) => {
  const { baseUrl } = await createApiHarness(t);

  const initialDemoUserResponse = await request<DemoAuth>(`${baseUrl}/demo-user`);
  assert.equal(initialDemoUserResponse.status, 200);
  const initialDemoUserPayload = expectSuccess(initialDemoUserResponse.payload);
  assert.equal(initialDemoUserPayload.data.authType, "guest");

  const invalidSignInResponse = await request<DemoAuth>(`${baseUrl}/demo-user/sign-in`, {
    method: "POST",
    body: JSON.stringify({
      identifier: "editor",
      password: "wrong-password"
    })
  });
  assert.equal(invalidSignInResponse.status, 401);

  const signInResponse = await request<DemoAuth>(`${baseUrl}/demo-user/sign-in`, {
    method: "POST",
    body: JSON.stringify({
      identifier: "editor",
      password: "123"
    })
  });
  assert.equal(signInResponse.status, 200);
  const signInPayload = expectSuccess(signInResponse.payload);
  assert.equal(signInPayload.data.authType, "demo");

  if (signInPayload.data.authType !== "demo") {
    throw new Error("Expected demo auth after sign-in.");
  }

  assert.equal(signInPayload.data.user.username, "editor");
  assert.equal(signInPayload.data.role.name, "Editor");

  const signOutResponse = await request<DemoAuth>(`${baseUrl}/demo-user/sign-out`, {
    method: "POST"
  });
  assert.equal(signOutResponse.status, 200);
  const signOutPayload = expectSuccess(signOutResponse.payload);
  assert.equal(signOutPayload.data.authType, "guest");
});

test("API enforces permissions and supports workspace, document and ticket flows", async (t) => {
  const { baseUrl, tempDir } = await createApiHarness(t);

  const viewerWorkspaceAttempt = await request<{ workspace: Workspace }>(
    `${baseUrl}/workspaces`,
    {
      method: "POST",
      body: JSON.stringify({
        name: "Viewer Workspace",
        slug: "viewer-workspace",
        rootPath: join(tempDir, "viewer-workspace")
      })
    }
  );
  assert.equal(viewerWorkspaceAttempt.status, 403);

  await expectSuccessStatus(
    request<DemoAuth>(`${baseUrl}/demo-user/switch-role`, {
      method: "POST",
      body: JSON.stringify({ roleName: "Admin" })
    }),
    200
  );

  const createdWorkspaceResponse = await request<{ workspace: Workspace }>(
    `${baseUrl}/workspaces`,
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

  const secondWorkspaceResponse = await request<{ workspace: Workspace }>(
    `${baseUrl}/workspaces`,
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

  const workspacesResponse = await request<{ workspaces: Workspace[] }>(
    `${baseUrl}/workspaces`
  );
  assert.equal(workspacesResponse.status, 200);
  const workspacesPayload = expectSuccess(workspacesResponse.payload);
  assert.ok(
    workspacesPayload.data.workspaces.some((workspace) => workspace.id === workspaceId)
  );
  assert.ok(
    workspacesPayload.data.workspaces.some(
      (workspace) => workspace.id === secondWorkspaceId
    )
  );

  await expectSuccessStatus(
    request<DemoAuth>(`${baseUrl}/demo-user/switch-role`, {
      method: "POST",
      body: JSON.stringify({ roleName: "Viewer" })
    }),
    200
  );

  const viewerDocumentAttempt = await request<{ document: Document }>(
    `${baseUrl}/documents`,
    {
      method: "POST",
      body: JSON.stringify({
        workspaceId,
        title: "Forbidden Doc",
        slug: "forbidden-doc",
        content: "# Forbidden"
      })
    }
  );
  assert.equal(viewerDocumentAttempt.status, 403);

  const viewerTicketAttempt = await request<{ ticket: Ticket }>(`${baseUrl}/tickets`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      title: "Blocked ticket",
      description: "Viewer cannot create tickets."
    })
  });
  assert.equal(viewerTicketAttempt.status, 403);

  await expectSuccessStatus(
    request<DemoAuth>(`${baseUrl}/demo-user/switch-role`, {
      method: "POST",
      body: JSON.stringify({ roleName: "Editor" })
    }),
    200
  );

  const createdKanbanResponse = await request<{ document: Document }>(
    `${baseUrl}/documents`,
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
  assert.equal(kanbanDocument.kind, "kanban");

  const secondWorkspaceDocumentResponse = await request<{ document: Document }>(
    `${baseUrl}/documents`,
    {
      method: "POST",
      body: JSON.stringify({
        workspaceId: secondWorkspaceId,
        kind: "document",
        title: "Release Notes",
        slug: "release-notes",
        content: "# Release"
      })
    }
  );
  assert.equal(secondWorkspaceDocumentResponse.status, 201);
  const secondWorkspaceDocumentPayload = expectSuccess(
    secondWorkspaceDocumentResponse.payload
  );
  const secondWorkspaceDocument = secondWorkspaceDocumentPayload.data.document;

  const duplicateSlugResponse = await request<{ document: Document }>(
    `${baseUrl}/documents`,
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

  const documentsResponse = await request<{ documents: Document[] }>(
    `${baseUrl}/workspaces/${workspaceId}/documents`
  );
  assert.equal(documentsResponse.status, 200);
  const documentsPayload = expectSuccess(documentsResponse.payload);
  assert.ok(
    documentsPayload.data.documents.some((document) => document.slug === "qa-board")
  );

  const usersResponse = await request<{ users: User[] }>(`${baseUrl}/users`);
  assert.equal(usersResponse.status, 200);
  const usersPayload = expectSuccess(usersResponse.payload);
  const assignee = usersPayload.data.users.find((user) => user.username === "viewer");
  assert.ok(assignee, "Expected seeded viewer user to exist.");

  const createdTicketResponse = await request<{ ticket: Ticket }>(`${baseUrl}/tickets`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      documentId: kanbanDocument.id,
      title: "Regression suite",
      description: "Add API and E2E checks for tickets.",
      status: "In Progress",
      assigneeId: assignee.id
    })
  });
  assert.equal(createdTicketResponse.status, 201);
  const createdTicketPayload = expectSuccess(createdTicketResponse.payload);
  const ticketId = createdTicketPayload.data.ticket.id;
  assert.equal(createdTicketPayload.data.ticket.documentId, kanbanDocument.id);
  assert.equal(createdTicketPayload.data.ticket.assigneeId, assignee.id);

  const crossWorkspaceTicketResponse = await request<{ ticket: Ticket }>(
    `${baseUrl}/tickets`,
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

  const updatedTicketResponse = await request<{ ticket: Ticket }>(
    `${baseUrl}/tickets/${ticketId}`,
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

  const ticketsResponse = await request<{ tickets: Ticket[] }>(
    `${baseUrl}/workspaces/${workspaceId}/tickets`
  );
  assert.equal(ticketsResponse.status, 200);
  const ticketsPayload = expectSuccess(ticketsResponse.payload);
  assert.equal(ticketsPayload.data.tickets.length, 1);
  assert.equal(ticketsPayload.data.tickets[0]?.status, "Done");
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

  return {
    tempDir,
    baseUrl: `http://127.0.0.1:${address.port}/api`
  };
}

async function request<T>(
  url: string,
  init?: {
    method?: string;
    body?: string;
  }
) {
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      "content-type": "application/json"
    },
    body: init?.body
  });

  const payload = (await response.json()) as JsonResponse<T>;

  return {
    status: response.status,
    payload
  };
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
