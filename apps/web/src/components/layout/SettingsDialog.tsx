import type { DemoAuth, Workspace } from "@plainbase/shared";
import { getInitials } from "../../lib/formatters";

type SettingsDialogProps = {
  isOpen: boolean;
  selectedWorkspace: Workspace | null;
  theme: "light" | "dark";
  themePreference: "light" | "dark" | "system";
  demoAuth: DemoAuth | null;
  onClose: () => void;
  onThemeChange: (theme: "light" | "dark" | "system") => void;
};

export function SettingsDialog({
  isOpen,
  selectedWorkspace,
  theme,
  themePreference,
  demoAuth,
  onClose,
  onThemeChange
}: SettingsDialogProps) {
  if (!isOpen) {
    return null;
  }

  const signedInAuth = demoAuth?.authType === "session" ? demoAuth : null;

  return (
    <div className="profile-dialog-backdrop" onClick={onClose}>
      <section
        className="profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="profile-dialog-header">
          <div className="profile-dialog-identity">
            <div className="profile-dialog-avatar">
              {signedInAuth?.user.avatarUrl ? (
                <img
                  src={signedInAuth.user.avatarUrl}
                  alt={signedInAuth.user.name}
                  className="topbar-avatar-image"
                />
              ) : signedInAuth ? (
                getInitials(signedInAuth.user.name)
              ) : (
                "PB"
              )}
            </div>
            <div>
              <p className="profile-dialog-kicker">Einstellungen</p>
              <h2 id="settings-dialog-title">Einstellungen</h2>
              <p className="profile-dialog-copy">
                {signedInAuth
                  ? `${signedInAuth.user.name} · @${signedInAuth.user.username}`
                  : "Nicht angemeldet"}
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

        <div className="settings-list" role="list" aria-label="Einstellungen">
          <div className="settings-list-item" role="listitem">
            <div className="settings-list-copy">
              <strong>Darstellungseinstellungen</strong>
              <p className="profile-dialog-copy">
                Waehle Light, Dark oder uebernimm automatisch die Darstellung
                deines Computers.
              </p>
            </div>

            <select
              className="sidebar-select settings-select"
              aria-label="Theme auswaehlen"
              value={themePreference}
              onChange={(event) =>
                onThemeChange(event.target.value as "light" | "dark" | "system")
              }
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="settings-list-item" role="listitem">
            <div className="settings-list-copy">
              <span className="profile-dialog-label">Workspace</span>
              <strong>{selectedWorkspace?.name ?? "Kein Workspace aktiv"}</strong>
              <p className="profile-dialog-copy">
                Hier siehst du, in welchem Bereich du gerade arbeitest.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
