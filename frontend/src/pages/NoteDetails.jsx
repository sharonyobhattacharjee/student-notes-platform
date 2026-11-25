
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { api, API_URL } from "../lib/api";

export function NoteDetails() {
  const { id } = useParams();

  const [note, setNote] = useState(null);
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadNote() {
    setLoading(true);
    setError("");

    try {
      const data = await api(`/notes/${id}`);
      setNote(data);
    } catch (e) {
      setError(e.message || "Unable to load this note.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setNote(null);
    loadNote();
  }, [id]);

  async function download() {
    if (!note || downloading) return;

    setDownloading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/notes/${id}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        let message = "Download failed. Please try again.";

        try {
          const data = await response.json();
          message = data.message || message;
        } catch {
          // Keep the default download error.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download =
        note.file?.originalName || `${note.title || "note"}.pdf`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      setNotice("Your download has started.");
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  async function submitReview(e) {
    e.preventDefault();

    if (!rating || busy) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api(`/notes/${id}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          rating: Number(rating),
          comment: comment.trim(),
        }),
      });

      setRating("");
      setComment("");
      setNotice("Your review has been submitted.");

      await loadNote();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function reportNote() {
    if (reporting) return;

    const reason = window.prompt(
      "Please explain why you are reporting this note."
    );

    if (!reason?.trim()) return;

    setReporting(true);
    setError("");
    setNotice("");

    try {
      await api(`/notes/${id}/report`, {
        method: "POST",
        body: JSON.stringify({
          reason: reason.trim(),
          noteId: id,
      }),
      });

      setNotice("Your report has been submitted for review.");
    } catch (e) {
      setError(e.message);
    } finally {
      setReporting(false);
    }
  }

  const ratingValue = Number(note?.averageRating || 0);
  const reviews = note?.reviews || [];

  const fileName = note?.file?.originalName || "Study material";
  const fileExtension = fileName.includes(".")
    ? fileName.split(".").pop().toUpperCase()
    : "NOTE";

  const uploadedDate = note?.uploadedAt
    ? new Date(note.uploadedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="note-detail-page">
          <div className="note-detail-loading">
            <div className="detail-spinner" />
            <p>Preparing your study material...</p>
          </div>
        </main>
        <DetailStyles />
      </>
    );
  }

  if (!note) {
    return (
      <>
        <Navbar />
        <main className="note-detail-page">
          <div className="note-detail-error">
            <span className="detail-error-icon">!</span>
            <h2>We couldn't find this note.</h2>
            <p>{error || "This resource may have been removed or is unavailable."}</p>
            <Link to="/read" className="detail-primary-button">
              Return to library <span>↗</span>
            </Link>
          </div>
        </main>
        <DetailStyles />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="note-detail-page">
        {/* BREADCRUMB */}
        <div className="detail-breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/read">Library</Link>
          <span>/</span>
          <span className="breadcrumb-current">Resource details</span>
        </div>

        {/* MAIN HEADER */}
        <section className="note-detail-hero">
          <div className="note-detail-hero-content">
            <div className="detail-eyebrow">
              <span />
              ACADEMIC RESOURCE
            </div>

            <div className="detail-subject-tag">
              {note.subject?.name || "Study material"}
              <span>·</span>
              Semester {note.semester || "—"}
            </div>

            <h1>{note.title}</h1>

            <p className="detail-uploader">
              Contributed by <strong>{note.uploader?.name || "Student"}</strong>
            </p>

            <div className="detail-hero-actions">
              <button
                className="detail-primary-button"
                onClick={download}
                disabled={downloading}
              >
                {downloading ? "Preparing download..." : "↓ Download resource"}
              </button>

              <button
                className="detail-report-button"
                onClick={reportNote}
                disabled={reporting}
              >
                {reporting ? "Submitting..." : "Report resource"}
              </button>
            </div>
          </div>

          <div className="detail-hero-visual" aria-hidden="true">
            <div className="detail-visual-circle">
              <svg
                width="76"
                height="88"
                viewBox="0 0 64 76"
                fill="none"
              >
                <path
                  d="M10 3H39L56 20V68C56 70.2 54.2 72 52 72H10C7.8 72 6 70.2 6 68V7C6 4.8 7.8 3 10 3Z"
                  fill="white"
                  stroke="#C9C4FF"
                  strokeWidth="2"
                />
                <path
                  d="M39 3V20H56"
                  stroke="#C9C4FF"
                  strokeWidth="2"
                />
                <path
                  d="M17 34H45M17 44H45M17 54H37"
                  stroke="#8177E5"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <span>{fileExtension}</span>
            </div>
            <div className="detail-visual-orbit" />
          </div>
        </section>

        {/* FEEDBACK */}
        {error && (
          <div className="detail-feedback detail-feedback-error" role="alert">
            <span>!</span>
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        {notice && (
          <div className="detail-feedback detail-feedback-success" role="status">
            <span>✓</span>
            {notice}
            <button onClick={() => setNotice("")} aria-label="Dismiss message">
              ×
            </button>
          </div>
        )}

        {/* CONTENT GRID */}
        <div className="note-detail-grid">
          <div className="note-detail-main-column">
            {/* ABOUT */}
            <section className="detail-panel">
              <div className="detail-panel-heading">
                <div>
                  <span className="detail-section-label">OVERVIEW</span>
                  <h2>About this resource</h2>
                </div>
                <span className="detail-heading-icon">◈</span>
              </div>

              <p className="detail-description">
                {note.description ||
                  "The contributor has not provided a description for this resource."}
              </p>

              {note.topic && (
                <div className="detail-topic">
                  <span>TOPIC</span>
                  <strong>{note.topic}</strong>
                </div>
              )}
            </section>

            {/* METADATA */}
            <section className="detail-panel">
              <div className="detail-panel-heading">
                <div>
                  <span className="detail-section-label">RESOURCE INFORMATION</span>
                  <h2>Document details</h2>
                </div>
                <span className="detail-heading-icon">▤</span>
              </div>

              <div className="detail-metadata-grid">
                <div className="detail-metadata-item">
                  <span>SUBJECT</span>
                  <strong>{note.subject?.name || "—"}</strong>
                </div>

                <div className="detail-metadata-item">
                  <span>COURSE</span>
                  <strong>{note.course?.name || "—"}</strong>
                </div>

                <div className="detail-metadata-item">
                  <span>SEMESTER</span>
                  <strong>{note.semester || "—"}</strong>
                </div>

                <div className="detail-metadata-item">
                  <span>CATEGORY</span>
                  <strong>{note.category?.name || "—"}</strong>
                </div>

                <div className="detail-metadata-item">
                  <span>FILE FORMAT</span>
                  <strong>{fileExtension}</strong>
                </div>

                <div className="detail-metadata-item">
                  <span>UPLOADED ON</span>
                  <strong>{uploadedDate}</strong>
                </div>

                <div className="detail-metadata-item">
                  <span>DOWNLOADS</span>
                  <strong>{note.downloadCount || 0}</strong>
                </div>

                <div className="detail-metadata-item">
                  <span>VISIBILITY</span>
                  <strong>{note.visibility || "—"}</strong>
                </div>
              </div>
            </section>

            {/* REVIEWS */}
            <section className="detail-panel">
              <div className="detail-panel-heading">
                <div>
                  <span className="detail-section-label">COMMUNITY FEEDBACK</span>
                  <h2>Ratings & reviews</h2>
                </div>

                <div className="detail-review-summary">
                  <span>★</span>
                  <strong>{ratingValue.toFixed(1)}</strong>
                  <small>{note.ratingCount || 0} ratings</small>
                </div>
              </div>

              <form className="detail-review-form" onSubmit={submitReview}>
                <label htmlFor="review-rating">Your rating</label>

                <select
                  id="review-rating"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  required
                >
                  <option value="">Select a rating</option>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {"★".repeat(value)} — {value} star{value > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>

                <label htmlFor="review-comment">Your review</label>

                <textarea
                  id="review-comment"
                  placeholder="Share your experience with this resource..."
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />

                <div className="detail-review-form-footer">
                  <span>{comment.length}/1000 characters</span>
                  <button
                    className="detail-primary-button"
                    type="submit"
                    disabled={!rating || busy}
                  >
                    {busy ? "Submitting..." : "Submit review ↗"}
                  </button>
                </div>
              </form>

              <div className="detail-review-list">
                {reviews.length === 0 ? (
                  <div className="detail-no-reviews">
                    <span>✧</span>
                    <strong>Be the first to review this resource.</strong>
                    <p>Your feedback can help other students.</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <article className="detail-review" key={review.id}>
                      <div className="detail-review-avatar">
                        {(review.user?.name || "S").charAt(0).toUpperCase()}
                      </div>

                      <div className="detail-review-content">
                        <div className="detail-review-top">
                          <strong>{review.user?.name || "Student"}</strong>
                          <span>★ {review.rating}/5</span>
                        </div>

                        <p>{review.comment || "No written comment."}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className="note-detail-sidebar">
            <section className="detail-download-panel">
              <span className="detail-section-label">GET THE MATERIAL</span>

              <div className="detail-download-icon">↓</div>

              <h2>Ready to study?</h2>

              <p>
                Download this resource and access your study material whenever
                you need it.
              </p>

              <button
                className="detail-primary-button detail-download-full"
                onClick={download}
                disabled={downloading}
              >
                {downloading ? "Preparing..." : "Download now ↓"}
              </button>

              <div className="detail-download-info">
                <span>FILE</span>
                <strong>{fileExtension}</strong>
              </div>

              <div className="detail-download-info">
                <span>DOWNLOADS</span>
                <strong>{note.downloadCount || 0}</strong>
              </div>
            </section>

            <section className="detail-contributor-panel">
              <span className="detail-section-label">CONTRIBUTOR</span>

              <div className="detail-contributor-avatar">
                {(note.uploader?.name || "S").charAt(0).toUpperCase()}
              </div>

              <h3>{note.uploader?.name || "Student"}</h3>

              <p>Shared this resource with the academic community.</p>
            </section>

            <div className="detail-sidebar-note">
              <span>✦</span>
              <p>
                Found this resource helpful? Leave a rating to help other
                students discover useful material.
              </p>
            </div>
          </aside>
        </div>

        <footer className="detail-page-footer">
          <span>NOTESHARE · RESOURCE DETAILS</span>
          <Link to="/read">Back to library ↗</Link>
        </footer>
      </main>

      <DetailStyles />
    </>
  );
}

function DetailStyles() {
  return (
    <style>{`
      .note-detail-page {
        width: min(1160px, 92%);
        margin: 0 auto;
        padding: 30px 0 35px;
      }

      .detail-breadcrumb {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 22px;
        color: #a0a3b2;
        font-size: 10px;
      }

      .detail-breadcrumb a:hover,
      .detail-page-footer a {
        color: #665bd5;
      }

      .breadcrumb-current {
        color: #5d6076;
        font-weight: 700;
      }

      /* HERO */

      .note-detail-hero {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 270px;
        overflow: hidden;
        padding: 37px 43px;
        color: white;
        background: linear-gradient(115deg, #202147, #37336f 65%, #5349a3);
        border-radius: 22px;
        box-shadow: 0 15px 40px rgba(39,35,100,0.13);
      }

      .note-detail-hero-content {
        position: relative;
        z-index: 2;
        max-width: 700px;
      }

      .detail-eyebrow {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #c8c5f8;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.14em;
      }

      .detail-eyebrow span {
        width: 7px;
        height: 7px;
        background: #b6f386;
        border-radius: 50%;
      }

      .detail-subject-tag {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        margin-top: 20px;
        padding: 7px 11px;
        color: #d7d4ff;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 7px;
        font-size: 9px;
        font-weight: 700;
      }

      .note-detail-hero h1 {
        margin: 15px 0 8px;
        color: white;
        font-family: 'Manrope', sans-serif;
        font-size: clamp(27px, 4vw, 38px);
        font-weight: 800;
        line-height: 1.2;
        letter-spacing: -0.045em;
        overflow-wrap: anywhere;
      }

      .detail-uploader {
        color: #c5c4e1;
        font-size: 11px;
      }

      .detail-uploader strong {
        color: white;
      }

      .detail-hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 22px;
      }

      .detail-primary-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        padding: 12px 16px;
        color: #29274e;
        background: #b6f386;
        border: 0;
        border-radius: 9px;
        font-size: 10px;
        font-weight: 900;
        cursor: pointer;
        transition: all 180ms ease;
      }

      .detail-primary-button:hover:not(:disabled) {
        background: #c9ffa1;
        transform: translateY(-2px);
      }

      .detail-primary-button:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .detail-report-button {
        padding: 11px 15px;
        color: white;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.25);
        border-radius: 9px;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
      }

      .detail-report-button:hover:not(:disabled) {
        background: rgba(255,255,255,0.15);
      }

      .detail-hero-visual {
        position: relative;
        width: 180px;
        height: 180px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
      }

      .detail-visual-circle {
        position: relative;
        z-index: 2;
        width: 125px;
        height: 145px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        background: rgba(255,255,255,0.14);
        border: 1px solid rgba(255,255,255,0.25);
        border-radius: 18px;
        transform: rotate(6deg);
      }

      .detail-visual-circle span {
        color: #d9d5ff;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.1em;
      }

      .detail-visual-orbit {
        position: absolute;
        width: 175px;
        height: 175px;
        border: 1px dashed rgba(255,255,255,0.2);
        border-radius: 50%;
      }

      /* FEEDBACK */

      .detail-feedback {
        display: flex;
        align-items: center;
        gap: 11px;
        margin-top: 17px;
        padding: 13px 15px;
        border-radius: 10px;
        font-size: 11px;
      }

      .detail-feedback > span {
        width: 22px;
        height: 22px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        border-radius: 50%;
        color: white;
        font-weight: 900;
      }

      .detail-feedback button {
        margin-left: auto;
        background: transparent;
        border: 0;
        font-size: 19px;
        cursor: pointer;
      }

      .detail-feedback-error {
        color: #a23d4a;
        background: #fff0f1;
        border: 1px solid #f3d5d8;
      }

      .detail-feedback-error > span {
        background: #d45b68;
      }

      .detail-feedback-success {
        color: #267b58;
        background: #eaf8f0;
        border: 1px solid #d1eddd;
      }

      .detail-feedback-success > span {
        background: #35a477;
      }

      /* CONTENT */

      .note-detail-grid {
        display: grid;
        grid-template-columns: minmax(0,1fr) 290px;
        align-items: start;
        gap: 22px;
        margin-top: 24px;
      }

      .note-detail-main-column {
        display: flex;
        flex-direction: column;
        gap: 19px;
        min-width: 0;
      }

      .detail-panel {
        padding: 24px;
        background: white;
        border: 1px solid #e9eaf2;
        border-radius: 16px;
        box-shadow: 0 4px 15px rgba(28,31,67,0.025);
      }

      .detail-panel-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        margin-bottom: 18px;
      }

      .detail-section-label {
        color: #756bd7;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.14em;
      }

      .detail-panel-heading h2 {
        margin: 6px 0 0;
        color: #292b47;
        font-family: 'Manrope', sans-serif;
        font-size: 18px;
        font-weight: 800;
      }

      .detail-heading-icon {
        width: 37px;
        height: 37px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #7066d6;
        background: #f0efff;
        border-radius: 10px;
        font-size: 18px;
      }

      .detail-description {
        margin: 0;
        color: #85899c;
        font-size: 12px;
        line-height: 1.9;
        overflow-wrap: anywhere;
      }

      .detail-topic {
        display: flex;
        flex-direction: column;
        gap: 7px;
        margin-top: 20px;
        padding: 13px;
        background: #f8f8fc;
        border-radius: 9px;
      }

      .detail-topic span,
      .detail-metadata-item span {
        color: #a0a3b2;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.1em;
      }

      .detail-topic strong {
        color: #484b64;
        font-size: 11px;
      }

      /* METADATA */

      .detail-metadata-grid {
        display: grid;
        grid-template-columns: repeat(2,minmax(0,1fr));
        border-top: 1px solid #efeff4;
        border-left: 1px solid #efeff4;
      }

      .detail-metadata-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
        padding: 16px;
        border-right: 1px solid #efeff4;
        border-bottom: 1px solid #efeff4;
      }

      .detail-metadata-item strong {
        color: #454861;
        font-size: 11px;
        overflow-wrap: anywhere;
      }

      /* REVIEWS */

      .detail-review-summary {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .detail-review-summary > span {
        color: #e4a943;
        font-size: 19px;
      }

      .detail-review-summary strong {
        color: #383a55;
        font-size: 15px;
      }

      .detail-review-summary small {
        color: #9a9eae;
        font-size: 9px;
      }

      .detail-review-form {
        display: flex;
        flex-direction: column;
        gap: 9px;
        padding: 17px;
        background: #f8f8fc;
        border: 1px solid #eeeef5;
        border-radius: 11px;
      }

      .detail-review-form label {
        color: #666a81;
        font-size: 10px;
        font-weight: 800;
      }

      .detail-review-form select,
      .detail-review-form textarea {
        width: 100%;
        padding: 11px;
        color: #44475f;
        background: white;
        border: 1px solid #e6e7ef;
        border-radius: 8px;
        outline: none;
        font-size: 11px;
      }

      .detail-review-form select:focus,
      .detail-review-form textarea:focus {
        border-color: #a49cf0;
      }

      .detail-review-form textarea {
        min-height: 90px;
        resize: vertical;
      }

      .detail-review-form-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }

      .detail-review-form-footer > span {
        color: #a0a3b2;
        font-size: 9px;
      }

      .detail-review-list {
        margin-top: 17px;
      }

      .detail-no-reviews {
        padding: 24px 10px;
        text-align: center;
        background: #fafaff;
        border: 1px dashed #e2e0f3;
        border-radius: 10px;
      }

      .detail-no-reviews > span {
        display: block;
        margin-bottom: 10px;
        color: #7167d9;
        font-size: 24px;
      }

      .detail-no-reviews strong {
        color: #484a65;
        font-size: 11px;
      }

      .detail-no-reviews p {
        margin: 6px 0 0;
        color: #999daf;
        font-size: 10px;
      }

      .detail-review {
        display: flex;
        gap: 11px;
        padding: 16px 0;
        border-bottom: 1px solid #efeff4;
      }

      .detail-review:last-child {
        border-bottom: 0;
      }

      .detail-review-avatar {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #655bd5;
        background: #eeedff;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 900;
      }

      .detail-review-content {
        flex: 1;
        min-width: 0;
      }

      .detail-review-top {
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }

      .detail-review-top strong {
        color: #454861;
        font-size: 11px;
      }

      .detail-review-top span {
        color: #d69b39;
        font-size: 10px;
        font-weight: 800;
      }

      .detail-review-content p {
        margin: 7px 0 0;
        color: #85899c;
        font-size: 10px;
        line-height: 1.8;
        overflow-wrap: anywhere;
      }

      /* SIDEBAR */

      .note-detail-sidebar {
        display: flex;
        flex-direction: column;
        gap: 17px;
      }

      .detail-download-panel,
      .detail-contributor-panel {
        padding: 22px;
        background: white;
        border: 1px solid #e9eaf2;
        border-radius: 16px;
      }

      .detail-download-icon {
        width: 51px;
        height: 51px;
        display: grid;
        place-items: center;
        margin: 20px 0 14px;
        color: #655bd5;
        background: #efeeff;
        border-radius: 14px;
        font-size: 26px;
      }

      .detail-download-panel h2 {
        margin: 0 0 8px;
        color: #292b47;
        font-family: 'Manrope', sans-serif;
        font-size: 18px;
        font-weight: 800;
      }

      .detail-download-panel > p {
        margin: 0 0 18px;
        color: #898da0;
        font-size: 10px;
        line-height: 1.8;
      }

      .detail-download-full {
        width: 100%;
      }

      .detail-download-info {
        display: flex;
        justify-content: space-between;
        padding-top: 13px;
        margin-top: 13px;
        border-top: 1px solid #efeff4;
      }

      .detail-download-info span {
        color: #999daf;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.1em;
      }

      .detail-download-info strong {
        color: #4b4e67;
        font-size: 10px;
      }

      .detail-contributor-avatar {
        width: 49px;
        height: 49px;
        display: grid;
        place-items: center;
        margin-top: 19px;
        color: white;
        background: linear-gradient(135deg, #8177eb, #5147b8);
        border-radius: 14px;
        font-size: 17px;
        font-weight: 900;
      }

      .detail-contributor-panel h3 {
        margin: 12px 0 5px;
        color: #353750;
        font-size: 13px;
      }

      .detail-contributor-panel p {
        margin: 0;
        color: #9296a7;
        font-size: 10px;
        line-height: 1.8;
      }

      .detail-sidebar-note {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 15px;
        background: #f0efff;
        border: 1px solid #e4e1ff;
        border-radius: 12px;
      }

      .detail-sidebar-note > span {
        color: #7167d9;
        font-size: 17px;
      }

      .detail-sidebar-note p {
        margin: 0;
        color: #77739e;
        font-size: 10px;
        line-height: 1.8;
      }

      .detail-page-footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 35px;
        padding-top: 20px;
        color: #a0a3b2;
        border-top: 1px solid #e9eaf2;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      /* LOADING AND ERROR */

      .note-detail-loading,
      .note-detail-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 360px;
        text-align: center;
      }

      .detail-spinner {
        width: 35px;
        height: 35px;
        border: 3px solid #e9e7ff;
        border-top-color: #675dd4;
        border-radius: 50%;
        animation: detail-spin 0.8s linear infinite;
      }

      @keyframes detail-spin {
        to { transform: rotate(360deg); }
      }

      .note-detail-loading p,
      .note-detail-error p {
        color: #9296a7;
        font-size: 11px;
      }

      .detail-error-icon {
        width: 48px;
        height: 48px;
        display: grid;
        place-items: center;
        color: white;
        background: #d45b68;
        border-radius: 15px;
        font-size: 21px;
        font-weight: 900;
      }

      .note-detail-error h2 {
        color: #292b47;
        font-size: 20px;
      }

      .note-detail-error .detail-primary-button {
        margin-top: 14px;
        background: #655bd5;
        color: white;
      }

      /* RESPONSIVE */

      @media (max-width: 850px) {
        .note-detail-grid {
          grid-template-columns: minmax(0,1fr) 240px;
        }

        .note-detail-hero {
          padding: 30px;
        }

        .detail-hero-visual {
          transform: scale(0.8);
        }
      }

      @media (max-width: 650px) {
        .note-detail-page {
          width: calc(100% - 30px);
          padding-top: 20px;
        }

        .note-detail-hero {
          min-height: 0;
          padding: 27px 21px;
          border-radius: 17px;
        }

        .note-detail-hero h1 {
          font-size: 28px;
        }

        .detail-hero-visual {
          display: none;
        }

        .detail-hero-actions {
          flex-direction: column;
          align-items: stretch;
        }

        .detail-primary-button,
        .detail-report-button {
          width: 100%;
        }

        .note-detail-grid {
          grid-template-columns: 1fr;
        }

        .note-detail-sidebar {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: start;
        }

        .detail-sidebar-note {
          grid-column: 1 / -1;
        }

        .detail-panel {
          padding: 19px;
        }
      }

      @media (max-width: 420px) {
        .note-detail-sidebar {
          grid-template-columns: 1fr;
        }

        .detail-sidebar-note {
          grid-column: auto;
        }

        .detail-metadata-item {
          padding: 12px 9px;
        }

        .detail-review-summary {
          gap: 3px;
        }

        .detail-review-summary small {
          display: none;
        }

        .detail-page-footer {
          flex-direction: column;
        }
      }
    `}</style>
  );
}
