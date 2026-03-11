import { NavLink } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Toggle } from "./Toggle";
import { useAppStore } from "../stores/appStore";
import { AuthButtons } from "./AuthButtons";

export function Sidebar() {
  const auctions = useQuery(api.auctions.list, { status: "active", limit: 100 });
  const activeCount = auctions?.length ?? 0;
  const { monitoringEnabled, toggleMonitoring } = useAppStore();

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">BaT Signal</div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
        <NavLink
          to="/"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span>Live Feed</span>
          <span className="nav-item-count">{activeCount}</span>
        </NavLink>

        <NavLink
          to="/compare"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          Compare
        </NavLink>

        <NavLink
          to="/market"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          Market
        </NavLink>

        <NavLink
          to="/preferences"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          Preferences
        </NavLink>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "var(--space-4)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)" }}>
          Monitoring
        </span>
        <Toggle enabled={monitoringEnabled} onToggle={toggleMonitoring} />
      </div>

      <AuthButtons />
    </nav>
  );
}
