import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Field } from "../components/Field";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nav = useNavigate();
  const { login } = useAuth();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const d = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      login(d);
      nav("/");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-background">
        <div className="login-orb login-orb-one" />
        <div className="login-orb login-orb-two" />
      </div>

      <div className="login-layout">
        <aside className="login-brand-panel">
          <Link to="/" className="login-logo">
            <span className="login-logo-mark">N</span>

            <span>
              <strong>NoteShare</strong>
              <small>Academic knowledge, shared.</small>
            </span>
          </Link>

          <div className="login-brand-content">
            <span className="login-eyebrow">
              STUDENT KNOWLEDGE HUB
            </span>

            <h1>
              Your notes.
              <br />
              Your knowledge.
              <br />
              <em>One workspace.</em>
            </h1>

            <p>
              Find quality study material, organize your notes,
              and share useful resources with your academic community.
            </p>

            <div className="login-feature-list">
              <div className="login-feature">
                <span className="feature-icon">↗</span>
                <div>
                  <strong>Discover resources</strong>
                  <span>Find notes by subject, semester and course.</span>
                </div>
              </div>

              <div className="login-feature">
                <span className="feature-icon">＋</span>
                <div>
                  <strong>Share what you know</strong>
                  <span>Upload useful material for fellow students.</span>
                </div>
              </div>

              <div className="login-feature">
                <span className="feature-icon">✓</span>
                <div>
                  <strong>Keep everything organized</strong>
                  <span>Manage your academic resources in one place.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="login-brand-footer">
            <span>Built for students</span>
            <span>•</span>
            <span>Learn · Share · Grow</span>
          </div>
        </aside>

        <main className="login-form-panel">
          <div className="login-mobile-logo">
            <Link to="/" className="login-logo">
              <span className="login-logo-mark">N</span>

              <span>
                <strong>NoteShare</strong>
                <small>Academic knowledge, shared.</small>
              </span>
            </Link>
          </div>

          <section className="login-card">
            <div className="login-card-header">
              <span className="login-eyebrow">
                STUDENT WORKSPACE
              </span>

              <h2>Welcome back</h2>

              <p>
                Sign in to continue to your academic workspace.
              </p>
            </div>

            {error && (
              <div className="login-error">
                <span className="login-error-icon">!</span>

                <div>
                  <strong>Sign-in failed</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="login-form">
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </Field>

              <Field label="Password">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
              </Field>

              <button
                className="login-submit"
                type="submit"
                disabled={busy}
              >
                <span>
                  {busy ? "Signing in…" : "Sign in"}
                </span>

                {!busy && <span className="login-arrow">→</span>}
              </button>
            </form>

            <div className="login-divider">
              <span>NEW TO NOTESHARE?</span>
            </div>

            <Link to="/signup" className="login-create-account">
              <span>Create your student account</span>
              <span>→</span>
            </Link>

            <p className="login-security">
              <span>✓</span>
              Your account is protected by secure authentication.
            </p>
          </section>
        </main>
      </div>

      <style>{`
        .login-shell {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: #f7f8fc;
          color: #34364f;
        }

        .login-background {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(1px);
        }

        .login-orb-one {
          width: 480px;
          height: 480px;
          top: -260px;
          right: -170px;
          background: rgba(104, 93, 210, 0.07);
        }

        .login-orb-two {
          width: 360px;
          height: 360px;
          bottom: -210px;
          left: -150px;
          background: rgba(109, 166, 122, 0.06);
        }

        .login-layout {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(400px, 0.95fr) minmax(460px, 1.05fr);
          width: min(1240px, 100%);
          min-height: 100vh;
          margin: 0 auto;
        }

        .login-brand-panel {
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

        .login-logo {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          width: fit-content;
          color: inherit;
          text-decoration: none;
        }

        .login-logo-mark {
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

        .login-logo strong {
          display: block;
          color: #ffffff;
          font-family: "Manrope", sans-serif;
          font-size: 15px;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .login-logo small {
          display: block;
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .login-brand-content {
          max-width: 530px;
          margin: auto 0;
          padding: 70px 0;
        }

        .login-eyebrow {
          display: inline-block;
          color: #8e85e6;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .login-brand-content h1 {
          margin: 16px 0 20px;
          color: #ffffff;
          font-family: "Manrope", sans-serif;
          font-size: clamp(34px, 4.5vw, 55px);
          font-weight: 900;
          line-height: 0.98;
          letter-spacing: -0.055em;
        }

        .login-brand-content h1 em {
          color: #a7a0ef;
          font-style: normal;
        }

        .login-brand-content > p {
          max-width: 460px;
          margin: 0;
          color: rgba(255, 255, 255, 0.52);
          font-size: 11px;
          line-height: 1.9;
        }

        .login-feature-list {
          display: grid;
          gap: 14px;
          margin-top: 34px;
        }

        .login-feature {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .feature-icon {
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          color: #a49def;
          background: rgba(133, 123, 222, 0.1);
          border: 1px solid rgba(153, 144, 235, 0.12);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 900;
        }

        .login-feature strong {
          display: block;
          color: rgba(255, 255, 255, 0.82);
          font-size: 9px;
          font-weight: 900;
        }

        .login-feature div > span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.34);
          font-size: 8px;
          line-height: 1.5;
        }

        .login-brand-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.25);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.03em;
        }

        .login-form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 48px 60px;
        }

        .login-card {
          width: min(440px, 100%);
          padding: 39px 40px 32px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #e7e8ef;
          border-radius: 18px;
          box-shadow:
            0 30px 80px rgba(43, 45, 74, 0.08),
            0 5px 20px rgba(43, 45, 74, 0.025);
        }

        .login-card-header h2 {
          margin: 9px 0 8px;
          color: #303249;
          font-family: "Manrope", sans-serif;
          font-size: 28px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.045em;
        }

        .login-card-header p {
          margin: 0 0 27px;
          color: #9699a9;
          font-size: 9px;
          line-height: 1.7;
        }

        .login-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 20px;
          padding: 12px;
          color: #a14d58;
          background: #fff5f5;
          border: 1px solid #f0dfe1;
          border-radius: 9px;
        }

        .login-error-icon {
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

        .login-error strong {
          display: block;
          margin-bottom: 2px;
          font-size: 8px;
          font-weight: 900;
        }

        .login-error p {
          margin: 0;
          color: #9e6670;
          font-size: 8px;
          line-height: 1.5;
        }

        .login-form {
          display: grid;
          gap: 16px;
        }

        .login-form .field {
          margin: 0;
        }

        .login-form input {
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease,
            background 0.15s ease;
        }

        .login-form input:focus {
          border-color: #8b83dd;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(107, 96, 205, 0.08);
          outline: none;
        }

        .login-form input::placeholder {
          color: #b7b8c2;
        }

        .login-submit {
          width: 100%;
          min-height: 45px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 4px;
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

        .login-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 27px rgba(91, 82, 181, 0.27);
        }

        .login-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-submit:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .login-arrow {
          font-size: 15px;
          line-height: 1;
        }

        .login-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 26px 0 15px;
        }

        .login-divider::before,
        .login-divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: #eeeeF3;
        }

        .login-divider span {
          color: #b0b2bd;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.13em;
        }

        .login-create-account {
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

        .login-create-account:hover {
          background: #f2f1fc;
          border-color: #dcd9f2;
          transform: translateY(-1px);
        }

        .login-create-account > span:last-child {
          color: #756bd3;
          font-size: 13px;
        }

        .login-security {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin: 20px 0 0;
          color: #aaacb7;
          font-size: 7px;
          font-weight: 700;
        }

        .login-security span {
          color: #65a374;
          font-size: 8px;
          font-weight: 900;
        }

        .login-mobile-logo {
          display: none;
        }

        @media (max-width: 900px) {
          .login-layout {
            grid-template-columns: 1fr;
          }

          .login-brand-panel {
            display: none;
          }

          .login-form-panel {
            min-height: 100vh;
            padding: 40px 24px;
          }

          .login-mobile-logo {
            display: block;
            margin-bottom: 27px;
          }

          .login-mobile-logo .login-logo {
            color: #303249;
          }

          .login-mobile-logo .login-logo strong {
            color: #303249;
          }

          .login-mobile-logo .login-logo small {
            color: #9699a9;
          }
        }

        @media (max-width: 520px) {
          .login-form-panel {
            align-items: flex-start;
            padding: 28px 15px 40px;
          }

          .login-mobile-logo {
            margin-bottom: 22px;
          }

          .login-card {
            padding: 28px 22px 25px;
            border-radius: 15px;
          }

          .login-card-header h2 {
            font-size: 25px;
          }

          .login-card-header p {
            margin-bottom: 23px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-submit,
          .login-create-account,
          .login-form input {
            transition: none;
          }

          .shared-loader {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}