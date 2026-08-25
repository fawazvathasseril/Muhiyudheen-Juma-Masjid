import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        publish_date
      `)
      .eq("published", true)
      .lte(
        "publish_date",
        new Date().toISOString().split("T")[0]
      )
      .order("publish_date", {
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
    loadAnnouncements();
  }, []);

  function formatDate(date) {
    const parsedDate = new Date(date);

    return {
      day: parsedDate.toLocaleDateString("en-IN", {
        day: "2-digit",
      }),

      month: parsedDate
        .toLocaleDateString("en-IN", {
          month: "short",
        })
        .toUpperCase(),
    };
  }

  return (
    <div className="announcements-page">

      <section className="page-hero">
        <div className="container">

          <p className="section-label">
            STAY INFORMED
          </p>

          <h1>
            Announcements
          </h1>

          <p>
            Latest news, notices and updates from our Mahal.
          </p>

        </div>
      </section>


      <section className="announcements-list-section">

        <div className="container">

          {loading ? (

            <div className="public-loading">
              Loading announcements...
            </div>

          ) : error ? (

            <div className="public-error">
              Unable to load announcements right now.
            </div>

          ) : announcements.length === 0 ? (

            <div className="public-empty">
              <h3>
                No announcements yet
              </h3>

              <p>
                There are currently no published announcements.
              </p>
            </div>

          ) : (

            <div className="announcements-list">

              {announcements.map((announcement) => {

                const date = formatDate(
                  announcement.publish_date
                );

                return (
                  <article
                    className="announcement-large-card"
                    key={announcement.id}
                  >

                    <div className="large-date">

                      <strong>
                        {date.day}
                      </strong>

                      <span>
                        {date.month}
                      </span>

                    </div>


                    <div className="announcement-large-content">

                      <span className="announcement-tag">
                        {announcement.category}
                      </span>

                      <h2>
                        {announcement.title}
                      </h2>

                      <p>
                        {announcement.content}
                      </p>

                      <span className="announcement-read">
                        Published by Mahal Committee
                      </span>

                    </div>

                  </article>
                );
              })}

            </div>

          )}


          <div className="back-link">

            <Link
              to="/"
              className="secondary-button"
            >
              ← Back to Home
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
}

export default Announcements;