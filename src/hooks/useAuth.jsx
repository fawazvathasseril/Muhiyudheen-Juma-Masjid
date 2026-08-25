import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const ADMIN_PERMISSIONS = [
  "dashboard",
  "donations",
  "expenses",
  "funds",
  "reports",
  "transactions",
  "contribution_requests",
  "announcements",
  "programs",
  "prayer_times",
  "mahall_members",
  "external_contributors",
  "committee",
  "documents",
  "audit_logs",
  "settings",
  "messages",
  "contribution_analytics",
  "user_management",
];

export function useAuth() {
  const [user, setUser] =
    useState(null);

  const [member, setMember] =
    useState(null);

  const [permissions, setPermissions] =
    useState({});

  const [loading, setLoading] =
    useState(true);


  async function loadAuth() {
    setLoading(true);


    const {
      data: { user },
    } =
      await supabase.auth.getUser();


    if (!user) {
      setUser(null);
      setMember(null);
      setPermissions({});
      setLoading(false);
      return;
    }


    // ========================================
    // LOAD COMMITTEE MEMBER
    // ========================================

    const {
      data: memberData,
      error: memberError,
    } =
      await supabase
        .from("committee_members")
        .select(`
          id,
          full_name,
          role,
          is_active,
          is_super_admin
        `)
        .eq("id", user.id)
        .maybeSingle();


    if (
      memberError ||
      !memberData
    ) {
      setUser(user);
      setMember(null);
      setPermissions({});
      setLoading(false);
      return;
    }


    setUser(user);
    setMember(memberData);


    // ========================================
    // SUPER ADMIN
    // ========================================

    // Only the explicitly designated
    // super admin gets automatic full access.

    if (
      memberData.is_active &&
      memberData.is_super_admin
    ) {
      const fullAccess = {};

      ADMIN_PERMISSIONS.forEach(
        (permission) => {
          fullAccess[permission] = true;
        }
      );

      setPermissions(
        fullAccess
      );

      setLoading(false);
      return;
    }


    // ========================================
    // NORMAL USER
    // ========================================

    const {
      data: permissionRows,
      error: permissionError,
    } =
      await supabase
        .from("user_permissions")
        .select(`
          permission_key,
          can_view
        `)
        .eq(
          "committee_member_id",
          user.id
        );


    if (permissionError) {
      setPermissions({});
      setLoading(false);
      return;
    }


    const permissionMap = {};


    ADMIN_PERMISSIONS.forEach(
      (permission) => {
        permissionMap[permission] =
          false;
      }
    );


    (
      permissionRows || []
    ).forEach(
      (row) => {

        permissionMap[
          row.permission_key
        ] =
          row.can_view === true;

      }
    );


    setPermissions(
      permissionMap
    );

    setLoading(false);
  }


  useEffect(() => {

    loadAuth();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        () => {
          loadAuth();
        }
      );


    return () => {
      subscription.unsubscribe();
    };
  }, []);


  // ========================================
  // PERMISSION HELPER
  // ========================================

  function hasPermission(
    permission
  ) {

    if (
      !member ||
      !member.is_active
    ) {
      return false;
    }


    // ONLY the designated Super Admin
    // gets automatic unrestricted access.

    if (
      member.is_super_admin
    ) {
      return true;
    }


    return (
      permissions[
        permission
      ] === true
    );
  }


  return {
    user,
    member,

    role:
      member?.role || null,

    permissions,

    hasPermission,

    loading,
  };
}