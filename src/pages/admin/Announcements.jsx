import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

function Announcements() {
  const { member, loading: authLoading } = useAuth();

  const [announcements, setAnnouncements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    category: "community",
    content: "",
    publishDate: new Date()
      .toISOString()
      .split("T")[0],
    published: true,
  });


  async function loadAnnouncements() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("announcements")
      .select(`
        id,
        title,
        category,
        content,
        published,
        publish_date,
        created_at
      `)
      .order("publish_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setError(error.message);
      setAnnouncements([]);
    } else {
      setAnnouncements(data || []);
    }

    setLoading(false);
  }


  useEffect(() => {
    if (!authLoading) {
      loadAnnouncements();
    }
  }, [authLoading]);


  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }


  function handlePublishedChange(event) {
    setForm((current) => ({
      ...current,
      published: event.target.checked,
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
      setError("Please enter a title.");
      return;
    }

    if (!form.content.trim()) {
      setError("Please enter the announcement content.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("announcements")
      .insert({
        title: form.title.trim(),
        category: form.category,
        content: form.content.trim(),
        publish_date: form.publishDate,
        published: form.published,
        created_by: member.id,
      });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      form.published
        ? "Announcement published successfully."
        : "Announcement saved as draft."
    );

    setForm({
      title: "",
      category: "community",
      content: "",
      publishDate: new Date()
        .toISOString()
        .split("T")[0],
      published: true,
    });

    loadAnnouncements();
  }


  async function togglePublished(announcement) {
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("announcements")
      .update({
        published: !announcement.published,
      })
      .eq("id", announcement.id);

    if (error) {
      setError(error.message);
      return;
    }

    setAnnouncements((current) =>
      current.map((item) =>
        item.id === announcement.id
          ? {
              ...item,
              published: !announcement.published,
            }
          : item
      )
    );

    setMessage(
      announcement.published
        ? "Announcement unpublished."
        : "Announcement published."
    );
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
        Loading announcements...
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
            Only administrators and secretaries can manage announcements.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="announcement-admin-page">

      <div className="admin-page-heading">

        <div>

          <p className="section-label">
            COMMUNITY CONTENT
          </p>

          <h1>
            Announcements
          </h1>

          <p>
            Publish notices and updates for the Mahal community.
          </p>

        </div>

        <button
          className="secondary-button"
          onClick={loadAnnouncements}
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


      <div className="announcement-admin-layout">


        {/* Create form */}

        <section className="admin-form-card">

          <div className="admin-section-heading">

            <div>
              <h2>
                New Announcement
              </h2>

              <p>
                Create a notice for the community.
              </p>
            </div>

          </div>


          <form onSubmit={handleSubmit}>

            <div className="form-field">

              <label>
                Title
              </label>

              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Enter announcement title"
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
                <option value="community">
                  Community
                </option>

                <option value="jummah">
                  Jummah
                </option>

                <option value="madrasa">
                  Madrasa
                </option>

                <option value="education">
                  Education
                </option>

                <option value="welfare">
                  Welfare
                </option>

                <option value="ramadan">
                  Ramadan
                </option>

                <option value="general">
                  General
                </option>
              </select>

            </div>


            <div className="form-field">

              <label>
                Announcement
              </label>

              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                rows="7"
                placeholder="Write the announcement..."
                required
              />

            </div>


            <div className="form-field">

              <label>
                Publish Date
              </label>

              <input
                type="date"
                name="publishDate"
                value={form.publishDate}
                onChange={handleChange}
                required
              />

            </div>


            <label className="publish-toggle">

              <input
                type="checkbox"
                checked={form.published}
                onChange={handlePublishedChange}
              />

              <span>
                Publish immediately
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
                  : form.published
                    ? "Publish Announcement"
                    : "Save Draft"}
              </button>

            </div>

          </form>

        </section>


        {/* Existing announcements */}

        <section className="announcement-admin-list">

          <div className="admin-section-heading">

            <div>
              <h2>
                Existing Announcements
              </h2>

              <p>
                Manage published notices and drafts.
              </p>
            </div>

          </div>


          {announcements.length === 0 ? (

            <div className="admin-empty-card">
              <h3>
                No announcements yet
              </h3>

              <p>
                Create your first community announcement.
              </p>
            </div>

          ) : (

            <div className="admin-announcement-list">

              {announcements.map((announcement) => (

                <article
                  className="admin-announcement-card"
                  key={announcement.id}
                >

                  <div className="admin-announcement-top">

                    <span className="announcement-tag">
                      {announcement.category}
                    </span>

                    <span
                      className={
                        announcement.published
                          ? "content-status published"
                          : "content-status draft"
                      }
                    >
                      {announcement.published
                        ? "Published"
                        : "Draft"}
                    </span>

                  </div>


                  <h3>
                    {announcement.title}
                  </h3>


                  <p>
                    {announcement.content}
                  </p>


                  <div className="admin-announcement-footer">

                    <span>
                      {formatDate(
                        announcement.publish_date
                      )}
                    </span>

                    <button
                      className="content-action"
                      onClick={() =>
                        togglePublished(announcement)
                      }
                    >
                      {announcement.published
                        ? "Unpublish"
                        : "Publish"}
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

export default Announcements;