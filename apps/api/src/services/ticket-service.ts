import { randomUUID } from "node:crypto";
import type { Ticket } from "@plainbase/shared";
import type { AuthContext } from "../auth/auth-context.js";
import { requireAuthenticatedUser } from "../auth/auth-context.js";
import { DocumentRepository } from "../db/repositories/document-repository.js";
import { TicketRepository } from "../db/repositories/ticket-repository.js";
import { UserRepository } from "../db/repositories/user-repository.js";
import { WorkspaceRepository } from "../db/repositories/workspace-repository.js";
import { ApiError } from "../errors/api-error.js";
import {
  expectObject,
  readOptionalNullableString,
  readOptionalString,
  readOptionalText,
  readOptionalTicketStatus,
  readRequiredString,
  readRequiredText,
  readTicketStatus,
  requireAtLeastOneField
} from "./validation.js";

export class TicketService {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly userRepository: UserRepository
  ) {}

  listTicketsByWorkspace(workspaceId: string, actor: AuthContext) {
    this.requireWorkspace(workspaceId, actor);
    return this.ticketRepository.listByWorkspaceId(workspaceId);
  }

  createTicket(input: unknown, actor: AuthContext) {
    const authenticatedUser = requireAuthenticatedUser(actor);
    const body = expectObject(input);
    const workspaceId = readRequiredString(body, "workspaceId");
    const title = readRequiredString(body, "title");
    const description = readRequiredText(body, "description");
    const status = readTicketStatus(body, "status", "Open");
    const documentId = readOptionalNullableString(body, "documentId");
    const assigneeId = readOptionalNullableString(body, "assigneeId");

    const workspace = this.requireWorkspace(workspaceId, actor);
    this.ensureOptionalUserExists(assigneeId, workspace.tenantId, "assigneeId");
    this.ensureDocumentMatchesWorkspace(documentId, workspace.id, "documentId");

    const timestamp = new Date().toISOString();

    return this.ticketRepository.create({
      id: `ticket-${randomUUID()}`,
      workspaceId,
      documentId: documentId ?? null,
      title,
      description,
      status,
      creatorId: authenticatedUser.user.id,
      assigneeId: assigneeId ?? null,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  updateTicket(ticketId: string, input: unknown, actor: AuthContext) {
    const existingTicket = this.requireTicket(ticketId);
    const workspace = this.requireWorkspace(existingTicket.workspaceId, actor);
    const body = expectObject(input);

    requireAtLeastOneField(
      body,
      ["documentId", "title", "description", "status", "assigneeId"],
      "At least one ticket field must be provided."
    );

    const title = readOptionalString(body, "title") ?? existingTicket.title;
    const description =
      readOptionalText(body, "description") ?? existingTicket.description;
    const status =
      readOptionalTicketStatus(body, "status") ?? existingTicket.status;
    const documentIdInput = readOptionalNullableString(body, "documentId");
    const assigneeIdInput = readOptionalNullableString(body, "assigneeId");
    const documentId =
      documentIdInput === undefined ? existingTicket.documentId : documentIdInput;
    const assigneeId =
      assigneeIdInput === undefined ? existingTicket.assigneeId : assigneeIdInput;

    this.ensureOptionalUserExists(assigneeId, workspace.tenantId, "assigneeId");
    this.ensureDocumentMatchesWorkspace(
      documentId,
      existingTicket.workspaceId,
      "documentId"
    );

    const updatedTicket: Ticket = {
      ...existingTicket,
      documentId: documentId ?? null,
      title,
      description,
      status,
      assigneeId: assigneeId ?? null,
      updatedAt: new Date().toISOString()
    };

    return this.ticketRepository.update(updatedTicket);
  }

  listAllTickets() {
    return this.ticketRepository.listAll();
  }

  private requireTicket(ticketId: string) {
    const ticket = this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new ApiError(404, "NOT_FOUND", "Ticket not found.");
    }

    return ticket;
  }

  private requireWorkspace(workspaceId: string, actor: AuthContext) {
    const authenticatedUser = requireAuthenticatedUser(actor);
    const workspace = this.workspaceRepository.findById(workspaceId);

    if (!workspace || workspace.tenantId !== authenticatedUser.tenant.id) {
      throw new ApiError(404, "NOT_FOUND", "Workspace not found.");
    }

    return workspace;
  }

  private ensureUserExists(userId: string, tenantId: string, field: string) {
    const user = this.userRepository.findById(userId);

    if (!user || user.tenantId !== tenantId) {
      throw new ApiError(404, "NOT_FOUND", "User not found.", {
        [field]: `User ${userId} does not exist.`
      });
    }
  }

  private ensureOptionalUserExists(
    userId: string | null | undefined,
    tenantId: string,
    field: string
  ) {
    if (!userId) {
      return;
    }

    this.ensureUserExists(userId, tenantId, field);
  }

  private ensureDocumentMatchesWorkspace(
    documentId: string | null | undefined,
    workspaceId: string,
    field: string
  ) {
    if (!documentId) {
      return;
    }

    const document = this.documentRepository.findById(documentId);

    if (!document) {
      throw new ApiError(404, "NOT_FOUND", "Document not found.", {
        [field]: `Document ${documentId} does not exist.`
      });
    }

    if (document.workspaceId !== workspaceId) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
        [field]: "Document must belong to the same workspace as the ticket."
      });
    }
  }
}
