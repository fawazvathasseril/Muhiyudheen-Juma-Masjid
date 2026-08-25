import { useState } from "react";
import {
  Link,
  NavLink,
} from "react-router-dom";

import { siteConfig } from "../config/siteConfig";


function Navbar() {

  const [menuOpen, setMenuOpen] =
    useState(false);


  function closeMenu() {
    setMenuOpen(false);
  }


  return (
    <header className="navbar">

      <div className="container navbar-inner">

        {/* ========================================
            LOGO
        ======================================== */}

        <Link
          to="/"
          className="logo"
          onClick={closeMenu}
        >

          <img
            src="/images/masjid-logo.png"
            alt={`${siteConfig.name} logo`}
            className="masjid-logo"
          />


          <div>

            <strong>
              {siteConfig.shortName}
            </strong>

            <small>
              MAHAL MASJID
            </small>

          </div>

        </Link>


        {/* ========================================
            MOBILE MENU
        ======================================== */}

        <button
          type="button"
          className="mobile-menu-button"
          onClick={() =>
            setMenuOpen(
              (current) =>
                !current
            )
          }
          aria-label="Toggle navigation"
          aria-expanded={
            menuOpen
          }
        >

          {menuOpen
            ? "✕"
            : "☰"}

        </button>


        {/* ========================================
            NAVIGATION
        ======================================== */}

        <nav
          className={
            menuOpen
              ? "navbar-menu open"
              : "navbar-menu"
          }
        >

          <NavLink
            to="/"
            end
            onClick={
              closeMenu
            }
          >
            Home
          </NavLink>


          <NavLink
            to="/about"
            onClick={
              closeMenu
            }
          >
            About
          </NavLink>


          <NavLink
            to="/prayer-times"
            onClick={
              closeMenu
            }
          >
            Prayer Times
          </NavLink>


          <NavLink
            to="/announcements"
            onClick={
              closeMenu
            }
          >
            Announcements
          </NavLink>


          <NavLink
            to="/programs"
            onClick={
              closeMenu
            }
          >
            Programs
          </NavLink>


          <NavLink
            to="/funds"
            onClick={
              closeMenu
            }
          >
            Funds
          </NavLink>


          <NavLink
            to="/contact"
            onClick={
              closeMenu
            }
          >
            Contact
          </NavLink>


          {/* ====================================
              DONATE
          ==================================== */}

          <NavLink
            to="/donate"
            className="donate-button"
            onClick={
              closeMenu
            }
          >
            Donate
          </NavLink>


          {/* ====================================
              COMMITTEE PORTAL
          ==================================== */}

          <Link
            to="/admin/login"
            className="committee-portal-button"
            onClick={
              closeMenu
            }
          >

            <span className="committee-portal-icon">
              ◈
            </span>

            <span>
              Login            </span>

          </Link>

        </nav>

      </div>

    </header>
  );
}


export default Navbar;