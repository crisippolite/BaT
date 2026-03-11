import { NavLink } from "react-router-dom";
import { useQuery } from "convex/react";
import { UserButton, SignInButton, useUser } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { Toggle } from "./Toggle";
import { useAppStore } from "../stores/appStore";

export function Sidebar() {
  const auctions = useQuery(api.auctions.list, { status: "active", limit: 100 });
  const activeCount = auctions?.length ?? 0;
  const { monitoringEnabled, toggleMonitoring } = useAppStore();
  const { isSignedIn, user } = useUser();

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

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          paddingTop: "var(--space-4)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        {isSignedIn ? (
          <>
            <UserButton afterSignOutUrl="/" />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)" }}>
              {user?.firstName ?? user?.emailAddresses[0]?.emailAddress}
            </span>
          </>
        ) : (
          <SignInButton mode="modal">
            <button
              style={{
                background: "var(--color-orange)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "6px 16px",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              Sign In
            </button>
          </SignInButton>
        )}
      </div>
    </nav>
  );
}
