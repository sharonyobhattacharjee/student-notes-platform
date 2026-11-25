import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Field } from "../components/Field";

export function SignUp() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    institution: "",
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nav = useNavigate();

  const set = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          institution: form.institution || "",
        }),
      });

      nav("/login", {
        state: { registered: true },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="signup-shell">
      <div className="signup-background">
        <div className="signup-orb signup-orb-one" />
        <div className="signup-orb signup-orb-two" />
      </div>

      <div className="signup-layout">
        <aside className="signup-brand-panel">
          <Link to="/" className="signup-logo">
            <span className="signup-logo-mark">N</span>

            <span>
              <strong>NoteShare</strong>
              <small>Academic knowledge, shared.</small>
            </span>
          </Link>

          <div className="signup-brand-content">
            <span className="signup-eyebrow">
              JOIN THE COMMUNITY
            </span>

            <h1>
              Learn together.
              <br />
              Share freely.
              <br />
              <em>Grow faster.</em>
            </h1>

            <p>
              Create your student account and start building
              a reliable academic resource library with your peers.
            </p>

            <div className="signup-steps">
              <div className="signup-step active">
                <span className="step-number">01</span>

                <div>
                  <strong>Create your account</strong>
                  <span>
                    Set up your student profile in seconds.
                  </span>
                </div>
              </div>

              <div className="signup-step">
                <span className="step-number">02</span>

                <div>
                  <strong>Discover useful notes</strong>
                  <span>
                    Explore resources organized by your academics.
                  </span>
                </div>
              </div>

              <div className="signup-step">
                <span className="step-number">03</span>

                <div>
                  <strong>Contribute & collaborate</strong>
                  <span>
                    Share material that helps other students.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="signup-brand-footer">
            <span>Built for students</span>
            <span>•</span>
            <span>Learn · Share · Grow</span>
          </div>
        </aside>

        <main className="signup-form-panel">
          <div className="signup-mobile-logo">
            <Link to="/" className="signup-logo">
              <span className="signup-logo-mark">N</span>

              <span>
                <strong>NoteShare</strong>
                <small>Academic knowledge, shared.</small>
              </span>
            </Link>
          </div>

          <section className="signup-card">
            <div className="signup-card-header">
              <span className="signup-eyebrow">
                CREATE YOUR ACCOUNT
              </span>

              <h2>Join NoteShare</h2>

              <p>
                Set up your student profile and start sharing knowledge.
              </p>
            </div>

            {error && (
              <div className="signup-error">
                <span className="signup-error-icon">!</span>

                <div>
                  <strong>Unable to create account</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="signup-form">
              <div className="signup-form-row">
                <Field label="Full name">
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Your full name"
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </Field>
              </div>

              <Field label="Institution">
                <input
                  value={form.institution}
                  onChange={(e) =>
                    set("institution", e.target.value)
                  }
                  autoComplete="organization"
                  placeholder="Your college or university"
                />
              </Field>

              <Field
                label="Password"
                hint="Minimum 8 characters, including letters and digits."
              >
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    set("password", e.target.value)
                  }
                  required
                  autoComplete="new-password"
                  placeholder="Create a secure password"
                />
              </Field>

              <div className="signup-password-note">
                <span>✓</span>
                <span>
                  Use a password you do not reuse on other accounts.
                </span>
              </div>

              <button
                className="signup-submit"
                type="submit"
                disabled={busy}
              >
                <span>
                  {busy
                    ? "Creating account…"
                    : "Create account"}
                </span>

                {!busy && (
                  <span className="signup-arrow">→</span>
                )}
              </button>
            </form>

            <div className="signup-divider">
              <span>ALREADY HAVE AN ACCOUNT?</span>
            </div>

            <Link
              to="/login"
              className="signup-login-link"
            >
              <span>Sign in to your account</span>
              <span>→</span>
            </Link>

            <p className="signup-security">
              <span>✓</span>
              Your information is handled through secure authentication.
            </p>
          </section>
        </main>
      </div>

      <style>{`
        .signup-shell {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: #f7f8fc;
          color: #34364f;
        }

        .signup-background {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .signup-orb {
          position: absolute;
          border-radius: 50%;
        }

        .signup-orb-one {
          width: 500px;
          height: 500px;
          top: -270px;
          right: -180px;
          background: rgba(104, 93, 210, 0.07);
        }

        .signup-orb-two {
          width: 370px;
          height: 370px;
          bottom: -220px;
          left: -160px;
          background: rgba(109, 166, 122, 0.06);
        }

        .signup-layout {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(400px, 0.95fr) minmax(500px, 1.05fr);
          width: min(1240px, 100%);
          min-height: 100vh;
          margin: 0 auto;
        }

        .signup-brand-panel {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 100vh;
          padding: 48px 55px;
          background:
            linear-gradient(
              145deg,
              rgba(39, 40, 67, 0.98),
              rgba(48, 47, 79, 0.97)
            );
          color: #ffffff;
          box-shadow: 20px 0 70px rgba(36, 37, 60, 0.08);
        }

        .signup-logo {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          width: fit-content;
          color: inherit;
          text-decoration: none;
        }

        .signup-logo-mark {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          color: #ffffff;
          background: linear-gradient(
            135deg,
            #766cdb,
            #5148b7
          );
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(90, 79, 190, 0.28);
          font-family: "Manrope", sans-serif;
          font-size: 15px;
          font-weight: 900;
        }

        .signup-logo strong {
          display: block;
          color: #ffffff;
          font-family: "Manrope", sans-serif;
          font-size: 15px;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .signup-logo small {
          display: block;
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 8px;
          font-weight: 700;
        }

        .signup-brand-content {
          max-width: 530px;
          margin: auto 0;
          padding: 65px 0;
        }

        .signup-eyebrow {
          display: inline-block;
          color: #8e85e6;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .signup-brand-content h1 {
          margin: 16px 0 20px;
          color: #ffffff;
          font-family: "Manrope", sans-serif;
          font-size: clamp(34px, 4.5vw, 53px);
          font-weight: 900;
          line-height: 0.98;
          letter-spacing: -0.055em;
        }

        .signup-brand-content h1 em {
          color: #a7a0ef;
          font-style: normal;
        }

        .signup-brand-content > p {
          max-width: 460px;
          margin: 0;
          color: rgba(255, 255, 255, 0.52);
          font-size: 11px;
          line-height: 1.9;
        }

        .signup-steps {
          display: grid;
          gap: 14px;
          margin-top: 34px;
        }

        .signup-step {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .step-number {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 8px;
          font-size: 7px;
          font-weight: 900;
        }

        .signup-step.active .step-number {
          color: #a49def;
          background: rgba(133, 123, 222, 0.11);
          border-color: rgba(153, 144, 235, 0.13);
        }

        .signup-step strong {
          display: block;
          color: rgba(255, 255, 255, 0.82);
          font-size: 9px;
          font-weight: 900;
        }

        .signup-step div > span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.34);
          font-size: 8px;
          line-height: 1.5;
        }

        .signup-brand-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.25);
          font-size: 7px;
          font-weight: 800;
        }

        .signup-form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 42px 55px;
        }

        .signup-card {
          width: min(500px, 100%);
          padding: 35px 38px 30px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #e7e8ef;
          border-radius: 18px;
          box-shadow:
            0 30px 80px rgba(43, 45, 74, 0.08),
            0 5px 20px rgba(43, 45, 74, 0.025);
        }

        .signup-card-header h2 {
          margin: 9px 0 8px;
          color: #303249;
          font-family: "Manrope", sans-serif;
          font-size: 28px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.045em;
        }

        .signup-card-header p {
          margin: 0 0 25px;
          color: #9699a9;
          font-size: 9px;
          line-height: 1.7;
        }

        .signup-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 19px;
          padding: 12px;
          color: #a14d58;
          background: #fff5f5;
          border: 1px solid #f0dfe1;
          border-radius: 9px;
        }

        .signup-error-icon {
          width: 19px;
          height: 19px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          color: #b95b65;
          background: #fbe4e6;
          border-radius: 50%;
          font-size: 9px;
          font-weight: 900;
        }

        .signup-error strong {
          display: block;
          margin-bottom: 2px;
          font-size: 8px;
          font-weight: 900;
        }

        .signup-error p {
          margin: 0;
          color: #9e6670;
          font-size: 8px;
          line-height: 1.5;
        }

        .signup-form {
          display: grid;
          gap: 15px;
        }

        .signup-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .signup-form .field {
          margin: 0;
        }

        .signup-form input {
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease,
            background 0.15s ease;
        }

        .signup-form input:focus {
          border-color: #8b83dd;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(107, 96, 205, 0.08);
          outline: none;
        }

        .signup-form input::placeholder {
          color: #b7b8c2;
        }

        .signup-password-note {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          margin-top: -4px;
          color: #a1a3ae;
          font-size: 7px;
          line-height: 1.55;
        }

        .signup-password-note span:first-child {
          color: #67a977;
          font-size: 8px;
          font-weight: 900;
        }

        .signup-submit {
          width: 100%;
          min-height: 45px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 3px;
          padding: 0 15px;
          color: #ffffff;
          background: linear-gradient(
            110deg,
            #6960d3,
            #5148b6
          );
          border: 0;
          border-radius: 8px;
          box-shadow: 0 9px 23px rgba(91, 82, 181, 0.2);
          font-family: inherit;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            opacity 0.15s ease;
        }

        .signup-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 27px rgba(91, 82, 181, 0.27);
        }

        .signup-submit:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .signup-arrow {
          font-size: 15px;
          line-height: 1;
        }

        .signup-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 23px 0 14px;
        }

        .signup-divider::before,
        .signup-divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: #eeeeF3;
        }

        .signup-divider span {
          color: #b0b2bd;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.13em;
        }

        .signup-login-link {
          min-height: 43px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 14px;
          color: #5c58a6;
          background: #f7f7fd;
          border: 1px solid #e8e7f5;
          border-radius: 8px;
          text-decoration: none;
          font-size: 8px;
          font-weight: 900;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            transform 0.15s ease;
        }

        .signup-login-link:hover {
          background: #f2f1fc;
          border-color: #dcd9f2;
          transform: translateY(-1px);
        }

        .signup-login-link > span:last-child {
          color: #756bd3;
          font-size: 13px;
        }

        .signup-security {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin: 18px 0 0;
          color: #aaacb7;
          font-size: 7px;
          font-weight: 700;
        }

        .signup-security span {
          color: #65a374;
          font-size: 8px;
          font-weight: 900;
        }

        .signup-mobile-logo {
          display: none;
        }

        @media (max-width: 960px) {
          .signup-layout {
            grid-template-columns: 1fr;
          }

          .signup-brand-panel {
            display: none;
          }

          .signup-form-panel {
            min-height: 100vh;
            padding: 38px 24px;
          }

          .signup-mobile-logo {
            display: block;
            margin-bottom: 25px;
          }

          .signup-mobile-logo .signup-logo {
            color: #303249;
          }

          .signup-mobile-logo .signup-logo strong {
            color: #303249;
          }

          .signup-mobile-logo .signup-logo small {
            color: #9699a9;
          }
        }

        @media (max-width: 600px) {
          .signup-form-panel {
            align-items: flex-start;
            padding: 27px 15px 40px;
          }

          .signup-card {
            padding: 28px 21px 25px;
            border-radius: 15px;
          }

          .signup-card-header h2 {
            font-size: 25px;
          }

          .signup-card-header p {
            margin-bottom: 22px;
          }

          .signup-form-row {
            grid-template-columns: 1fr;
            gap: 15px;
          }
        }

        @media (max-width: 420px) {
          .signup-card {
            padding-left: 18px;
            padding-right: 18px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .signup-submit,
          .signup-login-link,
          .signup-form input {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}