import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Programs() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        time
      `)
      .eq("is_active", true)
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
    loadPrograms();
  }, []);

  if (loading) {
    return (
      <div className="programs-page">

        <section className="page-hero">
          <div className="container">

            <p className="section-label">
              OUR COMMUNITY
            </p>

            <h1>
              Programs & Activities
            </h1>

            <p>
              Learning, worship and community service for
              everyone in our Mahal.
            </p>

          </div>
        </section>

        <section className="programs-list-section">
          <div className="container">
            <div className="public-loading">
              Loading programs...
            </div>
          </div>
        </section>

      </div>
    );
  }

  return (
    <div className="programs-page">

      <section className="page-hero">
        <div className="container">

          <p className="section-label">
            OUR COMMUNITY
          </p>

          <h1>
            Programs & Activities
          </h1>

          <p>
            Learning, worship and community service for
            everyone in our Mahal.
          </p>

        </div>
      </section>


      <section className="programs-list-section">

        <div className="container">

          {error ? (

            <div className="public-error">
              Unable to load programs right now.
            </div>

          ) : programs.length === 0 ? (

            <div className="public-empty">

              <h3>
                No active programs
              </h3>

              <p>
                Program information will appear here once
                the Mahal Committee publishes it.
              </p>

            </div>

          ) : (

            <div className="programs-large-grid">

              {programs.map((program) => (

                <article
                  className="program-large-card"
                  key={program.id}
                >

                  <div className="program-large-icon">
                    {program.category === "education"
                      ? "📖"
                      : program.category === "religious"
                        ? "🕌"
                        : program.category === "youth"
                          ? "👥"
                          : program.category === "welfare"
                            ? "🤝"
                            : program.category === "ramadan"
                              ? "🌙"
                              : "◇"}
                  </div>

                  <span className="program-category">
                    {program.category}
                  </span>

                  <h2>
                    {program.title}
                  </h2>

                  <p>
                    {program.description}
                  </p>

                  <div className="program-info">

                    <div>
                      <span>
                        Schedule
                      </span>

                      <strong>
                        {program.schedule ||
                          "As announced"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Time
                      </span>

                      <strong>
                        {program.time ||
                          "As announced"}
                      </strong>
                    </div>

                  </div>

                </article>

              ))}

            </div>

          )}

          <div className="programs-bottom">

            <p>
              Want to know more about any of our programs?
            </p>

            <Link
              to="/contact"
              className="primary-button"
            >
              Contact the Committee
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
}

export default Programs;