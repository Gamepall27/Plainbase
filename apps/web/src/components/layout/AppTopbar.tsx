import { useEffect, useRef, useState } from "react";
import type { DemoAuth, RoleName, Workspace } from "@plainbase/shared";
import type { LoadState, SaveState } from "../../app/types";
import { getInitials } from "../../lib/formatters";

type AppTopbarProps = {
  activeRole: RoleName | null;
  demoUserState: LoadState<DemoAuth>;
  roleSwitchStatus: SaveState;
  selectedWorkspace: Workspace | null;
  onSignIn: (identifier: string, password: string) => Promise<boolean>;
  onSignOut: () => void;
};

export function AppTopbar({
  activeRole,
  demoUserState,
  roleSwitchStatus,
  selectedWorkspace,
  onSignIn,
  onSignOut
}: AppTopbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({
    identifier: "",
    password: ""
  });
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const auth = demoUserState.status === "success" ? demoUserState.data : null;
  const demoAuth = auth?.authType === "demo" ? auth : null;
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
        setIsProfileDialogOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isProfileDialogOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileDialogOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileDialogOpen]);

  async function handleSignInSubmit() {
    const signedIn = await onSignIn(
      loginForm.identifier.trim(),
      loginForm.password
    );

    if (!signedIn) {
      return;
    }

    setLoginForm({ identifier: "", password: "" });
    setIsUserMenuOpen(false);
  }

  function handleSignOut() {
    onSignOut();
    setIsUserMenuOpen(false);
    setIsProfileDialogOpen(false);
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
          <button className="topbar-icon-button" type="button">
            Theme
          </button>

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
                        setIsProfileDialogOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                    >
                      Profileinstellungen
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
                      <span className="topbar-user-menu-eyebrow">Anmeldung</span>
                      <strong>Willkommen zurueck</strong>
                      <span>Melde dich mit E-Mail oder Benutzername an.</span>
                    </div>

                    <form
                      className="topbar-login-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSignInSubmit();
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
                      <button
                        type="submit"
                        className="toolbar-primary-button"
                        disabled={
                          roleSwitchStatus.status === "saving" ||
                          loginForm.identifier.trim() === "" ||
                          loginForm.password.trim() === ""
                        }
                      >
                        {roleSwitchStatus.status === "saving"
                          ? "Anmeldung laeuft..."
                          : "Anmelden"}
                      </button>
                    </form>

                    <p className="topbar-user-menu-helper">
                      Demo-Logins: `admin`, `editor` oder `viewer`
                      mit Passwort `plainbase`
                    </p>
                    {roleSwitchStatus.status === "error" && (
                      <p className="feedback error">{roleSwitchStatus.message}</p>
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

      {isProfileDialogOpen && isDemoUser && (
        <div
          className="profile-dialog-backdrop"
          onClick={() => setIsProfileDialogOpen(false)}
        >
          <section
            className="profile-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profile-dialog-header">
              <div className="profile-dialog-identity">
                <div className="profile-dialog-avatar">
                  {demoAuth.user.avatarUrl ? (
                    <img
                      src={demoAuth.user.avatarUrl}
                      alt={demoAuth.user.name}
                      className="topbar-avatar-image"
                    />
                  ) : (
                    getInitials(demoAuth.user.name)
                  )}
                </div>
                <div>
                  <p className="profile-dialog-kicker">Profil</p>
                  <h2 id="profile-dialog-title">{demoAuth.user.name}</h2>
                  <p className="profile-dialog-copy">@{demoAuth.user.username}</p>
                  <p className="profile-dialog-copy">{demoAuth.user.email}</p>
                </div>
              </div>

              <button
                type="button"
                className="profile-dialog-close"
                onClick={() => setIsProfileDialogOpen(false)}
              >
                Schliessen
              </button>
            </div>

            <div className="profile-dialog-grid">
              <div className="profile-dialog-card">
                <span className="profile-dialog-label">Aktive Rolle</span>
                <strong>{demoAuth.role.name}</strong>
                <p className="profile-dialog-copy">
                  Deine Berechtigungen in Plainbase richten sich nach dieser Rolle.
                </p>
              </div>

              <div className="profile-dialog-card">
                <span className="profile-dialog-label">Workspace</span>
                <strong>{selectedWorkspace?.name ?? "Kein Workspace aktiv"}</strong>
                <p className="profile-dialog-copy">
                  Hier siehst du, in welchem Bereich du gerade arbeitest.
                </p>
              </div>
            </div>

            <div className="profile-dialog-actions">
              <button
                type="button"
                className="toolbar-primary-button"
                onClick={() => setIsProfileDialogOpen(false)}
              >
                Zurueck zur App
              </button>
              <button
                type="button"
                className="toolbar-secondary-button"
                onClick={handleSignOut}
              >
                Abmelden
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
