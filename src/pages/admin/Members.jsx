import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

function Members() {
  const {
    member: currentMember,
    loading: authLoading,
  } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadMembers() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("committee_members")
      .select(`
        id,
        full_name,
        role,
        is_active,
        created_at
      `)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      setError(error.message);
      setMembers([]);
    } else {
      setMembers(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) {
      loadMembers();
    }
  }, [authLoading]);

  async function updateMember(id, changes) {
    setSavingId(id);
    setError("");
    setMessage("");

    const { data, error } = await supabase
      .from("committee_members")
      .update(changes)
      .eq("id", id)
      .select(`
        id,
        full_name,
        role,
        is_active,
        created_at
      `)
      .single();

    setSavingId(null);

    if (error) {
      setError(error.message);
      return;
    }

    setMembers((current) =>
      current.map((member) =>
        member.id === id ? data : member
      )
    );

    setMessage("Committee member updated successfully.");
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (authLoading || loading) {
    return (
      <div className="admin-loading">
        Loading committee...
      </div>
    );
  }

  if (currentMember?.role !== "admin") {
    return (
      <div className="admin-access-denied">
        <div>
          <h1>Access denied</h1>
          <p>
            Only administrators can manage committee members.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="members-page">

      <div className="admin-page-heading">

        <div>
          <p className="section-label">
            ADMINISTRATION
          </p>

          <h1>
            Committee Members
          </h1>

          <p>
            Manage roles and access for existing committee accounts.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadMembers}
        >
          ↻ Refresh
        </button>

      </div>


      <div className="member-notice">
        <strong>
          Adding new users
        </strong>

        <p>
          New committee accounts should be created through
          the secure authentication process. This page manages
          roles and access for existing accounts.
        </p>
      </div>


      {error && (
        <div className="form-message error">
          {error}
        </div>
      )}

      {message && (
        <div className="form-message success">
          {message}
        </div>
      )}


      <div className="members-card">

        <div className="members-table-wrapper">

          <table className="members-table">

            <thead>

              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>

            </thead>

            <tbody>

              {members.map((member) => (

                <tr key={member.id}>

                  <td>

                    <div className="member-identity">

                      <div className="member-avatar">
                        {member.full_name
                          ?.charAt(0)
                          ?.toUpperCase() || "?"}
                      </div>

                      <div>
                        <strong>
                          {member.full_name}
                        </strong>

                        {member.id === currentMember.id && (
                          <span className="you-badge">
                            You
                          </span>
                        )}
                      </div>

                    </div>

                  </td>


                  <td>

                    <select
                      value={member.role}
                      disabled={
                        savingId === member.id
                      }
                      onChange={(event) =>
                        updateMember(
                          member.id,
                          {
                            role: event.target.value,
                          }
                        )
                      }
                    >

                      <option value="admin">
                        Admin
                      </option>

                      <option value="treasurer">
                        Treasurer
                      </option>

                      <option value="secretary">
                        Secretary
                      </option>

                      <option value="viewer">
                        Viewer
                      </option>

                    </select>

                  </td>


                  <td>

                    <span
                      className={
                        member.is_active
                          ? "member-status active"
                          : "member-status inactive"
                      }
                    >
                      {member.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>

                  </td>


                  <td>
                    {formatDate(
                      member.created_at
                    )}
                  </td>


                  <td>

                    <button
                      className={
                        member.is_active
                          ? "member-action deactivate"
                          : "member-action activate"
                      }
                      disabled={
                        savingId === member.id ||
                        member.id === currentMember.id
                      }
                      onClick={() =>
                        updateMember(
                          member.id,
                          {
                            is_active:
                              !member.is_active,
                          }
                        )
                      }
                    >
                      {member.is_active
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

      <div className="member-safety-note">

        <span>✓</span>

        <div>
          <strong>
            Access changes are database-controlled
          </strong>

          <p>
            Deactivating a member prevents that account from
            accessing committee features. Their historical
            financial records remain intact.
          </p>
        </div>

      </div>

    </div>
  );
}

export default Members;