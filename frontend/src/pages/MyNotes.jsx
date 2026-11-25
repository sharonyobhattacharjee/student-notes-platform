import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

export function MyNotes() {
  const { user } = useAuth();

  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const data = await api("/notes");

      const ownNotes = (data.items || []).filter(
        (note) => note.uploader?.id === user.id
      );

      setNotes(ownNotes);
    } catch (e) {
      setError(e.message || "Unable to load your notes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user]);

  async function del(id) {
    const confirmed = window.confirm(
      "Delete this note permanently? This action cannot be undone."
    );

    if (!confirmed) return;

    setDeletingId(id);

    try {
      await api(`/notes/${id}`, {
        method: "DELETE",
      });

      setNotes((previous) => previous.filter((note) => note.id !== id));
    } catch (e) {
      window.alert(e.message || "Unable to delete this note.");
    } finally {
      setDeletingId(null);
    }
  }

  const totalNotes = notes.length;

  const publicNotes = notes.filter(
    (note) => note.visibility === "PUBLIC"
  ).length;

  const linkOnlyNotes = notes.filter(
    (note) => note.visibility === "LINK_ONLY"
  ).length;

  const privateNotes = notes.filter(
    (note) => note.visibility === "PRIVATE"
  ).length;

  const totalDownloads = notes.reduce(
    (sum, note) => sum + Number(note.downloadCount || 0),
    0
  );

  const averageRating =
    notes.length > 0
      ? notes.reduce(
          (sum, note) => sum + Number(note.averageRating || 0),
          0
        ) / notes.length
      : 0;

  return (
    <>
      <Navbar />

      <main className="my-notes-page">
        {/* HEADER */}
        <section className="my-notes-header">
          <div>
            <div className="my-notes-eyebrow">
              <span />
              YOUR KNOWLEDGE LIBRARY
            </div>

            <h1>My notes.</h1>

            <p>
              Manage, update and share the academic resources you've
              contributed.
            </p>
          </div>

          <Link to="/upload" className="my-notes-upload-button">
            <span>+</span>
            Upload note
          </Link>
        </section>

        {error && (
          <div className="my-notes-alert">
            <span>!</span>
            <p>{error}</p>

            <button type="button" onClick={load}>
              Retry
            </button>
          </div>
        )}

        {/* STATS */}
        <section className="my-notes-stats">
          <div className="my-stat-card featured">
            <div className="my-stat-icon">▤</div>

            <div>
              <span>Total resources</span>
              <strong>{totalNotes}</strong>
            </div>

            <small>Uploaded by you</small>
          </div>

          <div className="my-stat-card">
            <div className="my-stat-icon public">◎</div>

            <div>
              <span>Public</span>
              <strong>{publicNotes}</strong>
            </div>

            <small>Visible in library</small>
          </div>

          <div className="my-stat-card">
            <div className="my-stat-icon link">↗</div>

            <div>
              <span>Link-only</span>
              <strong>{linkOnlyNotes}</strong>
            </div>

            <small>Shared by link</small>
          </div>

          <div className="my-stat-card">
            <div className="my-stat-icon downloads">↓</div>

            <div>
              <span>Downloads</span>
              <strong>{totalDownloads}</strong>
            </div>

            <small>Across your resources</small>
          </div>
        </section>

        {/* CONTENT */}
        <section className="my-notes-content">
          <div className="my-notes-content-header">
            <div>
              <span className="my-section-label">CONTENT MANAGER</span>

              <h2>Your uploaded resources</h2>

              <p>
                {totalNotes
                  ? `${totalNotes} resource${totalNotes === 1 ? "" : "s"} in your library`
                  : "Your uploaded resources will appear here."}
              </p>
            </div>

            {totalNotes > 0 && (
              <div className="my-notes-summary">
                <span>Average rating</span>
                <strong>
                  ★ {averageRating.toFixed(1)}
                </strong>
              </div>
            )}
          </div>

          {loading ? (
            <div className="my-notes-loading">
              <div className="my-notes-spinner" />
              <p>Loading your resources...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="my-notes-empty">
              <div className="my-empty-illustration">
                <div className="my-empty-paper">
                  <span />
                  <span />
                  <span />
                  <div />
                  <span />
                </div>

                <div className="my-empty-plus">+</div>
              </div>

              <span className="my-empty-label">YOUR LIBRARY IS EMPTY</span>

              <h3>Start sharing your knowledge.</h3>

              <p>
                Upload lecture notes, study material, assignments or
                presentations and make them useful for other students.
              </p>

              <Link to="/upload" className="my-notes-empty-button">
                Upload your first note
                <span>↗</span>
              </Link>
            </div>
          ) : (
            <div className="my-notes-list">
              {notes.map((note) => {
                const rating = Number(note.averageRating || 0);
                const visibility = note.visibility || "PRIVATE";

                const fileName =
                  note.file?.originalName || "";

                const extension = fileName.includes(".")
                  ? fileName
                      .split(".")
                      .pop()
                      .toUpperCase()
                  : "NOTE";

                return (
                  <article className="my-note-row" key={note.id}>
                    {/* DOCUMENT ICON */}
                    <div className="my-note-file">
                      <span>{extension}</span>
                    </div>

                    {/* MAIN INFO */}
                    <div className="my-note-info">
                      <div className="my-note-title-line">
                        <Link to={`/notes/${note.id}`}>
                          {note.title}
                        </Link>

                        <span
                          className={`my-visibility ${visibility.toLowerCase()}`}
                        >
                          <i />
                          {visibility === "LINK_ONLY"
                            ? "Link-only"
                            : visibility.charAt(0) +
                              visibility.slice(1).toLowerCase()}
                        </span>
                      </div>

                      <p>
                        {note.topic ||
                          note.description ||
                          "Academic study material"}
                      </p>

                      <div className="my-note-meta">
                        <span>
                          {note.subject?.name || "No subject"}
                        </span>

                        <span className="meta-divider">·</span>

                        <span>
                          Semester {note.semester || "—"}
                        </span>

                        {note.category?.name && (
                          <>
                            <span className="meta-divider">·</span>

                            <span>
                              {note.category.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* STATS */}
                    <div className="my-note-stats">
                      <div>
                        <span>Rating</span>
                        <strong>
                          ★ {rating.toFixed(1)}
                        </strong>
                      </div>

                      <div>
                        <span>Downloads</span>
                        <strong>
                          {Number(note.downloadCount || 0)}
                        </strong>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="my-note-actions">
                      <Link
                        to={`/notes/${note.id}`}
                        className="my-view-button"
                      >
                        View
                        <span>↗</span>
                      </Link>

                      <Link
                        to={`/notes/${note.id}/edit`}
                        className="my-edit-button"
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        className="my-delete-button"
                        onClick={() => del(note.id)}
                        disabled={deletingId === note.id}
                      >
                        {deletingId === note.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* BOTTOM SUMMARY */}
        {!loading && notes.length > 0 && (
          <div className="my-notes-bottom">
            <div>
              <span className="bottom-dot" />
              <p>
                Your resources are managed securely through your
                account.
              </p>
            </div>

            <span>
              {privateNotes} private · {linkOnlyNotes} link-only ·{" "}
              {publicNotes} public
            </span>
          </div>
        )}
      </main>

      <MyNotesStyles />
    </>
  );
}

function MyNotesStyles() {
  return (
    <style>{`
      .my-notes-page {
        width: min(1180px, 92%);
        margin: 0 auto;
        padding: 34px 0 45px;
      }

      /* HEADER */

      .my-notes-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 25px;
        min-height: 155px;
        padding: 30px 35px;
        background:
          linear-gradient(
            110deg,
            #f0efff 0%,
            #f8f7ff 58%,
            #edf5ff 100%
          );
        border: 1px solid #e6e4f7;
        border-radius: 19px;
      }

      .my-notes-eyebrow {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #7066d3;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: .15em;
      }

      .my-notes-eyebrow span {
        width: 7px;
        height: 7px;
        background: #8dce6d;
        border-radius: 50%;
      }

      .my-notes-header h1 {
        margin: 11px 0 6px;
        color: #292b47;
        font-family: 'Manrope', sans-serif;
        font-size: clamp(30px, 4vw, 41px);
        font-weight: 900;
        letter-spacing: -.05em;
      }

      .my-notes-header p {
        max-width: 600px;
        margin: 0;
        color: #85899c;
        font-size: 10px;
        line-height: 1.8;
      }

      .my-notes-upload-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        flex-shrink: 0;
        color: white;
        background: linear-gradient(110deg,#665bd4,#5148b6);
        border-radius: 8px;
        box-shadow: 0 7px 18px rgba(91,81,193,.18);
        font-size: 9px;
        font-weight: 900;
      }

      .my-notes-upload-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 22px rgba(91,81,193,.23);
      }

      .my-notes-upload-button span {
        font-size: 17px;
        line-height: 1;
        font-weight: 400;
      }

      /* ALERT */

      .my-notes-alert {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 16px;
        padding: 12px 14px;
        color: #a13f4b;
        background: #fff0f1;
        border: 1px solid #f1d5d9;
        border-radius: 9px;
        font-size: 9px;
      }

      .my-notes-alert > span {
        width: 21px;
        height: 21px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: white;
        background: #d45b68;
        border-radius: 50%;
        font-weight: 900;
      }

      .my-notes-alert p {
        margin: 0;
        flex: 1;
      }

      .my-notes-alert button {
        padding: 6px 9px;
        color: #9e4550;
        background: white;
        border: 1px solid #ecced3;
        border-radius: 6px;
        font-size: 8px;
        font-weight: 800;
        cursor: pointer;
      }

      /* STATS */

      .my-notes-stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0,1fr));
        gap: 12px;
        margin-top: 18px;
      }

      .my-stat-card {
        position: relative;
        display: flex;
        align-items: center;
        gap: 11px;
        min-height: 84px;
        padding: 15px;
        background: white;
        border: 1px solid #e9eaf2;
        border-radius: 13px;
      }

      .my-stat-card.featured {
        background: #faf9ff;
        border-color: #e4e1fa;
      }

      .my-stat-icon {
        width: 37px;
        height: 37px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #6a60d4;
        background: #efeeff;
        border-radius: 9px;
        font-size: 15px;
        font-weight: 800;
      }

      .my-stat-icon.public {
        color: #4c9565;
        background: #edf8ef;
      }

      .my-stat-icon.link {
        color: #5d77bc;
        background: #edf2ff;
      }

      .my-stat-icon.downloads {
        color: #ba7d42;
        background: #fff4e7;
      }

      .my-stat-card div:nth-child(2) {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }

      .my-stat-card span {
        color: #969aab;
        font-size: 8px;
        font-weight: 700;
      }

      .my-stat-card strong {
        color: #34364f;
        font-family: 'Manrope', sans-serif;
        font-size: 18px;
        font-weight: 900;
      }

      .my-stat-card small {
        position: absolute;
        right: 12px;
        bottom: 12px;
        color: #b0b2be;
        font-size: 7px;
      }

      /* CONTENT */

      .my-notes-content {
        margin-top: 20px;
        overflow: hidden;
        background: white;
        border: 1px solid #e8e9f0;
        border-radius: 15px;
      }

      .my-notes-content-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 22px 23px 19px;
        border-bottom: 1px solid #eeeeF4;
      }

      .my-section-label {
        color: #746bd5;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .14em;
      }

      .my-notes-content-header h2 {
        margin: 6px 0 4px;
        color: #2f314c;
        font-family: 'Manrope', sans-serif;
        font-size: 16px;
        font-weight: 800;
      }

      .my-notes-content-header p {
        margin: 0;
        color: #9a9eae;
        font-size: 9px;
      }

      .my-notes-summary {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 11px;
        background: #fafaff;
        border: 1px solid #ecebf7;
        border-radius: 7px;
      }

      .my-notes-summary span {
        color: #999cad;
        font-size: 8px;
      }

      .my-notes-summary strong {
        color: #6258cb;
        font-size: 10px;
      }

      /* LOADING */

      .my-notes-loading {
        min-height: 310px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #969aab;
      }

      .my-notes-spinner {
        width: 30px;
        height: 30px;
        margin-bottom: 12px;
        border: 3px solid #e9e7ff;
        border-top-color: #675dd4;
        border-radius: 50%;
        animation: my-notes-spin .8s linear infinite;
      }

      @keyframes my-notes-spin {
        to {
          transform: rotate(360deg);
        }
      }

      .my-notes-loading p {
        margin: 0;
        font-size: 9px;
      }

      /* EMPTY STATE */

      .my-notes-empty {
        min-height: 390px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 45px 25px;
        text-align: center;
      }

      .my-empty-illustration {
        position: relative;
        width: 85px;
        height: 75px;
        margin-bottom: 20px;
      }

      .my-empty-paper {
        position: absolute;
        left: 17px;
        top: 3px;
        width: 48px;
        height: 60px;
        padding: 10px;
        background: #f1f0ff;
        border: 1px solid #dcd9f7;
        border-radius: 6px;
        transform: rotate(-5deg);
      }

      .my-empty-paper span {
        display: block;
        width: 80%;
        height: 4px;
        margin-bottom: 6px;
        background: #d8d5f1;
        border-radius: 4px;
      }

      .my-empty-paper span:nth-child(2) {
        width: 100%;
      }

      .my-empty-paper span:nth-child(3) {
        width: 60%;
      }

      .my-empty-paper div {
        width: 100%;
        height: 14px;
        margin: 8px 0;
        background: #dedcf8;
        border-radius: 3px;
      }

      .my-empty-plus {
        position: absolute;
        right: 7px;
        bottom: 5px;
        width: 27px;
        height: 27px;
        display: grid;
        place-items: center;
        color: white;
        background: #675dd4;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 5px 15px rgba(90,81,190,.2);
        font-size: 16px;
      }

      .my-empty-label {
        color: #8a84d8;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .15em;
      }

      .my-notes-empty h3 {
        margin: 8px 0 5px;
        color: #34364f;
        font-family: 'Manrope', sans-serif;
        font-size: 17px;
        font-weight: 800;
      }

      .my-notes-empty p {
        max-width: 410px;
        margin: 0;
        color: #9b9ead;
        font-size: 9px;
        line-height: 1.9;
      }

      .my-notes-empty-button {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        margin-top: 18px;
        padding: 11px 15px;
        color: #6258cb;
        background: #efeeff;
        border: 1px solid #e1defd;
        border-radius: 8px;
        font-size: 9px;
        font-weight: 900;
      }

      .my-notes-empty-button:hover {
        background: #e7e5ff;
      }

      .my-notes-empty-button span {
        font-size: 13px;
      }

      /* LIST */

      .my-notes-list {
        display: flex;
        flex-direction: column;
      }

      .my-note-row {
        display: grid;
        grid-template-columns: 50px minmax(0,1fr) 135px 205px;
        align-items: center;
        gap: 16px;
        padding: 17px 22px;
        border-bottom: 1px solid #f0f0f4;
        transition: background .18s;
      }

      .my-note-row:last-child {
        border-bottom: 0;
      }

      .my-note-row:hover {
        background: #fcfcff;
      }

      .my-note-file {
        width: 42px;
        height: 48px;
        display: grid;
        place-items: center;
        color: #665cd4;
        background: #eeedff;
        border: 1px solid #e2e0fa;
        border-radius: 7px;
        font-size: 7px;
        font-weight: 900;
      }

      .my-note-info {
        min-width: 0;
      }

      .my-note-title-line {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      .my-note-title-line a {
        max-width: 100%;
        color: #3b3d58;
        font-family: 'Manrope', sans-serif;
        font-size: 11px;
        font-weight: 800;
        overflow-wrap: anywhere;
      }

      .my-note-title-line a:hover {
        color: #665cd4;
      }

      .my-note-info > p {
        max-width: 550px;
        margin: 5px 0 7px;
        color: #979baa;
        font-size: 8px;
        line-height: 1.5;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .my-visibility {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 6px;
        border-radius: 5px;
        font-size: 7px;
        font-weight: 900;
      }

      .my-visibility i {
        width: 5px;
        height: 5px;
        display: block;
        border-radius: 50%;
      }

      .my-visibility.public {
        color: #4f8b5d;
        background: #edf8ef;
      }

      .my-visibility.public i {
        background: #63aa72;
      }

      .my-visibility.link_only {
        color: #6379b5;
        background: #edf2ff;
      }

      .my-visibility.link_only i {
        background: #7891d0;
      }

      .my-visibility.private {
        color: #9b6f42;
        background: #fff4e8;
      }

      .my-visibility.private i {
        background: #c48c52;
      }

      .my-note-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #a3a6b3;
        font-size: 7px;
      }

      .meta-divider {
        color: #d1d2da;
      }

      .my-note-stats {
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }

      .my-note-stats div {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .my-note-stats span {
        color: #a3a6b3;
        font-size: 7px;
      }

      .my-note-stats strong {
        color: #565970;
        font-size: 9px;
      }

      .my-note-stats div:first-child strong {
        color: #6359ca;
      }

      .my-note-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 5px;
      }

      .my-view-button,
      .my-edit-button,
      .my-delete-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 28px;
        padding: 0 9px;
        border-radius: 6px;
        font-size: 7px;
        font-weight: 900;
        cursor: pointer;
      }

      .my-view-button {
        gap: 5px;
        color: white;
        background: #665bd2;
        border: 1px solid #665bd2;
      }

      .my-view-button:hover {
        background: #574dbd;
      }

      .my-view-button span {
        font-size: 10px;
      }

      .my-edit-button {
        color: #696e85;
        background: white;
        border: 1px solid #e3e4ed;
      }

      .my-edit-button:hover {
        color: #6258cb;
        border-color: #cbc7ee;
      }

      .my-delete-button {
        color: #b25c67;
        background: white;
        border: 1px solid #ecdde0;
      }

      .my-delete-button:hover:not(:disabled) {
        background: #fff4f5;
        border-color: #e6c8cd;
      }

      .my-delete-button:disabled {
        opacity: .55;
        cursor: wait;
      }

      /* BOTTOM */

      .my-notes-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        padding: 13px 4px;
        color: #a1a4b2;
        font-size: 7px;
      }

      .my-notes-bottom > div {
        display: flex;
        align-items: center;
        gap: 7px;
      }

      .my-notes-bottom p {
        margin: 0;
      }

      .bottom-dot {
        width: 5px;
        height: 5px;
        background: #79b963;
        border-radius: 50%;
      }

      /* RESPONSIVE */

      @media (max-width: 1000px) {
        .my-note-row {
          grid-template-columns: 45px minmax(0,1fr) 110px;
        }

        .my-note-actions {
          grid-column: 2 / -1;
          justify-content: flex-start;
        }
      }

      @media (max-width: 800px) {
        .my-notes-stats {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }

        .my-note-row {
          grid-template-columns: 45px minmax(0,1fr);
        }

        .my-note-stats {
          grid-column: 2;
          justify-content: flex-start;
          gap: 35px;
        }

        .my-note-actions {
          grid-column: 2;
        }
      }

      @media (max-width: 600px) {
        .my-notes-page {
          width: calc(100% - 30px);
          padding-top: 20px;
        }

        .my-notes-header {
          align-items: flex-start;
          flex-direction: column;
          padding: 24px 21px;
        }

        .my-notes-upload-button {
          width: 100%;
          justify-content: center;
        }

        .my-notes-stats {
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .my-stat-card {
          min-height: 76px;
          padding: 11px;
        }

        .my-stat-card small {
          display: none;
        }

        .my-stat-icon {
          width: 31px;
          height: 31px;
          font-size: 13px;
        }

        .my-stat-card strong {
          font-size: 16px;
        }

        .my-notes-content-header {
          align-items: flex-start;
          flex-direction: column;
        }

        .my-notes-summary {
          width: 100%;
          justify-content: space-between;
        }

        .my-note-row {
          grid-template-columns: 43px minmax(0,1fr);
          gap: 12px;
          padding: 16px;
        }

        .my-note-stats,
        .my-note-actions {
          grid-column: 2;
        }

        .my-note-stats {
          padding-top: 3px;
        }

        .my-note-actions {
          flex-wrap: wrap;
        }

        .my-view-button,
        .my-edit-button,
        .my-delete-button {
          flex: 1;
        }

        .my-notes-bottom {
          align-items: flex-start;
          flex-direction: column;
        }
      }

      @media (max-width: 400px) {
        .my-notes-stats {
          grid-template-columns: 1fr;
        }

        .my-note-meta {
          flex-wrap: wrap;
        }
      }
    `}</style>
  );
}