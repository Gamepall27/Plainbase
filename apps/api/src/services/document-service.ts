import { randomUUID } from "node:crypto";
import type { Document } from "@plainbase/shared";
import { DocumentRepository } from "../db/repositories/document-repository.js";
import { UserRepository } from "../db/repositories/user-repository.js";
import { WorkspaceRepository } from "../db/repositories/workspace-repository.js";
import { ApiError } from "../errors/api-error.js";
import {
  expectObject,
  readOptionalNullableString,
  readOptionalString,
  readOptionalText,
  readRequiredString,
  readRequiredText,
  requireAtLeastOneField,
  validateSlug
} from "./validation.js";

export class DocumentService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly userRepository: UserRepository
  ) {}

  listDocumentsByWorkspace(workspaceId: string) {
    this.ensureWorkspaceExists(workspaceId);
    return this.documentRepository.listByWorkspaceId(workspaceId);
  }

  getDocument(documentId: string) {
    return this.requireDocument(documentId);
  }

  createDocument(input: unknown) {
    const body = expectObject(input);
    const workspaceId = readRequiredString(body, "workspaceId");
    const title = readRequiredString(body, "title");
    const slug = readRequiredString(body, "slug");
    const content = readRequiredText(body, "content");
    const createdByUserId = readRequiredString(body, "createdByUserId");
    const updatedByUserId =
      readOptionalString(body, "updatedByUserId") ?? createdByUserId;
    const parentId = readOptionalNullableString(body, "parentId");

    validateSlug(slug);

    this.ensureWorkspaceExists(workspaceId);
    this.ensureUserExists(createdByUserId, "createdByUserId");
    this.ensureUserExists(updatedByUserId, "updatedByUserId");
    this.ensureUniqueSlug(workspaceId, slug);

    if (parentId) {
      this.ensureParentDocument(parentId, workspaceId);
    }

    const timestamp = new Date().toISOString();

    return this.documentRepository.create({
      id: `document-${randomUUID()}`,
      workspaceId,
      parentId: parentId ?? null,
      title,
      slug,
      content,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdByUserId,
      updatedByUserId
    });
  }

  updateDocument(documentId: string, input: unknown) {
    const document = this.requireDocument(documentId);
    const body = expectObject(input);

    requireAtLeastOneField(
      body,
      ["parentId", "title", "slug", "content", "updatedByUserId"],
      "At least one document field must be provided."
    );

    const updatedByUserId = readRequiredString(body, "updatedByUserId");
    const title = readOptionalString(body, "title") ?? document.title;
    const slug = readOptionalString(body, "slug") ?? document.slug;
    const content = readOptionalText(body, "content") ?? document.content;
    const parentIdInput = readOptionalNullableString(body, "parentId");

    validateSlug(slug);
    this.ensureUserExists(updatedByUserId, "updatedByUserId");

    if (slug !== document.slug) {
      this.ensureUniqueSlug(document.workspaceId, slug, document.id);
    }

    const parentId =
      parentIdInput === undefined ? document.parentId : parentIdInput;

    if (parentId) {
      if (parentId === document.id) {
        throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
          parentId: "A document cannot be its own parent."
        });
      }

      this.ensureParentDocument(parentId, document.workspaceId);
    }

    const updatedDocument: Document = {
      ...document,
      parentId: parentId ?? null,
      title,
      slug,
      content,
      updatedAt: new Date().toISOString(),
      updatedByUserId
    };

    return this.documentRepository.update(updatedDocument);
  }

  deleteDocument(documentId: string) {
    const document = this.requireDocument(documentId);
    this.documentRepository.delete(document.id);
    return document.id;
  }

  listAllDocuments() {
    return this.documentRepository.listAll();
  }

  private requireDocument(documentId: string) {
    const document = this.documentRepository.findById(documentId);

    if (!document) {
      throw new ApiError(404, "NOT_FOUND", "Document not found.");
    }

    return document;
  }

  private ensureWorkspaceExists(workspaceId: string) {
    if (!this.workspaceRepository.findById(workspaceId)) {
      throw new ApiError(404, "NOT_FOUND", "Workspace not found.");
    }
  }

  private ensureUserExists(userId: string, field: string) {
    if (!this.userRepository.findById(userId)) {
      throw new ApiError(404, "NOT_FOUND", "User not found.", {
        [field]: `User ${userId} does not exist.`
      });
    }
  }

  private ensureUniqueSlug(
    workspaceId: string,
    slug: string,
    currentDocumentId?: string
  ) {
    const existingDocument = this.documentRepository.findBySlugInWorkspace(
      workspaceId,
      slug
    );

    if (existingDocument && existingDocument.id !== currentDocumentId) {
      throw new ApiError(409, "CONFLICT", "Document slug already exists.", {
        slug: "Choose a different document slug for this workspace."
      });
    }
  }

  private ensureParentDocument(parentId: string, workspaceId: string) {
    const parentDocument = this.documentRepository.findById(parentId);

    if (!parentDocument) {
      throw new ApiError(404, "NOT_FOUND", "Parent document not found.", {
        parentId: `Document ${parentId} does not exist.`
      });
    }

    if (parentDocument.workspaceId !== workspaceId) {
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        "Validation failed.",
        {
          parentId: "Parent document must belong to the same workspace."
        }
      );
    }
  }
}
