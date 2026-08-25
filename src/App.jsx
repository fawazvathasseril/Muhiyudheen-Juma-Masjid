import {
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import {
  useEffect,
} from "react";

import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/admin/AdminLayout";

import Home from "./pages/Home";
import About from "./pages/About";
import PrayerTimes from "./pages/PrayerTimes";
import Announcements from "./pages/Announcements";
import Programs from "./pages/Programs";
import Donate from "./pages/Donate";
import Contact from "./pages/Contact";
import Funds from "./pages/Funds.jsx";

import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import Donations from "./pages/admin/Donations";
import Expenses from "./pages/admin/Expenses";
import Reports from "./pages/admin/Reports";
import AdminFunds from "./pages/admin/Funds";
import TransactionDetails from "./pages/admin/TransactionDetails";
import AuditLogs from "./pages/admin/AuditLogs";

import RequireRole from "./layouts/admin/RequireRole";

import Members from "./pages/admin/Members";
import AdminAnnouncements from "./pages/admin/Announcements";
import AdminPrograms from "./pages/admin/Programs";
import AdminPrayerTimes from "./pages/admin/PrayerTimes";
import Messages from "./pages/admin/Messages";

import MahallMembers from "./pages/admin/MahallMembers";
import MemberProfile from "./pages/admin/MemberProfile";

import ExternalContributors from "./pages/admin/ExternalContributors";
import ExternalContributorProfile from "./pages/admin/ExternalContributorProfile";

import ContributionAnalytics from "./pages/admin/ContributionAnalytics";
import DonationRequests from "./pages/admin/DonationRequests";
import UserManagement from "./pages/admin/UserManagement";


/* =====================================================
   PUBLIC WEBSITE MOTION
===================================================== */

function PublicMotion() {

  const location =
    useLocation();


  useEffect(() => {

    /*
     * The immersive motion system is
     * only for the public website.
     */

    if (
      location.pathname.startsWith(
        "/admin"
      )
    ) {
      return;
    }


    const root =
      document.documentElement;


    root.classList.add(
      "public-motion-active"
    );


    /* ==========================================
       FIND ELEMENTS TO REVEAL
    ========================================== */

    const selectors = [

      "main section",

      ".home section",

      ".home article",

      ".home .prayer-card",

      ".home .prayer-item",

      ".home .hero-text",

      ".home .hero-image",

      ".home .hero-buttons",

      ".home .section-heading",

      ".home .container > article",

      ".home .container > .card",

    ];


    const elements = [
      ...new Set(

        selectors.flatMap(
          (selector) =>
            Array.from(
              document.querySelectorAll(
                selector
              )
            )
        )

      ),
    ];


    elements.forEach(
      (
        element,
        index
      ) => {

        /*
         * Hero has its own animation,
         * so don't give it the normal
         * scroll reveal.
         */

        if (
          element.classList.contains(
            "hero"
          )
        ) {
          return;
        }


        element.classList.add(
          "scroll-reveal"
        );


        element.style.setProperty(
          "--reveal-delay",
          `${Math.min(
            index * 35,
            240
          )}ms`
        );

      }
    );


    /* ==========================================
       HERO
    ========================================== */

    const heroText =
      document.querySelector(
        ".hero-text"
      );

    const heroImage =
      document.querySelector(
        ".hero-image"
      );


    heroText?.classList.add(
      "hero-reveal"
    );


    heroImage?.classList.add(
      "hero-reveal-image"
    );


    /* ==========================================
       INTERSECTION OBSERVER
    ========================================== */

    const observer =
      new IntersectionObserver(
        (
          entries,
          currentObserver
        ) => {

          entries.forEach(
            (entry) => {

              if (
                !entry.isIntersecting
              ) {
                return;
              }


              entry.target.classList.add(
                "is-visible"
              );


              currentObserver.unobserve(
                entry.target
              );

            }
          );

        },
        {
          threshold: 0.12,

          rootMargin:
            "0px 0px -60px 0px",
        }
      );


    document
      .querySelectorAll(
        ".scroll-reveal"
      )
      .forEach(
        (element) => {

          observer.observe(
            element
          );

        }
      );


    /* ==========================================
       SCROLL MOTION
    ========================================== */

    let ticking =
      false;


    function updateScrollProgress() {

      const documentHeight =
        document.documentElement
          .scrollHeight -
        window.innerHeight;


      if (
        documentHeight <= 0
      ) {

        document.documentElement
          .style
          .setProperty(
            "--scroll-progress",
            "0"
          );

        return;
      }


      const progress =
        window.scrollY /
        documentHeight;


      document.documentElement
        .style
        .setProperty(
          "--scroll-progress",
          Math.min(
            Math.max(
              progress,
              0
            ),
            1
          ).toString()
        );
    }


    function handleScroll() {

      if (ticking) {
        return;
      }


      ticking = true;


      requestAnimationFrame(
        () => {

          /*
           * Gentle hero-image parallax.
           */

          const image =
            document.querySelector(
              ".hero-masjid-image"
            );


          if (image) {

            const scrollY =
              window.scrollY;


            image.style.transform =
              `translate3d(0, ${
                scrollY * 0.08
              }px, 0) scale(1.03)`;

          }


          updateScrollProgress();


          ticking = false;

        }
      );

    }


    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      }
    );


    updateScrollProgress();


    /* ==========================================
       CLEANUP
    ========================================== */

    return () => {

      observer.disconnect();


      window.removeEventListener(
        "scroll",
        handleScroll
      );


      root.classList.remove(
        "public-motion-active"
      );


      root.style.setProperty(
        "--scroll-progress",
        "0"
      );

    };

  }, [
    location.pathname,
  ]);


  return null;
}


/* =====================================================
   PLACEHOLDER
===================================================== */

function PlaceholderPage({
  title,
}) {

  return (
    <div className="admin-placeholder-page">

      <p className="section-label">
        COMMITTEE PORTAL
      </p>

      <h1>
        {title}
      </h1>

      <p>
        This section will be built next.
      </p>

    </div>
  );
}


/* =====================================================
   APP
===================================================== */

function App() {

  return (
    <>

      <PublicMotion />

      <Routes>

        {/* =================================================
            PUBLIC WEBSITE
        ================================================== */}

        <Route
          element={
            <PublicLayout />
          }
        >

          <Route
            path="/"
            element={
              <Home />
            }
          />


          <Route
            path="/about"
            element={
              <About />
            }
          />


          <Route
            path="/prayer-times"
            element={
              <PrayerTimes />
            }
          />


          <Route
            path="/announcements"
            element={
              <Announcements />
            }
          />


          <Route
            path="/programs"
            element={
              <Programs />
            }
          />


          <Route
            path="/funds"
            element={
              <Funds />
            }
          />


          <Route
            path="/donate"
            element={
              <Donate />
            }
          />


          <Route
            path="/contact"
            element={
              <Contact />
            }
          />

        </Route>


        {/* =================================================
            ADMIN LOGIN
        ================================================== */}

        <Route
          path="/admin/login"
          element={
            <Login />
          }
        />


        {/* =================================================
            ADMIN PORTAL
        ================================================== */}

        <Route
          element={
            <AdminLayout />
          }
        >

          {/* -----------------------------------------------
              USERS & PERMISSIONS
          ------------------------------------------------ */}

          <Route
            path="/admin/user-management"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                ]}
              >

                <UserManagement />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              DASHBOARD
          ------------------------------------------------ */}

          <Route
            path="/admin/dashboard"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "treasurer",
                  "secretary",
                  "viewer",
                ]}
              >

                <Dashboard />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              DONATIONS
          ------------------------------------------------ */}

          <Route
            path="/admin/donations"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "treasurer",
                ]}
              >

                <Donations />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              EXPENSES
          ------------------------------------------------ */}

          <Route
            path="/admin/expenses"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "treasurer",
                ]}
              >

                <Expenses />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              FUNDS
          ------------------------------------------------ */}

          <Route
            path="/admin/funds"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "treasurer",
                  "secretary",
                  "viewer",
                ]}
              >

                <AdminFunds />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              REPORTS
          ------------------------------------------------ */}

          <Route
            path="/admin/reports"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "treasurer",
                  "secretary",
                  "viewer",
                ]}
              >

                <Reports />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              AUDIT LOG
          ------------------------------------------------ */}

          <Route
            path="/admin/audit"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "treasurer",
                ]}
              >

                <AuditLogs />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              ANNOUNCEMENTS
          ------------------------------------------------ */}

          <Route
            path="/admin/announcements"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "secretary",
                ]}
              >

                <AdminAnnouncements />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              PROGRAMS
          ------------------------------------------------ */}

          <Route
            path="/admin/programs"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "secretary",
                ]}
              >

                <AdminPrograms />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              COMMITTEE
          ------------------------------------------------ */}

          <Route
            path="/admin/members"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                ]}
              >

                <Members />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              PRAYER TIMES
          ------------------------------------------------ */}

          <Route
            path="/admin/prayer-times"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "secretary",
                ]}
              >

                <AdminPrayerTimes />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              MESSAGES
          ------------------------------------------------ */}

          <Route
            path="/admin/messages"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "secretary",
                ]}
              >

                <Messages />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              MAHALL MEMBERS
          ------------------------------------------------ */}

          <Route
            path="/admin/mahall-members"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                ]}
              >

                <MahallMembers />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              MAHALL MEMBER PROFILE
          ------------------------------------------------ */}

          <Route
            path="/admin/mahall-members/:id"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                ]}
              >

                <MemberProfile />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              EXTERNAL CONTRIBUTORS
          ------------------------------------------------ */}

          <Route
            path="/admin/external-contributors"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "treasurer",
                ]}
              >

                <ExternalContributors />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              EXTERNAL CONTRIBUTOR PROFILE
          ------------------------------------------------ */}

          <Route
            path="/admin/external-contributors/:id"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "treasurer",
                ]}
              >

                <ExternalContributorProfile />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              CONTRIBUTION ANALYTICS
          ------------------------------------------------ */}

          <Route
            path="/admin/contribution-analytics"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "treasurer",
                ]}
              >

                <ContributionAnalytics />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              TRANSACTION DETAILS
          ------------------------------------------------ */}

          <Route
            path="/admin/transactions/:id"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "treasurer",
                  "secretary",
                  "viewer",
                ]}
              >

                <TransactionDetails />

              </RequireRole>

            }
          />


          {/* -----------------------------------------------
              CONTRIBUTION REQUESTS
          ------------------------------------------------ */}

          <Route
            path="/admin/donation-requests"
            element={

              <RequireRole
                allowedRoles={[
                  "admin",
                  "treasurer",
                ]}
              >

                <DonationRequests />

              </RequireRole>

            }
          />

        </Route>

      </Routes>

    </>
  );
}


export default App;