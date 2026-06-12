import type { Document, Ticket } from "@plainbase/shared";

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
  title: string;
  slug?: string;
  documentId?: string;
  disabled?: boolean;
  children?: SidebarItem[];
};

export type RightPanelTab = "tickets" | "links" | "notes";

export type TicketFilter = Ticket["status"];

export type SelectedDocument = Document | null;
