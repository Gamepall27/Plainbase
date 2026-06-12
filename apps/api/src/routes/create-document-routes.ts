import type {
  DeleteDocumentResponse,
  DocumentResponse,
  DocumentsResponse
} from "@plainbase/shared";
import { Router } from "express";
import { DocumentService } from "../services/document-service.js";

export function createDocumentRoutes(documentService: DocumentService) {
  const router = Router();

  router.get("/workspaces/:workspaceId/documents", (request, response) => {
    const payload: DocumentsResponse = {
      success: true,
      data: {
        documents: documentService.listDocumentsByWorkspace(
          request.params.workspaceId
        )
      }
    };

    response.json(payload);
  });

  router.get("/documents/:documentId", (request, response) => {
    const payload: DocumentResponse = {
      success: true,
      data: {
        document: documentService.getDocument(request.params.documentId)
      }
    };

    response.json(payload);
  });

  router.post("/documents", (request, response) => {
    const document = documentService.createDocument(request.body);
    const payload: DocumentResponse = {
      success: true,
      data: {
        document
      }
    };

    response.status(201).json(payload);
  });

  router.put("/documents/:documentId", (request, response) => {
    const payload: DocumentResponse = {
      success: true,
      data: {
        document: documentService.updateDocument(
          request.params.documentId,
          request.body
        )
      }
    };

    response.json(payload);
  });

  router.delete("/documents/:documentId", (request, response) => {
    const payload: DeleteDocumentResponse = {
      success: true,
      data: {
        deletedDocumentId: documentService.deleteDocument(
          request.params.documentId
        )
      }
    };

    response.json(payload);
  });

  return router;
}
