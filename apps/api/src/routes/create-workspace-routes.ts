import type {
  WorkspaceResponse,
  WorkspacesResponse
} from "@plainbase/shared";
import { Router } from "express";
import { WorkspaceService } from "../services/workspace-service.js";

export function createWorkspaceRoutes(workspaceService: WorkspaceService) {
  const router = Router();

  router.get("/workspaces", (_request, response) => {
    const payload: WorkspacesResponse = {
      success: true,
      data: {
        workspaces: workspaceService.listWorkspaces()
      }
    };

    response.json(payload);
  });

  router.post("/workspaces", (request, response) => {
    const workspace = workspaceService.createWorkspace(request.body);
    const payload: WorkspaceResponse = {
      success: true,
      data: {
        workspace
      }
    };

    response.status(201).json(payload);
  });

  return router;
}
