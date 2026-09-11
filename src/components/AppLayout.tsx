import {
  Bell,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
  Users
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useAppContext } from "../context/AppContext";
import { Badge, ButtonLink, cx } from "./ui";

const navigationItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/map", label: "Map", icon: Compass },
  { to: "/rides/new", label: "Create", icon: Plus },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings }
];

const mobileItems = navigationItems.filter(item => ["/dashboard", "/map", "/rides/new", "/approvals", "/settings"].includes(item.to));

function getPageMeta(pathname: string) {
  if (pathname === "/dashboard") {
    return { title: "Dashboard", description: "Trusted family ride coordination for the day ahead." };
  }
  if (pathname === "/map") {
    return { title: "Live Map", description: "Mocked ride progress, pickup points, and destination status." };
  }
  if (pathname === "/rides/new") {
    return { title: "Create Ride", description: "Open a private ride board with approvals and trust controls." };
  }
  if (pathname.startsWith("/rides/")) {
    return { title: "Ride Detail", description: "Track trust, pickups, approvals, and destination progress." };
  }
  if (pathname === "/groups") {
    return { title: "Groups", description: "Invite-only circles for schools, teams, clubs, and neighborhoods." };
  }
  if (pathname === "/approvals") {
    return { title: "Requests & Approvals", description: "Clear parent and driver approvals before riders are added." };
  }
  if (pathname === "/notifications") {
    return { title: "Notifications", description: "Status updates, approvals, invites, and destination alerts." };
  }
  if (pathname === "/settings") {
    return { title: "Settings", description: "Family profile, safety preferences, and theme settings." };
  }

  return { title: "Ride2Rider", description: "Private ride coordination for families and trusted groups." };
}

export function AppLayout() {
  const location = useLocation();
  const { state, setTheme } = useAppContext();
  const meta = getPageMeta(location.pathname);
  const unreadNotifications = state.notifications.filter(item => !item.read).length;
  const pendingApprovals = state.joinRequests.filter(
    request => request.parentStatus === "pending" || request.driverStatus === "pending"
  ).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/">
          <div className="brand__mark">R</div>
          <div>
            <div className="brand__name">Ride2Rider</div>
            <div className="brand__sub">Trusted family ride boards</div>
          </div>
        </NavLink>

        <nav className="sidebar__nav">
          {navigationItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cx("nav-link", isActive && "nav-link--active")}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar__trust card">
          <div className="sidebar__trust-title">
            <ShieldCheck size={16} />
            <span>Trust rules active</span>
          </div>
          <p>Invite-only groups, parent approvals, and trusted-driver checks are on for all demo rides.</p>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div>
            <div className="topbar__badges">
              <Badge tone="accent">Invite-only groups</Badge>
              <Badge tone="neutral">Demo data</Badge>
            </div>
            <h1 className="topbar__title">{meta.title}</h1>
            <p className="topbar__description">{meta.description}</p>
          </div>

          <div className="topbar__actions">
            <ButtonLink to="/groups" tone="secondary" size="sm" icon={<Users size={16} />} className="topbar__shortcut">
              Groups
            </ButtonLink>
            <ButtonLink to="/notifications" tone="secondary" size="sm" icon={<Bell size={16} />} className="topbar__shortcut">
              Alerts {unreadNotifications > 0 ? `(${unreadNotifications})` : ""}
            </ButtonLink>
            <button
              type="button"
              className="theme-toggle"
              aria-label="Toggle theme"
              onClick={() => setTheme(state.theme === "light" ? "dark" : "light")}
            >
              {state.theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <ButtonLink to="/rides/new" icon={<Plus size={16} />}>Create ride</ButtonLink>
          </div>
        </header>

        <div className="status-strip">
          <div className="status-strip__item">
            <span className="status-strip__label">Pending approvals</span>
            <strong>{pendingApprovals}</strong>
          </div>
          <div className="status-strip__item">
            <span className="status-strip__label">Unread alerts</span>
            <strong>{unreadNotifications}</strong>
          </div>
          <div className="status-strip__item">
            <span className="status-strip__label">Current family</span>
            <strong>{state.settings.profile.familyName}</strong>
          </div>
        </div>

        <main className="page-shell">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav">
        {mobileItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cx("mobile-nav__link", isActive && "mobile-nav__link--active")}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
