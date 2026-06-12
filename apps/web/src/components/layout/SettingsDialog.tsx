import type { DemoAuth, Workspace } from "@plainbase/shared";
import { getInitials } from "../../lib/formatters";

type SettingsDialogProps = {
  isOpen: boolean;
  selectedWorkspace: Workspace | null;
  theme: "light" | "dark";
  demoAuth: DemoAuth | null;
  onClose: () => void;
  onThemeToggle: () => void;
};

export function SettingsDialog({
  isOpen,
  selectedWorkspace,
  theme,
  demoAuth,
  onClose,
  onThemeToggle
}: SettingsDialogProps) {
  if (!isOpen) {
    return null;
  }

  const signedInAuth = demoAuth?.authType === "demo" ? demoAuth : null;

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
              <span className="profile-dialog-label">Darstellung</span>
              <strong>{theme === "light" ? "Light Mode" : "Dark Mode"}</strong>
              <p className="profile-dialog-copy">
                Wechsle jederzeit zwischen heller und dunkler Oberflaeche.
              </p>
            </div>

            <button
              type="button"
              className={`settings-switch${theme === "dark" ? " is-on" : ""}`}
              role="switch"
              aria-checked={theme === "dark"}
              aria-label="Dark Mode umschalten"
              onClick={onThemeToggle}
            >
              <span className="settings-switch-thumb" aria-hidden="true" />
            </button>
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
