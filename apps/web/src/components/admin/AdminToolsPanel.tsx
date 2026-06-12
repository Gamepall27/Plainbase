import { useEffect, useState } from "react";
import type { Role, User } from "@plainbase/shared";
import type { LoadState, SaveState } from "../../app/types";

type AdminToolsPanelProps = {
  roles: Role[];
  selectedWorkspaceName: string | null;
  userMutationStatus: SaveState;
  usersState: LoadState<User[]>;
  onClose: () => void;
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
};

export function AdminToolsPanel({
  roles,
  selectedWorkspaceName,
  userMutationStatus,
  usersState,
  onClose,
  onUserCreate,
  onUserUpdate,
  onUserDelete
}: AdminToolsPanelProps) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    username: "",
    email: "",
    roleId: roles[1]?.id ?? roles[0]?.id ?? "",
    password: "",
    avatarUrl: ""
  });

  useEffect(() => {
    if (formState.roleId !== "" || roles.length === 0) {
      return;
    }

    setFormState((current) => ({
      ...current,
      roleId: roles[1]?.id ?? roles[0]?.id ?? ""
    }));
  }, [formState.roleId, roles]);

  function resetForm() {
    setEditingUserId(null);
    setFormState({
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
    setFormState({
      name: user.name,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      password: "",
      avatarUrl: user.avatarUrl ?? ""
    });
  }

  async function handleSubmit() {
    const payload = {
      name: formState.name.trim(),
      username: formState.username.trim().toLowerCase(),
      email: formState.email.trim().toLowerCase(),
      roleId: formState.roleId,
      password: formState.password.trim(),
      avatarUrl: formState.avatarUrl.trim() || null
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

    resetForm();
  }

  async function handleDelete(user: User) {
    if (!window.confirm(`"${user.name}" wirklich entfernen?`)) {
      return;
    }

    const deleted = await onUserDelete(user.id);

    if (deleted && editingUserId === user.id) {
      resetForm();
    }
  }

  return (
    <section className="main-stage admin-stage">
      <div className="document-tabs">
        <button type="button" className="document-tab active">
          <span>Admin-Tools</span>
        </button>
        <button type="button" className="document-tab-add" onClick={onClose}>
          x
        </button>
      </div>

      <div className="document-shell admin-tools-shell">
        <section className="admin-tools-hero">
          <div>
            <p className="canvas-eyebrow">{selectedWorkspaceName ?? "Workspace"}</p>
            <h1 className="canvas-title">Admin-Tools</h1>
            <p className="admin-tools-copy">
              Verwalte Nutzer, Logins und Rollen zentral an einer Stelle.
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
                <h3>{editingUserId ? "Nutzer bearbeiten" : "Nutzer anlegen"}</h3>
                <p className="sidebar-copy">
                  Login funktioniert mit Benutzername oder E-Mail plus Passwort.
                </p>
              </div>
              {editingUserId && (
                <button
                  type="button"
                  className="inline-link-button"
                  onClick={resetForm}
                >
                  Neuer Nutzer
                </button>
              )}
            </div>

            <form
              className="admin-user-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <input
                className="field"
                placeholder="Name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
              />
              <input
                className="field"
                placeholder="Benutzername"
                value={formState.username}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    username: event.target.value
                  }))
                }
              />
              <input
                className="field"
                placeholder="E-Mail"
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
              />
              <input
                className="field"
                placeholder={editingUserId ? "Neues Passwort (optional)" : "Passwort"}
                type="password"
                value={formState.password}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
              />
              <input
                className="field"
                placeholder="Bild-URL"
                value={formState.avatarUrl}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    avatarUrl: event.target.value
                  }))
                }
              />
              <select
                className="field"
                value={formState.roleId}
                onChange={(event) =>
                  setFormState((current) => ({
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
                  formState.name.trim() === "" ||
                  formState.username.trim() === "" ||
                  formState.email.trim() === "" ||
                  formState.roleId.trim() === "" ||
                  (!editingUserId && formState.password.trim() === "")
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
                <h3>Nutzerverzeichnis</h3>
                <p className="sidebar-copy">
                  Demo-Zugang: `admin`, `editor` oder `viewer` mit Passwort `123`.
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
    </section>
  );
}
