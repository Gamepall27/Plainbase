import { AddonRepository } from "../db/repositories/addon-repository.js";
import { DocumentRepository } from "../db/repositories/document-repository.js";
import { RoleRepository } from "../db/repositories/role-repository.js";
import { TicketRepository } from "../db/repositories/ticket-repository.js";
import { UserRepository } from "../db/repositories/user-repository.js";
import { WorkspaceRepository } from "../db/repositories/workspace-repository.js";

export class DemoDataService {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly addonRepository: AddonRepository,
    private readonly ticketRepository: TicketRepository
  ) {}

  getDemoData() {
    return {
      workspaces: this.workspaceRepository.list(),
      documents: this.documentRepository.listAll(),
      users: this.userRepository.list(),
      roles: this.roleRepository.list(),
      addons: this.addonRepository.list(),
      tickets: this.ticketRepository.listAll()
    };
  }
}
