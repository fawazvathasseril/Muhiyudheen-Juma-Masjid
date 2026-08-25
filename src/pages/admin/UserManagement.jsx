import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";


const PERMISSIONS = [
  ["dashboard", "Dashboard"],
  ["donations", "Donations"],
  ["expenses", "Expenses"],
  ["funds", "Funds"],
  ["reports", "Reports"],
  ["transactions", "Transactions"],
  [
    "contribution_requests",
    "Contribution Requests",
  ],
  ["announcements", "Announcements"],
  ["programs", "Programs"],
  ["prayer_times", "Prayer Times"],
  ["mahall_members", "Mahall Members"],
  [
    "external_contributors",
    "External Contributors",
  ],
  ["committee", "Committee Management"],
  ["documents", "Documents"],
  ["audit_logs", "Audit Logs"],
  ["settings", "Settings"],
  ["messages", "Messages"],
  [
    "contribution_analytics",
    "Contribution Analytics",
  ],
  [
    "user_management",
    "Users & Permissions",
  ],
];


function emptyPermissionMap() {
  return Object.fromEntries(
    PERMISSIONS.map(
      ([key]) => [key, false]
    )
  );
}


function permissionsToMap(
  value
) {
  const map =
    emptyPermissionMap();

  if (
    !Array.isArray(value)
  ) {
    return map;
  }

  value.forEach(
    (key) => {
      if (
        Object.prototype.hasOwnProperty.call(
          map,
          key
        )
      ) {
        map[key] = true;
      }
    }
  );

  return map;
}


function mapToPermissionArray(
  map
) {
  return Object.entries(
    map
  )
    .filter(
      ([, enabled]) =>
        enabled
    )
    .map(
      ([key]) => key
    );
}


function UserManagement() {

  const {
    member,
    loading: authLoading,
  } = useAuth();


  const isSuperAdmin =
    member?.is_super_admin === true;

  const isAdmin =
    member?.role === "admin";


  /* ======================================
     GENERAL
  ====================================== */

  const [tab, setTab] =
    useState("users");

  const [users, setUsers] =
    useState([]);

  const [roles, setRoles] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  /* ======================================
     SEARCH
  ====================================== */

  const [search, setSearch] =
    useState("");


  /* ======================================
     USER EDITOR
  ====================================== */

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [userPermissions, setUserPermissions] =
    useState(emptyPermissionMap());

  const [savingUser, setSavingUser] =
    useState(false);


  /* ======================================
     ADD USER
  ====================================== */

  const [showAddUser, setShowAddUser] =
    useState(false);

  const [creatingUser, setCreatingUser] =
    useState(false);

  const [newUser, setNewUser] =
    useState({
      fullName: "",
      email: "",
      password: "",
      phone: "",
      position: "",
      role: "",
    });

  const [newUserPermissions, setNewUserPermissions] =
    useState(
      emptyPermissionMap()
    );


  /* ======================================
     ROLE EDITOR
  ====================================== */

  const [selectedRole, setSelectedRole] =
    useState(null);

  const [roleForm, setRoleForm] =
    useState({
      name: "",
      description: "",
      is_active: true,
      permissions:
        emptyPermissionMap(),
    });

  const [showRoleEditor, setShowRoleEditor] =
    useState(false);

  const [savingRole, setSavingRole] =
    useState(false);


  /* ======================================
     LOAD USERS
  ====================================== */

  async function loadUsers() {

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "committee_members"
        )
        .select(`
          id,
          full_name,
          email,
          phone,
          position,
          role,
          is_active,
          is_super_admin,
          created_at
        `)
        .order(
          "full_name"
        );


    if (error) {
      throw new Error(
        error.message
      );
    }


    setUsers(
      data || []
    );
  }


  /* ======================================
     LOAD ROLES
  ====================================== */

  async function loadRoles() {

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "committee_roles"
        )
        .select(`
          id,
          name,
          description,
          permissions,
          is_active,
          is_system_role,
          created_at
        `)
        .order(
          "name"
        );


    if (error) {
      throw new Error(
        error.message
      );
    }


    setRoles(
      data || []
    );
  }


  async function loadAll() {

    setLoading(true);
    setError("");

    try {

      await Promise.all([
        loadUsers(),
        loadRoles(),
      ]);

    } catch (err) {

      setError(
        err.message
      );

    } finally {

      setLoading(false);

    }
  }


  useEffect(() => {

    if (
      !authLoading
    ) {
      loadAll();
    }

  }, [authLoading]);


  /* ======================================
     OPEN USER
  ====================================== */

  async function openUser(
    user
  ) {

    setSelectedUser(
      user
    );

    setTab("users");
    setError("");
    setSuccess("");


    /*
      Regular admins don't need permission
      data at all.
    */

    if (!isSuperAdmin) {
      setUserPermissions(
        emptyPermissionMap()
      );
      return;
    }


    const {
      data,
      error,
    } =
      await supabase
        .from(
          "user_permissions"
        )
        .select(`
          permission_key,
          can_view
        `)
        .eq(
          "committee_member_id",
          user.id
        );


    if (error) {

      setError(
        error.message
      );

      return;
    }


    const map =
      emptyPermissionMap();


    (
      data || []
    ).forEach(
      (row) => {

        if (
          Object.prototype.hasOwnProperty.call(
            map,
            row.permission_key
          )
        ) {
          map[
            row.permission_key
          ] =
            row.can_view === true;
        }

      }
    );


    setUserPermissions(
      map
    );
  }


  /* ======================================
     ROLE DEFAULTS
  ====================================== */

  function roleDefaults(
    roleName
  ) {

    const role =
      roles.find(
        (item) =>
          item.name ===
          roleName
      );

    return role
      ? permissionsToMap(
          role.permissions
        )
      : emptyPermissionMap();
  }


  /* ======================================
     ADD USER ROLE
  ====================================== */

  function changeNewUserRole(
    roleName
  ) {

    setNewUser(
      (current) => ({
        ...current,
        role:
          roleName,
      })
    );


    /*
      Fawaz can immediately edit
      permission overrides.

      Regular admins simply inherit
      the role defaults.
    */

    if (
      isSuperAdmin
    ) {

      setNewUserPermissions(
        roleDefaults(
          roleName
        )
      );
    }
  }


  /* ======================================
     SAVE USER
  ====================================== */

  async function saveUser() {

    if (
      !selectedUser
    ) {
      return;
    }


    if (
      selectedUser.is_super_admin
    ) {

      setError(
        "The Super Admin account is protected."
      );

      return;
    }


    setSavingUser(
      true
    );

    setError("");
    setSuccess("");


    try {

      /*
        Everyone in this page is an admin,
        so they can manage identity/role/status.
      */

      const {
        error:
          memberError,
      } =
        await supabase
          .from(
            "committee_members"
          )
          .update({
            role:
              selectedUser.role,

            position:
              selectedUser.position,

            is_active:
              selectedUser.is_active,
          })
          .eq(
            "id",
            selectedUser.id
          );


      if (memberError) {
        throw new Error(
          memberError.message
        );
      }


      /*
        ONLY FAWAZ can save permissions.
      */

      if (
        isSuperAdmin
      ) {

        const rows =
          PERMISSIONS.map(
            ([key]) => ({
              committee_member_id:
                selectedUser.id,

              permission_key:
                key,

              can_view:
                userPermissions[
                  key
                ] ?? false,
            })
          );


        const {
          error:
            permissionError,
        } =
          await supabase
            .from(
              "user_permissions"
            )
            .upsert(
              rows,
              {
                onConflict:
                  "committee_member_id,permission_key",
              }
            );


        if (
          permissionError
        ) {
          throw new Error(
            permissionError.message
          );
        }

      }


      setUsers(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              selectedUser.id
                ? {
                    ...item,
                    role:
                      selectedUser.role,
                    position:
                      selectedUser.position,
                    is_active:
                      selectedUser.is_active,
                  }
                : item
          )
      );


      setSuccess(
        isSuperAdmin
          ? "User role, status and permissions updated."
          : "User role, position and status updated."
      );

    } catch (err) {

      setError(
        err.message
      );

    } finally {

      setSavingUser(
        false
      );
    }
  }

async function deleteUser() {
  if (!selectedUser) {
    return;
  }

  if (!isSuperAdmin) {
    setError(
      "Only the Super Admin can permanently delete users."
    );
    return;
  }

  if (selectedUser.is_super_admin) {
    setError(
      "The Super Admin account cannot be deleted."
    );
    return;
  }

  const confirmed = window.confirm(
    `Permanently delete ${selectedUser.full_name}? This will remove their login account and committee account. Historical financial and audit records will be preserved.`
  );

  if (!confirmed) {
    return;
  }

  setSavingUser(true);
  setError("");
  setSuccess("");

  try {
    const {
      data: {
        session,
      },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-committee-user`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${session.access_token}`,

          apikey:
            import.meta.env
              .VITE_SUPABASE_ANON_KEY,
        },

        body: JSON.stringify({
          userId:
            selectedUser.id,
        }),
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
          "Unable to delete user."
      );
    }

    setUsers(
      (current) =>
        current.filter(
          (user) =>
            user.id !==
            selectedUser.id
        )
    );

    setSelectedUser(null);

    setSuccess(
      `${result.deletedUser?.fullName || "User"} was permanently deleted.`
    );

  } catch (err) {

    setError(
      err.message ||
        "Unable to delete user."
    );

  } finally {

    setSavingUser(false);
  }
}
  /* ======================================
     NEW USER FORM
  ====================================== */

  function updateNewUser(
    event
  ) {

    const {
      name,
      value,
    } = event.target;


    setNewUser(
      (current) => ({
        ...current,
        [name]:
          value,
      })
    );
  }


  function resetNewUser() {

    const firstRole =
      roles.find(
        (role) =>
          role.is_active
      );


    setNewUser({
      fullName: "",
      email: "",
      password: "",
      phone: "",
      position: "",
      role:
        firstRole?.name ||
        "",
    });


    if (
      isSuperAdmin &&
      firstRole
    ) {
      setNewUserPermissions(
        roleDefaults(
          firstRole.name
        )
      );
    } else {
      setNewUserPermissions(
        emptyPermissionMap()
      );
    }
  }


  /* ======================================
     CREATE USER
  ====================================== */

  async function createUser() {

    setError("");
    setSuccess("");


    if (
      !newUser.fullName.trim()
    ) {
      setError(
        "Full name is required."
      );
      return;
    }


    if (
      !newUser.email.trim()
    ) {
      setError(
        "Email is required."
      );
      return;
    }


    if (
      newUser.password.length <
      8
    ) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }


    if (
      !newUser.role
    ) {
      setError(
        "Please select a role."
      );
      return;
    }


    setCreatingUser(
      true
    );


    try {

      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase
          .auth.getSession();


      if (
        sessionError ||
        !session
      ) {
        throw new Error(
          "Your session has expired."
        );
      }


      /*
        Only Fawaz sends permission overrides.
        Regular admins send an empty array.
        The Edge Function applies the role defaults.
      */

      const permissions =
        isSuperAdmin
          ? mapToPermissionArray(
              newUserPermissions
            )
          : [];


      const response =
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-committee-user`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,

              apikey:
                import.meta.env
                  .VITE_SUPABASE_ANON_KEY,
            },

            body:
              JSON.stringify({
                fullName:
                  newUser.fullName.trim(),

                email:
                  newUser.email
                    .trim()
                    .toLowerCase(),

                password:
                  newUser.password,

                phone:
                  newUser.phone.trim() ||
                  null,

                position:
                  newUser.position.trim() ||
                  null,

                role:
                  newUser.role,

                permissions,
              }),
          }
        );


      const result =
        await response.json();


      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to create user."
        );
      }


      setShowAddUser(
        false
      );

      resetNewUser();

      await loadUsers();

      setSuccess(
        `${result.user?.fullName || "User"} was created successfully.`
      );

    } catch (err) {

      setError(
        err.message
      );

    } finally {

      setCreatingUser(
        false
      );
    }
  }


  /* ======================================
     SUPER ADMIN PERMISSION CHANGES
  ====================================== */

  function togglePermission(
    key
  ) {

    if (
      !isSuperAdmin
    ) {
      return;
    }


    setUserPermissions(
      (current) => ({
        ...current,
        [key]:
          !current[key],
      })
    );
  }


  function enableAllPermissions() {

    if (
      !isSuperAdmin
    ) {
      return;
    }


    const next =
      emptyPermissionMap();


    PERMISSIONS.forEach(
      ([key]) => {
        next[key] = true;
      }
    );


    setUserPermissions(
      next
    );
  }


  function toggleNewPermission(
    key
  ) {

    if (
      !isSuperAdmin
    ) {
      return;
    }


    setNewUserPermissions(
      (current) => ({
        ...current,
        [key]:
          !current[key],
      })
    );
  }


  function enableAllNewPermissions() {

    if (
      !isSuperAdmin
    ) {
      return;
    }


    const next =
      emptyPermissionMap();


    PERMISSIONS.forEach(
      ([key]) => {
        next[key] = true;
      }
    );


    setNewUserPermissions(
      next
    );
  }


  /* ======================================
     ROLE MANAGEMENT
  ====================================== */

  function openNewRole() {

    setSelectedRole(
      null
    );

    setRoleForm({
      name: "",
      description: "",
      is_active: true,
      permissions:
        emptyPermissionMap(),
    });

    setShowRoleEditor(
      true
    );

    setError("");
    setSuccess("");
  }


  function openRole(
    role
  ) {

    if (
      !isSuperAdmin
    ) {
      return;
    }


    setSelectedRole(
      role
    );

    setRoleForm({
      name:
        role.name,

      description:
        role.description ||
        "",

      is_active:
        role.is_active,

      permissions:
        permissionsToMap(
          role.permissions
        ),
    });

    setShowRoleEditor(
      true
    );

    setError("");
    setSuccess("");
  }


  function toggleRolePermission(
    key
  ) {

    setRoleForm(
      (current) => ({
        ...current,

        permissions: {
          ...current.permissions,

          [key]:
            !current.permissions[
              key
            ],
        },
      })
    );
  }


  async function saveRole() {

    if (
      !isSuperAdmin
    ) {
      return;
    }


    if (
      !roleForm.name.trim()
    ) {
      setError(
        "Role name is required."
      );
      return;
    }


    setSavingRole(
      true
    );

    setError("");
    setSuccess("");


    try {

      const payload = {
        name:
          roleForm.name.trim(),

        description:
          roleForm.description.trim() ||
          null,

        is_active:
          roleForm.is_active,

        permissions:
          mapToPermissionArray(
            roleForm.permissions
          ),
      };


      if (
        selectedRole
      ) {

        const {
          error,
        } =
          await supabase
            .from(
              "committee_roles"
            )
            .update(
              payload
            )
            .eq(
              "id",
              selectedRole.id
            );


        if (error) {
          throw new Error(
            error.message
          );
        }


        setSuccess(
          "Role updated successfully."
        );

      } else {

        const {
          error,
        } =
          await supabase
            .from(
              "committee_roles"
            )
            .insert(
              payload
            );


        if (error) {
          throw new Error(
            error.message
          );
        }


        setSuccess(
          "Role created successfully."
        );
      }


      await loadRoles();

      setShowRoleEditor(
        false
      );

      setSelectedRole(
        null
      );

    } catch (err) {

      setError(
        err.message
      );

    } finally {

      setSavingRole(
        false
      );
    }
  }


  async function deleteRole(role) {
  if (!isSuperAdmin) {
    return;
  }

  if (role.is_system_role) {
    setError(
      "Built-in system roles cannot be deleted."
    );
    return;
  }

  // Check whether any committee members
  // are currently using this role.
  const {
    count,
    error: countError,
  } =
    await supabase
      .from("committee_members")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "role",
        role.name
      );

  if (countError) {
    setError(
      countError.message
    );
    return;
  }

  if ((count || 0) > 0) {
    setError(
      `Cannot delete "${role.name}" because ${count} user${count === 1 ? " is" : "s are"} currently assigned to it. Reassign those users first.`
    );
    return;
  }

  const confirmed =
    window.confirm(
      `Permanently delete the "${role.name}" role? This cannot be undone.`
    );

  if (!confirmed) {
    return;
  }

  setError("");
  setSuccess("");

  const {
    error,
  } =
    await supabase
      .from(
        "committee_roles"
      )
      .delete()
      .eq(
        "id",
        role.id
      );

  if (error) {
    setError(
      error.message
    );
    return;
  }

  setSelectedRole(null);
  setShowRoleEditor(false);

  await loadRoles();

  setSuccess(
    `The "${role.name}" role was permanently deleted.`
  );
}

  /* ======================================
     FILTER
  ====================================== */

  const filteredUsers =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();


        if (!query) {
          return users;
        }


        return users.filter(
          (user) =>
            user.full_name
              ?.toLowerCase()
              .includes(query) ||
            user.email
              ?.toLowerCase()
              .includes(query) ||
            user.role
              ?.toLowerCase()
              .includes(query) ||
            user.position
              ?.toLowerCase()
              .includes(query)
        );
      },
      [
        users,
        search,
      ]
    );


  const activeRoles =
    roles.filter(
      (role) =>
        role.is_active
    );


  /* ======================================
     LOADING / ACCESS
  ====================================== */

  if (
    authLoading ||
    loading
  ) {
    return (
      <div className="admin-loading">
        Loading user management...
      </div>
    );
  }


  if (
    !member ||
    !member.is_active ||
    !isAdmin
  ) {
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


  return (
    <div className="user-management-page">

      {/* HEADER */}

      <div className="admin-page-heading">

        <div>

          <p className="section-label">
            ACCESS CONTROL
          </p>

          <h1>
            Users & Permissions
          </h1>

          <p>
            Manage committee accounts,
            roles and access.
          </p>

        </div>


        {tab === "users" && (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setError("");
              setSuccess("");
              resetNewUser();
              setShowAddUser(true);
            }}
          >
            + Add User
          </button>
        )}


        {tab === "roles" &&
          isSuperAdmin && (
            <button
              type="button"
              className="primary-button"
              onClick={openNewRole}
            >
              + Add Role
            </button>
          )}

      </div>


      {/* MESSAGES */}

      {error && (
        <div className="form-message error">
          {error}
        </div>
      )}


      {success && (
        <div className="form-message success">
          {success}
        </div>
      )}


      {/* TABS */}

      <div className="user-management-tabs">

        <button
          type="button"
          className={
            tab === "users"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("users")
          }
        >
          Users
        </button>


        {isSuperAdmin && (
          <button
            type="button"
            className={
              tab === "roles"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("roles")
            }
          >
            Roles
          </button>
        )}

      </div>


      {/* ==================================
          USERS
      ================================== */}

      {tab === "users" && (
        <>

          <div className="user-management-toolbar">

            <input
              type="search"
              placeholder="Search users by name, email, role or position..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

          </div>


          <div className="user-management-content">

            {/* USER LIST */}

            <section className="user-list-panel">

              <div className="user-list-heading">

                <h2>
                  Committee Users
                </h2>

                <span>
                  {
                    filteredUsers.length
                  }
                </span>

              </div>


              <div className="user-list">

                {filteredUsers.length === 0 ? (

                  <div className="user-empty">
                    No users found.
                  </div>

                ) : (

                  filteredUsers.map(
                    (user) => (

                      <button
                        type="button"
                        key={user.id}
                        className={
                          selectedUser?.id ===
                          user.id
                            ? "user-row active"
                            : "user-row"
                        }
                        onClick={() =>
                          openUser(user)
                        }
                      >

                        <div className="user-avatar">
                          {user.full_name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            "U"}
                        </div>


                        <div className="user-row-info">

                          <strong>
                            {
                              user.full_name ||
                              "Unnamed User"
                            }
                          </strong>

                          <span>
                            {
                              user.email ||
                              "No email"
                            }
                          </span>

                        </div>


                        <div className="user-row-meta">

                          <span>
                            {user.is_super_admin
                              ? "Super Admin"
                              : user.role}
                          </span>

                          <small
                            className={
                              user.is_active
                                ? "user-active"
                                : "user-disabled"
                            }
                          >
                            {user.is_active
                              ? "ACTIVE"
                              : "DISABLED"}
                          </small>

                        </div>

                      </button>
                    )
                  )
                )}

              </div>

            </section>


            {/* EDITOR */}

            <section className="user-permissions-panel">

              {!selectedUser ? (

                <div className="user-permissions-empty">

                  <div className="permissions-empty-icon">
                    ✓
                  </div>

                  <h2>
                    Select a user
                  </h2>

                  <p>
                    Select a committee member
                    to manage their role,
                    position and status.
                  </p>

                </div>

              ) : (

                <>

                  <div className="selected-user-heading">

                    <div>

                      <p className="section-label">
                        USER ACCESS
                      </p>

                      <h2>
                        {
                          selectedUser.full_name
                        }
                      </h2>

                      <p>
                        {
                          selectedUser.email ||
                          "No email"
                        }
                      </p>

                    </div>


                    <span
                      className={
                        selectedUser.is_super_admin
                          ? "user-profile-status active"
                          : selectedUser.is_active
                            ? "user-profile-status active"
                            : "user-profile-status inactive"
                      }
                    >
                      {selectedUser.is_super_admin
                        ? "Super Admin"
                        : selectedUser.is_active
                          ? "Active"
                          : "Disabled"}
                    </span>

                  </div>


                  {selectedUser.is_super_admin ? (

                    <div className="super-admin-notice">

                      <strong>
                        Super Admin Account
                      </strong>

                      <p>
                        This account is permanently
                        protected. Its role, status
                        and permissions cannot be
                        changed.
                      </p>

                    </div>

                  ) : (

                    <>

                      {/* ROLE */}

                      <div className="user-role-section">

                        <label>
                          Role
                        </label>

                        <select
                          value={
                            selectedUser.role ||
                            ""
                          }
                          onChange={(event) =>
                            setSelectedUser(
                              (current) => ({
                                ...current,
                                role:
                                  event.target.value,
                              })
                            )
                          }
                        >

                          <option value="">
                            Select role
                          </option>

                          {activeRoles.map(
                            (role) => (

                              <option
                                key={role.id}
                                value={role.name}
                              >
                                {role.name}
                              </option>

                            )
                          )}

                        </select>


                        <p>
                          {isSuperAdmin
                            ? "You can assign any active role and manage the person's individual permissions below."
                            : "You can assign or change this person's role. Individual permissions are managed by the Super Admin."}
                        </p>

                      </div>


                      {/* POSITION */}

                      <div className="form-field">

                        <label>
                          Position
                        </label>

                        <input
                          type="text"
                          value={
                            selectedUser.position ||
                            ""
                          }
                          onChange={(event) =>
                            setSelectedUser(
                              (current) => ({
                                ...current,
                                position:
                                  event.target.value,
                              })
                            )
                          }
                          placeholder="e.g. President, Secretary, Treasurer..."
                        />

                      </div>


                      {/* STATUS */}

                      <div className="user-status-section">

                        <div>

                          <strong>
                            Account Status
                          </strong>

                          <p>
                            Disabled users cannot
                            access the committee portal.
                          </p>

                        </div>


                        <button
                          type="button"
                          className={
                            selectedUser.is_active
                              ? "user-status-toggle active"
                              : "user-status-toggle inactive"
                          }
                          onClick={() =>
                            setSelectedUser(
                              (current) => ({
                                ...current,
                                is_active:
                                  !current.is_active,
                              })
                            )
                          }
                        >

                          <span />

                          {selectedUser.is_active
                            ? "Active"
                            : "Disabled"}

                        </button>

                      </div>


                      {/* Fawaz-only permissions */}

                      {isSuperAdmin && (

                        <div className="permissions-section">

                          <div className="permissions-heading">

                            <div>

                              <h3>
                                Section Access
                              </h3>

                              <p>
                                Only the Super Admin
                                can change what this
                                user can see or manage.
                              </p>

                            </div>


                            <button
                              type="button"
                              className="text-button"
                              onClick={
                                enableAllPermissions
                              }
                            >
                              Enable all
                            </button>

                          </div>


                          <div className="permissions-grid">

                            {PERMISSIONS.map(
                              ([
                                key,
                                label,
                              ]) => (

                                <label
                                  className="permission-option"
                                  key={key}
                                >

                                  <input
                                    type="checkbox"
                                    checked={
                                      userPermissions[
                                        key
                                      ] ?? false
                                    }
                                    onChange={() =>
                                      togglePermission(
                                        key
                                      )
                                    }
                                  />

                                  <span>
                                    {label}
                                  </span>

                                </label>

                              )
                            )}

                          </div>

                        </div>
                      )}


                      <div className="user-permissions-actions">

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            openUser(
                              selectedUser
                            )
                          }
                          disabled={
                            savingUser
                          }
                        >
                          Reset
                        </button>


                        <button
                          type="button"
                          className="primary-button"
                          onClick={
                            saveUser
                          }
                          disabled={
                            savingUser
                          }
                        >
                          {savingUser
                            ? "Saving..."
                            : "Save Changes"}
                        </button>

                      </div>


                      {/* DELETE — FAWAZ ONLY */}

                      {isSuperAdmin && (

                        <div className="user-danger-zone">

                          <div>

                            <strong>
                              Permanent Deletion
                            </strong>

                            <p>
                              This permanently removes
                              the user's login account.
                              Financial and audit history
                              is preserved.
                            </p>

                          </div>


                          <button
  type="button"
  className="member-action deactivate"
  onClick={deleteUser}
  disabled={savingUser}
>
  {savingUser
    ? "Deleting..."
    : "Delete User"}
</button>

                        </div>
                      )}

                    </>
                  )}

                </>

              )}

            </section>

          </div>

        </>
      )}


      {/* ==================================
          ROLES — FAWAZ ONLY
      ================================== */}

      {tab === "roles" &&
        isSuperAdmin && (

        <div className="roles-management-layout">

          <section className="roles-list-panel">

            <div className="user-list-heading">

              <h2>
                Committee Roles
              </h2>

              <span>
                {roles.length}
              </span>

            </div>


            <div className="roles-list">

              {roles.map(
                (role) => (

                  <button
                    key={role.id}
                    type="button"
                    className={
                      selectedRole?.id ===
                      role.id
                        ? "role-row active"
                        : "role-row"
                    }
                    onClick={() =>
                      openRole(
                        role
                      )
                    }
                  >

                    <div className="role-row-icon">
                      ◇
                    </div>


                    <div className="role-row-info">

                      <strong>
                        {role.name}
                      </strong>

                      <span>
                        {
                          role.description ||
                          "No description"
                        }
                      </span>

                    </div>


                    <div className="role-row-meta">

                      {role.is_system_role && (
                        <small>
                          SYSTEM
                        </small>
                      )}

                      <span
                        className={
                          role.is_active
                            ? "user-active"
                            : "user-disabled"
                        }
                      >
                        {role.is_active
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>

                    </div>

                  </button>
                )
              )}

            </div>

          </section>


          <section className="role-editor-panel">

            {!showRoleEditor ? (

              <div className="user-permissions-empty">

                <div className="permissions-empty-icon">
                  ◇
                </div>

                <h2>
                  Select a role
                </h2>

                <p>
                  Create or edit role templates
                  and their default permissions.
                </p>

              </div>

            ) : (

              <>

                <div className="selected-user-heading">

                  <div>

                    <p className="section-label">
                      ROLE MANAGEMENT
                    </p>

                    <h2>
                      {selectedRole
                        ? `Edit ${selectedRole.name}`
                        : "Create New Role"}
                    </h2>

                  </div>

                </div>


                <div className="form-field">

                  <label>
                    Role Name
                  </label>

                  <input
                    type="text"
                    value={
                      roleForm.name
                    }
                    disabled={
                      selectedRole?.is_system_role
                    }
                    onChange={(event) =>
                      setRoleForm(
                        (current) => ({
                          ...current,
                          name:
                            event.target.value,
                        })
                      )
                    }
                  />

                </div>


                <div className="form-field">

                  <label>
                    Description
                  </label>

                  <textarea
                    rows="3"
                    value={
                      roleForm.description
                    }
                    onChange={(event) =>
                      setRoleForm(
                        (current) => ({
                          ...current,
                          description:
                            event.target.value,
                        })
                      )
                    }
                  />

                </div>


                <div className="permissions-section">

                  <div className="permissions-heading">

                    <div>

                      <h3>
                        Default Permissions
                      </h3>

                      <p>
                        These become the default
                        permissions when the role
                        is assigned.
                      </p>

                    </div>


                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {

                        const all =
                          emptyPermissionMap();

                        PERMISSIONS.forEach(
                          ([key]) => {
                            all[key] = true;
                          }
                        );

                        setRoleForm(
                          (current) => ({
                            ...current,
                            permissions:
                              all,
                          })
                        );
                      }}
                    >
                      Enable all
                    </button>

                  </div>


                  <div className="permissions-grid">

                    {PERMISSIONS.map(
                      ([
                        key,
                        label,
                      ]) => (

                        <label
                          className="permission-option"
                          key={key}
                        >

                          <input
                            type="checkbox"
                            checked={
                              roleForm
                                .permissions[
                                  key
                                ] ??
                                false
                            }
                            onChange={() =>
                              setRoleForm(
                                (current) => ({
                                  ...current,
                                  permissions: {
                                    ...current.permissions,
                                    [key]:
                                      !current
                                        .permissions[
                                          key
                                        ],
                                  },
                                })
                              )
                            }
                          />

                          <span>
                            {label}
                          </span>

                        </label>

                      )
                    )}

                  </div>

                </div>


                <div className="user-status-section">

                  <div>

                    <strong>
                      Role Status
                    </strong>

                    <p>
                      Inactive roles cannot be
                      assigned to new users.
                    </p>

                  </div>


                  <button
                    type="button"
                    className={
                      roleForm.is_active
                        ? "user-status-toggle active"
                        : "user-status-toggle inactive"
                    }
                    disabled={
                      selectedRole?.is_system_role
                    }
                    onClick={() =>
                      setRoleForm(
                        (current) => ({
                          ...current,
                          is_active:
                            !current.is_active,
                        })
                      )
                    }
                  >

                    <span />

                    {roleForm.is_active
                      ? "Active"
                      : "Inactive"}

                  </button>

                </div>


                <div className="user-permissions-actions">

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setShowRoleEditor(
                        false
                      );
                      setSelectedRole(
                        null
                      );
                    }}
                  >
                    Cancel
                  </button>


                  <button
                    type="button"
                    className="primary-button"
                    onClick={
                      saveRole
                    }
                    disabled={
                      savingRole
                    }
                  >
                    {savingRole
                      ? "Saving..."
                      : selectedRole
                        ? "Save Role"
                        : "Create Role"}
                  </button>

                </div>


                {selectedRole &&
  !selectedRole.is_system_role && (

  <div className="role-danger-zone">

    <div>

      <strong>
        Danger Zone
      </strong>

      <p>
        Deactivating keeps the role in the
        system. Deleting permanently removes it.
        A role can only be deleted when no user
        is assigned to it.
      </p>

    </div>


    <div className="role-danger-actions">

      <button
        type="button"
        className={
          roleForm.is_active
            ? "member-action deactivate"
            : "secondary-button"
        }
        onClick={async () => {

          const {
            error,
          } =
            await supabase
              .from(
                "committee_roles"
              )
              .update({
                is_active:
                  !roleForm.is_active,
              })
              .eq(
                "id",
                selectedRole.id
              );

          if (error) {
            setError(
              error.message
            );
            return;
          }

          const updatedRole = {
            ...selectedRole,
            is_active:
              !roleForm.is_active,
          };

          setSelectedRole(
            updatedRole
          );

          setRoleForm(
            (current) => ({
              ...current,
              is_active:
                !current.is_active,
            })
          );

          await loadRoles();

          setSuccess(
            `Role ${
              updatedRole.is_active
                ? "activated"
                : "deactivated"
            } successfully.`
          );
        }}
      >
        {roleForm.is_active
          ? "Deactivate Role"
          : "Activate Role"}
      </button>


      <button
        type="button"
        className="member-action danger"
        onClick={() =>
          deleteRole(
            selectedRole
          )
        }
      >
        Delete Role
      </button>

    </div>

  </div>

)}
              </>

            )}

          </section>

        </div>
      )}


      {/* ==================================
          ADD USER MODAL
      ================================== */}

      {showAddUser && (

        <div className="user-modal-overlay">

          <div className="user-modal">

            <button
              type="button"
              className="user-modal-close"
              onClick={() => {
                if (
                  !creatingUser
                ) {
                  setShowAddUser(
                    false
                  );
                  resetNewUser();
                }
              }}
            >
              ×
            </button>


            <p className="section-label">
              NEW COMMITTEE ACCOUNT
            </p>

            <h2>
              Add User
            </h2>


            <p className="user-modal-intro">
              Assign the person's role and
              committee position.
              {isSuperAdmin &&
                " As Super Admin, you can also customize their section access."}
            </p>


            <div className="form-field">

              <label>
                Full Name
              </label>

              <input
                type="text"
                name="fullName"
                value={
                  newUser.fullName
                }
                onChange={
                  updateNewUser
                }
                placeholder="Full name"
              />

            </div>


            <div className="form-field">

              <label>
                Email
              </label>

              <input
                type="email"
                name="email"
                value={
                  newUser.email
                }
                onChange={
                  updateNewUser
                }
                placeholder="Email address"
              />

            </div>


            <div className="user-modal-two-column">

              <div className="form-field">

                <label>
                  Temporary Password
                </label>

                <input
                  type="password"
                  name="password"
                  value={
                    newUser.password
                  }
                  onChange={
                    updateNewUser
                  }
                  placeholder="Minimum 8 characters"
                />

              </div>


              <div className="form-field">

                <label>
                  Phone
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={
                    newUser.phone
                  }
                  onChange={
                    updateNewUser
                  }
                  placeholder="Optional"
                />

              </div>

            </div>


            <div className="user-modal-two-column">

              <div className="form-field">

                <label>
                  Role
                </label>

                <select
                  value={
                    newUser.role
                  }
                  onChange={(event) =>
                    changeNewUserRole(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    Select role
                  </option>

                  {activeRoles.map(
                    (role) => (
                      <option
                        key={
                          role.id
                        }
                        value={
                          role.name
                        }
                      >
                        {role.name}
                      </option>
                    )
                  )}

                </select>

              </div>


              <div className="form-field">

                <label>
                  Position
                </label>

                <input
                  type="text"
                  name="position"
                  value={
                    newUser.position
                  }
                  onChange={
                    updateNewUser
                  }
                  placeholder="President, Secretary, Treasurer..."
                />

              </div>

            </div>


            {isSuperAdmin && (

              <div className="new-user-permission-section">

                <div className="permissions-heading">

                  <div>

                    <h3>
                      Section Access
                    </h3>

                    <p>
                      Set the actual sections
                      this person can access.
                    </p>

                  </div>


                  <button
                    type="button"
                    className="text-button"
                    onClick={
                      enableAllNewPermissions
                    }
                  >
                    Enable all
                  </button>

                </div>


                <div className="permissions-grid">

                  {PERMISSIONS.map(
                    ([
                      key,
                      label,
                    ]) => (

                      <label
                        className="permission-option"
                        key={key}
                      >

                        <input
                          type="checkbox"
                          checked={
                            newUserPermissions[
                              key
                            ] ?? false
                          }
                          onChange={() =>
                            toggleNewPermission(
                              key
                            )
                          }
                        />

                        <span>
                          {label}
                        </span>

                      </label>

                    )
                  )}

                </div>

              </div>

            )}


            {!isSuperAdmin && (

              <div className="role-template-note">

                <strong>
                  Role permissions
                </strong>

                <p>
                  This account will receive the
                  default access defined for the
                  selected role. Only the Super
                  Admin can customize individual
                  section access.
                </p>

              </div>
            )}


            <div className="user-modal-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowAddUser(
                    false
                  );
                  resetNewUser();
                }}
                disabled={
                  creatingUser
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="primary-button"
                onClick={
                  createUser
                }
                disabled={
                  creatingUser
                }
              >
                {creatingUser
                  ? "Creating..."
                  : "Create Account"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}


export default UserManagement;