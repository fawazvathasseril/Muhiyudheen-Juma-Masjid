import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../../lib/supabase";


function Login() {

  const navigate =
    useNavigate();


  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  async function handleLogin(
    event
  ) {

    event.preventDefault();

    setError("");
    setLoading(true);


    const {
      error: loginError,
    } =
      await supabase.auth.signInWithPassword({
        email:
          email.trim(),

        password,
      });


    setLoading(false);


    if (loginError) {

      setError(
        loginError.message
      );

      return;
    }


    navigate(
      "/admin/dashboard",
      {
        replace: true,
      }
    );
  }


  return (
    <div className="admin-login-page">

      {/* =====================================
          BACKGROUND ATMOSPHERE
      ====================================== */}

      <div
        className="admin-login-orb admin-login-orb-one"
        aria-hidden="true"
      />

      <div
        className="admin-login-orb admin-login-orb-two"
        aria-hidden="true"
      />


      <div
        className="admin-login-pattern"
        aria-hidden="true"
      />


      {/* =====================================
          LOGIN CARD
      ====================================== */}

      <main className="admin-login-shell">

        <section
          className="admin-login-box"
          aria-labelledby="login-title"
        >

          {/* BRAND */}

          <div className="admin-login-brand">

            <div className="admin-login-logo">

              <img
                src="/images/masjid-logo.png"
                alt=""
              />

            </div>


            <div>

              <strong>
                AL-NOOR
              </strong>

              <span>
                MAHAL MASJID
              </span>

            </div>

          </div>


          {/* INTRO */}

          <div className="admin-login-heading">

            


            <h1 id="login-title">
              Welcome back
            </h1>


            <p className="admin-login-description">
              Sign in to continue to the
              portal.
            </p>

          </div>


          {/* FORM */}

          <form
            onSubmit={
              handleLogin
            }
            className="admin-login-form"
          >

            <div className="form-field">

              <label
                htmlFor="login-email"
              >
                Email address
              </label>


              <input
                id="login-email"
                type="email"
                value={
                  email
                }
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="committee@example.com"
                autoComplete="email"
                required
                disabled={
                  loading
                }
              />

            </div>


            <div className="form-field">

              <div className="login-password-label">

                <label
                  htmlFor="login-password"
                >
                  Password
                </label>

              </div>


              <div className="login-password-field">

                <input
                  id="login-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    password
                  }
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={
                    loading
                  }
                />


                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={
                    loading
                  }
                >
                  {
                    showPassword
                      ? "Hide"
                      : "Show"
                  }
                </button>

              </div>

            </div>


            {error && (

              <div
                className="login-error"
                role="alert"
              >

                <span className="login-error-icon">
                  !
                </span>

                <div>

                  <strong>
                    Sign-in failed
                  </strong>

                  <p>
                    {error}
                  </p>

                </div>

              </div>

            )}


            <button
              type="submit"
              className="admin-login-button"
              disabled={
                loading
              }
            >

              <span>
                {
                  loading
                    ? "Signing in..."
                    : "Sign In"
                }
              </span>


              {!loading && (
                <span
                  className="login-button-arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              )}

            </button>

          </form>


          {/* FOOTER */}

          <div className="admin-login-footer">

            <Link
              to="/"
            >
              ← Back to Mahal website
            </Link>


          

          </div>

        </section>

      </main>

    </div>
  );
}


export default Login;