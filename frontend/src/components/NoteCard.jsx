
import { Link } from "react-router-dom";

export function NoteCard({ note }) {
  const subjectName =
    typeof note.subject === "object"
      ? note.subject?.name
      : note.subject;

  const uploaderName =
    note.uploader?.name || note.author || "Student";

  const fileType = (
    note.file?.fileType ||
    note.file?.originalName?.split(".").pop() ||
    "NOTE"
  ).toUpperCase();

  const fileLabel = ["PDF", "DOCX", "PPTX"].includes(fileType)
    ? fileType
    : "NOTE";

  const rating = Number(note.averageRating || 0);
  const ratingCount = Number(note.ratingCount || 0);

  return (
    <>
      <article className="premium-note-card">
        <div className="premium-note-top">
          <span className="premium-note-subject">
            {subjectName || "General"}
          </span>

          <span className="premium-note-semester">
            SEM {note.semester || "—"}
          </span>
        </div>

        <div className="premium-note-document">
          <div className={`document-type-icon type-${fileLabel.toLowerCase()}`}>
            <svg
              width="27"
              height="31"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8M8 17h8" />
            </svg>

            <span>{fileLabel}</span>
          </div>

          <div className="premium-note-document-label">
            <span>ACADEMIC RESOURCE</span>
            <span className="premium-note-document-dot" />
          </div>
        </div>

        <div className="premium-note-content">
          <h3>{note.title || "Untitled resource"}</h3>

          <p className="premium-note-description">
            {note.topic ||
              note.description ||
              "Academic study material shared with the community."}
          </p>
        </div>

        <div className="premium-note-meta">
          <div className="premium-note-uploader">
            <span className="premium-note-avatar">
              {uploaderName.trim().charAt(0).toUpperCase()}
            </span>

            <div>
              <span className="premium-note-meta-label">CONTRIBUTED BY</span>
              <strong>{uploaderName}</strong>
            </div>
          </div>

          <div className="premium-note-rating">
            <span className="rating-star">★</span>
            <div>
              <strong>{rating.toFixed(1)}</strong>
              <small>{ratingCount} ratings</small>
            </div>
          </div>
        </div>

        <div className="premium-note-footer">
          <span className="premium-note-footer-label">
            Explore resource
          </span>

          <Link
            className="premium-note-view-button"
            to={`/notes/${note.id}`}
            aria-label={`View details for ${note.title}`}
          >
            View details <span>↗</span>
          </Link>
        </div>
      </article>

      <style>{`
        .premium-note-card {
          min-width: 0;
          display: flex;
          flex-direction: column;
          padding: 19px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e9eaf2;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(28,31,67,0.025);
          transition:
            transform 200ms ease,
            border-color 200ms ease,
            box-shadow 200ms ease;
        }

        .premium-note-card:hover {
          transform: translateY(-5px);
          border-color: #d4d0ff;
          box-shadow: 0 15px 35px rgba(49,44,119,0.09);
        }

        .premium-note-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .premium-note-subject {
          max-width: 70%;
          overflow: hidden;
          padding: 6px 10px;
          color: #675ed0;
          background: #f0efff;
          border-radius: 7px;
          font-size: 9px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .premium-note-semester {
          color: #9699aa;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        .premium-note-document {
          min-height: 105px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 17px;
          padding: 15px 18px;
          background: linear-gradient(115deg, #f5f4ff, #fafaff);
          border: 1px solid #eeedfa;
          border-radius: 11px;
        }

        .document-type-icon {
          position: relative;
          width: 46px;
          height: 54px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          color: #7066dc;
          background: white;
          border: 1px solid #e8e5ff;
          border-radius: 7px;
          box-shadow: 0 4px 9px rgba(64,58,139,0.06);
        }

        .document-type-icon span {
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.06em;
        }

        .document-type-icon.type-pdf {
          color: #d65d6a;
          border-color: #f4dfe2;
        }

        .document-type-icon.type-docx {
          color: #477acb;
          border-color: #e0e9f8;
        }

        .document-type-icon.type-pptx {
          color: #d28a43;
          border-color: #f5e8d9;
        }

        .premium-note-document-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #9996bb;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .premium-note-document-dot {
          width: 6px;
          height: 6px;
          background: #8d83eb;
          border-radius: 50%;
        }

        .premium-note-content {
          padding: 17px 0 15px;
        }

        .premium-note-content h3 {
          display: -webkit-box;
          min-height: 42px;
          margin: 0 0 8px;
          overflow: hidden;
          color: #292b47;
          font-family: 'Manrope', sans-serif;
          font-size: 15px;
          font-weight: 800;
          line-height: 1.4;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .premium-note-description {
          display: -webkit-box;
          min-height: 36px;
          margin: 0;
          overflow: hidden;
          color: #898da0;
          font-size: 10px;
          line-height: 1.8;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .premium-note-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 13px 0;
          border-top: 1px solid #f0f0f5;
          border-bottom: 1px solid #f0f0f5;
        }

        .premium-note-uploader {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .premium-note-avatar {
          width: 31px;
          height: 31px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          color: #6359cd;
          background: #efeeff;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 900;
        }

        .premium-note-uploader > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .premium-note-meta-label {
          color: #a0a3b2;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.09em;
        }

        .premium-note-uploader strong {
          max-width: 115px;
          overflow: hidden;
          color: #44475f;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .premium-note-rating {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .rating-star {
          color: #e5a844;
          font-size: 17px;
        }

        .premium-note-rating > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .premium-note-rating strong {
          color: #44475f;
          font-size: 10px;
        }

        .premium-note-rating small {
          color: #a0a3b2;
          font-size: 8px;
        }

        .premium-note-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding-top: 14px;
        }

        .premium-note-footer-label {
          color: #999daf;
          font-size: 9px;
          font-weight: 600;
        }

        .premium-note-view-button {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 9px 12px;
          color: white;
          background: #645bd5;
          border-radius: 8px;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
          transition: background 180ms ease;
        }

        .premium-note-view-button:hover {
          background: #4f46bf;
        }

        .premium-note-view-button span {
          font-size: 13px;
        }

        @media (max-width: 400px) {
          .premium-note-card {
            padding: 15px;
          }

          .premium-note-footer-label {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
