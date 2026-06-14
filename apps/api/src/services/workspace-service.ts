import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { CreateWorkspaceRequest, Workspace } from "@plainbase/shared";
import type { AuthContext } from "../auth/auth-context.js";
import { requireAuthenticatedUser } from "../auth/auth-context.js";
import { ApiError } from "../errors/api-error.js";
import { WorkspaceRepository } from "../db/repositories/workspace-repository.js";
import {
  expectObject,
  readOptionalNullableString,
  readRequiredString,
  requireAtLeastOneField,
  validateSlug
} from "./validation.js";
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
    const rootPathInput = readOptionalNullableString(body, "rootPath", "Workspace path");

    validateSlug(slug);

    if (this.workspaceRepository.findBySlug(slug)) {
      throw new ApiError(409, "CONFLICT", "Workspace slug already exists.", {
        slug: "Choose a different workspace slug."
      });
    }

    const rootPath = rootPathInput ? normalizeWorkspaceRootPath(rootPathInput) : "";
    const resolvedRootPath = resolveWorkspaceRootPath(this.contentRoot, {
      slug,
      rootPath
    });
    const workspaceAtPath = this.workspaceRepository
      .list()
      .map((workspace) => this.hydrateWorkspace(workspace))
      .find((workspace) => workspace.rootPath === resolvedRootPath);

    if (workspaceAtPath) {
      throw new ApiError(409, "CONFLICT", "Workspace path already exists.", {
        rootPath: "Choose a different workspace path."
      });
    }

    mkdirSync(resolvedRootPath, { recursive: true });

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

  updateWorkspace(workspaceId: string, input: unknown, actor: AuthContext) {
    const existingWorkspace = this.requireTenantWorkspace(workspaceId, actor);
    const body = expectObject(input);

    requireAtLeastOneField(
      body,
      ["rootPath"],
      "At least one workspace field must be provided."
    );

    const rootPathInput = readOptionalNullableString(body, "rootPath", "Workspace path");
    const nextStoredRootPath =
      rootPathInput === undefined
        ? existingWorkspace.rootPath
        : rootPathInput
          ? normalizeWorkspaceRootPath(rootPathInput)
          : "";
    const nextResolvedRootPath = resolveWorkspaceRootPath(this.contentRoot, {
      slug: existingWorkspace.slug,
      rootPath: nextStoredRootPath
    });
    const workspaceAtPath = this.workspaceRepository
      .list()
      .filter((workspace) => workspace.id !== existingWorkspace.id)
      .map((workspace) => this.hydrateWorkspace(workspace))
      .find((workspace) => workspace.rootPath === nextResolvedRootPath);

    if (workspaceAtPath) {
      throw new ApiError(409, "CONFLICT", "Workspace path already exists.", {
        rootPath: "Choose a different workspace path."
      });
    }

    mkdirSync(nextResolvedRootPath, { recursive: true });

    return this.workspaceRepository.update(
      this.hydrateWorkspace({
        ...existingWorkspace,
        rootPath: nextStoredRootPath,
        updatedAt: new Date().toISOString()
      })
    );
  }

  deleteWorkspace(workspaceId: string, actor: AuthContext) {
    const existingWorkspace = this.requireTenantWorkspace(workspaceId, actor);
    this.workspaceRepository.delete(existingWorkspace.id);
    return existingWorkspace.id;
  }

  private requireTenantWorkspace(workspaceId: string, actor: AuthContext) {
    const authenticatedUser = requireAuthenticatedUser(actor);
    const workspace = this.workspaceRepository.findById(workspaceId);

    if (!workspace || workspace.tenantId !== authenticatedUser.tenant.id) {
      throw new ApiError(404, "NOT_FOUND", "Workspace not found.");
    }

    return workspace;
  }

  private hydrateWorkspace(workspace: Workspace) {
    return {
      ...workspace,
      rootPath: resolveWorkspaceRootPath(this.contentRoot, workspace)
    };
  }
}
