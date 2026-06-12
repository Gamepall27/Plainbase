import type {
  DeleteDocumentResponse,
  DocumentResponse,
  DocumentsResponse
} from "@plainbase/shared";
import { Router } from "express";
import {
  canCreateDocument,
  canDeleteDocument,
  canEditDocument
} from "@plainbase/shared";
import { requirePermission } from "../middleware/require-permission.js";
import { DocumentService } from "../services/document-service.js";
import { readRouteParam } from "../services/validation.js";

export function createDocumentRoutes(documentService: DocumentService) {
  const router = Router();

  router.get("/workspaces/:workspaceId/documents", (request, response) => {
    const workspaceId = readRouteParam(request.params, "workspaceId");
    const payload: DocumentsResponse = {
      success: true,
      data: {
        documents: documentService.listDocumentsByWorkspace(workspaceId)
      }
    };

    response.json(payload);
  });

  router.get("/documents/:documentId", (request, response) => {
    const documentId = readRouteParam(request.params, "documentId");
    const payload: DocumentResponse = {
      success: true,
      data: {
        document: documentService.getDocument(documentId)
      }
    };

    response.json(payload);
  });

  router.post(
    "/documents",
    requirePermission(
      canCreateDocument,
      "The active demo user cannot create documents."
    ),
    (request, response) => {
      const document = documentService.createDocument(request.body, request.auth);
      const payload: DocumentResponse = {
        success: true,
        data: {
          document
        }
      };

      response.status(201).json(payload);
    }
  );

  router.put(
    "/documents/:documentId",
    requirePermission(
      canEditDocument,
      "The active demo user cannot edit documents."
    ),
    (request, response) => {
      const documentId = readRouteParam(request.params, "documentId");
      const payload: DocumentResponse = {
        success: true,
        data: {
          document: documentService.updateDocument(documentId, request.body, request.auth)
        }
      };

      response.json(payload);
    }
  );

  router.delete(
    "/documents/:documentId",
    requirePermission(
      canDeleteDocument,
      "The active demo user cannot delete documents."
    ),
    (request, response) => {
      const documentId = readRouteParam(request.params, "documentId");
      const payload: DeleteDocumentResponse = {
        success: true,
        data: {
          deletedDocumentId: documentService.deleteDocument(documentId)
        }
      };

      response.json(payload);
    }
  );

  return router;
}
