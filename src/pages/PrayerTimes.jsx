import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function PrayerTimes() {
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [weeklySchedule, setWeeklySchedule] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getToday() {
    return new Date().toISOString().split("T")[0];
  }

  async function loadPrayerTimes() {
    setLoading(true);
    setError("");

    const today = getToday();

    const todayResult = await supabase
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
      .eq("prayer_date", today)
      .maybeSingle();

    if (todayResult.error) {
      setError(todayResult.error.message);
      setLoading(false);
      return;
    }

    const weeklyResult = await supabase
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
      .gte(
        "prayer_date",
        today
      )
      .order("prayer_date", {
        ascending: true,
      })
      .limit(7);

    if (weeklyResult.error) {
      setError(weeklyResult.error.message);
      setLoading(false);
      return;
    }

    setTodaySchedule(todayResult.data || null);
    setWeeklySchedule(weeklyResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadPrayerTimes();
  }, []);

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatShortDate(date) {
    return new Date(date).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function formatTime(time) {
    if (!time) {
      return "—";
    }

    const [hours, minutes] = time.split(":");

    const date = new Date();

    date.setHours(
      Number(hours),
      Number(minutes),
      0,
      0
    );

    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const prayers = todaySchedule
    ? [
        {
          name: "Fajr",
          time: todaySchedule.fajr,
          icon: "🌅",
        },
        {
          name: "Sunrise",
          time: todaySchedule.sunrise,
          icon: "☀️",
        },
        {
          name: "Dhuhr",
          time: todaySchedule.dhuhr,
          icon: "☀️",
        },
        {
          name: "Asr",
          time: todaySchedule.asr,
          icon: "🌤️",
        },
        {
          name: "Maghrib",
          time: todaySchedule.maghrib,
          icon: "🌇",
        },
        {
          name: "Isha",
          time: todaySchedule.isha,
          icon: "🌙",
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="prayer-page">

        <section className="page-hero">
          <div className="container">

            <p className="section-label">
              DAILY SCHEDULE
            </p>

            <h1>
              Prayer Times
            </h1>

            <p>
              Loading today's prayer schedule...
            </p>

          </div>
        </section>

      </div>
    );
  }

  return (
    <div className="prayer-page">

      {/* Header */}

      <section className="page-hero">

        <div className="container">

          <p className="section-label">
            DAILY SCHEDULE
          </p>

          <h1>
            Prayer Times
          </h1>

          <p>
            Stay connected with the five daily prayers
            at our Mahal Masjid.
          </p>

        </div>

      </section>


      {/* Today's schedule */}

      <section className="today-prayer-section">

        <div className="container">

          {error ? (

            <div className="public-error">
              Unable to load prayer times right now.
            </div>

          ) : !todaySchedule ? (

            <div className="public-empty">

              <h3>
                Today's timetable has not been published.
              </h3>

              <p>
                Please check back later or contact the Mahal
                Committee.
              </p>

            </div>

          ) : (

            <>

              <div className="date-card">

                <div>

                  <span className="date-label">
                    TODAY
                  </span>

                  <h2>
                    {formatDate(
                      todaySchedule.prayer_date
                    )}
                  </h2>

                  <p>
                    Jama'ah timetable
                  </p>

                </div>


                <div className="next-prayer">

                  <span>
                    JUMMAH
                  </span>

                  <strong>
                    Friday Prayer
                  </strong>

                  <b>
                    {formatTime(
                      todaySchedule.jummah
                    )}
                  </b>

                </div>

              </div>


              <div className="prayer-list">

                {prayers.map((prayer) => (

                  <div
                    className="large-prayer-card"
                    key={prayer.name}
                  >

                    <div className="prayer-icon">
                      {prayer.icon}
                    </div>

                    <div>

                      <span>
                        {prayer.name}
                      </span>

                      <strong>
                        {formatTime(
                          prayer.time
                        )}
                      </strong>

                    </div>

                  </div>

                ))}

              </div>


              <div className="jummah-card">

                <div className="jummah-symbol">
                  🕌
                </div>

                <div>

                  <span>
                    FRIDAY
                  </span>

                  <h2>
                    Jummah Prayer
                  </h2>

                  <p>
                    Please arrive early for the khutbah.
                  </p>

                </div>

                <strong>
                  {formatTime(
                    todaySchedule.jummah
                  )}
                </strong>

              </div>

            </>

          )}

        </div>

      </section>


      {/* Weekly schedule */}

      <section className="weekly-section">

        <div className="container">

          <div className="section-heading">

            <div>

              <p className="section-label">
                UPCOMING DAYS
              </p>

              <h2>
                Weekly Schedule
              </h2>

            </div>

            <button
              className="weekly-refresh"
              onClick={loadPrayerTimes}
            >
              ↻ Refresh
            </button>

          </div>


          {weeklySchedule.length === 0 ? (

            <div className="public-empty">

              <h3>
                No upcoming schedules
              </h3>

              <p>
                The committee has not published upcoming
                prayer times yet.
              </p>

            </div>

          ) : (

            <div className="weekly-table">

              <div className="weekly-header">

                <span>
                  Day
                </span>

                <span>
                  Fajr
                </span>

                <span>
                  Dhuhr
                </span>

                <span>
                  Asr
                </span>

                <span>
                  Maghrib
                </span>

                <span>
                  Isha
                </span>

              </div>


              {weeklySchedule.map((item) => (

                <div
                  className={
                    item.prayer_date ===
                    getToday()
                      ? "weekly-row today-row"
                      : "weekly-row"
                  }
                  key={item.id}
                >

                  <span>
                    {formatShortDate(
                      item.prayer_date
                    )}
                  </span>

                  <span>
                    {formatTime(item.fajr)}
                  </span>

                  <span>
                    {formatTime(item.dhuhr)}
                  </span>

                  <span>
                    {formatTime(item.asr)}
                  </span>

                  <span>
                    {formatTime(item.maghrib)}
                  </span>

                  <span>
                    {formatTime(item.isha)}
                  </span>

                </div>

              ))}

            </div>

          )}

        </div>

      </section>


      <section className="prayer-bottom">

        <Link
          to="/"
          className="secondary-button"
        >
          ← Back to Home
        </Link>

      </section>

    </div>
  );
}

export default PrayerTimes;