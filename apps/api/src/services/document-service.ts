import { randomUUID } from "node:crypto";
import type { Document, DocumentKind, Workspace } from "@plainbase/shared";
import type { AuthContext } from "../auth/auth-context.js";
import {
  DocumentFilesystemStore,
  type FilesystemDocumentEntry
} from "../content/document-filesystem-store.js";
import { requireAuthenticatedUser } from "../auth/auth-context.js";
import { DocumentRepository } from "../db/repositories/document-repository.js";
import { WorkspaceRepository } from "../db/repositories/workspace-repository.js";
import { ApiError } from "../errors/api-error.js";
import {
  expectObject,
  readOptionalInteger,
  readOptionalNullableString,
  readOptionalString,
  readOptionalText,
  readRequiredString,
  requireAtLeastOneField,
  validateSlug
} from "./validation.js";

const documentKinds = ["document", "folder", "kanban"] satisfies DocumentKind[];
const syncUserId = "user-admin";

export class DocumentService {
  private readonly documentFilesystemStore: DocumentFilesystemStore;

  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly workspaceRepository: WorkspaceRepository,
    contentRoot: string
  ) {
    this.documentFilesystemStore = new DocumentFilesystemStore(contentRoot);
  }

  listDocumentsByWorkspace(workspaceId: string, actor: AuthContext) {
    const workspace = this.requireWorkspace(workspaceId, actor);
    this.syncWorkspace(workspace);
    return this.documentRepository.listByWorkspaceId(workspaceId);
  }

  importWorkspace(workspaceId: string, actor: AuthContext) {
    return this.listDocumentsByWorkspace(workspaceId, actor);
  }

  getDocument(documentId: string, actor: AuthContext) {
    const document = this.requireDocument(documentId);
    const workspace = this.requireWorkspace(document.workspaceId, actor);
    this.syncWorkspace(workspace);
    return this.requireDocument(documentId);
  }

  createDocument(input: unknown, actor: AuthContext) {
    const authenticatedUser = requireAuthenticatedUser(actor);
    const body = expectObject(input);
    const workspace = this.requireWorkspace(
      readRequiredString(body, "workspaceId"),
      actor
    );
    this.syncWorkspace(workspace);

    const kind = this.readDocumentKind(body, "kind") ?? "document";
    const title = readRequiredString(body, "title");
    const slug = readRequiredString(body, "slug");
    const content = this.readDocumentContent(body, kind);
    const parentId = readOptionalNullableString(body, "parentId");
    const requestedSortOrder = readOptionalInteger(body, "sortOrder");

    validateSlug(slug);
    this.ensureUniqueSlug(workspace.id, slug);

    const parentDocument = parentId
      ? this.ensureParentDocument(parentId, workspace.id)
      : null;
    const filePath = this.documentFilesystemStore.buildFilePath(
      parentDocument?.filePath ?? null,
      slug,
      kind
    );

    this.ensureFilePathAvailable(workspace, filePath);

    const document: Document = {
      id: `document-${randomUUID()}`,
      workspaceId: workspace.id,
      parentId: parentDocument?.id ?? null,
      kind,
      sortOrder:
        requestedSortOrder ??
        this.documentRepository.getNextSortOrder(
          workspace.id,
          parentDocument?.id ?? null
        ),
      filePath,
      title,
      slug,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: authenticatedUser.user.id,
      updatedByUserId: authenticatedUser.user.id
    };

    this.documentFilesystemStore.createEntry(workspace, filePath, kind, content);
    return this.documentRepository.create(document);
  }

  updateDocument(documentId: string, input: unknown, actor: AuthContext) {
    const authenticatedUser = requireAuthenticatedUser(actor);
    const document = this.requireDocument(documentId);
    const workspace = this.requireWorkspace(document.workspaceId, actor);
    this.syncWorkspace(workspace);

    const currentDocument = this.requireDocument(documentId);
    const body = expectObject(input);

    requireAtLeastOneField(
      body,
      ["parentId", "sortOrder", "title", "slug", "content"],
      "At least one document field must be provided."
    );

    const title = readOptionalString(body, "title") ?? currentDocument.title;
    const slug = readOptionalString(body, "slug") ?? currentDocument.slug;
    const parentIdInput = readOptionalNullableString(body, "parentId");
    const sortOrder =
      readOptionalInteger(body, "sortOrder") ?? currentDocument.sortOrder;
    const content =
      currentDocument.kind === "folder"
        ? ""
        : readOptionalText(body, "content") ?? currentDocument.content;

    validateSlug(slug);

    if (slug !== currentDocument.slug) {
      this.ensureUniqueSlug(workspace.id, slug, currentDocument.id);
    }

    const parentId =
      parentIdInput === undefined ? currentDocument.parentId : parentIdInput;
    const parentDocument = parentId
      ? this.ensureParentDocument(parentId, workspace.id)
      : null;

    if (parentDocument?.id === currentDocument.id) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
        parentId: "A document cannot be its own parent."
      });
    }

    const nextFilePath = this.documentFilesystemStore.buildFilePath(
      parentDocument?.filePath ?? null,
      slug,
      currentDocument.kind
    );
    const currentFilePath = currentDocument.filePath ?? nextFilePath;

    if (nextFilePath !== currentFilePath) {
      this.ensureFilePathAvailable(workspace, nextFilePath, currentDocument.id);
      this.documentFilesystemStore.moveEntry(workspace, currentFilePath, nextFilePath);
    }

    if (currentDocument.kind !== "folder" && content !== currentDocument.content) {
      this.documentFilesystemStore.updateDocumentContent(
        workspace,
        nextFilePath,
        content
      );
    }

    const updatedDocument: Document = {
      ...currentDocument,
      parentId: parentDocument?.id ?? null,
      sortOrder,
      filePath: nextFilePath,
      title,
      slug,
      content,
      updatedAt: new Date().toISOString(),
      updatedByUserId: authenticatedUser.user.id
    };

    this.documentRepository.update(updatedDocument);

    if (currentDocument.kind === "folder" && currentFilePath !== nextFilePath) {
      this.updateDescendantPaths(
        workspace.id,
        currentFilePath,
        nextFilePath,
        authenticatedUser.user.id
      );
    }

    return updatedDocument;
  }

  deleteDocument(documentId: string, actor: AuthContext) {
    requireAuthenticatedUser(actor);
    const document = this.requireDocument(documentId);
    const workspace = this.requireWorkspace(document.workspaceId, actor);
    this.syncWorkspace(workspace);

    const currentDocument = this.requireDocument(documentId);
    const workspaceDocuments = this.documentRepository.listByWorkspaceId(workspace.id);
    const descendants = this.getDescendants(workspaceDocuments, currentDocument);

    this.documentFilesystemStore.deleteEntry(
      workspace,
      currentDocument.filePath ?? "",
      currentDocument.kind
    );

    descendants
      .sort(compareByPathDepthDesc)
      .forEach((entry) => this.documentRepository.delete(entry.id));
    this.documentRepository.delete(currentDocument.id);

    return currentDocument.id;
  }

  listAllDocuments() {
    return this.documentRepository.listAll();
  }

  private syncWorkspace(workspace: Workspace) {
    this.documentFilesystemStore.ensureRoot();
    this.documentFilesystemStore.ensureWorkspaceRoot(workspace);

    const existingDocuments = this.documentRepository.listByWorkspaceId(workspace.id);
    this.materializeDatabaseDocuments(workspace, existingDocuments);

    const refreshedDocuments = this.documentRepository.listByWorkspaceId(workspace.id);
    const scannedEntries = this.documentFilesystemStore.scanWorkspace(workspace);

    this.upsertFilesystemEntries(workspace, refreshedDocuments, scannedEntries);
    this.removeMissingDatabaseEntries(workspace.id, scannedEntries);
  }

  private materializeDatabaseDocuments(workspace: Workspace, documents: Document[]) {
    const byId = new Map(documents.map((document) => [document.id, document]));

    [...documents]
      .sort((left, right) => getDepth(left, byId) - getDepth(right, byId))
      .forEach((document) => {
        const parentDocument = document.parentId ? byId.get(document.parentId) ?? null : null;
        const existingFilePath =
          typeof document.filePath === "string" && document.filePath.trim() !== ""
            ? document.filePath
            : null;
        const nextFilePath =
          existingFilePath ??
          this.documentFilesystemStore.buildFilePath(
            parentDocument?.filePath ?? null,
            document.slug,
            document.kind
          );

        if (!document.filePath || document.filePath !== nextFilePath) {
          const updatedDocument = {
            ...document,
            filePath: nextFilePath
          };
          this.documentRepository.update(updatedDocument);
          byId.set(document.id, updatedDocument);
          document = updatedDocument;
        }

        if (!existingFilePath && !this.documentFilesystemStore.exists(workspace, nextFilePath)) {
          this.documentFilesystemStore.createEntry(
            workspace,
            nextFilePath,
            document.kind,
            document.content
          );
        }
      });
  }

  private upsertFilesystemEntries(
    workspace: Workspace,
    currentDocuments: Document[],
    scannedEntries: FilesystemDocumentEntry[]
  ) {
    const byPath = new Map(
      currentDocuments
        .filter((document) => document.filePath && document.filePath.trim() !== "")
        .map((document) => [document.filePath!, document])
    );
    const syncedByPath = new Map<string, Document>();
    const claimedSlugs = new Set(
      currentDocuments.map((document) => document.slug)
    );

    scannedEntries.forEach((entry) => {
      const existingDocument = byPath.get(entry.filePath) ?? null;
      const parentDocument = entry.parentFilePath
        ? syncedByPath.get(entry.parentFilePath) ?? byPath.get(entry.parentFilePath) ?? null
        : null;

      if (existingDocument) {
        const updatedDocument: Document = {
          ...existingDocument,
          parentId: parentDocument?.id ?? null,
          kind: entry.kind,
          sortOrder: existingDocument.sortOrder,
          filePath: entry.filePath,
          title: entry.title,
          slug: existingDocument.slug,
          content: entry.kind === "folder" ? "" : entry.content,
          updatedAt:
            entry.kind !== "folder" && entry.content !== existingDocument.content
              ? new Date().toISOString()
              : existingDocument.updatedAt
        };

        if (this.hasFilesystemRelevantChanges(existingDocument, updatedDocument)) {
          this.documentRepository.update(updatedDocument);
        }

        syncedByPath.set(entry.filePath, updatedDocument);
        return;
      }

      const slug = createUniqueImportedSlug(claimedSlugs, entry.slug);
      claimedSlugs.add(slug);

      const createdDocument: Document = {
        id: `document-${randomUUID()}`,
        workspaceId: workspace.id,
        parentId: parentDocument?.id ?? null,
        kind: entry.kind,
        sortOrder: entry.sortOrder,
        filePath: entry.filePath,
        title: entry.title,
        slug,
        content: entry.kind === "folder" ? "" : entry.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdByUserId: syncUserId,
        updatedByUserId: syncUserId
      };

      this.documentRepository.create(createdDocument);
      syncedByPath.set(entry.filePath, createdDocument);
    });
  }

  private removeMissingDatabaseEntries(
    workspaceId: string,
    scannedEntries: FilesystemDocumentEntry[]
  ) {
    const scannedPaths = new Set(scannedEntries.map((entry) => entry.filePath));
    const staleDocuments = this.documentRepository
      .listByWorkspaceId(workspaceId)
      .filter(
        (document) =>
          document.filePath &&
          document.filePath.trim() !== "" &&
          !scannedPaths.has(document.filePath)
      )
      .sort(compareByPathDepthDesc);

    staleDocuments.forEach((document) => this.documentRepository.delete(document.id));
  }

  private updateDescendantPaths(
    workspaceId: string,
    currentFilePath: string,
    nextFilePath: string,
    updatedByUserId: string
  ) {
    const workspaceDocuments = this.documentRepository.listByWorkspaceId(workspaceId);
    const descendants = workspaceDocuments.filter(
      (document) =>
        document.filePath &&
        document.filePath.startsWith(`${currentFilePath}/`)
    );

    descendants.forEach((document) => {
      const suffix = document.filePath!.slice(currentFilePath.length);
      this.documentRepository.update({
        ...document,
        filePath: `${nextFilePath}${suffix}`,
        updatedAt: new Date().toISOString(),
        updatedByUserId
      });
    });
  }

  private requireDocument(documentId: string) {
    const document = this.documentRepository.findById(documentId);

    if (!document) {
      throw new ApiError(404, "NOT_FOUND", "Document not found.");
    }

    return document;
  }

  private requireWorkspace(workspaceId: string, actor: AuthContext) {
    const authenticatedUser = requireAuthenticatedUser(actor);
    const workspace = this.workspaceRepository.findById(workspaceId);

    if (!workspace || workspace.tenantId !== authenticatedUser.tenant.id) {
      throw new ApiError(404, "NOT_FOUND", "Workspace not found.");
    }

    return workspace;
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

    if (parentDocument.kind !== "folder") {
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        "Validation failed.",
        {
          parentId: "Parent item must be a folder."
        }
      );
    }

    return parentDocument;
  }

  private ensureFilePathAvailable(
    workspace: Workspace,
    filePath: string,
    currentDocumentId?: string
  ) {
    const existingDocument = this.documentRepository.findByFilePathInWorkspace(
      workspace.id,
      filePath
    );

    if (existingDocument && existingDocument.id !== currentDocumentId) {
      throw new ApiError(409, "CONFLICT", "Document path already exists.", {
        title: "Choose a different name in this folder."
      });
    }

    if (
      this.documentFilesystemStore.exists(workspace, filePath) &&
      !existingDocument
    ) {
      throw new ApiError(409, "CONFLICT", "Document path already exists.", {
        title: "A file or folder with this name already exists."
      });
    }
  }

  private readDocumentKind(input: Record<string, unknown>, field: string) {
    if (!(field in input)) {
      return undefined;
    }

    const value = readRequiredString(input, field);

    if (!documentKinds.includes(value as DocumentKind)) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
        [field]: `${field} must be one of: ${documentKinds.join(", ")}.`
      });
    }

    return value as DocumentKind;
  }

  private readDocumentContent(
    input: Record<string, unknown>,
    kind: DocumentKind
  ) {
    const value = input.content;

    if (typeof value !== "string") {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
        content: "content is required."
      });
    }

    if (kind === "document" && value.trim() === "") {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
        content: "content is required."
      });
    }

    return value;
  }

  private hasFilesystemRelevantChanges(
    currentDocument: Document,
    nextDocument: Document
  ) {
    return (
      currentDocument.parentId !== nextDocument.parentId ||
      currentDocument.kind !== nextDocument.kind ||
      currentDocument.filePath !== nextDocument.filePath ||
      currentDocument.title !== nextDocument.title ||
      currentDocument.content !== nextDocument.content ||
      currentDocument.updatedAt !== nextDocument.updatedAt
    );
  }

  private getDescendants(documents: Document[], document: Document) {
    const currentFilePath = document.filePath ?? "";

    return documents.filter(
      (entry) =>
        entry.id !== document.id &&
        entry.filePath &&
        entry.filePath.startsWith(`${currentFilePath}/`)
    );
  }
}

function compareByPathDepthDesc(left: Document, right: Document) {
  return (right.filePath?.length ?? 0) - (left.filePath?.length ?? 0);
}

function getDepth(document: Document, byId: Map<string, Document>) {
  let depth = 0;
  let currentParentId = document.parentId;

  while (currentParentId) {
    depth += 1;
    currentParentId = byId.get(currentParentId)?.parentId ?? null;
  }

  return depth;
}

function createUniqueImportedSlug(existingSlugs: Set<string>, baseSlug: string) {
  let index = 2;
  let nextSlug = baseSlug;

  while (existingSlugs.has(nextSlug)) {
    nextSlug = `${baseSlug}-${index}`;
    index += 1;
  }

  return nextSlug;
}
