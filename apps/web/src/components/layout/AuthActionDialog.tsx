import { useState } from "react";
import type { SaveState } from "../../app/types";

type AuthActionDialogProps = {
  mode: "invite" | "reset";
  status: SaveState;
  onClose: () => void;
  onSubmit: (password: string) => Promise<boolean>;
};

export function AuthActionDialog({
  mode,
  status,
  onClose,
  onSubmit
}: AuthActionDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const title =
    mode === "invite" ? "Einladung annehmen" : "Passwort zuruecksetzen";
  const copy =
    mode === "invite"
      ? "Lege dein Passwort fest, um dein neues Plainbase-Konto zu aktivieren."
      : "Lege ein neues Passwort fuer dein bestehendes Konto fest.";

  async function handleSubmit() {
    const success = await onSubmit(password);

    if (success && mode === "invite") {
      onClose();
    }
  }

  return (
    <div className="profile-dialog-backdrop" onClick={onClose}>
      <section
        className="profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-action-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="profile-dialog-header">
          <div className="profile-dialog-identity">
            <div className="profile-dialog-avatar">PB</div>
            <div>
              <p className="profile-dialog-kicker">Konto</p>
              <h2 id="auth-action-title">{title}</h2>
              <p className="profile-dialog-copy">{copy}</p>
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
            type="password"
            placeholder="Neues Passwort"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <input
            className="field"
            type="password"
            placeholder="Passwort bestaetigen"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <button
            type="submit"
            className="toolbar-primary-button"
            disabled={
              status.status === "saving" ||
              password.trim() === "" ||
              confirmPassword.trim() === "" ||
              password !== confirmPassword
            }
          >
            {status.status === "saving"
              ? "Speichere..."
              : mode === "invite"
                ? "Einladung annehmen"
                : "Passwort aktualisieren"}
          </button>
        </form>

        {password !== confirmPassword && confirmPassword.trim() !== "" && (
          <p className="feedback error">Die Passwoerter stimmen nicht ueberein.</p>
        )}
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
