import { siteConfig } from "../config/siteConfig";

function About() {
  return (
    <div className="about-page">

      {/* Header */}

      <section className="page-hero">
        <div className="container">

          <p className="section-label">
            ABOUT OUR MAHAL
          </p>

<h1>
  {siteConfig.name}
</h1>

          <p>
            A place of worship, learning, service and community.
          </p>

        </div>
      </section>


      {/* Introduction */}

      <section className="about-intro">

        <div className="container about-intro-grid">

          <div className="about-image">
            <div>
              🕌
            </div>
          </div>


          <div className="about-text">

            <p className="section-label">
              WHO WE ARE
            </p>

            <h2>
              More than a place of worship.
            </h2>

            <p>
              Our Mahal Masjid serves as a centre for worship,
              education, community development and mutual
              support. We strive to create a welcoming
              environment where everyone can learn, worship
              and contribute to the wellbeing of our community.
            </p>

            <p>
              Through regular prayers, educational programs,
              welfare initiatives and community activities,
              we work together to strengthen the bonds between
              the families and members of our Mahal.
            </p>

          </div>

        </div>

      </section>


      {/* Mission */}

      <section className="mission-section">

        <div className="container">

          <div className="mission-grid">

            <div className="mission-card">

              <span>🕌</span>

              <h3>
                Worship
              </h3>

              <p>
                Providing a welcoming space for daily prayers,
                Jummah and other acts of worship.
              </p>

            </div>


            <div className="mission-card">

              <span>📖</span>

              <h3>
                Knowledge
              </h3>

              <p>
                Supporting Quranic education, Madrasa and
                lifelong learning within our community.
              </p>

            </div>


            <div className="mission-card">

              <span>🤝</span>

              <h3>
                Community
              </h3>

              <p>
                Building stronger relationships through
                welfare, service and community activities.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* Committee */}

      <section className="committee-section">

        <div className="container">

          <div className="section-heading">

            <div>
              <p className="section-label">
                MAHAL COMMITTEE
              </p>

              <h2>
                Our Leadership
              </h2>
            </div>

          </div>


          <div className="committee-grid">

            <div className="committee-card">

              <div className="committee-avatar">
                P
              </div>

              <span>President</span>

              <h3>
                Committee President
              </h3>

            </div>


            <div className="committee-card">

              <div className="committee-avatar">
                S
              </div>

              <span>Secretary</span>

              <h3>
                Committee Secretary
              </h3>

            </div>


            <div className="committee-card">

              <div className="committee-avatar">
                T
              </div>

              <span>Treasurer</span>

              <h3>
                Committee Treasurer
              </h3>

            </div>


            <div className="committee-card">

              <div className="committee-avatar">
                C
              </div>

              <span>Committee</span>

              <h3>
                Committee Members
              </h3>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
}

export default About;