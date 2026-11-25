import { useEffect, useState } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export function Profile() {
  const { user, setUser } = useAuth();

  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setInstitution(user.institution || "");
    }
  }, [user]);

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
  }

  async function save() {
    if (!name.trim()) {
      showMessage("Please enter your name.", "error");
      return;
    }

    setSavingProfile(true);
    setMessage("");

    try {
      const data = await api("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          institution: institution.trim(),
        }),
      });

      setUser({
        ...user,
        ...data.user,
      });

      showMessage("Your profile has been updated.");
    } catch (e) {
      showMessage(e.message || "Unable to update your profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function change() {
    if (!password.currentPassword || !password.newPassword) {
      showMessage("Enter both your current and new password.", "error");
      return;
    }

    if (password.newPassword.length < 8) {
      showMessage("Your new password must be at least 8 characters.", "error");
      return;
    }

    setChangingPassword(true);
    setMessage("");

    try {
      await api("/auth/password", {
        method: "PATCH",
        body: JSON.stringify(password),
      });

      setPassword({
        currentPassword: "",
        newPassword: "",
      });

      showMessage("Password changed successfully.");
    } catch (e) {
      showMessage(e.message || "Unable to change your password.", "error");
    } finally {
      setChangingPassword(false);
    }
  }

  const initials =
    (user?.name || "Student")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "ST";

  return (
    <>
      <Navbar />

      <main className="profile-page">
        <section className="profile-hero">
          <div className="profile-hero-copy">
            <div className="profile-eyebrow">
              <span />
              ACCOUNT SETTINGS
            </div>

            <h1>Your profile.</h1>

            <p>
              Manage your personal information and account security
              from one place.
            </p>
          </div>

          <div className="profile-identity">
            <div className="profile-avatar">{initials}</div>

            <div>
              <strong>{user?.name || "Student"}</strong>
              <span>{user?.email || "No email available"}</span>
            </div>
          </div>
        </section>

        {message && (
          <div
            className={`profile-message ${
              messageType === "error" ? "error" : "success"
            }`}
          >
            <span>{messageType === "error" ? "!" : "✓"}</span>

            <p>{message}</p>

            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        <div className="profile-layout">
          <div className="profile-main">
            <section className="profile-card">
              <div className="profile-card-header">
                <div className="profile-card-icon personal">◉</div>

                <div>
                  <span className="profile-section-label">
                    PERSONAL INFORMATION
                  </span>

                  <h2>Basic details</h2>

                  <p>Keep your account information up to date.</p>
                </div>
              </div>

              <div className="profile-divider" />

              <div className="profile-form">
                <label className="profile-field">
                  <span>Name</span>

                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    autoComplete="name"
                  />
                </label>

                <label className="profile-field">
                  <span>Email address</span>

                  <div className="profile-input-with-badge">
                    <input
                      value={user?.email || ""}
                      disabled
                      autoComplete="email"
                    />

                    <span className="verified-badge">✓ Verified</span>
                  </div>

                  <small>
                    Your email address is linked to your account and cannot be
                    changed here.
                  </small>
                </label>

                <label className="profile-field">
                  <span>Institution</span>

                  <input
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. Techno India University"
                    autoComplete="organization"
                  />
                </label>

                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="profile-save-button"
                    onClick={save}
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <>
                        <span className="profile-button-spinner" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Save changes
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            <section className="profile-card security-card">
              <div className="profile-card-header">
                <div className="profile-card-icon security">◇</div>

                <div>
                  <span className="profile-section-label">
                    ACCOUNT SECURITY
                  </span>

                  <h2>Change password</h2>

                  <p>
                    Use a strong password that you don't use elsewhere.
                  </p>
                </div>
              </div>

              <div className="profile-divider" />

              <div className="profile-form">
                <label className="profile-field">
                  <span>Current password</span>

                  <input
                    type="password"
                    value={password.currentPassword}
                    onChange={(e) =>
                      setPassword({
                        ...password,
                        currentPassword: e.target.value,
                      })
                    }
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                  />
                </label>

                <label className="profile-field">
                  <span>New password</span>

                  <input
                    type="password"
                    value={password.newPassword}
                    onChange={(e) =>
                      setPassword({
                        ...password,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder="Enter a new password"
                    autoComplete="new-password"
                  />

                  <small>
                    Use at least 8 characters for better security.
                  </small>
                </label>

                <div className="password-hint">
                  <span>✓</span>

                  <p>
                    A strong password helps keep your notes, profile and
                    shared resources secure.
                  </p>
                </div>

                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="profile-password-button"
                    onClick={change}
                    disabled={changingPassword}
                  >
                    {changingPassword ? (
                      <>
                        <span className="profile-button-spinner dark" />
                        Updating...
                      </>
                    ) : (
                      <>
                        Update password
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </div>

          <aside className="profile-sidebar">
            <section className="profile-side-card">
              <div className="account-preview">
                <div className="account-preview-avatar">{initials}</div>

                <div>
                  <span>ACCOUNT</span>
                  <strong>{user?.name || "Student"}</strong>
                </div>
              </div>

              <div className="side-divider" />

              <div className="account-details">
                <div>
                  <span>Email</span>
                  <strong>{user?.email || "—"}</strong>
                </div>

                <div>
                  <span>Institution</span>
                  <strong>{user?.institution || "Not specified"}</strong>
                </div>

                <div>
                  <span>Role</span>
                  <strong>{user?.role || "STUDENT"}</strong>
                </div>
              </div>
            </section>

            <section className="profile-security-card">
              <div className="security-check">✓</div>

              <div>
                <span>YOUR ACCOUNT</span>

                <h3>Keep it secure.</h3>

                <p>
                  Never share your password with anyone. Our team will never
                  ask for your password.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </main>

      <ProfileStyles />
    </>
  );
}

function ProfileStyles() {
  return (
    <style>{`
      .profile-page {
        width: min(1120px, 92%);
        margin: 0 auto;
        padding: 34px 0 55px;
      }

      .profile-hero {
        min-height: 180px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 25px;
        padding: 30px 34px;
        background:
          linear-gradient(
            112deg,
            #f0efff 0%,
            #f8f7ff 58%,
            #eef6ff 100%
          );
        border: 1px solid #e5e3f7;
        border-radius: 19px;
      }

      .profile-eyebrow {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #6f66d0;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.15em;
      }

      .profile-eyebrow span {
        width: 7px;
        height: 7px;
        background: #8bcf6d;
        border-radius: 50%;
      }

      .profile-hero h1 {
        margin: 10px 0 6px;
        color: #292b47;
        font-family: "Manrope", sans-serif;
        font-size: clamp(31px, 4vw, 42px);
        font-weight: 900;
        letter-spacing: -0.055em;
      }

      .profile-hero-copy p {
        max-width: 520px;
        margin: 0;
        color: #878b9e;
        font-size: 10px;
        line-height: 1.8;
      }

      .profile-identity {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 12px 15px;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(226, 224, 244, 0.9);
        border-radius: 11px;
        backdrop-filter: blur(10px);
      }

      .profile-avatar,
      .account-preview-avatar {
        display: grid;
        place-items: center;
        color: white;
        background: linear-gradient(135deg, #7167dc, #5147b2);
        border-radius: 50%;
        font-weight: 900;
      }

      .profile-avatar {
        width: 40px;
        height: 40px;
        font-size: 11px;
      }

      .profile-identity > div:last-child {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .profile-identity strong {
        color: #3d3f58;
        font-size: 9px;
        font-weight: 900;
      }

      .profile-identity span {
        color: #9699aa;
        font-size: 7px;
      }

      .profile-message {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 16px;
        padding: 12px 14px;
        border-radius: 9px;
        font-size: 9px;
      }

      .profile-message.success {
        color: #4b815b;
        background: #eef8f0;
        border: 1px solid #d9eddd;
      }

      .profile-message.error {
        color: #a04752;
        background: #fff0f1;
        border: 1px solid #efd6d9;
      }

      .profile-message > span {
        width: 20px;
        height: 20px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: white;
        background: #68a978;
        border-radius: 50%;
        font-size: 9px;
        font-weight: 900;
      }

      .profile-message.error > span {
        background: #d45d69;
      }

      .profile-message p {
        flex: 1;
        margin: 0;
      }

      .profile-message button {
        padding: 0;
        color: currentColor;
        background: transparent;
        border: 0;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        opacity: 0.55;
      }

      .profile-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 290px;
        gap: 18px;
        margin-top: 19px;
        align-items: start;
      }

      .profile-main {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .profile-card,
      .profile-side-card {
        background: white;
        border: 1px solid #e7e8ef;
        border-radius: 15px;
      }

      .profile-card {
        overflow: hidden;
      }

      .profile-card-header {
        display: flex;
        align-items: flex-start;
        gap: 13px;
        padding: 21px 23px;
      }

      .profile-card-icon {
        width: 35px;
        height: 35px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        border-radius: 9px;
        font-size: 14px;
      }

      .profile-card-icon.personal {
        color: #665cd1;
        background: #efeeff;
      }

      .profile-card-icon.security {
        color: #5272b9;
        background: #edf2ff;
      }

      .profile-section-label {
        color: #746bd3;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: 0.14em;
      }

      .profile-card-header h2 {
        margin: 5px 0 3px;
        color: #34364f;
        font-family: "Manrope", sans-serif;
        font-size: 16px;
        font-weight: 800;
      }

      .profile-card-header p {
        margin: 0;
        color: #9a9dac;
        font-size: 8px;
      }

      .profile-divider {
        height: 1px;
        background: #f0f0f4;
      }

      .profile-form {
        padding: 21px 23px 23px;
      }

      .profile-field {
        display: block;
        margin-bottom: 16px;
      }

      .profile-field > span {
        display: block;
        margin-bottom: 6px;
        color: #65687d;
        font-size: 8px;
        font-weight: 900;
      }

      .profile-field input {
        width: 100%;
        min-height: 39px;
        padding: 0 11px;
        color: #3f4159;
        background: #fbfbfd;
        border: 1px solid #e3e4ec;
        border-radius: 7px;
        outline: none;
        font-family: inherit;
        font-size: 9px;
        transition:
          border-color 0.15s,
          box-shadow 0.15s,
          background 0.15s;
      }

      .profile-field input:focus {
        background: white;
        border-color: #aaa5e8;
        box-shadow: 0 0 0 3px rgba(109, 99, 211, 0.08);
      }

      .profile-field input:disabled {
        color: #999baa;
        background: #f4f4f7;
        cursor: not-allowed;
      }

      .profile-field input::placeholder {
        color: #b2b4c0;
      }

      .profile-field small {
        display: block;
        margin-top: 6px;
        color: #aaaebb;
        font-size: 7px;
        line-height: 1.6;
      }

      .profile-input-with-badge {
        position: relative;
      }

      .profile-input-with-badge input {
        padding-right: 80px;
      }

      .verified-badge {
        position: absolute;
        right: 9px;
        top: 50%;
        transform: translateY(-50%);
        padding: 4px 6px;
        color: #518861;
        background: #edf8ef;
        border-radius: 5px;
        font-size: 6px !important;
        font-weight: 900 !important;
      }

      .profile-form-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 4px;
      }

      .profile-save-button,
      .profile-password-button {
        min-height: 35px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 13px;
        border-radius: 7px;
        font-family: inherit;
        font-size: 8px;
        font-weight: 900;
        cursor: pointer;
        transition:
          transform 0.15s,
          box-shadow 0.15s,
          opacity 0.15s;
      }

      .profile-save-button {
        color: white;
        background: linear-gradient(110deg, #675dd4, #5148b5);
        border: 1px solid #675dd4;
        box-shadow: 0 6px 16px rgba(95, 85, 196, 0.16);
      }

      .profile-save-button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 9px 20px rgba(95, 85, 196, 0.22);
      }

      .profile-password-button {
        color: #5f66a0;
        background: #f0f1ff;
        border: 1px solid #dfe1f7;
      }

      .profile-password-button:hover:not(:disabled) {
        background: #e9eaff;
        transform: translateY(-1px);
      }

      .profile-save-button:disabled,
      .profile-password-button:disabled {
        opacity: 0.6;
        cursor: wait;
        transform: none;
      }

      .profile-save-button span:last-child,
      .profile-password-button span:last-child {
        font-size: 12px;
      }

      .profile-button-spinner {
        width: 11px;
        height: 11px;
        border: 2px solid rgba(255, 255, 255, 0.35);
        border-top-color: white;
        border-radius: 50%;
        animation: profile-spin 0.7s linear infinite;
      }

      .profile-button-spinner.dark {
        border-color: rgba(94, 100, 160, 0.25);
        border-top-color: #5f66a0;
      }

      @keyframes profile-spin {
        to {
          transform: rotate(360deg);
        }
      }

      .password-hint {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 3px 0 17px;
        padding: 10px 11px;
        background: #f7f8ff;
        border: 1px solid #e8e9f7;
        border-radius: 7px;
      }

      .password-hint > span {
        color: #6a9d71;
        font-size: 9px;
        font-weight: 900;
      }

      .password-hint p {
        margin: 0;
        color: #8c8fa2;
        font-size: 7px;
        line-height: 1.7;
      }

      .profile-sidebar {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .profile-side-card {
        padding: 19px;
      }

      .account-preview {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .account-preview-avatar {
        width: 37px;
        height: 37px;
        font-size: 9px;
      }

      .account-preview > div:last-child {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .account-preview span {
        color: #989baa;
        font-size: 6px;
        font-weight: 900;
        letter-spacing: 0.12em;
      }

      .account-preview strong {
        color: #3e4058;
        font-size: 9px;
        font-weight: 900;
      }

      .side-divider {
        height: 1px;
        margin: 17px 0;
        background: #f0f0f4;
      }

      .account-details {
        display: flex;
        flex-direction: column;
        gap: 13px;
      }

      .account-details div {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .account-details span {
        color: #a0a3b0;
        font-size: 7px;
      }

      .account-details strong {
        color: #55586e;
        font-size: 8px;
        font-weight: 800;
        overflow-wrap: anywhere;
      }

      .profile-security-card {
        display: flex;
        gap: 10px;
        padding: 17px;
        background: #f3f2ff;
        border: 1px solid #e4e1fb;
        border-radius: 13px;
      }

      .security-check {
        width: 27px;
        height: 27px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #5f56c8;
        background: white;
        border-radius: 50%;
        font-size: 10px;
        font-weight: 900;
      }

      .profile-security-card span {
        color: #756bd1;
        font-size: 6px;
        font-weight: 900;
        letter-spacing: 0.13em;
      }

      .profile-security-card h3 {
        margin: 5px 0 5px;
        color: #41435d;
        font-family: "Manrope", sans-serif;
        font-size: 12px;
        font-weight: 800;
      }

      .profile-security-card p {
        margin: 0;
        color: #9295a8;
        font-size: 7px;
        line-height: 1.8;
      }

      @media (max-width: 850px) {
        .profile-layout {
          grid-template-columns: 1fr;
        }

        .profile-sidebar {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 650px) {
        .profile-page {
          width: calc(100% - 30px);
          padding-top: 20px;
        }

        .profile-hero {
          align-items: flex-start;
          flex-direction: column;
          padding: 24px 21px;
        }

        .profile-identity {
          width: 100%;
        }

        .profile-sidebar {
          display: flex;
        }

        .profile-card-header,
        .profile-form {
          padding-left: 17px;
          padding-right: 17px;
        }

        .profile-form-actions {
          justify-content: stretch;
        }

        .profile-save-button,
        .profile-password-button {
          width: 100%;
          justify-content: center;
        }
      }

      @media (max-width: 400px) {
        .profile-input-with-badge .verified-badge {
          display: none;
        }

        .profile-input-with-badge input {
          padding-right: 11px;
        }
      }
    `}</style>
  );
}