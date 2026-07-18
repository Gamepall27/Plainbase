import type {
  DeleteWorkspaceResponse,
  ImportWorkspaceResponse,
  WorkspaceResponse,
  WorkspacesResponse,
  UpdateWorkspaceRequest,
} from "@plainbase/shared";
import { readRouteParam } from "../services/validation.js";
import { Router } from "express";
import { requirePermission } from "../middleware/require-permission.js";
import { DocumentService } from "../services/document-service.js";
import { WorkspaceService } from "../services/workspace-service.js";
import { isAdmin } from "@plainbase/shared";

export function createWorkspaceRoutes(
  workspaceService: WorkspaceService,
  documentService: DocumentService
) {
  const router = Router();

  router.get("/workspaces", (request, response) => {
    const payload: WorkspacesResponse = {
      success: true,
      data: {
        workspaces: workspaceService.listWorkspaces(request.auth)
      }
    };

    response.json(payload);
  });

  router.post(
    "/workspaces",
    requirePermission(
      isAdmin,
      "The active user cannot create workspaces."
    ),
    (request, response) => {
      const workspace = workspaceService.createWorkspace(request.body, request.auth);
      documentService.listDocumentsByWorkspace(workspace.id, request.auth);
      const payload: WorkspaceResponse = {
        success: true,
        data: {
          workspace
        }
      };

      response.status(201).json(payload);
    }
  );

  router.put(
    "/workspaces/:workspaceId",
    requirePermission(
      isAdmin,
      "The active user cannot update workspaces."
    ),
    (request, response) => {
      const workspaceId = readRouteParam(request.params, "workspaceId");
      const workspace = workspaceService.updateWorkspace(
        workspaceId,
        request.body satisfies UpdateWorkspaceRequest,
        request.auth
      );
      documentService.listDocumentsByWorkspace(workspace.id, request.auth);
      const payload: WorkspaceResponse = {
        success: true,
        data: {
          workspace
        }
      };

      response.json(payload);
    }
  );

  router.post(
    "/workspaces/:workspaceId/import",
    requirePermission(
      isAdmin,
      "The active user cannot import workspace contents."
    ),
    (request, response) => {
      const workspaceId = readRouteParam(request.params, "workspaceId");
      const payload: ImportWorkspaceResponse = {
        success: true,
        data: {
          documents: documentService.importWorkspace(workspaceId, request.auth)
        }
      };

      response.json(payload);
    }
  );

  router.delete(
    "/workspaces/:workspaceId",
    requirePermission(
      isAdmin,
      "The active user cannot delete workspaces."
    ),
    (request, response) => {
      const workspaceId = readRouteParam(request.params, "workspaceId");
      const payload: DeleteWorkspaceResponse = {
        success: true,
        data: {
          deletedWorkspaceId: workspaceService.deleteWorkspace(
            workspaceId,
            request.auth
          )
        }
      };

      response.json(payload);
    }
  );

  return router;
}
