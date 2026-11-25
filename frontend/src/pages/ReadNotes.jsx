
import { useCallback, useEffect, useState } from "react";
import { Navbar } from "../components/Navbar";
import { NoteCard } from "../components/NoteCard";
import { api } from "../lib/api";

const initialFilters = {
  q: "",
  semester: "",
  subjectId: "",
  courseId: "",
  categoryId: "",
  sort: "newest",
};

export function ReadNotes() {
  const [notes, setNotes] = useState([]);
  const [catalog, setCatalog] = useState({
    subjects: [],
    courses: [],
    categories: [],
  });
  const [resultMeta, setResultMeta] = useState({});
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value !== "")
      );

      const data = await api(`/notes?${params.toString()}`);

      setNotes(Array.isArray(data.items) ? data.items : []);
      setResultMeta(data);
      setSearched(true);
    } catch (err) {
      setError(err.message || "Unable to load notes. Please try again.");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    async function initialise() {
      try {
        const metadata = await api("/meta");

        setCatalog({
          subjects: metadata.subjects || [],
          courses: metadata.courses || [],
          categories: metadata.categories || [],
        });
      } catch (err) {
        setError(err.message || "Unable to load filter options.");
      }

      await load();
    }

    initialise();
  }, []);

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSearch(event) {
    event.preventDefault();
    load();
  }

  function resetFilters() {
    setFilters(initialFilters);
  }

  const hasFilters = Object.entries(filters).some(
    ([key, value]) => key !== "sort" && value !== ""
  );

  return (
    <>
      <Navbar />

      <main className="library-page">
        {/* PAGE INTRO */}
        <section className="library-intro">
          <div>
            <div className="library-eyebrow">
              <span className="library-eyebrow-dot" />
              THE ACADEMIC LIBRARY
            </div>

            <h1>
              Find your next
              <br />
              <span>learning resource.</span>
            </h1>

            <p>
              Explore study materials shared by students. Search by topic,
              subject or semester and find exactly what you need.
            </p>
          </div>

          <div className="library-intro-decoration" aria-hidden="true">
            <div className="library-decoration-circle">
              <span>⌕</span>
            </div>
            <span className="decoration-label">DISCOVER MORE</span>
          </div>
        </section>

        {/* SEARCH AND FILTERS */}
        <form className="library-search-panel" onSubmit={handleSearch}>
          <div className="library-search-heading">
            <div>
              <span className="library-section-label">SEARCH RESOURCES</span>
              <h2>What are you looking for?</h2>
            </div>

            <span className="library-search-icon">⌕</span>
          </div>

          <div className="library-search-input-wrap">
            <span className="search-input-icon">⌕</span>

            <input
              className="library-search-input"
              type="search"
              placeholder="Search notes, subjects, topics or keywords..."
              value={filters.q}
              onChange={(event) => updateFilter("q", event.target.value)}
            />

            <button className="library-search-button" type="submit">
              Search resources <span>↗</span>
            </button>
          </div>

          <div className="library-filter-heading">
            <span>REFINE YOUR SEARCH</span>

            {hasFilters && (
              <button
                type="button"
                className="library-reset-button"
                onClick={resetFilters}
              >
                Reset filters ↺
              </button>
            )}
          </div>

          <div className="library-filters">
            <label className="library-filter">
              <span>Semester</span>
              <select
                value={filters.semester}
                onChange={(event) =>
                  updateFilter("semester", event.target.value)
                }
              >
                <option value="">All semesters</option>
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    Semester {index + 1}
                  </option>
                ))}
              </select>
            </label>

            <label className="library-filter">
              <span>Subject</span>
              <select
                value={filters.subjectId}
                onChange={(event) =>
                  updateFilter("subjectId", event.target.value)
                }
              >
                <option value="">All subjects</option>
                {catalog.subjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="library-filter">
              <span>Course</span>
              <select
                value={filters.courseId}
                onChange={(event) =>
                  updateFilter("courseId", event.target.value)
                }
              >
                <option value="">All courses</option>
                {catalog.courses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="library-filter">
              <span>Category</span>
              <select
                value={filters.categoryId}
                onChange={(event) =>
                  updateFilter("categoryId", event.target.value)
                }
              >
                <option value="">All categories</option>
                {catalog.categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="library-filter">
              <span>Sort by</span>
              <select
                value={filters.sort}
                onChange={(event) =>
                  updateFilter("sort", event.target.value)
                }
              >
                <option value="newest">Recently added</option>
                <option value="oldest">Oldest first</option>
                <option value="downloads">Most downloaded</option>
              </select>
            </label>
          </div>
        </form>

        {/* RESULTS */}
        <section className="library-results">
          <div className="library-results-heading">
            <div>
              <span className="library-section-label">YOUR DISCOVERIES</span>
              <h2>Available resources</h2>
            </div>

            {!loading && !error && (
              <div className="library-results-count">
                <strong>{resultMeta.total ?? notes.length}</strong>
                <span>resources found</span>
              </div>
            )}
          </div>

          {error && (
            <div className="library-error">
              <span>!</span>
              <div>
                <strong>Something went wrong</strong>
                <p>{error}</p>
              </div>
              <button type="button" onClick={load}>
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="library-loading-grid">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="library-skeleton" key={index}>
                  <div className="skeleton-line skeleton-short" />
                  <div className="skeleton-line skeleton-title" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line skeleton-medium" />
                  <div className="skeleton-bottom" />
                </div>
              ))}
            </div>
          ) : !error && notes.length > 0 ? (
            <div className="notes-grid">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          ) : !error ? (
            <div className="library-empty">
              <div className="library-empty-icon">⌕</div>
              <span className="library-section-label">NO MATCHES FOUND</span>
              <h3>Nothing here just yet.</h3>
              <p>
                Try a different keyword or remove some filters to discover
                more study materials.
              </p>
              <button
                type="button"
                className="library-empty-button"
                onClick={resetFilters}
              >
                Clear all filters
              </button>
            </div>
          ) : null}
        </section>

        {/* FOOTER */}
        <footer className="library-footer">
          <span>NOTESHARE · ACADEMIC KNOWLEDGE LIBRARY</span>
          <span>Learn together. Grow together.</span>
        </footer>
      </main>

      <style>{`
        .library-page {
          width: min(1200px, 92%);
          margin: 0 auto;
          padding: 45px 0 30px;
        }

        .library-intro {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-height: 230px;
          overflow: hidden;
          padding: 35px 42px;
          background: linear-gradient(115deg, #f0efff, #f8f7ff 70%, #eeedff);
          border: 1px solid #e8e6ff;
          border-radius: 22px;
        }

        .library-intro > div:first-child {
          position: relative;
          z-index: 2;
        }

        .library-eyebrow {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #7067d6;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.15em;
        }

        .library-eyebrow-dot {
          width: 7px;
          height: 7px;
          background: #7b70e7;
          border-radius: 50%;
        }

        .library-intro h1 {
          margin: 17px 0 10px;
          color: #292748;
          font-family: 'Manrope', sans-serif;
          font-size: clamp(34px, 4vw, 46px);
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.055em;
        }

        .library-intro h1 span {
          color: #7167db;
        }

        .library-intro p {
          max-width: 570px;
          margin: 0;
          color: #85839f;
          font-size: 12px;
          line-height: 1.8;
        }

        .library-intro-decoration {
          position: relative;
          width: 190px;
          height: 180px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
        }

        .library-decoration-circle {
          width: 130px;
          height: 130px;
          display: grid;
          place-items: center;
          color: #7268d8;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(115,105,221,0.18);
          border-radius: 50%;
          box-shadow: 0 15px 45px rgba(100,90,190,0.1);
        }

        .library-decoration-circle span {
          font-size: 85px;
          font-weight: 300;
          transform: rotate(-15deg);
        }

        .decoration-label {
          position: absolute;
          right: 0;
          bottom: 10px;
          color: #938ed0;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        /* SEARCH PANEL */

        .library-search-panel {
          margin-top: 25px;
          padding: 27px;
          background: white;
          border: 1px solid #e9eaf2;
          border-radius: 18px;
          box-shadow: 0 7px 24px rgba(31,33,70,0.035);
        }

        .library-search-heading,
        .library-results-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .library-section-label {
          color: #7770d9;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.15em;
        }

        .library-search-heading h2,
        .library-results-heading h2 {
          margin: 6px 0 0;
          color: #292b47;
          font-family: 'Manrope', sans-serif;
          font-size: 19px;
          font-weight: 800;
        }

        .library-search-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          color: #7469dc;
          background: #f0efff;
          border-radius: 11px;
          font-size: 25px;
        }

        .library-search-input-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 55px;
          margin-top: 22px;
          padding: 5px 6px 5px 16px;
          background: #f8f8fc;
          border: 1px solid #e9eaf2;
          border-radius: 11px;
          transition: border 180ms ease, box-shadow 180ms ease;
        }

        .library-search-input-wrap:focus-within {
          border-color: #aaa3f4;
          box-shadow: 0 0 0 3px rgba(112,103,219,0.08);
        }

        .search-input-icon {
          color: #7770d9;
          font-size: 25px;
        }

        .library-search-input {
          min-width: 0;
          flex: 1;
          border: 0;
          outline: none;
          background: transparent;
          color: #292b47;
          font-size: 12px;
        }

        .library-search-input::placeholder {
          color: #a3a5b4;
        }

        .library-search-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 16px;
          color: white;
          background: #645bd5;
          border: 0;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          cursor: pointer;
          transition: background 180ms ease;
        }

        .library-search-button:hover {
          background: #5148bf;
        }

        .library-filter-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 25px 0 13px;
          color: #9699aa;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .library-reset-button {
          padding: 4px 0;
          color: #7167d9;
          background: transparent;
          border: 0;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .library-filters {
          display: grid;
          grid-template-columns: repeat(5, minmax(0,1fr));
          gap: 12px;
        }

        .library-filter {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .library-filter > span {
          color: #686d82;
          font-size: 10px;
          font-weight: 700;
        }

        .library-filter select {
          width: 100%;
          min-width: 0;
          padding: 11px 9px;
          color: #51566e;
          background: #fbfbfd;
          border: 1px solid #e8e9f0;
          border-radius: 8px;
          outline: none;
          font-size: 10px;
        }

        .library-filter select:focus {
          border-color: #aaa3f4;
        }

        /* RESULTS */

        .library-results {
          padding-top: 45px;
        }

        .library-results-heading {
          margin-bottom: 22px;
        }

        .library-results-count {
          display: flex;
          align-items: baseline;
          gap: 6px;
          color: #9699aa;
          font-size: 10px;
        }

        .library-results-count strong {
          color: #6259d5;
          font-family: 'Manrope', sans-serif;
          font-size: 22px;
        }

        .library-loading-grid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 17px;
        }

        .library-skeleton {
          min-height: 200px;
          padding: 22px;
          background: white;
          border: 1px solid #e9eaf2;
          border-radius: 15px;
        }

        .skeleton-line {
          width: 85%;
          height: 9px;
          margin-top: 17px;
          background: #f0f0f6;
          border-radius: 5px;
          animation: library-pulse 1.4s ease-in-out infinite;
        }

        .skeleton-short {
          width: 35%;
          margin-top: 0;
        }

        .skeleton-title {
          width: 70%;
          height: 15px;
          margin-top: 25px;
        }

        .skeleton-medium {
          width: 55%;
        }

        .skeleton-bottom {
          width: 100%;
          height: 1px;
          margin-top: 32px;
          background: #f0f0f6;
        }

        @keyframes library-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .library-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 55px 20px;
          text-align: center;
          background: white;
          border: 1px dashed #dcdbea;
          border-radius: 17px;
        }

        .library-empty-icon {
          width: 65px;
          height: 65px;
          display: grid;
          place-items: center;
          margin-bottom: 20px;
          color: #7168d9;
          background: #f0efff;
          border-radius: 20px;
          font-size: 43px;
        }

        .library-empty h3 {
          margin: 10px 0 5px;
          color: #292b47;
          font-family: 'Manrope', sans-serif;
          font-size: 19px;
        }

        .library-empty p {
          max-width: 390px;
          color: #9296a7;
          font-size: 11px;
          line-height: 1.8;
        }

        .library-empty-button {
          margin-top: 12px;
          padding: 11px 16px;
          color: white;
          background: #645bd5;
          border: 0;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .library-error {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 17px;
          background: #fff3f3;
          border: 1px solid #f4dada;
          border-radius: 12px;
        }

        .library-error > span {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          color: white;
          background: #d95c69;
          border-radius: 50%;
          font-weight: 800;
        }

        .library-error strong {
          color: #9e3c4b;
          font-size: 12px;
        }

        .library-error p {
          margin: 4px 0 0;
          color: #a96b74;
          font-size: 10px;
        }

        .library-error button {
          margin-left: auto;
          padding: 9px 12px;
          color: #a94352;
          background: white;
          border: 1px solid #f0cfd3;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .library-footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-top: 55px;
          padding-top: 20px;
          color: #a0a3b2;
          border-top: 1px solid #e9eaf2;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.07em;
        }

        /* RESPONSIVE */

        @media (max-width: 900px) {
          .library-filters {
            grid-template-columns: repeat(3,minmax(0,1fr));
          }

          .library-loading-grid {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
        }

        @media (max-width: 600px) {
          .library-page {
            width: calc(100% - 30px);
            padding-top: 23px;
          }

          .library-intro {
            min-height: 200px;
            padding: 27px 22px;
          }

          .library-intro h1 {
            font-size: 34px;
          }

          .library-intro-decoration {
            display: none;
          }

          .library-search-panel {
            padding: 20px 15px;
          }

          .library-search-heading h2 {
            font-size: 17px;
          }

          .library-search-input-wrap {
            flex-wrap: wrap;
            padding: 10px;
          }

          .library-search-input {
            width: calc(100% - 45px);
            flex: auto;
          }

          .library-search-button {
            width: 100%;
          }

          .library-filters {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }

          .library-results {
            padding-top: 35px;
          }

          .library-results-heading h2 {
            font-size: 17px;
          }

          .library-loading-grid {
            grid-template-columns: 1fr;
          }

          .library-footer {
            flex-direction: column;
          }
        }

        @media (max-width: 360px) {
          .library-filters {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
