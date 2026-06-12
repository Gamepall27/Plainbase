import type { Document, RoleName, Ticket } from "@plainbase/shared";

export type ExtensionType =
  | "sidebar-panel"
  | "document-action"
  | "command"
  | "settings-page"
  | "markdown-block-renderer"
  | "backend-route";

export type AddonManifestExtension =
  | {
      type: "sidebar-panel";
      id: string;
      title: string;
      location: "left" | "right";
    }
  | {
      type: "document-action";
      id: string;
      title: string;
    }
  | {
      type: "command";
      id: string;
      title: string;
    }
  | {
      type: "settings-page";
      id: string;
      title: string;
      slug: string;
    }
  | {
      type: "markdown-block-renderer";
      id: string;
      title: string;
      language: string;
    }
  | {
      type: "backend-route";
      id: string;
      title: string;
      path: string;
      method: BackendRouteMethod;
    };

export type AddonManifest = {
  id: string;
  name: string;
  version: string;
  description?: string;
  entry: string;
  capabilities?: string[];
  extensions?: AddonManifestExtension[];
};

type ExtensionBase<TType extends ExtensionType> = {
  id: string;
  type: TType;
  title: string;
  order?: number;
};

export type SidebarPanelContext = {
  activeAddonIds: string[];
  currentDocument: Document | null;
  demoRoleName: RoleName | null;
  tickets: Ticket[];
  workspaceId: string | null;
};

export type SidebarPanelExtension<TRendered = unknown> = ExtensionBase<"sidebar-panel"> & {
  location: "left" | "right";
  render: (context: SidebarPanelContext) => TRendered;
};

export type DocumentActionContext = {
  currentDocument: Document | null;
  demoRoleName: RoleName | null;
  workspaceId: string | null;
};

export type DocumentActionExtension<TResult = unknown> = ExtensionBase<"document-action"> & {
  execute: (context: DocumentActionContext) => TResult | Promise<TResult>;
};

export type CommandContext = {
  currentDocument: Document | null;
  demoRoleName: RoleName | null;
  workspaceId: string | null;
};

export type CommandExtension<TResult = unknown> = ExtensionBase<"command"> & {
  execute: (context: CommandContext) => TResult | Promise<TResult>;
};

export type SettingsPageContext = {
  activeAddonIds: string[];
  demoRoleName: RoleName | null;
};

export type SettingsPageExtension<TRendered = unknown> = ExtensionBase<"settings-page"> & {
  slug: string;
  render: (context: SettingsPageContext) => TRendered;
};

export type MarkdownBlockRendererContext = {
  code: string;
  currentDocument: Document | null;
  language: string;
  workspaceId: string | null;
};

export type MarkdownBlockRendererExtension<TRendered = unknown> =
  ExtensionBase<"markdown-block-renderer"> & {
    language: string;
    render: (context: MarkdownBlockRendererContext) => TRendered | null;
  };

export type BackendRouteMethod = "GET" | "POST" | "PUT" | "DELETE";

export type BackendRouteContext<TRouter = unknown> = {
  manifest: AddonManifest;
  router: TRouter;
};

export type BackendRouteExtension<TRouter = unknown> = ExtensionBase<"backend-route"> & {
  method: BackendRouteMethod;
  path: string;
  register: (context: BackendRouteContext<TRouter>) => void | Promise<void>;
};

export type AddonExtension<TRendered = unknown, TRouter = unknown> =
  | SidebarPanelExtension<TRendered>
  | DocumentActionExtension
  | CommandExtension
  | SettingsPageExtension<TRendered>
  | MarkdownBlockRendererExtension<TRendered>
  | BackendRouteExtension<TRouter>;

export type AddonDefinition<TRendered = unknown, TRouter = unknown> = {
  manifest: AddonManifest;
  extensions: AddonExtension<TRendered, TRouter>[];
};

export function defineAddon<TRendered = unknown, TRouter = unknown>(
  definition: AddonDefinition<TRendered, TRouter>
) {
  return definition;
}

export function parseAddonManifestJson(manifestJson: string) {
  const parsed = JSON.parse(manifestJson) as unknown;

  return parseAddonManifest(parsed);
}

export function parseAddonManifest(value: unknown): AddonManifest {
  if (!isRecord(value)) {
    throw new Error("Addon manifest must be an object.");
  }

  const id = readString(value.id, "id");
  const name = readString(value.name, "name");
  const version = readString(value.version, "version");
  const entry = readString(value.entry, "entry");
  const description =
    value.description === undefined
      ? undefined
      : readString(value.description, "description");
  const capabilities =
    value.capabilities === undefined
      ? undefined
      : readStringArray(value.capabilities, "capabilities");
  const extensions =
    value.extensions === undefined
      ? undefined
      : readExtensions(value.extensions);

  return {
    id,
    name,
    version,
    entry,
    description,
    capabilities,
    extensions
  };
}

function readExtensions(value: unknown): AddonManifestExtension[] {
  if (!Array.isArray(value)) {
    throw new Error("Addon manifest extensions must be an array.");
  }

  return value.map((extension, index) => {
    if (!isRecord(extension)) {
      throw new Error(`Addon manifest extension ${index} must be an object.`);
    }

    const type = readString(extension.type, `extensions[${index}].type`);
    const id = readString(extension.id, `extensions[${index}].id`);
    const title = readString(extension.title, `extensions[${index}].title`);

    switch (type) {
      case "sidebar-panel":
        return {
          type,
          id,
          title,
          location: readSidebarLocation(
            extension.location,
            `extensions[${index}].location`
          )
        };
      case "document-action":
        return { type, id, title };
      case "command":
        return { type, id, title };
      case "settings-page":
        return {
          type,
          id,
          title,
          slug: readString(extension.slug, `extensions[${index}].slug`)
        };
      case "markdown-block-renderer":
        return {
          type,
          id,
          title,
          language: readString(
            extension.language,
            `extensions[${index}].language`
          )
        };
      case "backend-route":
        return {
          type,
          id,
          title,
          path: readString(extension.path, `extensions[${index}].path`),
          method: readRouteMethod(
            extension.method,
            `extensions[${index}].method`
          )
        };
      default:
        throw new Error(`Unsupported addon extension type: ${type}`);
    }
  });
}

function readSidebarLocation(
  value: unknown,
  field: string
): "left" | "right" {
  const location = readString(value, field);

  if (location !== "left" && location !== "right") {
    throw new Error(`${field} must be "left" or "right".`);
  }

  return location;
}

function readRouteMethod(value: unknown, field: string): BackendRouteMethod {
  const method = readString(value, field);

  if (!["GET", "POST", "PUT", "DELETE"].includes(method)) {
    throw new Error(`${field} must be GET, POST, PUT, or DELETE.`);
  }

  return method as BackendRouteMethod;
}

function readString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string.`);
  }

  return value;
}

function readStringArray(value: unknown, field: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${field} must be an array of strings.`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
