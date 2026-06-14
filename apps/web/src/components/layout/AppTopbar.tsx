import { useEffect, useRef, useState } from "react";
import type { DemoAuth, RoleName, Workspace } from "@plainbase/shared";
import type { LoadState, SaveState } from "../../app/types";
import { getInitials } from "../../lib/formatters";

type AppTopbarProps = {
  activeRole: RoleName | null;
  demoUserState: LoadState<DemoAuth>;
  roleSwitchStatus: SaveState;
  selectedWorkspace: Workspace | null;
  onOpenSettings: () => void;
  onSignIn: (identifier: string, password: string) => Promise<boolean>;
  onRequestPasswordReset: (identifier: string) => Promise<string | null>;
  onSignOut: () => void;
};

export function AppTopbar({
  activeRole,
  demoUserState,
  roleSwitchStatus,
  selectedWorkspace,
  onOpenSettings,
  onSignIn,
  onRequestPasswordReset,
  onSignOut
}: AppTopbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "reset">("sign-in");
  const [loginForm, setLoginForm] = useState({
    identifier: "",
    password: ""
  });
  const [resetLink, setResetLink] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const auth = demoUserState.status === "success" ? demoUserState.data : null;
  const demoAuth = auth?.authType === "session" ? auth : null;
  const isDemoUser = demoAuth !== null;

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        userMenuRef.current &&
        event.target instanceof Node &&
        !userMenuRef.current.contains(event.target)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  async function handleSignInSubmit() {
    const signedIn = await onSignIn(
      loginForm.identifier.trim(),
      loginForm.password
    );

    if (!signedIn) {
      return;
    }

    setLoginForm({ identifier: "", password: "" });
    setResetLink(null);
    setAuthMode("sign-in");
    setIsUserMenuOpen(false);
  }

  function handleSignOut() {
    onSignOut();
    setIsUserMenuOpen(false);
  }

  async function handlePasswordResetSubmit() {
    const createdResetLink = await onRequestPasswordReset(
      loginForm.identifier.trim()
    );
    setResetLink(createdResetLink);
  }

  return (
    <>
      <header className="app-topbar">
        <div className="brand-lockup">
          <div className="brand-badge">PB</div>
          <span className="brand-name">Plainbase</span>
        </div>

        <div className="topbar-workspace-pill">
          <span className="topbar-workspace-icon">[]</span>
          <span>{selectedWorkspace?.name ?? "Workspace"}</span>
        </div>

        <div className="topbar-spacer" />

        <div className="topbar-role">
          <span>Rolle:</span>
          <span className="topbar-role-badge">
            {activeRole ?? "Gast"}
          </span>
        </div>

        <div className="topbar-icon-row">
          <div className="topbar-user-menu-shell" ref={userMenuRef}>
            <button
              className={
                isUserMenuOpen
                  ? "topbar-avatar-button topbar-avatar-button-active"
                  : "topbar-avatar-button"
              }
              type="button"
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
              aria-label={
                isDemoUser
                  ? `${demoAuth.user.name} oeffnet Kontomenue`
                  : "Anmelden oder Profilmenue oeffnen"
              }
              onClick={() => setIsUserMenuOpen((current) => !current)}
            >
              <div className="topbar-avatar">
                {demoAuth?.user.avatarUrl ? (
                  <img
                    src={demoAuth.user.avatarUrl}
                    alt={demoAuth.user.name}
                    className="topbar-avatar-image"
                  />
                ) : isDemoUser ? (
                  getInitials(demoAuth.user.name)
                ) : (
                  "PB"
                )}
              </div>
            </button>

            {isUserMenuOpen && (
              <div className="topbar-user-menu" role="menu">
                {isDemoUser ? (
                  <>
                    <div className="topbar-user-menu-summary">
                      <span className="topbar-user-menu-eyebrow">
                        Angemeldet als
                      </span>
                      <strong>{demoAuth.user.name}</strong>
                      <span>@{demoAuth.user.username}</span>
                      <span>{demoAuth.user.email}</span>
                      <span className="topbar-user-menu-role">{demoAuth.role.name}</span>
                    </div>

                    <button
                      type="button"
                      className="topbar-user-menu-button"
                      role="menuitem"
                      onClick={() => {
                        onOpenSettings();
                        setIsUserMenuOpen(false);
                      }}
                    >
                      Einstellungen
                    </button>

                    <button
                      type="button"
                      className="topbar-user-menu-button topbar-user-menu-button-danger"
                      role="menuitem"
                      disabled={roleSwitchStatus.status === "saving"}
                      onClick={handleSignOut}
                    >
                      Abmelden
                    </button>
                  </>
                ) : (
                  <>
                    <div className="topbar-user-menu-summary">
                      <span className="topbar-user-menu-eyebrow">
                        {authMode === "sign-in" ? "Anmeldung" : "Passwort-Reset"}
                      </span>
                      <strong>
                        {authMode === "sign-in"
                          ? "Willkommen zurueck"
                          : "Neues Passwort anfordern"}
                      </strong>
                      <span>
                        {authMode === "sign-in"
                          ? "Melde dich mit E-Mail oder Benutzername an."
                          : "Wir erzeugen einen einmaligen Reset-Link fuer dein Konto."}
                      </span>
                    </div>

                    <form
                      className="topbar-login-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (authMode === "sign-in") {
                          void handleSignInSubmit();
                          return;
                        }

                        void handlePasswordResetSubmit();
                      }}
                    >
                      <input
                        className="field"
                        placeholder="E-Mail oder Benutzername"
                        value={loginForm.identifier}
                        onChange={(event) =>
                          setLoginForm((current) => ({
                            ...current,
                            identifier: event.target.value
                          }))
                        }
                      />
                      {authMode === "sign-in" && (
                        <input
                          className="field"
                          type="password"
                          placeholder="Passwort"
                          value={loginForm.password}
                          onChange={(event) =>
                            setLoginForm((current) => ({
                              ...current,
                              password: event.target.value
                            }))
                          }
                        />
                      )}
                      <button
                        type="submit"
                        className="toolbar-primary-button"
                        disabled={
                          roleSwitchStatus.status === "saving" ||
                          loginForm.identifier.trim() === "" ||
                          (authMode === "sign-in" &&
                            loginForm.password.trim() === "")
                        }
                      >
                        {roleSwitchStatus.status === "saving"
                          ? authMode === "sign-in"
                            ? "Anmeldung laeuft..."
                            : "Link wird erstellt..."
                          : authMode === "sign-in"
                            ? "Anmelden"
                            : "Reset-Link erstellen"}
                      </button>
                    </form>

                    <button
                      type="button"
                      className="inline-link-button"
                      onClick={() => {
                        setAuthMode((current) =>
                          current === "sign-in" ? "reset" : "sign-in"
                        );
                        setResetLink(null);
                      }}
                    >
                      {authMode === "sign-in"
                        ? "Passwort vergessen?"
                        : "Zurueck zur Anmeldung"}
                    </button>

                    {resetLink && (
                      <p className="topbar-user-menu-helper">
                        Reset-Link: <a href={resetLink}>{resetLink}</a>
                      </p>
                    )}
                    <p className="topbar-user-menu-helper">
                      Seed-Konten: `admin`, `editor` oder `viewer`
                      mit Passwort `plainbase123`
                    </p>
                    {roleSwitchStatus.status === "error" && (
                      <p className="feedback error">{roleSwitchStatus.message}</p>
                    )}
                    {roleSwitchStatus.status === "success" && (
                      <p className="feedback success">{roleSwitchStatus.message}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <button className="topbar-icon-button" type="button">
            Alerts
          </button>
          <button className="topbar-icon-button" type="button">
            Share
          </button>
        </div>
      </header>
    </>
  );
}
