import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { CreateWorkspaceRequest, Workspace } from "@plainbase/shared";
import type { AuthContext } from "../auth/auth-context.js";
import { requireAuthenticatedUser } from "../auth/auth-context.js";
import { ApiError } from "../errors/api-error.js";
import { WorkspaceRepository } from "../db/repositories/workspace-repository.js";
import { expectObject, readRequiredString, validateSlug } from "./validation.js";
import {
  normalizeWorkspaceRootPath,
  resolveWorkspaceRootPath
} from "../workspaces/workspace-paths.js";

export class WorkspaceService {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly contentRoot: string
  ) {}

  listWorkspaces(actor: AuthContext) {
    const authenticatedUser = requireAuthenticatedUser(actor);
    return this.workspaceRepository
      .listByTenantId(authenticatedUser.tenant.id)
      .map((workspace) => this.hydrateWorkspace(workspace));
  }

  createWorkspace(input: unknown, actor: AuthContext) {
    const authenticatedUser = requireAuthenticatedUser(actor);
    const body = expectObject(input);
    const name = readRequiredString(body, "name", "Workspace name");
    const slug = readRequiredString(body, "slug", "Workspace slug");
    const rootPathInput = readRequiredString(body, "rootPath", "Workspace path");

    validateSlug(slug);

    if (this.workspaceRepository.findBySlug(slug)) {
      throw new ApiError(409, "CONFLICT", "Workspace slug already exists.", {
        slug: "Choose a different workspace slug."
      });
    }

    const rootPath = normalizeWorkspaceRootPath(rootPathInput);
    const workspaceAtPath = this.workspaceRepository.findByRootPath(rootPath);

    if (workspaceAtPath) {
      throw new ApiError(409, "CONFLICT", "Workspace path already exists.", {
        rootPath: "Choose a different workspace path."
      });
    }

    mkdirSync(rootPath, { recursive: true });

    const timestamp = new Date().toISOString();

    return this.workspaceRepository.create(
      this.hydrateWorkspace({
        id: `workspace-${randomUUID()}`,
        tenantId: authenticatedUser.tenant.id,
        name,
        slug,
        rootPath,
        createdAt: timestamp,
        updatedAt: timestamp
      } satisfies Workspace)
    );
  }

  private hydrateWorkspace(workspace: Workspace) {
    return {
      ...workspace,
      rootPath: resolveWorkspaceRootPath(this.contentRoot, workspace)
    };
  }
}
