import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { api, API_URL } from "../lib/api";

export function SharedNote() {
  const { id, token } = useParams();
  const [note, setNote] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api(`/notes/shared/${id}/${token}`)
      .then(setNote)
      .catch((e) => setError(e.message));
  }, [id, token]);

  async function download() {
    setDownloading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/notes/${id}/download?token=${encodeURIComponent(token)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download =
        note.file?.originalName || `${note.title}.pdf`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  if (error) {
    return (
      <>
        <Navbar />

        <main className="shared-page">
          <section className="shared-error-card">
            <div className="shared-error-icon">!</div>

            <div>
              <span className="shared-eyebrow">SHARED RESOURCE</span>
              <h1>Unable to open this note</h1>
              <p>{error}</p>
            </div>
          </section>
        </main>

        <SharedNoteStyles />
      </>
    );
  }

  if (!note) {
    return (
      <>
        <Navbar />

        <main className="shared-page">
          <section className="shared-loading-card">
            <div className="shared-loader" />

            <span className="shared-eyebrow">
              SECURE SHARE LINK
            </span>

            <h1>Checking your shared note…</h1>

            <p>
              Verifying the link and preparing the study material.
            </p>
          </section>
        </main>

        <SharedNoteStyles />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="shared-page">
        <div className="shared-container">
          <div className="shared-breadcrumb">
            <span className="breadcrumb-dot" />
            Shared study material
          </div>

          <section className="shared-hero">
            <div className="shared-document-icon">
              <span>DOC</span>
            </div>

            <div className="shared-hero-content">
              <div className="shared-eyebrow">
                SHARED NOTE
              </div>

              <h1>{note.title}</h1>

              <div className="shared-meta">
                <span>
                  <span className="meta-icon">◉</span>
                  {note.uploader?.name || "Student"}
                </span>

                <span className="meta-divider">•</span>

                <span>
                  {note.subject?.name || "Study material"}
                </span>

                <span className="meta-divider">•</span>

                <span>
                  Semester {note.semester}
                </span>
              </div>
            </div>

            <div className="shared-status">
              <span className="status-dot" />
              Available
            </div>
          </section>

          <div className="shared-content-grid">
            <section className="shared-main-card">
              <div className="card-section-label">
                ABOUT THIS NOTE
              </div>

              <h2>Study material</h2>

              <p className="shared-description">
                {note.description ||
                  "No description was provided for this study material."}
              </p>

              <div className="shared-info-grid">
                <div className="shared-info-item">
                  <span>Subject</span>
                  <strong>
                    {note.subject?.name || "—"}
                  </strong>
                </div>

                <div className="shared-info-item">
                  <span>Semester</span>
                  <strong>
                    {note.semester || "—"}
                  </strong>
                </div>

                <div className="shared-info-item">
                  <span>Uploaded by</span>
                  <strong>
                    {note.uploader?.name || "Student"}
                  </strong>
                </div>

                <div className="shared-info-item">
                  <span>File</span>
                  <strong>
                    {note.file?.originalName || "Study document"}
                  </strong>
                </div>
              </div>
            </section>

            <aside className="shared-download-card">
              <div className="download-icon">
                ↓
              </div>

              <div>
                <span className="card-section-label">
                  GET THE FILE
                </span>

                <h3>Download this note</h3>

                <p>
                  Save the shared study material to your device.
                </p>
              </div>

              <button
                className="shared-download-button"
                onClick={download}
                disabled={downloading}
              >
                <span>
                  {downloading
                    ? "Downloading…"
                    : "Download note"}
                </span>

                <span className="download-arrow">
                  →
                </span>
              </button>

              <div className="download-security">
                <span>✓</span>
                Secure shared resource
              </div>
            </aside>
          </div>

          <div className="shared-footer-note">
            <span>ⓘ</span>
            This page was opened through a shared link. Access
            permissions are controlled by the note owner.
          </div>
        </div>
      </main>

      <SharedNoteStyles />
    </>
  );
}

function SharedNoteStyles() {
  return (
    <style>{`
      .shared-page {
        min-height: calc(100vh - 70px);
        padding: 48px 20px 80px;
        background:
          radial-gradient(
            circle at 10% 0%,
            rgba(103, 93, 212, 0.07),
            transparent 32%
          ),
          radial-gradient(
            circle at 90% 10%,
            rgba(111, 169, 122, 0.055),
            transparent 28%
          ),
          #f7f8fc;
      }

      .shared-container {
        width: min(1040px, 100%);
        margin: 0 auto;
      }

      .shared-breadcrumb {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        color: #9497a8;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.02em;
      }

      .breadcrumb-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #756bd4;
        box-shadow: 0 0 0 4px rgba(117, 107, 212, 0.1);
      }

      .shared-hero {
        position: relative;
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 30px;
        overflow: hidden;
        background:
          linear-gradient(
            125deg,
            #ffffff 0%,
            #f8f7ff 58%,
            #f1f6ff 100%
          );
        border: 1px solid #e7e8f0;
        border-radius: 20px;
        box-shadow: 0 16px 45px rgba(45, 48, 78, 0.055);
      }

      .shared-hero::after {
        content: "";
        position: absolute;
        width: 190px;
        height: 190px;
        right: -100px;
        top: -100px;
        border-radius: 50%;
        background: rgba(112, 101, 214, 0.07);
      }

      .shared-document-icon {
        position: relative;
        z-index: 1;
        width: 68px;
        height: 78px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #6259c9;
        background: linear-gradient(
          145deg,
          #efeeff,
          #e7e6fb
        );
        border: 1px solid #dedcf5;
        border-radius: 14px;
        box-shadow: 0 8px 20px rgba(91, 82, 181, 0.1);
      }

      .shared-document-icon::before {
        content: "";
        position: absolute;
        top: 0;
        right: 0;
        width: 19px;
        height: 19px;
        background: #ffffff;
        clip-path: polygon(0 0, 100% 100%, 0 100%);
        opacity: 0.8;
      }

      .shared-document-icon span {
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.08em;
      }

      .shared-hero-content {
        position: relative;
        z-index: 1;
        min-width: 0;
        flex: 1;
      }

      .shared-eyebrow {
        display: inline-block;
        color: #7168cf;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.16em;
      }

      .shared-hero h1 {
        max-width: 720px;
        margin: 7px 0 9px;
        color: #292b47;
        font-family: "Manrope", sans-serif;
        font-size: clamp(25px, 4vw, 38px);
        font-weight: 900;
        line-height: 1.05;
        letter-spacing: -0.045em;
        overflow-wrap: anywhere;
      }

      .shared-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        color: #858898;
        font-size: 10px;
        font-weight: 700;
      }

      .shared-meta > span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }

      .meta-icon {
        color: #746bd2;
        font-size: 9px;
      }

      .meta-divider {
        color: #c6c7d0;
      }

      .shared-status {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        gap: 7px;
        flex-shrink: 0;
        padding: 8px 11px;
        color: #52835e;
        background: #eef8f0;
        border: 1px solid #dbeede;
        border-radius: 999px;
        font-size: 9px;
        font-weight: 900;
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #68a977;
        box-shadow: 0 0 0 4px rgba(104, 169, 119, 0.1);
      }

      .shared-content-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.75fr);
        gap: 15px;
        margin-top: 15px;
        align-items: start;
      }

      .shared-main-card,
      .shared-download-card {
        background: #ffffff;
        border: 1px solid #e7e8ef;
        border-radius: 16px;
        box-shadow: 0 10px 32px rgba(45, 48, 78, 0.035);
      }

      .shared-main-card {
        padding: 27px;
      }

      .card-section-label {
        color: #8b8ea0;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.14em;
      }

      .shared-main-card h2 {
        margin: 7px 0 10px;
        color: #3a3c55;
        font-family: "Manrope", sans-serif;
        font-size: 18px;
        font-weight: 900;
        letter-spacing: -0.02em;
      }

      .shared-description {
        max-width: 760px;
        margin: 0;
        color: #858897;
        font-size: 11px;
        line-height: 1.85;
      }

      .shared-info-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid #f0f0f4;
      }

      .shared-info-item {
        min-width: 0;
        padding: 12px;
        background: #fafafd;
        border: 1px solid #f0f0f4;
        border-radius: 9px;
      }

      .shared-info-item span {
        display: block;
        margin-bottom: 5px;
        color: #a0a2af;
        font-size: 7px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .shared-info-item strong {
        display: block;
        color: #55576b;
        font-size: 9px;
        font-weight: 900;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .shared-download-card {
        position: sticky;
        top: 90px;
        padding: 23px;
      }

      .download-icon {
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        margin-bottom: 17px;
        color: #635acb;
        background: #efeeff;
        border: 1px solid #e2e0f7;
        border-radius: 10px;
        font-size: 17px;
        font-weight: 900;
      }

      .shared-download-card h3 {
        margin: 7px 0 7px;
        color: #3d3f57;
        font-family: "Manrope", sans-serif;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: -0.02em;
      }

      .shared-download-card p {
        margin: 0;
        color: #999baa;
        font-size: 9px;
        line-height: 1.7;
      }

      .shared-download-button {
        width: 100%;
        min-height: 43px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 20px;
        padding: 0 14px;
        color: #ffffff;
        background: linear-gradient(
          110deg,
          #675dd4,
          #5148b5
        );
        border: 0;
        border-radius: 8px;
        box-shadow: 0 8px 20px rgba(91, 82, 181, 0.17);
        font-family: inherit;
        font-size: 9px;
        font-weight: 900;
        cursor: pointer;
        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease,
          opacity 0.15s ease;
      }

      .shared-download-button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 11px 24px rgba(91, 82, 181, 0.23);
      }

      .shared-download-button:disabled {
        opacity: 0.6;
        cursor: wait;
      }

      .download-arrow {
        font-size: 14px;
      }

      .download-security {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 13px;
        color: #9da0ad;
        font-size: 7px;
        font-weight: 700;
      }

      .download-security span {
        color: #67a977;
        font-size: 9px;
        font-weight: 900;
      }

      .shared-footer-note {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-top: 14px;
        padding: 13px 15px;
        color: #9b9daa;
        background: rgba(255, 255, 255, 0.65);
        border: 1px solid #ececf2;
        border-radius: 10px;
        font-size: 8px;
        line-height: 1.6;
      }

      .shared-footer-note span {
        color: #746bd2;
        font-weight: 900;
      }

      /* LOADING */

      .shared-loading-card {
        width: min(520px, 100%);
        margin: 90px auto;
        padding: 42px 30px;
        text-align: center;
        background: #ffffff;
        border: 1px solid #e7e8ef;
        border-radius: 18px;
        box-shadow: 0 18px 50px rgba(45, 48, 78, 0.06);
      }

      .shared-loader {
        width: 34px;
        height: 34px;
        margin: 0 auto 21px;
        border: 3px solid #ecebf7;
        border-top-color: #665cd0;
        border-radius: 50%;
        animation: shared-spin 0.8s linear infinite;
      }

      .shared-loading-card h1 {
        margin: 8px 0 8px;
        color: #353750;
        font-family: "Manrope", sans-serif;
        font-size: 19px;
        font-weight: 900;
        letter-spacing: -0.025em;
      }

      .shared-loading-card p {
        margin: 0;
        color: #9699a9;
        font-size: 9px;
        line-height: 1.7;
      }

      @keyframes shared-spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* ERROR */

      .shared-error-card {
        width: min(700px, 100%);
        display: flex;
        align-items: flex-start;
        gap: 18px;
        margin: 90px auto;
        padding: 28px;
        background: #ffffff;
        border: 1px solid #efd9dc;
        border-radius: 16px;
        box-shadow: 0 15px 45px rgba(45, 48, 78, 0.05);
      }

      .shared-error-icon {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #b54e5a;
        background: #fff0f1;
        border: 1px solid #efd9dc;
        border-radius: 11px;
        font-size: 15px;
        font-weight: 900;
      }

      .shared-error-card h1 {
        margin: 7px 0 7px;
        color: #3d3f57;
        font-family: "Manrope", sans-serif;
        font-size: 20px;
        font-weight: 900;
        letter-spacing: -0.025em;
      }

      .shared-error-card p {
        margin: 0;
        color: #8e919f;
        font-size: 10px;
        line-height: 1.7;
      }

      @media (max-width: 760px) {
        .shared-page {
          padding: 30px 14px 60px;
        }

        .shared-hero {
          align-items: flex-start;
          flex-wrap: wrap;
          padding: 22px;
        }

        .shared-document-icon {
          width: 54px;
          height: 63px;
        }

        .shared-status {
          width: 100%;
          justify-content: center;
        }

        .shared-content-grid {
          grid-template-columns: 1fr;
        }

        .shared-download-card {
          position: static;
        }

        .shared-info-grid {
          grid-template-columns: 1fr;
        }

        .shared-main-card {
          padding: 22px;
        }

        .shared-meta {
          line-height: 1.8;
        }
      }

      @media (max-width: 480px) {
        .shared-page {
          padding-left: 11px;
          padding-right: 11px;
        }

        .shared-hero {
          gap: 14px;
          padding: 18px;
        }

        .shared-hero h1 {
          font-size: 25px;
        }

        .shared-document-icon {
          width: 48px;
          height: 57px;
        }

        .shared-main-card,
        .shared-download-card {
          border-radius: 13px;
        }

        .shared-main-card {
          padding: 18px;
        }

        .shared-download-card {
          padding: 19px;
        }

        .shared-error-card {
          margin-top: 50px;
          padding: 21px;
        }
      }
    `}</style>
  );
}