import type { Document, DocumentKind, Ticket } from "@plainbase/shared";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };

export type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type SidebarFolder = {
  id: string;
  title: string;
  items: SidebarItem[];
};

export type SidebarItem = {
  id: string;
  kind: DocumentKind;
  parentId: string | null;
  sortOrder: number;
  title: string;
  slug?: string;
  documentId?: string;
  disabled?: boolean;
  children?: SidebarItem[];
};

export type RightPanelTab = "tickets" | "links" | "notes";
export type MainView = "document" | "tickets";
export type QuickLinkId =
  | "all-documents"
  | "favorites"
  | "recent"
  | "tickets";

export type TicketFilter = Ticket["status"];

export type SelectedDocument = Document | null;
