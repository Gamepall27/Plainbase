import { useEffect, useState } from "react";
import type { OnboardingState, Role } from "@plainbase/shared";
import type { SaveState } from "../../app/types";
import { slugify } from "../../lib/document-draft";

type OnboardingGuideProps = {
  invitationMutationStatus: SaveState;
  onboarding: OnboardingState;
  roles: Role[];
  workspaceMutationStatus: SaveState;
  onInvitationCreate: (input: {
    name: string;
    username: string;
    email: string;
    roleId: string;
    avatarUrl: string | null;
  }) => Promise<string | null>;
  onWorkspaceCreate: (input: {
    name: string;
    slug: string;
    rootPath?: string | null;
  }) => Promise<boolean>;
};

type OnboardingDialog = "workspace" | "invite" | null;

export function OnboardingGuide({
  invitationMutationStatus,
  onboarding,
  roles,
  workspaceMutationStatus,
  onInvitationCreate,
  onWorkspaceCreate
}: OnboardingGuideProps) {
  const [activeDialog, setActiveDialog] = useState<OnboardingDialog>(null);
  const [workspaceFormState, setWorkspaceFormState] = useState({
    name: "",
    slug: "",
    rootPath: ""
  });
  const [inviteFormState, setInviteFormState] = useState({
    name: "",
    username: "",
    email: "",
    roleId: getDefaultRoleId(roles),
    avatarUrl: ""
  });

  useEffect(() => {
    if (onboarding.state !== "onboarding" || !onboarding.canManageUsers) {
      setActiveDialog(null);
    }
  }, [onboarding]);

  useEffect(() => {
    if (inviteFormState.roleId !== "" || roles.length === 0) {
      return;
    }

    setInviteFormState((current) => ({
      ...current,
      roleId: getDefaultRoleId(roles)
    }));
  }, [inviteFormState.roleId, roles]);

  if (onboarding.state !== "onboarding" || !onboarding.canManageUsers) {
    return null;
  }

  async function handleWorkspaceSubmit() {
    const success = await onWorkspaceCreate({
      name: workspaceFormState.name.trim(),
      slug: workspaceFormState.slug.trim().toLowerCase(),
      rootPath: workspaceFormState.rootPath.trim() || null
    });

    if (!success) {
      return;
    }

    setWorkspaceFormState({
      name: "",
      slug: "",
      rootPath: ""
    });
    setActiveDialog(null);
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

    setInviteFormState({
      name: "",
      username: "",
      email: "",
      roleId: getDefaultRoleId(roles),
      avatarUrl: ""
    });
    setActiveDialog(null);
  }

  return (
    <>
      <div className="profile-dialog-backdrop">
        <section
          className="profile-dialog onboarding-guide-dialog"
          aria-modal="true"
          role="dialog"
          aria-labelledby="onboarding-guide-title"
        >
          <div className="profile-dialog-header">
            <div className="profile-dialog-copy onboarding-guide-copy">
              <p className="profile-dialog-kicker">Onboarding</p>
              <h2 id="onboarding-guide-title">Livegang vorbereiten</h2>
              <p>
                Richte Workspaces und Teamzugriffe direkt hier ein. Sobald alle
                offenen Schritte erledigt sind, schliesst sich dieses Fenster
                automatisch.
              </p>
            </div>
          </div>

          <div className="onboarding-guide-metrics">
            <span>{onboarding.workspaceCount} Workspaces</span>
            <span>{onboarding.userCount} Nutzer</span>
            <span>{onboarding.pendingInvitationCount} offene Einladungen</span>
          </div>

          <div className="onboarding-guide-steps">
            {onboarding.steps.map((step) => (
              <article
                key={step.id}
                className={
                  step.completed
                    ? "onboarding-step onboarding-step-complete"
                    : "onboarding-step"
                }
              >
                <div className="onboarding-step-copy">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>

                <div className="onboarding-step-actions">
                  {step.completed ? (
                    <span className="onboarding-step-badge">Erledigt</span>
                  ) : step.id === "create_first_workspace" ? (
                    <button
                      type="button"
                      className="toolbar-primary-button"
                      onClick={() => setActiveDialog("workspace")}
                    >
                      Workspace anlegen
                    </button>
                  ) : step.id === "invite_teammates" ? (
                    <button
                      type="button"
                      className="toolbar-primary-button"
                      onClick={() => setActiveDialog("invite")}
                    >
                      Team einladen
                    </button>
                  ) : (
                    <span className="onboarding-step-note">
                      Wird im Erstsetup erledigt.
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {activeDialog === "workspace" && (
        <div className="profile-dialog-backdrop onboarding-guide-subdialog">
          <section
            className="profile-dialog onboarding-action-dialog"
            aria-modal="true"
            role="dialog"
            aria-labelledby="onboarding-workspace-title"
          >
            <div className="profile-dialog-header">
              <div className="profile-dialog-copy">
                <p className="profile-dialog-kicker">Workspace</p>
                <h2 id="onboarding-workspace-title">Workspace anlegen</h2>
                <p>
                  Ohne Pfadangabe wird automatisch ein Ordner im konfigurierten
                  Content-Root angelegt.
                </p>
              </div>
              <button
                type="button"
                className="profile-dialog-close"
                onClick={() => setActiveDialog(null)}
              >
                Schliessen
              </button>
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
                      current.slug === "" || current.slug === slugify(current.name)
                        ? slugify(name)
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
                    slug: slugify(event.target.value)
                  }))
                }
              />
              <input
                className="field"
                placeholder="Pfad oder smb://Server/Freigabe/Ordner (optional)"
                value={workspaceFormState.rootPath}
                onChange={(event) =>
                  setWorkspaceFormState((current) => ({
                    ...current,
                    rootPath: event.target.value
                  }))
                }
              />

              <div className="profile-dialog-actions">
                <button
                  type="button"
                  className="toolbar-secondary-button"
                  onClick={() => setActiveDialog(null)}
                >
                  Abbrechen
                </button>
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
              </div>
            </form>

            {workspaceMutationStatus.status === "error" && (
              <p className="feedback error">{workspaceMutationStatus.message}</p>
            )}
          </section>
        </div>
      )}

      {activeDialog === "invite" && (
        <div className="profile-dialog-backdrop onboarding-guide-subdialog">
          <section
            className="profile-dialog onboarding-action-dialog"
            aria-modal="true"
            role="dialog"
            aria-labelledby="onboarding-invite-title"
          >
            <div className="profile-dialog-header">
              <div className="profile-dialog-copy">
                <p className="profile-dialog-kicker">Einladung</p>
                <h2 id="onboarding-invite-title">Teammitglied einladen</h2>
                <p>
                  Lege den Nutzer an und gib den erzeugten Einladungslink danach
                  direkt weiter.
                </p>
              </div>
              <button
                type="button"
                className="profile-dialog-close"
                onClick={() => setActiveDialog(null)}
              >
                Schliessen
              </button>
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

              <div className="profile-dialog-actions">
                <button
                  type="button"
                  className="toolbar-secondary-button"
                  onClick={() => setActiveDialog(null)}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="toolbar-primary-button"
                  disabled={
                    invitationMutationStatus.status === "saving" ||
                    inviteFormState.name.trim() === "" ||
                    inviteFormState.username.trim() === "" ||
                    inviteFormState.email.trim() === "" ||
                    inviteFormState.roleId === ""
                  }
                >
                  {invitationMutationStatus.status === "saving"
                    ? "Erstelle Einladung..."
                    : "Einladung erstellen"}
                </button>
              </div>
            </form>

            {invitationMutationStatus.status === "error" && (
              <p className="feedback error">{invitationMutationStatus.message}</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function getDefaultRoleId(roles: Role[]) {
  return roles[1]?.id ?? roles[0]?.id ?? "";
}
