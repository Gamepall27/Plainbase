import type { Express, Request, Response } from "express";
import type { HealthResponse } from "@plainbase/shared";
import { ContentStore } from "../content/content-store.js";
import { PlainbaseDatabase } from "../db/plainbase-database.js";

type ApiDependencies = {
  contentStore: ContentStore;
  database: PlainbaseDatabase;
};

export function registerRoutes(app: Express, dependencies: ApiDependencies) {
  const { contentStore, database } = dependencies;

  app.get("/api/health", (_request: Request, response: Response) => {
    const summary = contentStore.getSummary();
    const payload: HealthResponse = {
      status: "ok",
      service: "plainbase-api",
      timestamp: new Date().toISOString(),
      storage: {
        type: "filesystem",
        rootPath: summary.rootPath,
        markdownFileCount: summary.markdownFileCount,
        directoryCount: summary.directoryCount,
        scanCompleted: summary.scanCompleted
      },
      database: database.getSummary()
    };

    response.json(payload);
  });

  app.get("/api/library/summary", (_request: Request, response: Response) => {
    response.json(contentStore.getSummary());
  });

  app.get("/api/demo-data", (_request: Request, response: Response) => {
    response.json(database.getDemoData());
  });
}
