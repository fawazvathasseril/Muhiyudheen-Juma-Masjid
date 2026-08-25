import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

function Programs() {
  const { member, loading: authLoading } = useAuth();

  const [programs, setPrograms] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    category: "education",
    description: "",
    schedule: "",
    time: "",
    isActive: true,
  });

  async function loadPrograms() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("programs")
      .select(`
        id,
        title,
        category,
        description,
        schedule,
        time,
        is_active,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setError(error.message);
      setPrograms([]);
    } else {
      setPrograms(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) {
      loadPrograms();
    }
  }, [authLoading]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleActiveChange(event) {
    setForm((current) => ({
      ...current,
      isActive: event.target.checked,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!member) {
      setError("You must be signed in as a committee member.");
      return;
    }

    if (!form.title.trim()) {
      setError("Please enter a program title.");
      return;
    }

    if (!form.description.trim()) {
      setError("Please enter a description.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("programs")
      .insert({
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        schedule: form.schedule.trim() || null,
        time: form.time.trim() || null,
        is_active: form.isActive,
        created_by: member.id,
      });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      form.isActive
        ? "Program added successfully."
        : "Program saved as inactive."
    );

    setForm({
      title: "",
      category: "education",
      description: "",
      schedule: "",
      time: "",
      isActive: true,
    });

    loadPrograms();
  }

  async function toggleActive(program) {
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("programs")
      .update({
        is_active: !program.is_active,
      })
      .eq("id", program.id);

    if (error) {
      setError(error.message);
      return;
    }

    setPrograms((current) =>
      current.map((item) =>
        item.id === program.id
          ? {
              ...item,
              is_active: !program.is_active,
            }
          : item
      )
    );

    setMessage(
      program.is_active
        ? "Program deactivated."
        : "Program activated."
    );
  }

  if (authLoading || loading) {
    return (
      <div className="admin-loading">
        Loading programs...
      </div>
    );
  }

  if (
    member?.role !== "admin" &&
    member?.role !== "secretary"
  ) {
    return (
      <div className="admin-access-denied">
        <div>
          <h1>Access denied</h1>

          <p>
            Only administrators and secretaries can manage programs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="program-admin-page">

      <div className="admin-page-heading">

        <div>
          <p className="section-label">
            COMMUNITY CONTENT
          </p>

          <h1>
            Programs
          </h1>

          <p>
            Manage educational, religious and community activities.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadPrograms}
        >
          ↻ Refresh
        </button>

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

      <div className="program-admin-layout">

        {/* Create form */}

        <section className="admin-form-card">

          <div className="admin-section-heading">
            <div>
              <h2>
                Add Program
              </h2>

              <p>
                Create a program for the Mahal website.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-field">

              <label>
                Program Title
              </label>

              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Weekly Quran Class"
                required
              />

            </div>

            <div className="form-field">

              <label>
                Category
              </label>

              <select
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                <option value="education">
                  Education
                </option>

                <option value="religious">
                  Religious
                </option>

                <option value="youth">
                  Youth
                </option>

                <option value="welfare">
                  Welfare
                </option>

                <option value="ramadan">
                  Ramadan
                </option>

                <option value="community">
                  Community
                </option>

                <option value="other">
                  Other
                </option>
              </select>

            </div>

            <div className="form-field">

              <label>
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="6"
                placeholder="Describe the program..."
                required
              />

            </div>

            <div className="form-field">

              <label>
                Schedule
              </label>

              <input
                type="text"
                name="schedule"
                value={form.schedule}
                onChange={handleChange}
                placeholder="e.g. Monday – Thursday"
              />

            </div>

            <div className="form-field">

              <label>
                Time
              </label>

              <input
                type="text"
                name="time"
                value={form.time}
                onChange={handleChange}
                placeholder="e.g. After Maghrib"
              />

            </div>

            <label className="publish-toggle">

              <input
                type="checkbox"
                checked={form.isActive}
                onChange={handleActiveChange}
              />

              <span>
                Publish program on website
              </span>

            </label>

            <div className="admin-form-actions">

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : form.isActive
                    ? "Add Program"
                    : "Save Inactive"}
              </button>

            </div>

          </form>

        </section>


        {/* Existing programs */}

        <section className="program-admin-list">

          <div className="admin-section-heading">

            <div>
              <h2>
                Existing Programs
              </h2>

              <p>
                Activate or deactivate programs.
              </p>
            </div>

          </div>

          {programs.length === 0 ? (

            <div className="admin-empty-card">

              <h3>
                No programs yet
              </h3>

              <p>
                Add your first community program.
              </p>

            </div>

          ) : (

            <div className="admin-program-list">

              {programs.map((program) => (

                <article
                  className="admin-program-card"
                  key={program.id}
                >

                  <div className="admin-program-top">

                    <span className="announcement-tag">
                      {program.category}
                    </span>

                    <span
                      className={
                        program.is_active
                          ? "content-status published"
                          : "content-status draft"
                      }
                    >
                      {program.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>

                  </div>

                  <h3>
                    {program.title}
                  </h3>

                  <p>
                    {program.description}
                  </p>

                  <div className="program-admin-meta">

                    {program.schedule && (
                      <span>
                        📅 {program.schedule}
                      </span>
                    )}

                    {program.time && (
                      <span>
                        🕒 {program.time}
                      </span>
                    )}

                  </div>

                  <div className="admin-program-footer">

                    <span>
                      {program.is_active
                        ? "Visible on website"
                        : "Hidden from website"}
                    </span>

                    <button
                      className="content-action"
                      onClick={() =>
                        toggleActive(program)
                      }
                    >
                      {program.is_active
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                  </div>

                </article>

              ))}

            </div>

          )}

        </section>

      </div>

    </div>
  );
}

export default Programs;