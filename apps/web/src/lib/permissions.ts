import type { DemoUser, RoleName } from "@plainbase/shared";

export function canCreateDocument(user: DemoUser | null) {
  return hasRole(user, "Admin") || hasRole(user, "Editor");
}

export function canEditDocument(user: DemoUser | null) {
  return hasRole(user, "Admin") || hasRole(user, "Editor");
}

export function canDeleteDocument(user: DemoUser | null) {
  return hasRole(user, "Admin");
}

export function canManageAddons(user: DemoUser | null) {
  return hasRole(user, "Admin");
}

export function canCreateTicket(user: DemoUser | null) {
  return hasRole(user, "Admin") || hasRole(user, "Editor");
}

export function canEditTicket(user: DemoUser | null) {
  return hasRole(user, "Admin") || hasRole(user, "Editor");
}

function hasRole(user: DemoUser | null, roleName: RoleName) {
  return user?.role.name === roleName;
}
