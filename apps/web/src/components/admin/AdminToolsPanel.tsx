import { useEffect, useState } from "react";
import type { Role, User, Workspace } from "@plainbase/shared";
import type { LoadState, SaveState } from "../../app/types";

type AdminToolsPanelProps = {
  roles: Role[];
  selectedWorkspace: Workspace | null;
  selectedWorkspaceName: string | null;
  invitationMutationStatus: SaveState;
  userMutationStatus: SaveState;
  usersState: LoadState<User[]>;
  workspaceMutationStatus: SaveState;
  workspacesState: LoadState<Workspace[]>;
  onClose: () => void;
  onInvitationCreate: (input: {
    name: string;
    username: string;
    email: string;
    roleId: string;
    avatarUrl: string | null;
  }) => Promise<string | null>;
  onUserCreate: (input: {
    name: string;
    username: string;
    email: string;
    roleId: string;
    password: string;
    avatarUrl: string | null;
  }) => Promise<boolean>;
  onUserUpdate: (
    userId: string,
    input: {
      name?: string;
      username?: string;
      email?: string;
      roleId?: string;
      password?: string;
      avatarUrl?: string | null;
    }
  ) => Promise<boolean>;
  onUserDelete: (userId: string) => Promise<boolean>;
  onWorkspaceCreate: (input: {
    name: string;
    slug: string;
    rootPath?: string | null;
  }) => Promise<boolean>;
  onWorkspaceDelete: (workspaceId: string) => Promise<boolean>;
  onWorkspaceUpdate: (
    workspaceId: string,
    input: {
      rootPath?: string | null;
    }
  ) => Promise<boolean>;
};

export function AdminToolsPanel({
  roles,
  selectedWorkspace,
  selectedWorkspaceName,
  invitationMutationStatus,
  userMutationStatus,
  usersState,
  workspaceMutationStatus,
  workspacesState,
  onClose,
  onInvitationCreate,
  onUserCreate,
  onUserUpdate,
  onUserDelete,
  onWorkspaceCreate,
  onWorkspaceDelete,
  onWorkspaceUpdate
}: AdminToolsPanelProps) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormState, setUserFormState] = useState({
    name: "",
    username: "",
    email: "",
    roleId: roles[1]?.id ?? roles[0]?.id ?? "",
    password: "",
    avatarUrl: ""
  });
  const [workspaceFormState, setWorkspaceFormState] = useState({
    name: "",
    slug: "",
    rootPath: ""
  });
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [workspacePathDraft, setWorkspacePathDraft] = useState("");
  const [inviteFormState, setInviteFormState] = useState({
    name: "",
    username: "",
    email: "",
    roleId: roles[1]?.id ?? roles[0]?.id ?? "",
    avatarUrl: ""
  });
  const [invitationLink, setInvitationLink] = useState<string | null>(null);

  async function copyInvitationLink() {
    if (!invitationLink) {
      return;
    }

    await navigator.clipboard.writeText(invitationLink);
  }

  useEffect(() => {
    if (userFormState.roleId !== "" || roles.length === 0) {
      return;
    }

    setUserFormState((current) => ({
      ...current,
      roleId: roles[1]?.id ?? roles[0]?.id ?? ""
    }));
  }, [userFormState.roleId, roles]);

  useEffect(() => {
    if (inviteFormState.roleId !== "" || roles.length === 0) {
      return;
    }

    setInviteFormState((current) => ({
      ...current,
      roleId: roles[1]?.id ?? roles[0]?.id ?? ""
    }));
  }, [inviteFormState.roleId, roles]);

  function resetUserForm() {
    setEditingUserId(null);
    setUserFormState({
      name: "",
      username: "",
      email: "",
      roleId: roles[1]?.id ?? roles[0]?.id ?? "",
      password: "",
      avatarUrl: ""
    });
  }

  function startEditing(user: User) {
    setEditingUserId(user.id);
    setUserFormState({
      name: user.name,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      password: "",
      avatarUrl: user.avatarUrl ?? ""
    });
  }

  async function handleUserSubmit() {
    const payload = {
      name: userFormState.name.trim(),
      username: userFormState.username.trim().toLowerCase(),
      email: userFormState.email.trim().toLowerCase(),
      roleId: userFormState.roleId,
      password: userFormState.password.trim(),
      avatarUrl: userFormState.avatarUrl.trim() || null
    };

    const success = editingUserId
      ? await onUserUpdate(editingUserId, {
          name: payload.name,
          username: payload.username,
          email: payload.email,
          roleId: payload.roleId,
          password: payload.password === "" ? undefined : payload.password,
          avatarUrl: payload.avatarUrl
        })
      : await onUserCreate(payload);

    if (!success) {
      return;
    }

    resetUserForm();
  }

  async function handleWorkspaceSubmit() {
    const payload = {
      name: workspaceFormState.name.trim(),
      slug: workspaceFormState.slug.trim().toLowerCase(),
      rootPath: workspaceFormState.rootPath.trim()
    };

    const success = await onWorkspaceCreate(payload);

    if (!success) {
      return;
    }

    setWorkspaceFormState({
      name: "",
      slug: "",
      rootPath: ""
    });
  }

  async function handleInvitationSubmit() {
    const acceptUrl = await onInvitationCreate({
      name: inviteFormState.name.trim(),
      username: inviteFormState.username.trim().toLowerCase(),
      email: inviteFormState.email.trim().toLowerCase(),
      roleId: inviteFormState.roleId,
      avatarUrl: inviteFormState.avatarUrl.trim() || null
    });

    if (!acceptUrl) {
      return;
    }

    setInvitationLink(acceptUrl);
    setInviteFormState({
      name: "",
      username: "",
      email: "",
      roleId: roles[1]?.id ?? roles[0]?.id ?? "",
      avatarUrl: ""
    });
  }

  async function handleWorkspacePathUpdate(workspaceId: string) {
    const success = await onWorkspaceUpdate(workspaceId, {
      rootPath: workspacePathDraft.trim() || null
    });

    if (!success) {
      return;
    }

    setEditingWorkspaceId(null);
    setWorkspacePathDraft("");
  }

  async function handleWorkspaceDelete(workspace: Workspace) {
    if (
      !window.confirm(
        `Workspace "${workspace.name}" aus Plainbase entfernen? Dateien auf dem Datentraeger bleiben erhalten.`
      )
    ) {
      return;
    }

    const deleted = await onWorkspaceDelete(workspace.id);

    if (deleted && editingWorkspaceId === workspace.id) {
      setEditingWorkspaceId(null);
      setWorkspacePathDraft("");
    }
  }

  async function handleDelete(user: User) {
    if (!window.confirm(`"${user.name}" wirklich entfernen?`)) {
      return;
    }

    const deleted = await onUserDelete(user.id);

    if (deleted && editingUserId === user.id) {
      resetUserForm();
    }
  }

  return (
    <div className="document-shell admin-tools-shell">
        <section className="admin-tools-hero">
          <div>
            <p className="canvas-eyebrow">{selectedWorkspaceName ?? "Workspace"}</p>
            <h1 className="canvas-title">Admin-Tools</h1>
            <p className="admin-tools-copy">
              Verwalte Nutzer, Workspaces und ihre echten Ursprungsordner.
            </p>
          </div>
          <button
            type="button"
            className="toolbar-secondary-button"
            onClick={onClose}
          >
            Editor oeffnen
          </button>
        </section>

        <section className="admin-tools-grid">
          <section className="addon-panel-card">
            <div className="user-panel-header">
              <div>
                <h3>Workspace anlegen</h3>
                <p className="sidebar-copy">
                  Ohne Pfadangabe wird automatisch ein Ordner im konfigurierten
                  Content-Root angelegt.
                </p>
              </div>
            </div>

            <form
              className="admin-user-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleWorkspaceSubmit();
              }}
            >
              <input
                className="field"
                placeholder="Workspace-Name"
                value={workspaceFormState.name}
                onChange={(event) =>
                  setWorkspaceFormState((current) => {
                    const name = event.target.value;
                    const nextSlug =
                      current.slug === "" || current.slug === slugifyValue(current.name)
                        ? slugifyValue(name)
                        : current.slug;

                    return {
                      ...current,
                      name,
                      slug: nextSlug
                    };
                  })
                }
              />
              <input
                className="field"
                placeholder="Slug"
                value={workspaceFormState.slug}
                onChange={(event) =>
                  setWorkspaceFormState((current) => ({
                    ...current,
                    slug: slugifyValue(event.target.value)
                  }))
                }
              />
              <input
                className="field"
                placeholder="Pfad (optional), z. B. /Users/joshua/Wissensbasis/Team-A"
                value={workspaceFormState.rootPath}
                onChange={(event) =>
                  setWorkspaceFormState((current) => ({
                    ...current,
                    rootPath: event.target.value
                  }))
                }
              />
              <button
                type="submit"
                className="toolbar-primary-button"
                disabled={
                  workspaceMutationStatus.status === "saving" ||
                  workspaceFormState.name.trim() === "" ||
                  workspaceFormState.slug.trim() === ""
                }
              >
                {workspaceMutationStatus.status === "saving"
                  ? "Lege Workspace an..."
                  : "Workspace anlegen"}
              </button>
            </form>

            {workspaceMutationStatus.status === "error" && (
              <p className="feedback error">{workspaceMutationStatus.message}</p>
            )}
            {workspaceMutationStatus.status === "success" && (
              <p className="feedback success">{workspaceMutationStatus.message}</p>
            )}

            {selectedWorkspace && (
              <div className="workspace-admin-hint">
                <strong>Aktuell:</strong> {selectedWorkspace.name}
                <br />
                <span>{selectedWorkspace.rootPath}</span>
              </div>
            )}
          </section>

          <section className="addon-panel-card">
            <div className="user-panel-header">
              <div>
                <h3>Workspace-Verzeichnis</h3>
                <p className="sidebar-copy">
                  Jeder Workspace zeigt auf einen echten Ordner im Dateisystem.
                </p>
              </div>
            </div>

            {workspacesState.status === "loading" && (
              <p className="sidebar-copy">Lade Workspaces...</p>
            )}
            {workspacesState.status === "error" && (
              <p className="feedback error">{workspacesState.message}</p>
            )}
            {workspacesState.status === "success" && (
              <div className="user-list">
                {workspacesState.data.map((workspace) => (
                  <article key={workspace.id} className="user-card">
                    <div className="user-card-copy">
                      <strong>{workspace.name}</strong>
                      <span>{workspace.slug}</span>
                      {editingWorkspaceId === workspace.id ? (
                        <input
                          className="field"
                          value={workspacePathDraft}
                          placeholder="Pfad leer lassen fuer Standardpfad"
                          onChange={(event) => setWorkspacePathDraft(event.target.value)}
                        />
                      ) : (
                        <span>{workspace.rootPath}</span>
                      )}
                    </div>
                    <div className="user-card-actions">
                      {editingWorkspaceId === workspace.id ? (
                        <>
                          <button
                            type="button"
                            className="inline-link-button"
                            disabled={workspaceMutationStatus.status === "saving"}
                            onClick={() => void handleWorkspacePathUpdate(workspace.id)}
                          >
                            Pfad speichern
                          </button>
                          <button
                            type="button"
                            className="inline-link-button"
                            disabled={workspaceMutationStatus.status === "saving"}
                            onClick={() => {
                              setEditingWorkspaceId(null);
                              setWorkspacePathDraft("");
                            }}
                          >
                            Abbrechen
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="inline-link-button"
                            disabled={workspaceMutationStatus.status === "saving"}
                            onClick={() => {
                              setEditingWorkspaceId(workspace.id);
                              setWorkspacePathDraft(workspace.rootPath);
                            }}
                          >
                            Pfad anpassen
                          </button>
                          <button
                            type="button"
                            className="inline-link-button user-remove-button"
                            disabled={workspaceMutationStatus.status === "saving"}
                            onClick={() => void handleWorkspaceDelete(workspace)}
                          >
                            Workspace loeschen
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="addon-panel-card">
            <div className="user-panel-header">
              <div>
                <h3>{editingUserId ? "Nutzer bearbeiten" : "Nutzer anlegen"}</h3>
                <p className="sidebar-copy">
                  Login funktioniert mit Benutzername oder E-Mail plus Passwort.
                </p>
              </div>
              {editingUserId && (
                <button
                  type="button"
                  className="inline-link-button"
                  onClick={resetUserForm}
                >
                  Neuer Nutzer
                </button>
              )}
            </div>

            <form
              className="admin-user-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleUserSubmit();
              }}
            >
              <input
                className="field"
                placeholder="Name"
                value={userFormState.name}
                onChange={(event) =>
                  setUserFormState((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
              />
              <input
                className="field"
                placeholder="Benutzername"
                value={userFormState.username}
                onChange={(event) =>
                  setUserFormState((current) => ({
                    ...current,
                    username: event.target.value
                  }))
                }
              />
              <input
                className="field"
                placeholder="E-Mail"
                value={userFormState.email}
                onChange={(event) =>
                  setUserFormState((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
              />
              <input
                className="field"
                placeholder={editingUserId ? "Neues Passwort (optional)" : "Passwort"}
                type="password"
                value={userFormState.password}
                onChange={(event) =>
                  setUserFormState((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
              />
              <input
                className="field"
                placeholder="Bild-URL"
                value={userFormState.avatarUrl}
                onChange={(event) =>
                  setUserFormState((current) => ({
                    ...current,
                    avatarUrl: event.target.value
                  }))
                }
              />
              <select
                className="field"
                value={userFormState.roleId}
                onChange={(event) =>
                  setUserFormState((current) => ({
                    ...current,
                    roleId: event.target.value
                  }))
                }
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="toolbar-primary-button"
                disabled={
                  userMutationStatus.status === "saving" ||
                  userFormState.name.trim() === "" ||
                  userFormState.username.trim() === "" ||
                  userFormState.email.trim() === "" ||
                  userFormState.roleId.trim() === "" ||
                  (!editingUserId && userFormState.password.trim() === "")
                }
              >
                {userMutationStatus.status === "saving"
                  ? editingUserId
                    ? "Speichere..."
                    : "Lege an..."
                  : editingUserId
                    ? "Nutzer speichern"
                    : "Nutzer anlegen"}
              </button>
            </form>

            {userMutationStatus.status === "error" && (
              <p className="feedback error">{userMutationStatus.message}</p>
            )}
            {userMutationStatus.status === "success" && (
              <p className="feedback success">{userMutationStatus.message}</p>
            )}
          </section>

          <section className="addon-panel-card">
            <div className="user-panel-header">
              <div>
                <h3>Einladung erstellen</h3>
                <p className="sidebar-copy">
                  Neue Nutzer erhalten einen einmaligen Link und setzen ihr Passwort
                  selbst. Die Zustellung erfolgt aktuell per manuell teilbarem
                  Einladungslink.
                </p>
              </div>
            </div>

            <form
              className="admin-user-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleInvitationSubmit();
              }}
            >
              <input
                className="field"
                placeholder="Name"
                value={inviteFormState.name}
                onChange={(event) =>
                  setInviteFormState((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
              />
              <input
                className="field"
                placeholder="Benutzername"
                value={inviteFormState.username}
                onChange={(event) =>
                  setInviteFormState((current) => ({
                    ...current,
                    username: event.target.value
                  }))
                }
              />
              <input
                className="field"
                placeholder="E-Mail"
                value={inviteFormState.email}
                onChange={(event) =>
                  setInviteFormState((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
              />
              <input
                className="field"
                placeholder="Bild-URL"
                value={inviteFormState.avatarUrl}
                onChange={(event) =>
                  setInviteFormState((current) => ({
                    ...current,
                    avatarUrl: event.target.value
                  }))
                }
              />
              <select
                className="field"
                value={inviteFormState.roleId}
                onChange={(event) =>
                  setInviteFormState((current) => ({
                    ...current,
                    roleId: event.target.value
                  }))
                }
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="toolbar-primary-button"
                disabled={
                  invitationMutationStatus.status === "saving" ||
                  inviteFormState.name.trim() === "" ||
                  inviteFormState.username.trim() === "" ||
                  inviteFormState.email.trim() === "" ||
                  inviteFormState.roleId.trim() === ""
                }
              >
                {invitationMutationStatus.status === "saving"
                  ? "Erstelle Einladung..."
                  : "Einladung erzeugen"}
              </button>
            </form>

            {invitationMutationStatus.status === "error" && (
              <p className="feedback error">{invitationMutationStatus.message}</p>
            )}
            {invitationMutationStatus.status === "success" && (
              <p className="feedback success">{invitationMutationStatus.message}</p>
            )}
            {invitationLink && (
              <div className="admin-link-actions">
                <p className="topbar-user-menu-helper">
                  Einladungslink: <a href={invitationLink}>{invitationLink}</a>
                </p>
                <button
                  type="button"
                  className="inline-link-button"
                  onClick={() => void copyInvitationLink()}
                >
                  Link kopieren
                </button>
              </div>
            )}
          </section>

          <section className="addon-panel-card">
            <div className="user-panel-header">
              <div>
                <h3>Nutzerverzeichnis</h3>
                <p className="sidebar-copy">
                  Verwalte hier alle Nutzer des aktuellen Kundenkontos.
                </p>
              </div>
            </div>

            {usersState.status === "loading" && (
              <p className="sidebar-copy">Lade Nutzer...</p>
            )}
            {usersState.status === "error" && (
              <p className="feedback error">{usersState.message}</p>
            )}
            {usersState.status === "success" && (
              <div className="user-list">
                {usersState.data.map((user) => {
                  const role = roles.find((entry) => entry.id === user.roleId);

                  return (
                    <article key={user.id} className="user-card">
                      <div className="user-card-avatar">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="user-card-avatar-image"
                          />
                        ) : (
                          user.name
                            .split(" ")
                            .map((part) => part[0] ?? "")
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        )}
                      </div>
                      <div className="user-card-copy">
                        <strong>{user.name}</strong>
                        <span>@{user.username}</span>
                        <span>{user.email}</span>
                      </div>
                      <span className="user-role-pill">{role?.name ?? "Unbekannt"}</span>
                      <div className="user-card-actions">
                        <button
                          type="button"
                          className="inline-link-button"
                          disabled={userMutationStatus.status === "saving"}
                          onClick={() => startEditing(user)}
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          className="inline-link-button user-remove-button"
                          disabled={userMutationStatus.status === "saving"}
                          onClick={() => void handleDelete(user)}
                        >
                          Entfernen
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </div>
  );
}

function slugifyValue(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug;
}
