import { AddonRepository } from "../db/repositories/addon-repository.js";
import { DocumentRepository } from "../db/repositories/document-repository.js";
import { RoleRepository } from "../db/repositories/role-repository.js";
import { TicketRepository } from "../db/repositories/ticket-repository.js";
import { TenantRepository } from "../db/repositories/tenant-repository.js";
import { UserRepository } from "../db/repositories/user-repository.js";
import { WorkspaceRepository } from "../db/repositories/workspace-repository.js";
import type { AuthContext } from "../auth/auth-context.js";
import { requireAuthenticatedUser } from "../auth/auth-context.js";

export class DemoDataService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly addonRepository: AddonRepository,
    private readonly ticketRepository: TicketRepository
  ) {}

  getDemoData(actor: AuthContext) {
    const authenticatedUser = requireAuthenticatedUser(actor);
    const tenantId = authenticatedUser.tenant.id;
    const workspaces = this.workspaceRepository.listByTenantId(tenantId);

    return {
      tenants: [this.tenantRepository.findById(tenantId)!],
      workspaces,
      documents: workspaces.flatMap((workspace) =>
        this.documentRepository.listByWorkspaceId(workspace.id)
      ),
      users: this.userRepository.listByTenantId(tenantId),
      roles: this.roleRepository.list(),
      addons: this.addonRepository.list(),
      tickets: workspaces.flatMap((workspace) =>
        this.ticketRepository.listByWorkspaceId(workspace.id)
      )
    };
  }
}
