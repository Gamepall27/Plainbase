import cors from "cors";
import express from "express";
import { apiConfig } from "./config.js";
import { ContentStore } from "./content/content-store.js";
import { PlainbaseDatabase } from "./db/plainbase-database.js";
import { registerRoutes } from "./routes/register-routes.js";

type CreatePlainbaseApiAppOptions = {
  contentRoot?: string;
  databasePath?: string;
};

export function createPlainbaseApiApp(
  options: CreatePlainbaseApiAppOptions = {}
) {
  const contentStore = new ContentStore(options.contentRoot ?? apiConfig.contentRoot);
  const database = new PlainbaseDatabase(
    options.databasePath ?? apiConfig.databasePath
  );

  database.initialize();

  const app = express();
  app.use(cors());
  app.use(express.json());
  registerRoutes(app, { contentStore, database });

  return {
    app,
    contentStore,
    database
  };
}
