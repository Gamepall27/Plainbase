import { useMemo, useState } from "react";
import type { SaveState } from "../../app/types";

type InitialSetupDialogProps = {
  status: SaveState;
  onClose: () => void;
  onSubmit: (input: {
    tenantName: string;
    tenantSlug: string;
    workspaceName: string;
    workspaceSlug: string;
    workspaceRootPath?: string | null;
    adminName: string;
    adminUsername: string;
    adminEmail: string;
    password: string;
  }) => Promise<boolean>;
};

export function InitialSetupDialog({
  status,
  onClose,
  onSubmit
}: InitialSetupDialogProps) {
  const [formState, setFormState] = useState({
    tenantName: "",
    tenantSlug: "",
    workspaceName: "",
    workspaceSlug: "",
    workspaceRootPath: "",
    adminName: "",
    adminUsername: "",
    adminEmail: "",
    password: "",
    confirmPassword: ""
  });

  const passwordsMatch = formState.password === formState.confirmPassword;
  const isReady = useMemo(
    () =>
      formState.tenantName.trim() !== "" &&
      formState.tenantSlug.trim() !== "" &&
      formState.workspaceName.trim() !== "" &&
      formState.workspaceSlug.trim() !== "" &&
      formState.adminName.trim() !== "" &&
      formState.adminUsername.trim() !== "" &&
      formState.adminEmail.trim() !== "" &&
      formState.password.trim() !== "" &&
      passwordsMatch,
    [formState, passwordsMatch]
  );

  async function handleSubmit() {
    const success = await onSubmit({
      tenantName: formState.tenantName.trim(),
      tenantSlug: formState.tenantSlug.trim().toLowerCase(),
      workspaceName: formState.workspaceName.trim(),
      workspaceSlug: formState.workspaceSlug.trim().toLowerCase(),
      workspaceRootPath: formState.workspaceRootPath.trim() || null,
      adminName: formState.adminName.trim(),
      adminUsername: formState.adminUsername.trim().toLowerCase(),
      adminEmail: formState.adminEmail.trim().toLowerCase(),
      password: formState.password
    });

    if (success) {
      onClose();
    }
  }

  return (
    <div className="profile-dialog-backdrop" onClick={onClose}>
      <section
        className="profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="initial-setup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="profile-dialog-header">
          <div className="profile-dialog-identity">
            <div className="profile-dialog-avatar">PB</div>
            <div>
              <p className="profile-dialog-kicker">Erstinstallation</p>
              <h2 id="initial-setup-title">Plainbase einrichten</h2>
              <p className="profile-dialog-copy">
                Lege dein erstes Kundenkonto, den ersten Workspace und ein
                Administrationskonto in einem Schritt an.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="profile-dialog-close"
            onClick={onClose}
          >
            Schliessen
          </button>
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
            placeholder="Firmenname"
            value={formState.tenantName}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                tenantName: event.target.value,
                tenantSlug:
                  current.tenantSlug === "" || current.tenantSlug === slugifyValue(current.tenantName)
                    ? slugifyValue(event.target.value)
                    : current.tenantSlug
              }))
            }
          />
          <input
            className="field"
            placeholder="Firmen-Slug"
            value={formState.tenantSlug}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                tenantSlug: slugifyValue(event.target.value)
              }))
            }
          />
          <input
            className="field"
            placeholder="Workspace-Name"
            value={formState.workspaceName}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                workspaceName: event.target.value,
                workspaceSlug:
                  current.workspaceSlug === "" ||
                  current.workspaceSlug === slugifyValue(current.workspaceName)
                    ? slugifyValue(event.target.value)
                    : current.workspaceSlug
              }))
            }
          />
          <input
            className="field"
            placeholder="Workspace-Slug"
            value={formState.workspaceSlug}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                workspaceSlug: slugifyValue(event.target.value)
              }))
            }
          />
          <input
            className="field"
            placeholder="Workspace-Pfad oder smb://Server/Freigabe/Ordner (optional)"
            value={formState.workspaceRootPath}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                workspaceRootPath: event.target.value
              }))
            }
          />
          <input
            className="field"
            placeholder="Admin-Name"
            value={formState.adminName}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                adminName: event.target.value
              }))
            }
          />
          <input
            className="field"
            placeholder="Admin-Benutzername"
            value={formState.adminUsername}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                adminUsername: event.target.value.toLowerCase()
              }))
            }
          />
          <input
            className="field"
            placeholder="Admin-E-Mail"
            value={formState.adminEmail}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                adminEmail: event.target.value
              }))
            }
          />
          <input
            className="field"
            type="password"
            placeholder="Passwort"
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
            type="password"
            placeholder="Passwort bestaetigen"
            value={formState.confirmPassword}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                confirmPassword: event.target.value
              }))
            }
          />
          <button
            type="submit"
            className="toolbar-primary-button"
            disabled={status.status === "saving" || !isReady}
          >
            {status.status === "saving"
              ? "Richte ein..."
              : "Erstinstallation abschliessen"}
          </button>
        </form>

        {!passwordsMatch && formState.confirmPassword.trim() !== "" && (
          <p className="feedback error">Die Passwoerter stimmen nicht ueberein.</p>
        )}
        <p className="topbar-user-menu-helper">
          Einladungen und Passwort-Resets werden anschliessend per sicherem
          Einmallink zugestellt.
        </p>
        {status.status === "error" && (
          <p className="feedback error">{status.message}</p>
        )}
        {status.status === "success" && (
          <p className="feedback success">{status.message}</p>
        )}
      </section>
    </div>
  );
}

function slugifyValue(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
