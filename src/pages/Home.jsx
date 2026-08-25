import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";
import { siteConfig } from "../config/siteConfig";

function Home() {
  // ========================================
  // STATE
  // ========================================

  const [todayPrayerTimes, setTodayPrayerTimes] =
    useState(null);

  const [announcements, setAnnouncements] =
    useState([]);

  const [programs, setPrograms] =
    useState([]);

  const [funds, setFunds] =
    useState([]);

  const [contentLoading, setContentLoading] =
    useState(true);


  // ========================================
  // LOAD HOMEPAGE DATA
  // ========================================

  useEffect(() => {
    async function loadHomeData() {
      setContentLoading(true);

      const today = new Date()
        .toISOString()
        .split("T")[0];

      const [
        prayerResult,
        announcementsResult,
        programsResult,
        fundsResult,
      ] = await Promise.all([
        // ------------------------------
        // Prayer Times
        // ------------------------------

        supabase
          .from("prayer_times")
          .select(`
            fajr,
            sunrise,
            dhuhr,
            asr,
            maghrib,
            isha,
            jummah
          `)
          .eq("prayer_date", today)
          .maybeSingle(),

        // ------------------------------
        // Latest Announcements
        // ------------------------------

        supabase
          .from("announcements")
          .select(`
            id,
            title,
            category,
            content,
            publish_date
          `)
          .eq("published", true)
          .lte("publish_date", today)
          .order("publish_date", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          })
          .limit(3),

        // ------------------------------
        // Active Programs
        // ------------------------------

        supabase
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
          })
          .limit(4),

        // ------------------------------
        // Public Fund Summary
        // ------------------------------

        supabase.rpc(
          "get_public_fund_summary"
        ),
      ]);


      // Prayer times

      if (!prayerResult.error) {
        setTodayPrayerTimes(
          prayerResult.data || null
        );
      }


      // Announcements

      if (!announcementsResult.error) {
        setAnnouncements(
          announcementsResult.data || []
        );
      }


      // Programs

      if (!programsResult.error) {
        setPrograms(
          programsResult.data || []
        );
      }


      // Funds

      if (!fundsResult.error) {
        setFunds(
          (fundsResult.data || []).slice(0, 4)
        );
      }


      setContentLoading(false);
    }

    loadHomeData();
  }, []);


  // ========================================
  // TIME FORMATTER
  // ========================================

  function formatTime(time) {
    if (!time) {
      return "—";
    }

    const [hours, minutes] =
      time.split(":");

    const date = new Date();

    date.setHours(
      Number(hours),
      Number(minutes),
      0,
      0
    );

    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }


  // ========================================
  // DATE FORMATTERS
  // ========================================

  function formatAnnouncementDay(date) {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
      }
    );
  }


  function formatAnnouncementMonth(date) {
    return new Date(
      `${date}T00:00:00`
    )
      .toLocaleDateString(
        "en-IN",
        {
          month: "short",
        }
      )
      .toUpperCase();
  }


  // ========================================
  // FUND FORMATTER
  // ========================================

  function formatCurrency(amount) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }
    ).format(
      Number(amount || 0)
    );
  }


  // ========================================
  // PROGRAM ICON
  // ========================================

  function getProgramIcon(category) {
    switch (category) {
      case "education":
        return "📖";

      case "religious":
        return "🕌";

      case "youth":
        return "👥";

      case "welfare":
        return "🤝";

      case "ramadan":
        return "🌙";

      case "community":
        return "👥";

      default:
        return "◇";
    }
  }


  return (
    <div className="home">

      {/* =========================
          HERO
      ========================== */}

      <section className="hero">

        <div className="container hero-content">

          <div className="hero-text">

            <p className="arabic-text">
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </p>

            <p className="hero-label">
              WELCOME TO OUR MAHAL
            </p>

            <h1>
              {siteConfig.name}
            </h1>

            <p className="hero-description">
              {siteConfig.tagline}
            </p>

            <div className="hero-buttons">

              <Link
                to="/donate"
                className="primary-button"
              >
                Donate Now
              </Link>

              <Link
                to="/prayer-times"
                className="secondary-button"
              >
                Prayer Times
              </Link>

            </div>

          </div>


          <div className="hero-image">

            <img
              src="/images/masjid.jpg"
              alt={siteConfig.name}
              className="hero-masjid-image"
            />

          </div>

        </div>

      </section>


      {/* =========================
          PRAYER TIMES
      ========================== */}

      <section className="prayer-section">

        <div className="container">

          <div className="section-heading">

            <div>

              <p className="section-label">
                TODAY
              </p>

              <h2>
                Prayer Times
              </h2>

            </div>

            <Link to="/prayer-times">
              View full schedule →
            </Link>

          </div>


          <div className="prayer-card">

            <div className="prayer-item">
              <span>Fajr</span>

              <strong>
                {formatTime(
                  todayPrayerTimes?.fajr
                )}
              </strong>
            </div>


            <div className="prayer-item">
              <span>Sunrise</span>

              <strong>
                {formatTime(
                  todayPrayerTimes?.sunrise
                )}
              </strong>
            </div>


            <div className="prayer-item">
              <span>Dhuhr</span>

              <strong>
                {formatTime(
                  todayPrayerTimes?.dhuhr
                )}
              </strong>
            </div>


            <div className="prayer-item">
              <span>Asr</span>

              <strong>
                {formatTime(
                  todayPrayerTimes?.asr
                )}
              </strong>
            </div>


            <div className="prayer-item">
              <span>Maghrib</span>

              <strong>
                {formatTime(
                  todayPrayerTimes?.maghrib
                )}
              </strong>
            </div>


            <div className="prayer-item">
              <span>Isha</span>

              <strong>
                {formatTime(
                  todayPrayerTimes?.isha
                )}
              </strong>
            </div>


            <div className="jummah-item">
              <span>
                Jummah
              </span>

              <strong>
                {formatTime(
                  todayPrayerTimes?.jummah
                )}
              </strong>
            </div>

          </div>

        </div>

      </section>


      {/* =========================
          ANNOUNCEMENTS
      ========================== */}

      <section className="announcements-section">

        <div className="container">

          <div className="section-heading">

            <div>

              <p className="section-label">
                LATEST NEWS
              </p>

              <h2>
                Announcements
              </h2>

            </div>

            <Link to="/announcements">
              View all →
            </Link>

          </div>


          {contentLoading ? (

            <div className="public-loading">
              Loading announcements...
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

            <div className="announcement-grid">

              {announcements.map(
                (announcement) => (

                  <article
                    className="announcement-card"
                    key={announcement.id}
                  >

                    <div className="announcement-date">

                      <strong>
                        {formatAnnouncementDay(
                          announcement.publish_date
                        )}
                      </strong>

                      <span>
                        {formatAnnouncementMonth(
                          announcement.publish_date
                        )}
                      </span>

                    </div>


                    <div>

                      <span className="announcement-tag">

                        {announcement.category
                          ?.toUpperCase()}

                      </span>

                      <h3>
                        {announcement.title}
                      </h3>

                      <p>
                        {announcement.content}
                      </p>

                    </div>

                  </article>

                )
              )}

            </div>

          )}

        </div>

      </section>


      {/* =========================
          PROGRAMS
      ========================== */}

      <section className="programs-section">

        <div className="container">

          <div className="section-heading">

            <div>

              <p className="section-label">
                OUR ACTIVITIES
              </p>

              <h2>
                Programs & Activities
              </h2>

            </div>

            <Link to="/programs">
              View all →
            </Link>

          </div>


          {contentLoading ? (

            <div className="public-loading">
              Loading programs...
            </div>

          ) : programs.length === 0 ? (

            <div className="public-empty">

              <h3>
                No active programs
              </h3>

              <p>
                Program information will appear here
                when activities are published.
              </p>

            </div>

          ) : (

            <div className="program-grid">

              {programs.map(
                (program) => (

                  <div
                    className="program-card"
                    key={program.id}
                  >

                    <div className="program-icon">
                      {getProgramIcon(
                        program.category
                      )}
                    </div>

                    <h3>
                      {program.title}
                    </h3>

                    <p>
                      {program.description}
                    </p>

                    {(program.schedule ||
                      program.time) && (

                      <div className="home-program-meta">

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

                    )}

                    <Link to="/programs">
                      Learn more →
                    </Link>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </section>


      {/* =========================
          DONATION
      ========================== */}

      <section className="donation-section">

        <div className="container donation-content">

          <div>

            <p className="section-label">
              SUPPORT OUR MAHAL
            </p>

            <h2>
              Your contribution
              <br />
              makes a difference.
            </h2>

            <p>
              Help us maintain the Masjid, support community
              programs and serve those in need.
            </p>

          </div>


          <div className="donation-actions">

            <Link
              to="/donate"
              className="primary-button"
            >
              Donate Now
            </Link>

            <Link
              to="/funds"
              className="donation-link"
            >
              See how funds are used →
            </Link>

          </div>

        </div>

      </section>


      {/* =========================
          TRANSPARENCY
      ========================== */}

      <section className="transparency-section">

        <div className="container">

          <div className="section-heading">

            <div>

              <p className="section-label">
                FINANCIAL TRANSPARENCY
              </p>

              <h2>
                Our Funds
              </h2>

            </div>

            <Link to="/funds">
              View financial report →
            </Link>

          </div>


          {contentLoading ? (

            <div className="public-loading">
              Loading fund information...
            </div>

          ) : funds.length === 0 ? (

            <div className="public-empty">

              <h3>
                No public fund information
              </h3>

              <p>
                Fund information will appear here once
                active funds are configured.
              </p>

            </div>

          ) : (

            <div className="fund-grid">

              {funds.map(
                (fund) => (

                  <div
                    className="fund-card"
                    key={fund.id}
                  >

                    <span>
                      {fund.name}
                    </span>

                    <strong>
                      {formatCurrency(
                        fund.balance
                      )}
                    </strong>

                    <small>
                      Current balance
                    </small>

                  </div>

                )
              )}

            </div>

          )}


          <div className="transparency-note">

            <span>
              ✓
            </span>

            <p>
              Financial information is published regularly
              to maintain transparency and accountability
              within our community.
            </p>

          </div>

        </div>

      </section>

    </div>
  );
}

export default Home;