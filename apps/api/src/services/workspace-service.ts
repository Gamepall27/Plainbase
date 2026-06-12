import { randomUUID } from "node:crypto";
import type { CreateWorkspaceRequest } from "@plainbase/shared";
import { ApiError } from "../errors/api-error.js";
import { WorkspaceRepository } from "../db/repositories/workspace-repository.js";
import { expectObject, readRequiredString, validateSlug } from "./validation.js";

export class WorkspaceService {
  constructor(private readonly workspaceRepository: WorkspaceRepository) {}

  listWorkspaces() {
    return this.workspaceRepository.list();
  }

  createWorkspace(input: unknown) {
    const body = expectObject(input);
    const name = readRequiredString(body, "name", "Workspace name");
    const slug = readRequiredString(body, "slug", "Workspace slug");

    validateSlug(slug);

    if (this.workspaceRepository.findBySlug(slug)) {
      throw new ApiError(409, "CONFLICT", "Workspace slug already exists.", {
        slug: "Choose a different workspace slug."
      });
    }

    const timestamp = new Date().toISOString();

    return this.workspaceRepository.create({
      id: `workspace-${randomUUID()}`,
      name,
      slug,
      createdAt: timestamp,
      updatedAt: timestamp
    } satisfies CreateWorkspaceRequest & {
      id: string;
      createdAt: string;
      updatedAt: string;
    });
  }
}
