import type { DemoAuthContext } from "./demo-auth-context.js";

export function canCreateDocument(user: DemoAuthContext) {
  return isAdmin(user) || isEditor(user);
}

export function canEditDocument(user: DemoAuthContext) {
  return isAdmin(user) || isEditor(user);
}

export function canDeleteDocument(user: DemoAuthContext) {
  return isAdmin(user);
}

export function canManageAddons(user: DemoAuthContext) {
  return isAdmin(user);
}

export function canCreateTicket(user: DemoAuthContext) {
  return isAdmin(user) || isEditor(user);
}

export function canEditTicket(user: DemoAuthContext) {
  return isAdmin(user) || isEditor(user);
}

export function isAdmin(user: DemoAuthContext) {
  return user.role.name === "Admin";
}

function isEditor(user: DemoAuthContext) {
  return user.role.name === "Editor";
}
