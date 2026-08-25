import {
  Navigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";


const PATH_PERMISSIONS = {
  "/admin/dashboard":
    "dashboard",

  "/admin/donations":
    "donations",

  "/admin/expenses":
    "expenses",

  "/admin/funds":
    "funds",

  "/admin/reports":
    "reports",

  "/admin/announcements":
    "announcements",

  "/admin/programs":
    "programs",

  "/admin/members":
    "committee",

  "/admin/audit":
    "audit_logs",

  "/admin/prayer-times":
    "prayer_times",

  "/admin/messages":
    "messages",

  "/admin/mahall-members":
    "mahall_members",

  "/admin/external-contributors":
    "external_contributors",

  "/admin/contribution-analytics":
    "contribution_analytics",

  "/admin/donation-requests":
    "contribution_requests",
};


function RequireRole({
  allowedRoles = [],
  allowedPermission,
  children,
}) {
  const {
    user,
    member,
    hasPermission,
    loading,
  } = useAuth();

  const location =
    useLocation();


  if (loading) {
    return (
      <div className="admin-loading">
        Checking permissions...
      </div>
    );
  }


  if (!user) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
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


  /*
    Special route:
    EVERY ADMIN can open Users & Permissions.

    Fawaz gets the full controls inside the page.
  */

  if (
    location.pathname ===
      "/admin/user-management"
  ) {
    if (
      member.role === "admin"
    ) {
      return children;
    }

    return (
      <div className="admin-access-denied">
        <div>
          <h1>
            Access denied
          </h1>

          <p>
            Only administrators can manage
            committee users.
          </p>
        </div>
      </div>
    );
  }


  /*
    Super Admin bypasses all ordinary
    section permissions.
  */

  if (
    member.is_super_admin
  ) {
    return children;
  }


  const permission =
    allowedPermission ||
    PATH_PERMISSIONS[
      location.pathname
    ];


  if (permission) {

    if (
      hasPermission(
        permission
      )
    ) {
      return children;
    }


    return (
      <div className="admin-access-denied">
        <div>
          <h1>
            Access denied
          </h1>

          <p>
            You do not have permission
            to access this section.
          </p>
        </div>
      </div>
    );
  }


  if (
    allowedRoles.length > 0 &&
    allowedRoles.includes(
      member.role
    )
  ) {
    return children;
  }


  return (
    <div className="admin-access-denied">
      <div>
        <h1>
          Access denied
        </h1>

        <p>
          You do not have permission
          to access this section.
        </p>
      </div>
    </div>
  );
}


export default RequireRole;