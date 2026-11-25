import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { api } from "../lib/api";

export function EditNote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [note, setNote] = useState(null);
  const [meta, setMeta] = useState({});
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    subjectId: "",
    courseId: "",
    categoryId: "",
    semester: "",
    topic: "",
    description: "",
    visibility: "PUBLIC",
  });

  useEffect(() => {
    setLoading(true);

    Promise.all([api(`/notes/${id}`), api("/meta")])
      .then(([data, metadata]) => {
        setNote(data);
        setMeta(metadata);

        setForm({
          title: data.title || "",
          subjectId: String(data.subject?.id || ""),
          courseId: String(data.course?.id || ""),
          categoryId: String(data.category?.id || ""),
          semester: String(data.semester || ""),
          topic: data.topic || "",
          description: data.description || "",
          visibility: data.visibility || "PUBLIC",
        });
      })
      .catch((e) => {
        setMessage(e.message || "Unable to load this note.");
        setMessageType("error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  function update(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function chooseFile(selectedFile) {
    if (!selectedFile) return;

    const extension = selectedFile.name
      .slice(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    if (![".pdf", ".docx", ".pptx"].includes(extension)) {
      setMessage("Only PDF, DOCX and PPTX files are supported.");
      setMessageType("error");
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setMessage("The replacement file must not exceed 20 MB.");
      setMessageType("error");
      return;
    }

    setMessage("");
    setMessageType("");
    setFile(selectedFile);
  }

  async function save(e) {
    e.preventDefault();

    if (busy) return;

    setBusy(true);
    setMessage("");
    setMessageType("");

    try {
      const payload = {
        ...form,
        subjectId: Number(form.subjectId),
        semester: Number(form.semester),
        courseId: form.courseId ? Number(form.courseId) : null,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
      };

      await api(`/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        await api(`/notes/${id}/file`, {
          method: "PUT",
          body: formData,
        });
      }

      navigate(`/notes/${id}`);
    } catch (e) {
      setMessage(e.message || "Unable to save your changes.");
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  }

  async function createShareLink() {
    setMessage("");
    setMessageType("");

    try {
      const data = await api(`/notes/${id}/share-link`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      if (!data.shareUrl) {
        throw new Error("The server did not return a share link.");
      }

      await navigator.clipboard.writeText(data.shareUrl);

      setMessage("Share link copied to clipboard.");
      setMessageType("success");
    } catch (e) {
      setMessage(e.message || "Unable to create the share link.");
      setMessageType("error");
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="edit-note-page">
          <div className="edit-loading">
            <div className="edit-spinner" />
            <p>Loading resource settings...</p>
          </div>
        </main>

        <EditStyles />
      </>
    );
  }

  if (!note) {
    return (
      <>
        <Navbar />

        <main className="edit-note-page">
          <div className="edit-error-page">
            <div className="edit-error-icon">!</div>
            <h2>Unable to load this resource</h2>
            <p>{message || "The requested note could not be found."}</p>

            <Link to="/my-notes" className="edit-primary-button">
              Back to my notes ↗
            </Link>
          </div>
        </main>

        <EditStyles />
      </>
    );
  }

  const currentFileName =
    note.file?.originalName || "Current document";

  const currentExtension = currentFileName.includes(".")
    ? currentFileName.split(".").pop().toUpperCase()
    : "FILE";

  return (
    <>
      <Navbar />

      <main className="edit-note-page">
        {/* BREADCRUMB */}
        <div className="edit-breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/my-notes">My notes</Link>
          <span>/</span>
          <span>Edit resource</span>
        </div>

        {/* PAGE HEADER */}
        <section className="edit-page-header">
          <div>
            <div className="edit-eyebrow">
              <span />
              RESOURCE MANAGEMENT
            </div>

            <h1>Edit your resource.</h1>

            <p>
              Update the information, visibility or document attached to your
              academic resource.
            </p>
          </div>

          <div className="edit-header-status">
            <span className="edit-status-dot" />
            {form.visibility === "PUBLIC"
              ? "Public resource"
              : form.visibility === "LINK_ONLY"
              ? "Link-only resource"
              : "Private resource"}
          </div>
        </section>

        {message && (
          <div
            className={`edit-feedback ${
              messageType === "success"
                ? "edit-feedback-success"
                : "edit-feedback-error"
            }`}
            role={messageType === "success" ? "status" : "alert"}
          >
            <span>{messageType === "success" ? "✓" : "!"}</span>
            <p>{message}</p>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setMessageType("");
              }}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        <form className="edit-layout" onSubmit={save}>
          <div className="edit-main-column">
            {/* RESOURCE INFORMATION */}
            <section className="edit-panel">
              <div className="edit-panel-heading">
                <div className="edit-section-number">01</div>

                <div>
                  <span>RESOURCE INFORMATION</span>
                  <h2>Basic details</h2>
                  <p>Keep your resource easy to understand and discover.</p>
                </div>
              </div>

              <div className="edit-field">
                <label htmlFor="edit-title">
                  Resource title <b>*</b>
                </label>

                <input
                  id="edit-title"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  maxLength={200}
                  placeholder="Enter a clear resource title"
                  required
                />

                <small>{form.title.length}/200 characters</small>
              </div>

              <div className="edit-field-grid">
                <div className="edit-field">
                  <label htmlFor="edit-subject">
                    Subject <b>*</b>
                  </label>

                  <select
                    id="edit-subject"
                    value={form.subjectId}
                    onChange={(e) =>
                      update("subjectId", e.target.value)
                    }
                    required
                  >
                    <option value="">Select subject</option>

                    {(meta.subjects || []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="edit-field">
                  <label htmlFor="edit-semester">
                    Semester <b>*</b>
                  </label>

                  <select
                    id="edit-semester"
                    value={form.semester}
                    onChange={(e) =>
                      update("semester", e.target.value)
                    }
                    required
                  >
                    <option value="">Select semester</option>

                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        Semester {index + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="edit-field">
                  <label htmlFor="edit-course">Course</label>

                  <select
                    id="edit-course"
                    value={form.courseId}
                    onChange={(e) =>
                      update("courseId", e.target.value)
                    }
                  >
                    <option value="">Optional</option>

                    {(meta.courses || []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="edit-field">
                  <label htmlFor="edit-category">Category</label>

                  <select
                    id="edit-category"
                    value={form.categoryId}
                    onChange={(e) =>
                      update("categoryId", e.target.value)
                    }
                  >
                    <option value="">Optional</option>

                    {(meta.categories || []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="edit-field">
                <label htmlFor="edit-topic">Topic</label>

                <input
                  id="edit-topic"
                  value={form.topic}
                  onChange={(e) => update("topic", e.target.value)}
                  placeholder="e.g. Operating Systems — Memory Management"
                  maxLength={150}
                />
              </div>

              <div className="edit-field">
                <label htmlFor="edit-description">Description</label>

                <textarea
                  id="edit-description"
                  rows={6}
                  value={form.description}
                  onChange={(e) =>
                    update("description", e.target.value)
                  }
                  placeholder="Describe what students will find in this resource..."
                  maxLength={2000}
                />

                <div className="edit-character-count">
                  {form.description.length}/2000 characters
                </div>
              </div>
            </section>

            {/* CURRENT FILE */}
            <section className="edit-panel">
              <div className="edit-panel-heading">
                <div className="edit-section-number">02</div>

                <div>
                  <span>DOCUMENT</span>
                  <h2>Manage attached file</h2>
                  <p>Keep the current document or replace it.</p>
                </div>
              </div>

              <div className="edit-current-file">
                <div className="edit-file-icon">
                  {currentExtension}
                </div>

                <div className="edit-file-info">
                  <span>CURRENT FILE</span>
                  <strong>{currentFileName}</strong>
                  <small>
                    {note.file?.fileSizeBytes
                      ? `${(
                          note.file.fileSizeBytes /
                          1024 /
                          1024
                        ).toFixed(2)} MB`
                      : "Existing uploaded document"}
                  </small>
                </div>

                <span className="edit-file-status">Active</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.pptx"
                className="edit-hidden-file"
                onChange={(e) =>
                  chooseFile(e.target.files?.[0] || null)
                }
              />

              {!file ? (
                <button
                  type="button"
                  className="edit-replace-trigger"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span>↻</span>
                  <div>
                    <strong>Replace this document</strong>
                    <small>
                      PDF, DOCX or PPTX · maximum 20 MB
                    </small>
                  </div>
                  <b>Choose file</b>
                </button>
              ) : (
                <div className="edit-new-file">
                  <div className="edit-new-file-icon">
                    {file.name
                      .slice(file.name.lastIndexOf(".") + 1)
                      .toUpperCase()}
                  </div>

                  <div>
                    <span>NEW DOCUMENT</span>
                    <strong>{file.name}</strong>
                    <small>
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Ready
                      to replace current file
                    </small>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);

                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </section>

            {/* VISIBILITY */}
            <section className="edit-panel">
              <div className="edit-panel-heading">
                <div className="edit-section-number">03</div>

                <div>
                  <span>ACCESS CONTROL</span>
                  <h2>Visibility settings</h2>
                  <p>Choose how other students can access this resource.</p>
                </div>
              </div>

              <div className="edit-visibility-grid">
                <label
                  className={`edit-visibility-card ${
                    form.visibility === "PUBLIC"
                      ? "selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="PUBLIC"
                    checked={form.visibility === "PUBLIC"}
                    onChange={(e) =>
                      update("visibility", e.target.value)
                    }
                  />

                  <div className="edit-radio">
                    <span />
                  </div>

                  <div className="edit-visibility-icon">◎</div>

                  <div>
                    <strong>Public</strong>
                    <p>
                      Searchable and accessible to logged-in users.
                    </p>
                  </div>

                  <span className="edit-recommended">
                    Recommended
                  </span>
                </label>

                <label
                  className={`edit-visibility-card ${
                    form.visibility === "LINK_ONLY"
                      ? "selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="LINK_ONLY"
                    checked={form.visibility === "LINK_ONLY"}
                    onChange={(e) =>
                      update("visibility", e.target.value)
                    }
                  />

                  <div className="edit-radio">
                    <span />
                  </div>

                  <div className="edit-visibility-icon">↗</div>

                  <div>
                    <strong>Link-only</strong>
                    <p>
                      Available through a generated share link.
                    </p>
                  </div>
                </label>

                <label
                  className={`edit-visibility-card ${
                    form.visibility === "PRIVATE"
                      ? "selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="PRIVATE"
                    checked={form.visibility === "PRIVATE"}
                    onChange={(e) =>
                      update("visibility", e.target.value)
                    }
                  />

                  <div className="edit-radio">
                    <span />
                  </div>

                  <div className="edit-visibility-icon">⌑</div>

                  <div>
                    <strong>Private</strong>
                    <p>
                      Restricted to you and explicitly shared users.
                    </p>
                  </div>
                </label>
              </div>
            </section>

            {/* ACTION BAR */}
            <div className="edit-action-bar">
              <button
                type="button"
                className="edit-cancel-button"
                onClick={() => navigate(`/notes/${id}`)}
                disabled={busy}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="edit-save-button"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <span className="edit-button-spinner" />
                    Saving changes...
                  </>
                ) : (
                  <>
                    Save changes
                    <span>↗</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className="edit-sidebar">
            <section className="edit-sidebar-card">
              <span className="edit-sidebar-label">
                RESOURCE PREVIEW
              </span>

              <div className="edit-preview-document">
                <div className="edit-preview-paper">
                  <div className="edit-preview-top">
                    <span>{currentExtension}</span>
                    <span>NS</span>
                  </div>

                  <div className="edit-preview-title">
                    {form.title || "Untitled resource"}
                  </div>

                  <div className="edit-preview-line large" />
                  <div className="edit-preview-line" />
                  <div className="edit-preview-line short" />

                  <div className="edit-preview-block" />

                  <div className="edit-preview-line" />
                  <div className="edit-preview-line short" />
                </div>
              </div>

              <h3>{form.title || "Untitled resource"}</h3>

              <p>
                {form.topic ||
                  "Your resource topic will appear here."}
              </p>

              <div className="edit-preview-tags">
                <span>
                  {note.subject?.name || "Subject"}
                </span>
                <span>
                  Sem {form.semester || "—"}
                </span>
              </div>
            </section>

            <section className="edit-sidebar-card">
              <span className="edit-sidebar-label">
                SHARING
              </span>

              <h3 className="edit-sharing-title">
                Share this resource
              </h3>

              <p className="edit-sharing-text">
                Create a link that you can send to classmates when
                your resource is not private.
              </p>

              {form.visibility !== "PRIVATE" ? (
                <button
                  type="button"
                  className="edit-share-button"
                  onClick={createShareLink}
                >
                  <span>↗</span>
                  Copy share link
                </button>
              ) : (
                <div className="edit-private-notice">
                  <span>⌑</span>
                  <p>
                    Share links are unavailable while this
                    resource is private.
                  </p>
                </div>
              )}
            </section>

            <div className="edit-tip-card">
              <span>✦</span>
              <div>
                <strong>Keep it useful.</strong>
                <p>
                  A descriptive title, accurate topic and clear
                  description help students find the right material.
                </p>
              </div>
            </div>
          </aside>
        </form>

        <footer className="edit-page-footer">
          <span>NOTESHARE · RESOURCE MANAGEMENT</span>
          <Link to={`/notes/${id}`}>View resource ↗</Link>
        </footer>
      </main>

      <EditStyles />
    </>
  );
}

function EditStyles() {
  return (
    <style>{`
      .edit-note-page {
        width: min(1160px, 92%);
        margin: 0 auto;
        padding: 30px 0 35px;
      }

      .edit-breadcrumb {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-bottom: 20px;
        color: #a0a3b2;
        font-size: 9px;
      }

      .edit-breadcrumb a:hover {
        color: #675dd5;
      }

      .edit-page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 25px;
        min-height: 150px;
        padding: 29px 34px;
        overflow: hidden;
        background:
          linear-gradient(
            110deg,
            #f0efff 0%,
            #f8f7ff 65%,
            #edf5ff 100%
          );
        border: 1px solid #e7e5f8;
        border-radius: 18px;
      }

      .edit-eyebrow {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #7066d3;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: .15em;
      }

      .edit-eyebrow span {
        width: 7px;
        height: 7px;
        background: #8dce6d;
        border-radius: 50%;
      }

      .edit-page-header h1 {
        margin: 12px 0 7px;
        color: #292b47;
        font-family: 'Manrope', sans-serif;
        font-size: clamp(27px, 4vw, 37px);
        font-weight: 900;
        letter-spacing: -.045em;
      }

      .edit-page-header p {
        max-width: 620px;
        margin: 0;
        color: #83879a;
        font-size: 10px;
        line-height: 1.8;
      }

      .edit-header-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 12px;
        flex-shrink: 0;
        color: #5f6379;
        background: rgba(255,255,255,.72);
        border: 1px solid rgba(225,223,243,.9);
        border-radius: 8px;
        font-size: 9px;
        font-weight: 800;
      }

      .edit-status-dot {
        width: 7px;
        height: 7px;
        background: #71b854;
        border-radius: 50%;
        box-shadow: 0 0 0 4px rgba(113,184,84,.1);
      }

      /* FEEDBACK */

      .edit-feedback {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 16px;
        padding: 12px 14px;
        border-radius: 9px;
        font-size: 10px;
      }

      .edit-feedback > span {
        width: 21px;
        height: 21px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: white;
        border-radius: 50%;
        font-weight: 900;
      }

      .edit-feedback p {
        margin: 0;
        overflow-wrap: anywhere;
      }

      .edit-feedback button {
        margin-left: auto;
        color: inherit;
        background: transparent;
        border: 0;
        font-size: 19px;
        cursor: pointer;
      }

      .edit-feedback-error {
        color: #a13f4b;
        background: #fff0f1;
        border: 1px solid #f2d5d9;
      }

      .edit-feedback-error > span {
        background: #d45b68;
      }

      .edit-feedback-success {
        color: #267b58;
        background: #eaf8f0;
        border: 1px solid #d2eddd;
      }

      .edit-feedback-success > span {
        background: #36a477;
      }

      /* LAYOUT */

      .edit-layout {
        display: grid;
        grid-template-columns: minmax(0,1fr) 285px;
        align-items: start;
        gap: 22px;
        margin-top: 22px;
      }

      .edit-main-column {
        display: flex;
        flex-direction: column;
        gap: 18px;
        min-width: 0;
      }

      .edit-panel {
        padding: 24px;
        background: white;
        border: 1px solid #e9eaf2;
        border-radius: 15px;
        box-shadow: 0 4px 15px rgba(28,31,67,.025);
      }

      .edit-panel-heading {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 23px;
      }

      .edit-section-number {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #675dd5;
        background: #efeeff;
        border-radius: 10px;
        font-size: 9px;
        font-weight: 900;
      }

      .edit-panel-heading > div:last-child > span {
        display: block;
        color: #746bd5;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .14em;
      }

      .edit-panel-heading h2 {
        margin: 5px 0 4px;
        color: #2d2f4b;
        font-family: 'Manrope', sans-serif;
        font-size: 15px;
        font-weight: 800;
      }

      .edit-panel-heading p {
        margin: 0;
        color: #9a9eae;
        font-size: 9px;
      }

      /* FIELDS */

      .edit-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
        margin-bottom: 17px;
      }

      .edit-field:last-child {
        margin-bottom: 0;
      }

      .edit-field label {
        color: #555970;
        font-size: 10px;
        font-weight: 800;
      }

      .edit-field label b {
        color: #d25b68;
      }

      .edit-field input,
      .edit-field select,
      .edit-field textarea {
        width: 100%;
        min-width: 0;
        padding: 12px 13px;
        color: #42455f;
        background: #fcfcfe;
        border: 1px solid #e7e8f0;
        border-radius: 8px;
        outline: none;
        font: inherit;
        font-size: 10px;
        transition: border-color .18s, box-shadow .18s;
      }

      .edit-field input:focus,
      .edit-field select:focus,
      .edit-field textarea:focus {
        border-color: #a39aef;
        box-shadow: 0 0 0 3px rgba(113,102,212,.08);
      }

      .edit-field input::placeholder,
      .edit-field textarea::placeholder {
        color: #b1b4c0;
      }

      .edit-field textarea {
        resize: vertical;
        line-height: 1.8;
      }

      .edit-field small {
        align-self: flex-end;
        color: #a0a3b2;
        font-size: 8px;
      }

      .edit-character-count {
        align-self: flex-end;
        color: #a0a3b2;
        font-size: 8px;
      }

      .edit-field-grid {
        display: grid;
        grid-template-columns: repeat(2,minmax(0,1fr));
        gap: 0 14px;
      }

      /* FILE */

      .edit-current-file {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        margin-bottom: 12px;
        background: #f8f8fc;
        border: 1px solid #ececf3;
        border-radius: 10px;
      }

      .edit-file-icon,
      .edit-new-file-icon {
        width: 45px;
        height: 50px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #665cd4;
        background: #eeedff;
        border-radius: 8px;
        font-size: 8px;
        font-weight: 900;
      }

      .edit-file-info {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .edit-file-info span,
      .edit-new-file span {
        color: #a0a3b2;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .12em;
      }

      .edit-file-info strong {
        color: #4b4e67;
        font-size: 10px;
        overflow-wrap: anywhere;
      }

      .edit-file-info small {
        color: #999daf;
        font-size: 8px;
      }

      .edit-file-status {
        padding: 5px 8px;
        color: #4f915c;
        background: #edf8ef;
        border-radius: 5px;
        font-size: 7px;
        font-weight: 900;
      }

      .edit-hidden-file {
        display: none;
      }

      .edit-replace-trigger {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 13px;
        color: inherit;
        text-align: left;
        background: white;
        border: 1px dashed #d8d6ef;
        border-radius: 9px;
        cursor: pointer;
      }

      .edit-replace-trigger:hover {
        background: #faf9ff;
        border-color: #948ae9;
      }

      .edit-replace-trigger > span {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        color: #6d63d5;
        background: #efeeff;
        border-radius: 9px;
        font-size: 17px;
      }

      .edit-replace-trigger div {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .edit-replace-trigger strong {
        color: #4b4e67;
        font-size: 9px;
      }

      .edit-replace-trigger small {
        color: #a0a3b2;
        font-size: 8px;
      }

      .edit-replace-trigger > b {
        color: #6d63d5;
        font-size: 8px;
      }

      .edit-new-file {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        background: #f5fbf7;
        border: 1px solid #d3ebda;
        border-radius: 10px;
      }

      .edit-new-file-icon {
        color: #398a5f;
        background: #e5f5eb;
      }

      .edit-new-file > div:nth-child(2) {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .edit-new-file strong {
        color: #45604f;
        font-size: 10px;
        overflow-wrap: anywhere;
      }

      .edit-new-file small {
        color: #71917d;
        font-size: 8px;
      }

      .edit-new-file button {
        padding: 7px 9px;
        color: #bd5966;
        background: white;
        border: 1px solid #efd5d9;
        border-radius: 7px;
        font-size: 8px;
        font-weight: 800;
        cursor: pointer;
      }

      /* VISIBILITY */

      .edit-visibility-grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .edit-visibility-card {
        position: relative;
        display: grid;
        grid-template-columns: auto auto minmax(0,1fr) auto;
        align-items: center;
        gap: 11px;
        min-height: 66px;
        padding: 11px 13px;
        background: #fcfcfe;
        border: 1px solid #e9eaf2;
        border-radius: 10px;
        cursor: pointer;
        transition: all .18s;
      }

      .edit-visibility-card.selected {
        background: #f5f4ff;
        border-color: #a59cef;
      }

      .edit-visibility-card input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .edit-radio {
        width: 15px;
        height: 15px;
        display: grid;
        place-items: center;
        border: 1.5px solid #c6c8d3;
        border-radius: 50%;
      }

      .edit-radio span {
        width: 7px;
        height: 7px;
        background: transparent;
        border-radius: 50%;
      }

      .edit-visibility-card.selected .edit-radio {
        border-color: #6e64d5;
      }

      .edit-visibility-card.selected .edit-radio span {
        background: #6e64d5;
      }

      .edit-visibility-icon {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        color: #7066d4;
        background: #efeeff;
        border-radius: 9px;
        font-size: 16px;
      }

      .edit-visibility-card strong {
        display: block;
        color: #454861;
        font-size: 10px;
      }

      .edit-visibility-card p {
        margin: 4px 0 0;
        color: #9a9eae;
        font-size: 8px;
        line-height: 1.5;
      }

      .edit-recommended {
        padding: 5px 7px;
        color: #548b3d;
        background: #edf8e8;
        border-radius: 5px;
        font-size: 7px;
        font-weight: 900;
      }

      /* ACTION */

      .edit-action-bar {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .edit-cancel-button,
      .edit-save-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        padding: 13px 19px;
        border-radius: 9px;
        font-size: 10px;
        font-weight: 900;
        cursor: pointer;
      }

      .edit-cancel-button {
        color: #6e7288;
        background: white;
        border: 1px solid #e3e4ed;
      }

      .edit-save-button {
        min-width: 165px;
        color: white;
        background: linear-gradient(110deg,#655bd2,#5148b5);
        border: 0;
        box-shadow: 0 6px 15px rgba(91,81,193,.18);
      }

      .edit-save-button:hover:not(:disabled) {
        background: linear-gradient(110deg,#766ce3,#5c52c4);
        transform: translateY(-1px);
      }

      .edit-save-button:disabled,
      .edit-cancel-button:disabled {
        opacity: .6;
        cursor: not-allowed;
      }

      .edit-button-spinner {
        width: 13px;
        height: 13px;
        border: 2px solid rgba(255,255,255,.35);
        border-top-color: white;
        border-radius: 50%;
        animation: edit-spin .7s linear infinite;
      }

      @keyframes edit-spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* SIDEBAR */

      .edit-sidebar {
        position: sticky;
        top: 95px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .edit-sidebar-card {
        padding: 21px;
        background: white;
        border: 1px solid #e9eaf2;
        border-radius: 14px;
      }

      .edit-sidebar-label {
        color: #746bd5;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .14em;
      }

      .edit-sidebar-card h3 {
        margin: 9px 0 0;
        color: #30324d;
        font-family: 'Manrope', sans-serif;
        font-size: 14px;
        font-weight: 800;
      }

      .edit-preview-document {
        display: flex;
        justify-content: center;
        margin: 17px 0 15px;
        padding: 14px;
        background: #f3f3f8;
        border-radius: 11px;
      }

      .edit-preview-paper {
        width: 112px;
        height: 142px;
        padding: 10px;
        background: white;
        border: 1px solid #dedee8;
        border-radius: 5px;
        box-shadow: 0 7px 18px rgba(34,35,64,.09);
      }

      .edit-preview-top {
        display: flex;
        justify-content: space-between;
        color: #8c89c9;
        font-size: 5px;
        font-weight: 900;
      }

      .edit-preview-title {
        height: 20px;
        margin: 13px 0 9px;
        color: #4e4f66;
        font-size: 7px;
        font-weight: 900;
        line-height: 1.4;
        overflow: hidden;
      }

      .edit-preview-line {
        width: 100%;
        height: 3px;
        margin-top: 6px;
        background: #e7e7ef;
        border-radius: 5px;
      }

      .edit-preview-line.large {
        width: 78%;
        background: #a39bed;
      }

      .edit-preview-line.short {
        width: 58%;
      }

      .edit-preview-block {
        height: 30px;
        margin: 10px 0 8px;
        background: #f1f0ff;
        border-radius: 3px;
      }

      .edit-sidebar-card > h3 {
        overflow-wrap: anywhere;
      }

      .edit-sidebar-card > p {
        margin: 5px 0 0;
        color: #969aab;
        font-size: 9px;
        line-height: 1.7;
        overflow-wrap: anywhere;
      }

      .edit-preview-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 13px;
      }

      .edit-preview-tags span {
        padding: 5px 7px;
        color: #6e65c7;
        background: #efeeff;
        border-radius: 5px;
        font-size: 7px;
        font-weight: 800;
      }

      .edit-sharing-title {
        margin-top: 10px !important;
      }

      .edit-sharing-text {
        margin: 7px 0 14px !important;
      }

      .edit-share-button {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 11px;
        color: #6258cd;
        background: #f0efff;
        border: 1px solid #e2dfff;
        border-radius: 8px;
        font-size: 9px;
        font-weight: 900;
        cursor: pointer;
      }

      .edit-share-button:hover {
        background: #e8e6ff;
      }

      .edit-share-button span {
        font-size: 14px;
      }

      .edit-private-notice {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        padding: 11px;
        background: #f8f8fc;
        border-radius: 8px;
      }

      .edit-private-notice > span {
        color: #85899c;
        font-size: 15px;
      }

      .edit-private-notice p {
        margin: 0;
        color: #8d91a2;
        font-size: 8px;
        line-height: 1.7;
      }

      .edit-tip-card {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 16px;
        background: #f0efff;
        border: 1px solid #e3e0ff;
        border-radius: 11px;
      }

      .edit-tip-card > span {
        color: #7166d4;
        font-size: 18px;
      }

      .edit-tip-card strong {
        color: #4d4b78;
        font-size: 9px;
      }

      .edit-tip-card p {
        margin: 5px 0 0;
        color: #8582a9;
        font-size: 8px;
        line-height: 1.8;
      }

      /* FOOTER / STATES */

      .edit-page-footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 34px;
        padding-top: 18px;
        border-top: 1px solid #e9eaf2;
        color: #a0a3b2;
        font-size: 8px;
        font-weight: 800;
        letter-spacing: .1em;
      }

      .edit-page-footer a:hover {
        color: #675dd5;
      }

      .edit-loading,
      .edit-error-page {
        min-height: 400px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      .edit-spinner {
        width: 35px;
        height: 35px;
        border: 3px solid #e9e7ff;
        border-top-color: #675dd4;
        border-radius: 50%;
        animation: edit-spin .8s linear infinite;
      }

      .edit-loading p,
      .edit-error-page p {
        color: #9296a7;
        font-size: 10px;
      }

      .edit-error-icon {
        width: 48px;
        height: 48px;
        display: grid;
        place-items: center;
        color: white;
        background: #d45b68;
        border-radius: 14px;
        font-size: 20px;
        font-weight: 900;
      }

      .edit-error-page h2 {
        margin-bottom: 0;
        color: #292b47;
        font-size: 19px;
      }

      .edit-primary-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
        padding: 12px 16px;
        color: white;
        background: #655bd5;
        border-radius: 8px;
        font-size: 9px;
        font-weight: 900;
      }

      /* RESPONSIVE */

      @media (max-width: 850px) {
        .edit-layout {
          grid-template-columns: minmax(0,1fr) 245px;
        }

        .edit-page-header {
          padding: 25px;
        }

        .edit-header-status {
          display: none;
        }
      }

      @media (max-width: 700px) {
        .edit-note-page {
          width: calc(100% - 30px);
          padding-top: 20px;
        }

        .edit-layout {
          grid-template-columns: 1fr;
        }

        .edit-sidebar {
          position: static;
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
        }

        .edit-tip-card {
          grid-column: 1 / -1;
        }

        .edit-panel {
          padding: 19px;
        }
      }

      @media (max-width: 500px) {
        .edit-page-header {
          min-height: 0;
          padding: 23px 20px;
        }

        .edit-page-header h1 {
          font-size: 28px;
        }

        .edit-field-grid {
          grid-template-columns: 1fr;
        }

        .edit-sidebar {
          grid-template-columns: 1fr;
        }

        .edit-tip-card {
          grid-column: auto;
        }

        .edit-visibility-card {
          grid-template-columns: auto auto minmax(0,1fr);
        }

        .edit-recommended {
          display: none;
        }

        .edit-action-bar {
          flex-direction: column-reverse;
        }

        .edit-cancel-button,
        .edit-save-button {
          width: 100%;
        }

        .edit-new-file {
          align-items: flex-start;
        }

        .edit-new-file button {
          margin-left: auto;
        }

        .edit-page-footer {
          flex-direction: column;
        }
      }
    `}</style>
  );
}