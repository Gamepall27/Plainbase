import type { DemoUser, Role, RoleName, Workspace } from "@plainbase/shared";
import type { LoadState, SaveState } from "../../app/types";
import { getInitials } from "../../lib/formatters";

type AppTopbarProps = {
  activeRole: RoleName | null;
  demoUserState: LoadState<DemoUser>;
  roleSwitchStatus: SaveState;
  rolesState: LoadState<Role[]>;
  selectedWorkspace: Workspace | null;
  onRoleChange: (roleName: RoleName) => void;
};

export function AppTopbar({
  activeRole,
  demoUserState,
  roleSwitchStatus,
  rolesState,
  selectedWorkspace,
  onRoleChange
}: AppTopbarProps) {
  return (
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
        <select
          className="toolbar-select"
          value={activeRole ?? ""}
          disabled={
            rolesState.status !== "success" ||
            roleSwitchStatus.status === "saving"
          }
          onChange={(event) => onRoleChange(event.target.value as RoleName)}
        >
          {rolesState.status === "success" &&
            rolesState.data.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
        </select>
      </div>

      <div className="topbar-avatar">
        {demoUserState.status === "success"
          ? getInitials(demoUserState.data.user.name)
          : "PB"}
      </div>

      <div className="topbar-icon-row">
        <button className="topbar-icon-button" type="button">
          Theme
        </button>
        <button className="topbar-icon-button" type="button">
          Alerts
        </button>
        <button className="topbar-icon-button" type="button">
          Share
        </button>
      </div>
    </header>
  );
}
