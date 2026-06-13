import { registerAddonBackendRoutes } from "../addons/register-addon-backend-routes.js";
import type { Express } from "express";
import { ContentStore } from "../content/content-store.js";
import { PlainbaseDatabase } from "../db/plainbase-database.js";
import { attachDemoAuth } from "../middleware/attach-demo-auth.js";
import { errorHandler, notFoundHandler } from "../middleware/error-handler.js";
import { createServices } from "../services/create-services.js";
import { createAddonRoutes } from "./create-addon-routes.js";
import { createDocumentRoutes } from "./create-document-routes.js";
import { createHealthRoutes } from "./create-health-routes.js";
import { createRoleRoutes } from "./create-role-routes.js";
import { createTicketRoutes } from "./create-ticket-routes.js";
import { createUserRoutes } from "./create-user-routes.js";
import { createWorkspaceRoutes } from "./create-workspace-routes.js";

type ApiDependencies = {
  contentStore: ContentStore;
  database: PlainbaseDatabase;
};

export function registerRoutes(app: Express, dependencies: ApiDependencies) {
  const services = createServices(
    dependencies.database,
    dependencies.contentStore.getRootPath()
  );

  app.use("/api", attachDemoAuth(services.demoAuthService));
  app.use(
    "/api",
    createHealthRoutes({
      contentStore: dependencies.contentStore,
      database: dependencies.database,
      services
    })
  );
  app.use("/api", createWorkspaceRoutes(services.workspaceService));
  app.use("/api", createDocumentRoutes(services.documentService));
  app.use(
    "/api",
    createUserRoutes(services.userService, services.demoAuthService)
  );
  app.use("/api", createRoleRoutes(services.roleService));
  app.use("/api", createAddonRoutes(services.addonService));
  app.use("/api", createTicketRoutes(services.ticketService));
  registerAddonBackendRoutes(app, services.addonService);
  app.use("/api", notFoundHandler);
  app.use(errorHandler);
}
