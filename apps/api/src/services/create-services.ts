import { AddonRepository } from "../db/repositories/addon-repository.js";
import { AuthSessionRepository } from "../db/repositories/auth-session-repository.js";
import { DocumentRepository } from "../db/repositories/document-repository.js";
import { PasswordResetRepository } from "../db/repositories/password-reset-repository.js";
import { RoleRepository } from "../db/repositories/role-repository.js";
import { TicketRepository } from "../db/repositories/ticket-repository.js";
import { TenantRepository } from "../db/repositories/tenant-repository.js";
import { UserInvitationRepository } from "../db/repositories/user-invitation-repository.js";
import { UserRepository } from "../db/repositories/user-repository.js";
import { WorkspaceRepository } from "../db/repositories/workspace-repository.js";
import { PlainbaseDatabase } from "../db/plainbase-database.js";
import { AddonService } from "./addon-service.js";
import { AuthService } from "./auth-service.js";
import { DemoDataService } from "./demo-data-service.js";
import { DocumentService } from "./document-service.js";
import { RoleService } from "./role-service.js";
import { TicketService } from "./ticket-service.js";
import { UserService } from "./user-service.js";
import { WorkspaceService } from "./workspace-service.js";

export type ApiServices = ReturnType<typeof createServices>;

export function createServices(
  database: PlainbaseDatabase,
  contentRoot: string
) {
  const connection = database.getConnection();

  const workspaceRepository = new WorkspaceRepository(connection);
  const documentRepository = new DocumentRepository(connection);
  const userRepository = new UserRepository(connection);
  const roleRepository = new RoleRepository(connection);
  const tenantRepository = new TenantRepository(connection);
  const addonRepository = new AddonRepository(connection);
  const ticketRepository = new TicketRepository(connection);
  const authSessionRepository = new AuthSessionRepository(connection);
  const passwordResetRepository = new PasswordResetRepository(connection);
  const userInvitationRepository = new UserInvitationRepository(connection);

  return {
    workspaceService: new WorkspaceService(workspaceRepository, contentRoot),
    documentService: new DocumentService(
      documentRepository,
      workspaceRepository,
      contentRoot
    ),
    userService: new UserService(
      userRepository,
      roleRepository,
      documentRepository,
      ticketRepository
    ),
    authService: new AuthService(
      userRepository,
      tenantRepository,
      roleRepository,
      authSessionRepository,
      passwordResetRepository,
      userInvitationRepository
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
      tenantRepository,
      workspaceRepository,
      documentRepository,
      userRepository,
      roleRepository,
      addonRepository,
      ticketRepository
    )
  };
}
