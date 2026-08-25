import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

function PrayerTimes() {
  const { member, loading: authLoading } = useAuth();

  const [prayerTimes, setPrayerTimes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    prayerDate: new Date()
      .toISOString()
      .split("T")[0],

    fajr: "",
    sunrise: "",
    dhuhr: "",
    asr: "",
    maghrib: "",
    isha: "",
    jummah: "",
  });

  async function loadPrayerTimes() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("prayer_times")
      .select(`
        id,
        prayer_date,
        fajr,
        sunrise,
        dhuhr,
        asr,
        maghrib,
        isha,
        jummah
      `)
      .order("prayer_date", {
        ascending: false,
      })
      .limit(30);

    if (error) {
      setError(error.message);
      setPrayerTimes([]);
    } else {
      setPrayerTimes(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) {
      loadPrayerTimes();
    }
  }, [authLoading]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
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

    setSaving(true);

    const prayerData = {
      prayer_date: form.prayerDate,
      fajr: form.fajr || null,
      sunrise: form.sunrise || null,
      dhuhr: form.dhuhr || null,
      asr: form.asr || null,
      maghrib: form.maghrib || null,
      isha: form.isha || null,
      jummah: form.jummah || null,
      created_by: member.id,
    };

    /*
     * Because prayer_date is UNIQUE, we use UPSERT.
     * That means entering the same date again updates
     * that day's existing schedule instead of creating
     * a duplicate.
     */

    const { error } = await supabase
      .from("prayer_times")
      .upsert(prayerData, {
        onConflict: "prayer_date",
      });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      "Prayer timetable saved successfully."
    );

    loadPrayerTimes();
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function loadIntoForm(item) {
    setForm({
      prayerDate: item.prayer_date,
      fajr: item.fajr || "",
      sunrise: item.sunrise || "",
      dhuhr: item.dhuhr || "",
      asr: item.asr || "",
      maghrib: item.maghrib || "",
      isha: item.isha || "",
      jummah: item.jummah || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (authLoading || loading) {
    return (
      <div className="admin-loading">
        Loading prayer times...
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
            Only administrators and secretaries can manage prayer times.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="prayer-admin-page">

      <div className="admin-page-heading">

        <div>
          <p className="section-label">
            MASJID SCHEDULE
          </p>

          <h1>
            Prayer Times
          </h1>

          <p>
            Manage the daily prayer and Jummah timetable.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadPrayerTimes}
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

      <div className="prayer-admin-layout">

        {/* Form */}

        <section className="admin-form-card">

          <div className="admin-section-heading">

            <div>
              <h2>
                Daily Timetable
              </h2>

              <p>
                Enter the Jama'ah times used by your Mahal.
              </p>
            </div>

          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-field">

              <label>
                Date
              </label>

              <input
                type="date"
                name="prayerDate"
                value={form.prayerDate}
                onChange={handleChange}
                required
              />

            </div>


            <div className="prayer-admin-grid">

              <div className="form-field">
                <label>Fajr</label>

                <input
                  type="time"
                  name="fajr"
                  value={form.fajr}
                  onChange={handleChange}
                />
              </div>


              <div className="form-field">
                <label>Sunrise</label>

                <input
                  type="time"
                  name="sunrise"
                  value={form.sunrise}
                  onChange={handleChange}
                />
              </div>


              <div className="form-field">
                <label>Dhuhr</label>

                <input
                  type="time"
                  name="dhuhr"
                  value={form.dhuhr}
                  onChange={handleChange}
                />
              </div>


              <div className="form-field">
                <label>Asr</label>

                <input
                  type="time"
                  name="asr"
                  value={form.asr}
                  onChange={handleChange}
                />
              </div>


              <div className="form-field">
                <label>Maghrib</label>

                <input
                  type="time"
                  name="maghrib"
                  value={form.maghrib}
                  onChange={handleChange}
                />
              </div>


              <div className="form-field">
                <label>Isha</label>

                <input
                  type="time"
                  name="isha"
                  value={form.isha}
                  onChange={handleChange}
                />
              </div>


              <div className="form-field prayer-jummah-field">
                <label>Jummah</label>

                <input
                  type="time"
                  name="jummah"
                  value={form.jummah}
                  onChange={handleChange}
                />
              </div>

            </div>


            <div className="admin-form-actions">

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Timetable"}
              </button>

            </div>

          </form>

        </section>


        {/* Existing schedules */}

        <section className="prayer-admin-list">

          <div className="admin-section-heading">

            <div>
              <h2>
                Recent Schedules
              </h2>

              <p>
                Select a date to edit its timetable.
              </p>
            </div>

          </div>

          {prayerTimes.length === 0 ? (

            <div className="admin-empty-card">

              <h3>
                No schedules yet
              </h3>

              <p>
                Add your first prayer timetable.
              </p>

            </div>

          ) : (

            <div className="prayer-schedule-list">

              {prayerTimes.map((item) => (

                <article
                  className="prayer-schedule-card"
                  key={item.id}
                >

                  <div className="prayer-schedule-header">

                    <div>
                      <span>
                        PRAYER DATE
                      </span>

                      <h3>
                        {formatDate(
                          item.prayer_date
                        )}
                      </h3>
                    </div>

                    <button
                      className="content-action"
                      onClick={() =>
                        loadIntoForm(item)
                      }
                    >
                      Edit
                    </button>

                  </div>


                  <div className="prayer-mini-grid">

                    <div>
                      <span>Fajr</span>
                      <strong>
                        {item.fajr || "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Dhuhr</span>
                      <strong>
                        {item.dhuhr || "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Asr</span>
                      <strong>
                        {item.asr || "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Maghrib</span>
                      <strong>
                        {item.maghrib || "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Isha</span>
                      <strong>
                        {item.isha || "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Jummah</span>
                      <strong>
                        {item.jummah || "—"}
                      </strong>
                    </div>

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

export default PrayerTimes;