import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";


const navigation = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: "⌂",
    permission: "dashboard",
  },
  {
    label: "Donations",
    path: "/admin/donations",
    icon: "＋",
    permission: "donations",
  },
  {
    label: "Expenses",
    path: "/admin/expenses",
    icon: "−",
    permission: "expenses",
  },
  {
    label: "Funds",
    path: "/admin/funds",
    icon: "◈",
    permission: "funds",
  },
  {
    label: "Reports",
    path: "/admin/reports",
    icon: "▥",
    permission: "reports",
  },
  {
    label: "Announcements",
    path: "/admin/announcements",
    icon: "◉",
    permission: "announcements",
  },
  {
    label: "Programs",
    path: "/admin/programs",
    icon: "◇",
    permission: "programs",
  },
  {
    label: "Committee",
    path: "/admin/members",
    icon: "♙",
    permission: "committee",
  },
  {
    label: "Audit Log",
    path: "/admin/audit",
    icon: "◷",
    permission: "audit_logs",
  },
  {
    label: "Prayer Times",
    path: "/admin/prayer-times",
    icon: "◷",
    permission: "prayer_times",
  },
  {
    label: "Messages",
    path: "/admin/messages",
    icon: "✉",
    permission: "messages",
  },
  {
    label: "Mahall Members",
    path: "/admin/mahall-members",
    icon: "♙",
    permission: "mahall_members",
  },
  {
    label: "External Contributors",
    path: "/admin/external-contributors",
    icon: "◉",
    permission: "external_contributors",
  },
  {
    label: "Contribution Analytics",
    path: "/admin/contribution-analytics",
    icon: "▦",
    permission: "contribution_analytics",
  },
  {
    label: "Contribution Requests",
    path: "/admin/donation-requests",
    icon: "₹",
    permission: "contribution_requests",
  },
];


function AdminLayout() {
  const navigate = useNavigate();

  const {
    member,
    loading,
    hasPermission,
  } = useAuth();


  async function handleLogout() {
    await supabase.auth.signOut();

    navigate(
      "/admin/login",
      { replace: true }
    );
  }


  if (loading) {
    return (
      <div className="admin-loading">
        Loading committee portal...
      </div>
    );
  }


  if (
    !member ||
    !member.is_active
  ) {
    return (
      <div className="admin-access-denied">
        <div>
          <h1>
            Access denied
          </h1>

          <p>
            Your account is not an active
            committee account.
          </p>
        </div>
      </div>
    );
  }


  const visibleNavigation =
    navigation.filter(
      (item) =>
        hasPermission(
          item.permission
        )
    );


  /*
    Users & Permissions is special.

    Every ADMIN can open it because admins
    are allowed to manage committee identities,
    roles and status.

    Only the Super Admin sees the actual
    permission-management controls inside.
  */

  const canManageUsers =
    member.role === "admin";


  return (
    <div className="admin-layout">

      <aside className="admin-sidebar">

        <div className="admin-brand">

          <div className="admin-brand-icon">
            🕌
          </div>

          <div>
            <strong>
              AL-NOOR
            </strong>

            <span>
              MAHAL MASJID
            </span>
          </div>

        </div>


        <div className="admin-sidebar-label">
          COMMITTEE
        </div>


        <nav className="admin-nav">

          {visibleNavigation.map(
            (item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({
                  isActive,
                }) =>
                  `admin-nav-item ${
                    isActive
                      ? "active"
                      : ""
                  }`
                }
              >
                <span className="admin-nav-icon">
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>
              </NavLink>
            )
          )}


          {canManageUsers && (
            <NavLink
              to="/admin/user-management"
              className={({
                isActive,
              }) =>
                `admin-nav-item ${
                  isActive
                    ? "active"
                    : ""
                }`
              }
            >
              <span className="admin-nav-icon">
                ♙
              </span>

              <span>
                Users & Permissions
              </span>
            </NavLink>
          )}

        </nav>


        <div className="admin-sidebar-bottom">

          <button
            className="admin-logout"
            onClick={handleLogout}
          >
            <span>
              ↪
            </span>

            <span>
              Sign Out
            </span>
          </button>

        </div>

      </aside>


      <div className="admin-main">

        <header className="admin-topbar">

          <div className="admin-breadcrumb">
            Committee Portal
          </div>


          <div className="admin-user">

            <div className="admin-user-avatar">
              {member.full_name
                ?.charAt(0)
                ?.toUpperCase() ||
                "A"}
            </div>


            <div>

              <strong>
                {member.full_name ||
                  "Committee Member"}
              </strong>

              <span>
                {member.is_super_admin
                  ? "Super Admin"
                  : member.role}
              </span>

            </div>

          </div>

        </header>


        <main className="admin-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}


export default AdminLayout;