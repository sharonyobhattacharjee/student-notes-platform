
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { api, API_URL } from "../lib/api";

export function UploadNotes() {
  const nav = useNavigate();
  const fileInputRef = useRef(null);

  const [meta, setMeta] = useState({});
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subjectId: "",
    courseId: "",
    categoryId: "",
    semester: "",
    topic: "",
    description: "",
    visibility: "PUBLIC",
    rightsConfirmed: false,
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);

  useEffect(() => {
    api("/meta")
      .then(setMeta)
      .catch((e) => setError(e.message))
      .finally(() => setMetaLoading(false));
  }, []);

  function update(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function selectFile(selectedFile) {
    if (!selectedFile) return;

    const allowedExtensions = [".pdf", ".docx", ".pptx"];
    const extension = selectedFile.name
      .slice(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setError("Please select a PDF, DOCX or PPTX file.");
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setError("File size must not exceed 20 MB.");
      return;
    }

    setError("");
    setFile(selectedFile);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    selectFile(e.dataTransfer.files?.[0]);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Please select a PDF, DOCX or PPTX file.");
      return;
    }

    if (!form.rightsConfirmed) {
      setError("Please confirm that you have the right to share this file.");
      return;
    }

    setBusy(true);

    const fd = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (value !== "" && value !== false) {
        fd.append(key, value);
      }
    });

    fd.append("rightsConfirmed", String(form.rightsConfirmed));
    fd.append("file", file);

    try {
      const response = await fetch(`${API_URL}/notes/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: fd,
      });

      const data = await response.json();

      if (!response.ok) {
        const details = Array.isArray(data.errors)
          ? data.errors.map((item) => `${item.field}: ${item.message}`).join("; ")
          : "";
        throw new Error(details || data.message || "Upload failed. Please try again.");
      }

      nav("/my-notes");
    } catch (e) {
      setError(e.message || "Something went wrong while uploading.");
    } finally {
      setBusy(false);
    }
  }

  const fileExtension = file?.name.split(".").pop().toUpperCase();

  return (
    <>
      <Navbar />

      <main className="upload-workspace">
        {/* PAGE INTRO */}
        <div className="upload-page-heading">
          <div>
            <div className="upload-eyebrow">
              <span />
              COMMUNITY CONTRIBUTION
            </div>

            <h1>Share what you know.</h1>

            <p>
              Upload your academic resources and help fellow students learn
              better. Every useful note makes a difference.
            </p>
          </div>

          <div className="upload-heading-art" aria-hidden="true">
            <div className="upload-art-paper">
              <span />
              <span />
              <span />
              <span />
              <div>+</div>
            </div>
          </div>
        </div>

        {/* PROGRESS STRIP */}
        <div className="upload-progress-strip">
          <div className="upload-progress-step">
            <span>01</span>
            <div>
              <strong>Resource details</strong>
              <small>Describe your material</small>
            </div>
          </div>

          <div className="upload-progress-line" />

          <div className="upload-progress-step">
            <span>02</span>
            <div>
              <strong>File & visibility</strong>
              <small>Choose how to share</small>
            </div>
          </div>

          <div className="upload-progress-line" />

          <div className="upload-progress-step">
            <span>03</span>
            <div>
              <strong>Publish</strong>
              <small>Submit your resource</small>
            </div>
          </div>
        </div>

        {error && (
          <div className="upload-error" role="alert">
            <span>!</span>
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        <form className="upload-layout" onSubmit={submit}>
          <div className="upload-form-column">
            {/* RESOURCE DETAILS */}
            <section className="upload-panel">
              <div className="upload-panel-heading">
                <div className="upload-panel-number">01</div>
                <div>
                  <h2>Resource information</h2>
                  <p>Give your study material a clear identity.</p>
                </div>
              </div>

              <div className="upload-field">
                <label htmlFor="upload-title">
                  Resource title <span>*</span>
                </label>
                <input
                  id="upload-title"
                  type="text"
                  placeholder="e.g. Data Structures — Complete Notes"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  required
                  maxLength={180}
                />
              </div>

              <div className="upload-field-grid">
                <div className="upload-field">
                  <label htmlFor="upload-subject">
                    Subject <span>*</span>
                  </label>
                  <select
                    id="upload-subject"
                    value={form.subjectId}
                    onChange={(e) => update("subjectId", e.target.value)}
                    required
                    disabled={metaLoading}
                  >
                    <option value="">
                      {metaLoading ? "Loading subjects..." : "Select subject"}
                    </option>
                    {(meta.subjects || []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="upload-field">
                  <label htmlFor="upload-semester">
                    Semester <span>*</span>
                  </label>
                  <select
                    id="upload-semester"
                    value={form.semester}
                    onChange={(e) => update("semester", e.target.value)}
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

                <div className="upload-field">
                  <label htmlFor="upload-course">Course</label>
                  <select
                    id="upload-course"
                    value={form.courseId}
                    onChange={(e) => update("courseId", e.target.value)}
                    disabled={metaLoading}
                  >
                    <option value="">Optional</option>
                    {(meta.courses || []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="upload-field">
                  <label htmlFor="upload-category">Category</label>
                  <select
                    id="upload-category"
                    value={form.categoryId}
                    onChange={(e) => update("categoryId", e.target.value)}
                    disabled={metaLoading}
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

              <div className="upload-field">
                <label htmlFor="upload-topic">Topic</label>
                <input
                  id="upload-topic"
                  type="text"
                  placeholder="e.g. Trees, Graphs, Sorting Algorithms"
                  value={form.topic}
                  onChange={(e) => update("topic", e.target.value)}
                  maxLength={150}
                />
                <small className="upload-field-hint">
                  Add a specific topic to make your resource easier to discover.
                </small>
              </div>

              <div className="upload-field">
                <label htmlFor="upload-description">Description</label>
                <textarea
                  id="upload-description"
                  rows={5}
                  placeholder="What does this resource cover? Mention important chapters, concepts or useful information..."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  maxLength={2000}
                />
                <div className="upload-character-count">
                  {form.description.length}/2000 characters
                </div>
              </div>
            </section>

            {/* FILE UPLOAD */}
            <section className="upload-panel">
              <div className="upload-panel-heading">
                <div className="upload-panel-number">02</div>
                <div>
                  <h2>Upload your document</h2>
                  <p>Choose the academic material you want to share.</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.pptx"
                className="upload-hidden-input"
                onChange={(e) => selectFile(e.target.files?.[0])}
              />

              <div
                className={`upload-dropzone ${dragging ? "is-dragging" : ""} ${
                  file ? "has-file" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Choose a document to upload"
              >
                {file ? (
                  <div className="upload-selected-file">
                    <div className="upload-file-icon">
                      {fileExtension === "PDF" ? "PDF" : "DOC"}
                    </div>

                    <div className="upload-file-information">
                      <strong>{file.name}</strong>
                      <span>
                        {fileExtension} · {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <small>Ready to upload</small>
                    </div>

                    <button
                      type="button"
                      className="upload-remove-file"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="upload-cloud-icon">
                      <svg
                        width="38"
                        height="38"
                        viewBox="0 0 40 40"
                        fill="none"
                      >
                        <path
                          d="M12 27.5H10.5C6.91 27.5 4 24.59 4 21C4 17.41 6.91 14.5 10.5 14.5C11.16 14.5 11.79 14.6 12.38 14.79C13.67 10.95 17.32 8.2 21.6 8.2C26.61 8.2 30.72 12.07 31.1 16.98C33.92 17.3 36 19.69 36 22.5C36 25.54 33.54 28 30.5 28H28"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M20 32V19M20 19L15 24M20 19L25 24"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    <h3>Drop your file here</h3>
                    <p>
                      or <strong>browse your computer</strong>
                    </p>
                    <span>PDF, DOCX or PPTX · Maximum file size 20 MB</span>
                  </>
                )}
              </div>
            </section>

            {/* VISIBILITY */}
            <section className="upload-panel">
              <div className="upload-panel-heading">
                <div className="upload-panel-number">03</div>
                <div>
                  <h2>Sharing preferences</h2>
                  <p>Control who can access your resource.</p>
                </div>
              </div>

              <div className="upload-visibility-options">
                <label
                  className={`upload-visibility-option ${
                    form.visibility === "PUBLIC" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="PUBLIC"
                    checked={form.visibility === "PUBLIC"}
                    onChange={(e) => update("visibility", e.target.value)}
                  />
                  <span className="visibility-radio" />
                  <span className="visibility-icon">◎</span>
                  <span className="visibility-copy">
                    <strong>Public</strong>
                    <small>Discoverable by logged-in users.</small>
                  </span>
                  <span className="visibility-tag">Recommended</span>
                </label>

                <label
                  className={`upload-visibility-option ${
                    form.visibility === "LINK_ONLY" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="LINK_ONLY"
                    checked={form.visibility === "LINK_ONLY"}
                    onChange={(e) => update("visibility", e.target.value)}
                  />
                  <span className="visibility-radio" />
                  <span className="visibility-icon">↗</span>
                  <span className="visibility-copy">
                    <strong>Link-only</strong>
                    <small>Accessible through a valid share link.</small>
                  </span>
                </label>

                <label
                  className={`upload-visibility-option ${
                    form.visibility === "PRIVATE" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="PRIVATE"
                    checked={form.visibility === "PRIVATE"}
                    onChange={(e) => update("visibility", e.target.value)}
                  />
                  <span className="visibility-radio" />
                  <span className="visibility-icon">⌑</span>
                  <span className="visibility-copy">
                    <strong>Private</strong>
                    <small>Only you and explicitly shared users.</small>
                  </span>
                </label>
              </div>
            </section>

            {/* RIGHTS CONFIRMATION */}
            <section className="upload-rights-panel">
              <label className="upload-rights-check">
                <input
                  type="checkbox"
                  checked={form.rightsConfirmed}
                  onChange={(e) =>
                    update("rightsConfirmed", e.target.checked)
                  }
                  required
                />
                <span className="custom-checkbox">✓</span>
                <span>
                  <strong>I have the right to share this material.</strong>
                  <small>
                    I confirm that I own this content or have permission to
                    distribute it. I will not upload copyrighted or restricted
                    material without authorization.
                  </small>
                </span>
              </label>
            </section>

            <div className="upload-submit-area">
              <button
                type="button"
                className="upload-cancel-button"
                onClick={() => nav("/my-notes")}
                disabled={busy}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="upload-submit-button"
                disabled={busy || metaLoading}
              >
                {busy ? (
                  <>
                    <span className="upload-button-spinner" />
                    Uploading resource...
                  </>
                ) : (
                  <>Publish resource <span>↗</span></>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="upload-sidebar">
            <section className="upload-sidebar-card">
              <span className="upload-sidebar-label">UPLOAD CHECKLIST</span>
              <h3>Before you publish</h3>

              <div className="upload-checklist-item">
                <span>01</span>
                <div>
                  <strong>Clear title</strong>
                  <p>Use a descriptive name for your notes.</p>
                </div>
              </div>

              <div className="upload-checklist-item">
                <span>02</span>
                <div>
                  <strong>Correct subject</strong>
                  <p>Choose the appropriate subject and semester.</p>
                </div>
              </div>

              <div className="upload-checklist-item">
                <span>03</span>
                <div>
                  <strong>Readable document</strong>
                  <p>Make sure your file is complete and accessible.</p>
                </div>
              </div>

              <div className="upload-checklist-item">
                <span>04</span>
                <div>
                  <strong>Sharing permissions</strong>
                  <p>Only upload material you are allowed to distribute.</p>
                </div>
              </div>
            </section>

            <section className="upload-sidebar-card upload-format-card">
              <span className="upload-sidebar-label">SUPPORTED FORMATS</span>
              <h3>File requirements</h3>

              <div className="upload-format-row">
                <span className="format-badge pdf">PDF</span>
                <div>
                  <strong>PDF document</strong>
                  <small>Portable Document Format</small>
                </div>
              </div>

              <div className="upload-format-row">
                <span className="format-badge doc">DOCX</span>
                <div>
                  <strong>Word document</strong>
                  <small>Microsoft Word format</small>
                </div>
              </div>

              <div className="upload-format-row">
                <span className="format-badge ppt">PPTX</span>
                <div>
                  <strong>Presentation</strong>
                  <small>Microsoft PowerPoint format</small>
                </div>
              </div>

              <div className="upload-format-limit">
                <span>Maximum file size</span>
                <strong>20 MB</strong>
              </div>
            </section>

            <div className="upload-help-card">
              <span>✦</span>
              <div>
                <strong>Knowledge is better when shared.</strong>
                <p>
                  Help someone understand a difficult concept with the
                  resources you create.
                </p>
              </div>
            </div>
          </aside>
        </form>

        <footer className="upload-footer">
          <span>NOTESHARE · CONTRIBUTION CENTRE</span>
          <span>Make learning accessible.</span>
        </footer>
      </main>

      <UploadStyles />
    </>
  );
}

function UploadStyles() {
  return (
    <style>{`
      .upload-workspace {
        width: min(1160px, 92%);
        margin: 0 auto;
        padding: 38px 0 30px;
      }

      .upload-page-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-height: 155px;
        padding: 25px 34px;
        overflow: hidden;
        background: linear-gradient(110deg, #f0efff, #f8f7ff 65%, #e9f5ff);
        border: 1px solid #e8e6fa;
        border-radius: 18px;
      }

      .upload-eyebrow {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #7166d4;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .15em;
      }

      .upload-eyebrow span {
        width: 7px;
        height: 7px;
        background: #8acb69;
        border-radius: 50%;
      }

      .upload-page-heading h1 {
        margin: 13px 0 7px;
        color: #292b47;
        font-family: 'Manrope', sans-serif;
        font-size: clamp(27px, 4vw, 37px);
        font-weight: 900;
        letter-spacing: -.045em;
      }

      .upload-page-heading p {
        max-width: 570px;
        margin: 0;
        color: #81859a;
        font-size: 11px;
        line-height: 1.8;
      }

      .upload-heading-art {
        width: 125px;
        height: 125px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        margin-right: 30px;
        background: rgba(255,255,255,.55);
        border: 1px solid rgba(255,255,255,.8);
        border-radius: 50%;
      }

      .upload-art-paper {
        position: relative;
        width: 61px;
        height: 77px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 7px;
        padding: 14px 10px;
        background: white;
        border: 1px solid #dedbff;
        border-radius: 8px;
        box-shadow: 0 8px 20px rgba(84,75,170,.13);
        transform: rotate(-8deg);
      }

      .upload-art-paper span {
        height: 3px;
        background: #dcd9fa;
        border-radius: 5px;
      }

      .upload-art-paper span:first-child {
        width: 65%;
        background: #8b81e8;
      }

      .upload-art-paper div {
        position: absolute;
        right: -14px;
        bottom: -10px;
        width: 29px;
        height: 29px;
        display: grid;
        place-items: center;
        color: white;
        background: #7166d4;
        border: 3px solid white;
        border-radius: 50%;
        font-size: 19px;
      }

      /* PROGRESS */

      .upload-progress-strip {
        display: flex;
        align-items: center;
        gap: 15px;
        margin: 24px 0;
        padding: 17px 22px;
        background: white;
        border: 1px solid #e9eaf2;
        border-radius: 13px;
      }

      .upload-progress-step {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      .upload-progress-step > span {
        width: 31px;
        height: 31px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #665bd5;
        background: #efeeff;
        border-radius: 9px;
        font-size: 9px;
        font-weight: 900;
      }

      .upload-progress-step strong,
      .upload-progress-step small {
        display: block;
      }

      .upload-progress-step strong {
        color: #484b64;
        font-size: 10px;
      }

      .upload-progress-step small {
        margin-top: 3px;
        color: #a0a3b2;
        font-size: 8px;
      }

      .upload-progress-line {
        flex: 1;
        height: 1px;
        min-width: 12px;
        background: #e8e8f0;
      }

      /* FORM LAYOUT */

      .upload-layout {
        display: grid;
        grid-template-columns: minmax(0,1fr) 285px;
        align-items: start;
        gap: 22px;
      }

      .upload-form-column {
        display: flex;
        flex-direction: column;
        gap: 18px;
        min-width: 0;
      }

      .upload-panel {
        padding: 24px;
        background: white;
        border: 1px solid #e9eaf2;
        border-radius: 15px;
        box-shadow: 0 4px 15px rgba(28,31,67,.025);
      }

      .upload-panel-heading {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 22px;
      }

      .upload-panel-number {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #675dd5;
        background: #efeeff;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 900;
      }

      .upload-panel-heading h2 {
        margin: 0;
        color: #292b47;
        font-family: 'Manrope', sans-serif;
        font-size: 15px;
        font-weight: 800;
      }

      .upload-panel-heading p {
        margin: 4px 0 0;
        color: #9a9eae;
        font-size: 9px;
      }

      .upload-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
        margin-bottom: 17px;
      }

      .upload-field:last-child {
        margin-bottom: 0;
      }

      .upload-field label {
        color: #555970;
        font-size: 10px;
        font-weight: 800;
      }

      .upload-field label span {
        color: #d85c6b;
      }

      .upload-field input,
      .upload-field select,
      .upload-field textarea {
        width: 100%;
        min-width: 0;
        padding: 12px 13px;
        color: #42455f;
        background: #fcfcfe;
        border: 1px solid #e7e8f0;
        border-radius: 8px;
        outline: none;
        font: inherit;
        font-size: 11px;
        transition: border-color .18s, box-shadow .18s;
      }

      .upload-field input:focus,
      .upload-field select:focus,
      .upload-field textarea:focus {
        border-color: #a39aef;
        box-shadow: 0 0 0 3px rgba(113,102,212,.08);
      }

      .upload-field input::placeholder,
      .upload-field textarea::placeholder {
        color: #b0b3c0;
      }

      .upload-field textarea {
        resize: vertical;
        line-height: 1.7;
      }

      .upload-field-grid {
        display: grid;
        grid-template-columns: repeat(2,minmax(0,1fr));
        gap: 0 14px;
      }

      .upload-field-hint {
        color: #a0a3b2;
        font-size: 9px;
      }

      .upload-character-count {
        align-self: flex-end;
        color: #a0a3b2;
        font-size: 9px;
      }

      /* FILE DROPZONE */

      .upload-hidden-input {
        display: none;
      }

      .upload-dropzone {
        min-height: 190px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: #fafaff;
        border: 1.5px dashed #d7d4f1;
        border-radius: 12px;
        cursor: pointer;
        transition: all .2s;
      }

      .upload-dropzone:hover,
      .upload-dropzone.is-dragging {
        background: #f3f2ff;
        border-color: #8176e3;
      }

      .upload-dropzone.has-file {
        min-height: 125px;
        background: #f7fbf8;
        border-color: #b8dfc7;
        border-style: solid;
      }

      .upload-cloud-icon {
        width: 56px;
        height: 56px;
        display: grid;
        place-items: center;
        color: #7166d4;
        background: #efeeff;
        border-radius: 16px;
      }

      .upload-dropzone h3 {
        margin: 13px 0 4px;
        color: #41445e;
        font-size: 12px;
      }

      .upload-dropzone > p {
        margin: 0;
        color: #9699aa;
        font-size: 10px;
      }

      .upload-dropzone > p strong {
        color: #6c61d1;
      }

      .upload-dropzone > span {
        margin-top: 12px;
        color: #a5a8b6;
        font-size: 9px;
      }

      .upload-selected-file {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 13px;
        min-width: 0;
      }

      .upload-file-icon {
        width: 48px;
        height: 53px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #655bd5;
        background: #eeedff;
        border-radius: 9px;
        font-size: 10px;
        font-weight: 900;
      }

      .upload-file-information {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 5px;
        min-width: 0;
      }

      .upload-file-information strong {
        color: #454861;
        font-size: 10px;
        overflow-wrap: anywhere;
      }

      .upload-file-information span {
        color: #898da0;
        font-size: 9px;
      }

      .upload-file-information small {
        color: #36946a;
        font-size: 9px;
        font-weight: 800;
      }

      .upload-remove-file {
        padding: 7px 9px;
        flex-shrink: 0;
        color: #c45b67;
        background: white;
        border: 1px solid #f0d8dc;
        border-radius: 7px;
        font-size: 9px;
        font-weight: 800;
        cursor: pointer;
      }

      /* VISIBILITY */

      .upload-visibility-options {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .upload-visibility-option {
        position: relative;
        display: flex;
        align-items: center;
        gap: 11px;
        min-height: 68px;
        padding: 12px;
        background: #fcfcfe;
        border: 1px solid #e9eaf2;
        border-radius: 10px;
        cursor: pointer;
        transition: all .18s;
      }

      .upload-visibility-option.selected {
        background: #f5f4ff;
        border-color: #a59cef;
      }

      .upload-visibility-option input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .visibility-radio {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
        border: 1.5px solid #c5c7d3;
        border-radius: 50%;
      }

      .upload-visibility-option.selected .visibility-radio {
        border: 4px solid #7166d4;
      }

      .visibility-icon {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #7066d4;
        background: #efeeff;
        border-radius: 9px;
        font-size: 17px;
      }

      .visibility-copy {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .visibility-copy strong {
        color: #44475f;
        font-size: 10px;
      }

      .visibility-copy small {
        color: #999daf;
        font-size: 9px;
        line-height: 1.5;
      }

      .visibility-tag {
        padding: 5px 7px;
        color: #548c3d;
        background: #edf8e8;
        border-radius: 5px;
        font-size: 7px;
        font-weight: 900;
      }

      /* RIGHTS */

      .upload-rights-panel {
        padding: 17px;
        background: #f7f8fc;
        border: 1px solid #e8eaf2;
        border-radius: 12px;
      }

      .upload-rights-check {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        cursor: pointer;
      }

      .upload-rights-check input {
        position: absolute;
        opacity: 0;
      }

      .custom-checkbox {
        width: 19px;
        height: 19px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: transparent;
        background: white;
        border: 1px solid #d4d6e1;
        border-radius: 5px;
        font-size: 12px;
        font-weight: 900;
      }

      .upload-rights-check input:checked + .custom-checkbox {
        color: white;
        background: #6d63d5;
        border-color: #6d63d5;
      }

      .upload-rights-check strong,
      .upload-rights-check small {
        display: block;
      }

      .upload-rights-check strong {
        color: #4c5068;
        font-size: 10px;
      }

      .upload-rights-check small {
        margin-top: 6px;
        color: #9296a7;
        font-size: 9px;
        line-height: 1.8;
      }

      /* SUBMIT */

      .upload-submit-area {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .upload-cancel-button,
      .upload-submit-button {
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

      .upload-cancel-button {
        color: #6e7288;
        background: white;
        border: 1px solid #e3e4ed;
      }

      .upload-submit-button {
        min-width: 190px;
        color: white;
        background: linear-gradient(110deg,#655bd2,#5148b5);
        border: 0;
        box-shadow: 0 6px 15px rgba(91,81,193,.18);
      }

      .upload-submit-button:hover:not(:disabled) {
        background: linear-gradient(110deg,#766ce3,#5c52c4);
        transform: translateY(-1px);
      }

      .upload-submit-button:disabled,
      .upload-cancel-button:disabled {
        opacity: .6;
        cursor: not-allowed;
      }

      .upload-button-spinner {
        width: 13px;
        height: 13px;
        border: 2px solid rgba(255,255,255,.35);
        border-top-color: white;
        border-radius: 50%;
        animation: upload-spin .7s linear infinite;
      }

      @keyframes upload-spin {
        to { transform: rotate(360deg); }
      }

      /* SIDEBAR */

      .upload-sidebar {
        position: sticky;
        top: 95px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .upload-sidebar-card {
        padding: 21px;
        background: white;
        border: 1px solid #e9eaf2;
        border-radius: 14px;
      }

      .upload-sidebar-label {
        color: #756bd7;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: .13em;
      }

      .upload-sidebar-card h3 {
        margin: 8px 0 18px;
        color: #30324d;
        font-family: 'Manrope', sans-serif;
        font-size: 15px;
        font-weight: 800;
      }

      .upload-checklist-item {
        display: flex;
        gap: 11px;
        padding: 13px 0;
        border-top: 1px solid #f0f0f5;
      }

      .upload-checklist-item > span {
        width: 25px;
        height: 25px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #7166d4;
        background: #f0efff;
        border-radius: 7px;
        font-size: 8px;
        font-weight: 900;
      }

      .upload-checklist-item strong {
        color: #4b4e66;
        font-size: 10px;
      }

      .upload-checklist-item p {
        margin: 5px 0 0;
        color: #9a9eae;
        font-size: 9px;
        line-height: 1.6;
      }

      .upload-format-row {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 12px 0;
        border-top: 1px solid #f0f0f5;
      }

      .format-badge {
        width: 39px;
        height: 39px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        border-radius: 9px;
        font-size: 8px;
        font-weight: 900;
      }

      .format-badge.pdf {
        color: #c34d5c;
        background: #fff0f1;
      }

      .format-badge.doc {
        color: #477dc4;
        background: #eef5ff;
      }

      .format-badge.ppt {
        color: #c57b39;
        background: #fff5e9;
      }

      .upload-format-row strong,
      .upload-format-row small {
        display: block;
      }

      .upload-format-row strong {
        color: #4b4e66;
        font-size: 10px;
      }

      .upload-format-row small {
        margin-top: 4px;
        color: #a0a3b2;
        font-size: 8px;
      }

      .upload-format-limit {
        display: flex;
        justify-content: space-between;
        margin-top: 8px;
        padding-top: 13px;
        border-top: 1px solid #efeff4;
      }

      .upload-format-limit span {
        color: #969aab;
        font-size: 9px;
      }

      .upload-format-limit strong {
        color: #4b4e66;
        font-size: 10px;
      }

      .upload-help-card {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        padding: 17px;
        background: #f0efff;
        border: 1px solid #e3e0ff;
        border-radius: 12px;
      }

      .upload-help-card > span {
        color: #7166d4;
        font-size: 20px;
      }

      .upload-help-card strong {
        color: #4d4b78;
        font-size: 10px;
      }

      .upload-help-card p {
        margin: 6px 0 0;
        color: #8582a9;
        font-size: 9px;
        line-height: 1.7;
      }

      /* ERROR AND FOOTER */

      .upload-error {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 17px;
        padding: 13px;
        color: #a23d4a;
        background: #fff0f1;
        border: 1px solid #f3d5d8;
        border-radius: 9px;
        font-size: 10px;
      }

      .upload-error > span {
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

      .upload-error button {
        margin-left: auto;
        color: inherit;
        background: transparent;
        border: 0;
        font-size: 19px;
        cursor: pointer;
      }

      .upload-footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 35px;
        padding-top: 18px;
        color: #a0a3b2;
        border-top: 1px solid #e9eaf2;
        font-size: 8px;
        font-weight: 800;
        letter-spacing: .1em;
      }

      /* RESPONSIVE */

      @media (max-width: 900px) {
        .upload-layout {
          grid-template-columns: minmax(0,1fr) 245px;
        }

        .upload-sidebar-card {
          padding: 16px;
        }

        .upload-heading-art {
          margin-right: 5px;
        }
      }

      @media (max-width: 700px) {
        .upload-workspace {
          width: calc(100% - 30px);
          padding-top: 22px;
        }

        .upload-layout {
          grid-template-columns: 1fr;
        }

        .upload-sidebar {
          position: static;
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
        }

        .upload-help-card {
          grid-column: 1 / -1;
        }

        .upload-progress-strip {
          gap: 8px;
          padding: 13px;
        }

        .upload-progress-step {
          gap: 6px;
        }

        .upload-progress-step small {
          display: none;
        }

        .upload-progress-step strong {
          font-size: 8px;
        }

        .upload-progress-step > span {
          width: 26px;
          height: 26px;
        }
      }

      @media (max-width: 480px) {
        .upload-page-heading {
          min-height: 0;
          padding: 22px;
        }

        .upload-heading-art {
          display: none;
        }

        .upload-page-heading h1 {
          font-size: 28px;
        }

        .upload-progress-strip {
          align-items: flex-start;
        }

        .upload-progress-line {
          margin-top: 13px;
        }

        .upload-progress-step {
          flex-direction: column;
          align-items: flex-start;
        }

        .upload-progress-step strong {
          font-size: 7px;
        }

        .upload-panel {
          padding: 18px;
        }

        .upload-field-grid {
          grid-template-columns: 1fr;
        }

        .upload-sidebar {
          grid-template-columns: 1fr;
        }

        .upload-help-card {
          grid-column: auto;
        }

        .upload-submit-area {
          flex-direction: column-reverse;
        }

        .upload-cancel-button,
        .upload-submit-button {
          width: 100%;
        }

        .visibility-tag {
          display: none;
        }

        .upload-footer {
          flex-direction: column;
        }
      }
    `}</style>
  );
}
