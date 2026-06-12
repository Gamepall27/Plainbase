import { AddonRepository } from "../db/repositories/addon-repository.js";
import { AppStateRepository } from "../db/repositories/app-state-repository.js";
import { DocumentRepository } from "../db/repositories/document-repository.js";
import { RoleRepository } from "../db/repositories/role-repository.js";
import { TicketRepository } from "../db/repositories/ticket-repository.js";
import { UserRepository } from "../db/repositories/user-repository.js";
import { WorkspaceRepository } from "../db/repositories/workspace-repository.js";
import { PlainbaseDatabase } from "../db/plainbase-database.js";
import { AddonService } from "./addon-service.js";
import { DemoDataService } from "./demo-data-service.js";
import { DocumentService } from "./document-service.js";
import { RoleService } from "./role-service.js";
import { TicketService } from "./ticket-service.js";
import { UserService } from "./user-service.js";
import { WorkspaceService } from "./workspace-service.js";

export type ApiServices = ReturnType<typeof createServices>;

export function createServices(database: PlainbaseDatabase) {
  const connection = database.getConnection();

  const workspaceRepository = new WorkspaceRepository(connection);
  const documentRepository = new DocumentRepository(connection);
  const userRepository = new UserRepository(connection);
  const roleRepository = new RoleRepository(connection);
  const addonRepository = new AddonRepository(connection);
  const ticketRepository = new TicketRepository(connection);
  const appStateRepository = new AppStateRepository(connection);

  return {
    workspaceService: new WorkspaceService(workspaceRepository),
    documentService: new DocumentService(
      documentRepository,
      workspaceRepository,
      userRepository
    ),
    userService: new UserService(
      userRepository,
      roleRepository,
      appStateRepository
    ),
    roleService: new RoleService(roleRepository),
    addonService: new AddonService(addonRepository),
    ticketService: new TicketService(
      ticketRepository,
      workspaceRepository,
      documentRepository,
      userRepository
    ),
    demoDataService: new DemoDataService(
      workspaceRepository,
      documentRepository,
      userRepository,
      roleRepository,
      addonRepository,
      ticketRepository
    )
  };
}
