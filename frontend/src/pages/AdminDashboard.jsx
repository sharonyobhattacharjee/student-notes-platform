import { useEffect, useMemo, useState } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "../lib/api";

const tabs = [
  "overview",
  "users",
  "notes",
  "reports",
  "reviews",
  "audit logs",
  "catalogue",
];

const tabIcons = {
  overview: "◈",
  users: "♙",
  notes: "▤",
  reports: "⚑",
  reviews: "★",
  "audit logs": "◷",
  catalogue: "◇",
};

export function AdminDashboard() {
  const [tab, setTab] = useState("overview");

  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [notes, setNotes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [logs, setLogs] = useState([]);

  const [catalogue, setCatalogue] = useState({
    subjects: [],
    courses: [],
    categories: [],
  });

  const [search, setSearch] = useState("");
  const [catalogueType, setCatalogueType] = useState("subjects");
  const [catalogueName, setCatalogueName] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [s, u, r, n, v, a, m] = await Promise.all([
        api("/admin/stats"),
        api("/admin/users"),
        api("/admin/reports"),
        api("/admin/notes"),
        api("/admin/reviews"),
        api("/admin/audit-logs"),
        api("/meta"),
      ]);

      setStats(s);
      setUsers(u.items || []);
      setReports(r.items || []);
      setNotes(n.items || []);
      setReviews(v.items || []);
      setLogs(a.items || []);

      setCatalogue({
        subjects: m.subjects || [],
        courses: m.courses || [],
        categories: m.categories || [],
      });
    } catch (e) {
      setError(e.message || "Unable to load administration data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function updateStatus(url, body) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await api(url, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      setMessage(result.message || "Changes saved.");
      await loadAll();
    } catch (e) {
      setError(e.message || "Unable to save changes.");
    } finally {
      setBusy(false);
    }
  }

  async function changeUserStatus(user) {
    const next =
      user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

    const confirmed = window.confirm(
      `${next === "SUSPENDED" ? "Suspend" : "Reactivate"} ${user.name}?`
    );

    if (!confirmed) return;

    await updateStatus(`/admin/users/${user.id}/status`, {
      status: next,
    });
  }

  async function moderateNote(note) {
    const next =
      note.status === "ACTIVE" ? "HIDDEN" : "ACTIVE";

    const reason = window.prompt(
      `Reason for changing this note to ${next}:`
    );

    if (reason === null) return;

    await updateStatus(`/admin/notes/${note.id}/status`, {
      status: next,
      reason: reason.trim(),
    });
  }

  async function moderateReview(review) {
    const next =
      review.status === "ACTIVE" ? "HIDDEN" : "ACTIVE";

    const reason = window.prompt(
      `Reason for changing review status to ${next}:`
    );

    if (reason === null) return;

    await updateStatus(`/admin/reviews/${review.id}/status`, {
      status: next,
      reason: reason.trim(),
    });
  }

  async function resolveReport(report, status) {
    const confirmed = window.confirm(
      `${status === "RESOLVED" ? "Resolve" : "Dismiss"} this report?`
    );

    if (!confirmed) return;

    await updateStatus(`/admin/reports/${report.id}`, {
      status,
    });
  }

  async function searchUsers(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const result = await api(
        `/admin/users?q=${encodeURIComponent(search.trim())}`
      );
      setUsers(result.items || []);
    } catch (e) {
      setError(e.message || "Unable to search users.");
    } finally {
      setLoading(false);
    }
  }

  async function createCatalogueItem(e) {
    e.preventDefault();

    if (catalogueName.trim().length < 2) {
      setError("Enter a name containing at least two characters.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await api(`/admin/${catalogueType}`, {
        method: "POST",
        body: JSON.stringify({
          name: catalogueName.trim(),
        }),
      });

      setCatalogue((previous) => ({
        ...previous,
        [catalogueType]: [
          ...previous[catalogueType],
          result,
        ],
      }));

      setCatalogueName("");
      setMessage("Catalogue item created successfully.");
    } catch (e) {
      setError(e.message || "Unable to create catalogue item.");
    } finally {
      setBusy(false);
    }
  }

  const visibleUsers = users;

  const openReports = reports.filter(
    (report) => report.status === "OPEN"
  ).length;

  const activeUsers = users.filter(
    (user) => user.status === "ACTIVE"
  ).length;

  const hiddenNotes = notes.filter(
    (note) => note.status === "HIDDEN"
  ).length;

  const pendingReviews = reviews.filter(
    (review) => review.status !== "ACTIVE"
  ).length;

  const recentLogs = logs.slice(0, 8);

  const currentTabCount = useMemo(() => {
    if (tab === "users") return users.length;
    if (tab === "notes") return notes.length;
    if (tab === "reports") return reports.length;
    if (tab === "reviews") return reviews.length;
    if (tab === "audit logs") return logs.length;
    return null;
  }, [tab, users, notes, reports, reviews, logs]);

  return (
    <>
      <Navbar />

      <main className="admin-page">
        {/* TOP HEADER */}
        <section className="admin-hero">
          <div className="admin-hero-copy">
            <div className="admin-eyebrow">
              <span />
              ADMINISTRATION
            </div>

            <h1>Control centre.</h1>

            <p>
              Manage users, moderate content, resolve reports and
              monitor platform activity.
            </p>
          </div>

          <div className="admin-system-status">
            <div className="status-pulse">
              <span />
            </div>

            <div>
              <strong>System operational</strong>
              <small>Administration services online</small>
            </div>

            <button
              type="button"
              onClick={loadAll}
              disabled={loading || busy}
              className="admin-refresh"
            >
              ↻
              <span>Refresh</span>
            </button>
          </div>
        </section>

        {/* GLOBAL MESSAGES */}
        {error && (
          <div className="admin-message error">
            <span>!</span>
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="admin-message success">
            <span>✓</span>
            <p>{message}</p>

            <button
              type="button"
              onClick={() => setMessage("")}
            >
              ×
            </button>
          </div>
        )}

        {/* MAIN LAYOUT */}
        <div className="admin-shell">
          {/* SIDEBAR */}
          <aside className="admin-sidebar">
            <div className="admin-sidebar-label">
              WORKSPACE
            </div>

            <nav className="admin-nav">
              {tabs.map((item) => {
                const active = tab === item;

                return (
                  <button
                    key={item}
                    type="button"
                    className={`admin-nav-item ${
                      active ? "active" : ""
                    }`}
                    onClick={() => {
                      setTab(item);
                      setError("");
                      setMessage("");
                    }}
                  >
                    <span className="admin-nav-icon">
                      {tabIcons[item]}
                    </span>

                    <span className="admin-nav-name">
                      {item}
                    </span>

                    {item === "reports" && openReports > 0 ? (
                      <span className="admin-nav-count alert-count">
                        {openReports}
                      </span>
                    ) : currentTabCount !== null &&
                      active ? (
                      <span className="admin-nav-count">
                        {currentTabCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div className="admin-sidebar-footer">
              <div className="admin-security-icon">
                ✓
              </div>

              <div>
                <strong>Admin access</strong>
                <span>Protected workspace</span>
              </div>
            </div>
          </aside>

          {/* CONTENT */}
          <section className="admin-content">
            {loading ? (
              <AdminLoading />
            ) : (
              <>
                {/* OVERVIEW */}
                {tab === "overview" && (
                  <section className="admin-tab-content">
                    <SectionHeading
                      eyebrow="OVERVIEW"
                      title="Platform at a glance"
                      description="A live summary of your platform activity."
                    />

                    <div className="admin-overview-stats">
                      {Object.entries(stats).map(
                        ([key, value], index) => (
                          <div
                            className={`admin-overview-card card-${index % 4}`}
                            key={key}
                          >
                            <div className="admin-overview-icon">
                              {index === 0
                                ? "◈"
                                : index === 1
                                ? "♙"
                                : index === 2
                                ? "▤"
                                : "↗"}
                            </div>

                            <div className="admin-overview-value">
                              {typeof value === "object" && value !== null
                                ? value.total ?? 0
                                : value}
                            </div>

                            <div className="admin-overview-label">
                              {key.replaceAll("_", " ")}
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div className="admin-overview-grid">
                      <section className="admin-panel">
                        <PanelHeader
                          eyebrow="RECENT ACTIVITY"
                          title="Latest events"
                          action={
                            logs.length > 0
                              ? "Live audit trail"
                              : null
                          }
                        />

                        {recentLogs.length === 0 ? (
                          <EmptyState
                            icon="◷"
                            title="No activity recorded"
                            text="Platform activity will appear here."
                          />
                        ) : (
                          <div className="activity-list">
                            {recentLogs.map((log) => (
                              <article
                                className="activity-item"
                                key={log.id}
                              >
                                <div className="activity-icon">
                                  {getActionIcon(log.action)}
                                </div>

                                <div className="activity-body">
                                  <strong>
                                    {log.action}
                                  </strong>

                                  <p>
                                    {log.entityType}
                                    {" · "}
                                    {new Date(
                                      log.createdAt
                                    ).toLocaleString()}
                                  </p>
                                </div>

                                <span className="activity-user">
                                  {log.user?.name || "System"}
                                </span>
                              </article>
                            ))}
                          </div>
                        )}
                      </section>

                      <section className="admin-panel">
                        <PanelHeader
                          eyebrow="ATTENTION"
                          title="Items requiring review"
                        />

                        <div className="attention-list">
                          <AttentionItem
                            label="Open reports"
                            value={openReports}
                            tone="red"
                            onClick={() =>
                              setTab("reports")
                            }
                          />

                          <AttentionItem
                            label="Hidden notes"
                            value={hiddenNotes}
                            tone="purple"
                            onClick={() =>
                              setTab("notes")
                            }
                          />

                          <AttentionItem
                            label="Moderated reviews"
                            value={pendingReviews}
                            tone="orange"
                            onClick={() =>
                              setTab("reviews")
                            }
                          />

                          <AttentionItem
                            label="Active users"
                            value={activeUsers}
                            tone="green"
                            onClick={() =>
                              setTab("users")
                            }
                          />
                        </div>
                      </section>
                    </div>
                  </section>
                )}

                {/* USERS */}
                {tab === "users" && (
                  <section className="admin-tab-content">
                    <SectionHeading
                      eyebrow="USER MANAGEMENT"
                      title="Users"
                      description="Search accounts and manage their access status."
                      count={users.length}
                    />

                    <form
                      className="admin-search"
                      onSubmit={searchUsers}
                    >
                      <div className="admin-search-input">
                        <span>⌕</span>

                        <input
                          value={search}
                          onChange={(e) =>
                            setSearch(e.target.value)
                          }
                          placeholder="Search users by name or email"
                        />
                      </div>

                      <button
                        type="submit"
                        className="admin-primary-button"
                      >
                        Search
                      </button>

                      {search && (
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => {
                            setSearch("");
                            loadAll();
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </form>

                    <div className="admin-table-card">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {visibleUsers.map((user) => (
                            <tr key={user.id}>
                              <td>
                                <div className="admin-user-cell">
                                  <Avatar
                                    name={user.name}
                                  />

                                  <div>
                                    <strong>
                                      {user.name}
                                    </strong>

                                    <span>
                                      {user.email}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <RoleBadge role={user.role} />
                              </td>

                              <td>
                                <StatusBadge
                                  status={user.status}
                                />
                              </td>

                              <td>
                                {new Date(
                                  user.createdAt
                                ).toLocaleDateString()}
                              </td>

                              <td>
                                {user.role !== "ADMIN" &&
                                  user.status !== "DELETED" && (
                                    <button
                                      type="button"
                                      className={`admin-action-button ${
                                        user.status ===
                                        "ACTIVE"
                                          ? "danger"
                                          : "success"
                                      }`}
                                      disabled={busy}
                                      onClick={() =>
                                        changeUserStatus(
                                          user
                                        )
                                      }
                                    >
                                      {user.status ===
                                      "ACTIVE"
                                        ? "Suspend"
                                        : "Reactivate"}
                                    </button>
                                  )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {visibleUsers.length === 0 && (
                        <EmptyState
                          icon="♙"
                          title="No users found"
                          text="Try another search query."
                        />
                      )}
                    </div>
                  </section>
                )}

                {/* NOTES */}
                {tab === "notes" && (
                  <section className="admin-tab-content">
                    <SectionHeading
                      eyebrow="CONTENT MODERATION"
                      title="Notes"
                      description="Review and control the visibility of uploaded study material."
                      count={notes.length}
                    />

                    <div className="admin-table-card">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Note</th>
                            <th>Uploader</th>
                            <th>Subject</th>
                            <th>Visibility</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {notes.map((note) => (
                            <tr key={note.id}>
                              <td>
                                <div className="admin-note-cell">
                                  <div className="admin-file-icon">
                                    PDF
                                  </div>

                                  <strong>
                                    {note.title}
                                  </strong>
                                </div>
                              </td>

                              <td>
                                {note.uploader?.name ||
                                  "—"}
                              </td>

                              <td>
                                {note.subject?.name ||
                                  "—"}
                              </td>

                              <td>
                                <VisibilityBadge
                                  visibility={
                                    note.visibility
                                  }
                                />
                              </td>

                              <td>
                                <StatusBadge
                                  status={note.status}
                                />
                              </td>

                              <td>
                                {note.status !==
                                  "DELETED" && (
                                  <button
                                    type="button"
                                    className={`admin-action-button ${
                                      note.status ===
                                      "ACTIVE"
                                        ? "warning"
                                        : "success"
                                    }`}
                                    disabled={busy}
                                    onClick={() =>
                                      moderateNote(note)
                                    }
                                  >
                                    {note.status ===
                                    "ACTIVE"
                                      ? "Hide"
                                      : "Restore"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {notes.length === 0 && (
                        <EmptyState
                          icon="▤"
                          title="No notes found"
                          text="There are no uploaded notes to moderate."
                        />
                      )}
                    </div>
                  </section>
                )}

                {/* REPORTS */}
                {tab === "reports" && (
                  <section className="admin-tab-content">
                    <SectionHeading
                      eyebrow="REPORT CENTRE"
                      title="Reports"
                      description="Review reports submitted against notes and reviews."
                      count={reports.length}
                    />

                    <div className="admin-table-card">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Reason</th>
                            <th>Reporter</th>
                            <th>Target</th>
                            <th>Status</th>
                            <th>Reported</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {reports.map((report) => (
                            <tr key={report.id}>
                              <td>
                                <div className="report-reason">
                                  <strong>
                                    {report.reason}
                                  </strong>
                                </div>
                              </td>

                              <td>
                                {report.reporter?.name ||
                                  "—"}
                              </td>

                              <td>
                                <span className="target-text">
                                  {report.note?.title ||
                                    report.review?.comment ||
                                    "Review"}
                                </span>
                              </td>

                              <td>
                                <StatusBadge
                                  status={report.status}
                                />
                              </td>

                              <td>
                                {new Date(
                                  report.createdAt
                                ).toLocaleDateString()}
                              </td>

                              <td>
                                {report.status ===
                                  "OPEN" && (
                                  <div className="action-group">
                                    <button
                                      type="button"
                                      className="admin-action-button success"
                                      disabled={busy}
                                      onClick={() =>
                                        resolveReport(
                                          report,
                                          "RESOLVED"
                                        )
                                      }
                                    >
                                      Resolve
                                    </button>

                                    <button
                                      type="button"
                                      className="admin-action-button muted"
                                      disabled={busy}
                                      onClick={() =>
                                        resolveReport(
                                          report,
                                          "DISMISSED"
                                        )
                                      }
                                    >
                                      Dismiss
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {reports.length === 0 && (
                        <EmptyState
                          icon="⚑"
                          title="No reports"
                          text="There are no reports requiring attention."
                        />
                      )}
                    </div>
                  </section>
                )}

                {/* REVIEWS */}
                {tab === "reviews" && (
                  <section className="admin-tab-content">
                    <SectionHeading
                      eyebrow="REVIEW MODERATION"
                      title="Reviews"
                      description="Monitor ratings and moderate student feedback."
                      count={reviews.length}
                    />

                    <div className="admin-table-card">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Note</th>
                            <th>User</th>
                            <th>Rating</th>
                            <th>Comment</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {reviews.map((review) => (
                            <tr key={review.id}>
                              <td>
                                <strong className="table-primary-text">
                                  {review.note?.title ||
                                    "—"}
                                </strong>
                              </td>

                              <td>
                                {review.user?.name ||
                                  "—"}
                              </td>

                              <td>
                                <span className="rating-value">
                                  ★ {review.rating}
                                </span>
                              </td>

                              <td>
                                <span className="comment-cell">
                                  {review.comment ||
                                    "No written comment."}
                                </span>
                              </td>

                              <td>
                                <StatusBadge
                                  status={review.status}
                                />
                              </td>

                              <td>
                                <button
                                  type="button"
                                  className={`admin-action-button ${
                                    review.status ===
                                    "ACTIVE"
                                      ? "danger"
                                      : "success"
                                  }`}
                                  disabled={busy}
                                  onClick={() =>
                                    moderateReview(
                                      review
                                    )
                                  }
                                >
                                  {review.status ===
                                  "ACTIVE"
                                    ? "Hide"
                                    : "Restore"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {reviews.length === 0 && (
                        <EmptyState
                          icon="★"
                          title="No reviews"
                          text="There are no reviews to moderate."
                        />
                      )}
                    </div>
                  </section>
                )}

                {/* AUDIT LOGS */}
                {tab === "audit logs" && (
                  <section className="admin-tab-content">
                    <SectionHeading
                      eyebrow="SYSTEM AUDIT"
                      title="Audit logs"
                      description="A chronological record of administrative activity."
                      count={logs.length}
                    />

                    <div className="admin-table-card">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Entity</th>
                            <th>Details</th>
                          </tr>
                        </thead>

                        <tbody>
                          {logs.map((log) => (
                            <tr key={log.id}>
                              <td className="nowrap">
                                {new Date(
                                  log.createdAt
                                ).toLocaleString()}
                              </td>

                              <td>
                                {log.user?.name ||
                                  "System"}
                              </td>

                              <td>
                                <span className="audit-action">
                                  {getActionIcon(
                                    log.action
                                  )}
                                  {log.action}
                                </span>
                              </td>

                              <td>
                                <span className="entity-badge">
                                  {log.entityType}
                                </span>
                              </td>

                              <td>
                                <span className="metadata-cell">
                                  {log.metadata
                                    ? JSON.stringify(
                                        log.metadata
                                      )
                                    : "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {logs.length === 0 && (
                        <EmptyState
                          icon="◷"
                          title="No audit logs"
                          text="Administrative activity will appear here."
                        />
                      )}
                    </div>
                  </section>
                )}

                {/* CATALOGUE */}
                {tab === "catalogue" && (
                  <section className="admin-tab-content">
                    <SectionHeading
                      eyebrow="CONTENT CATALOGUE"
                      title="Catalogue"
                      description="Manage the subjects, courses and categories available to students."
                    />

                    <div className="catalogue-layout">
                      <section className="admin-panel catalogue-create">
                        <PanelHeader
                          eyebrow="CREATE ITEM"
                          title="Add catalogue item"
                        />

                        <form
                          onSubmit={
                            createCatalogueItem
                          }
                        >
                          <label className="admin-field">
                            <span>
                              Catalogue type
                            </span>

                            <select
                              value={
                                catalogueType
                              }
                              onChange={(e) =>
                                setCatalogueType(
                                  e.target.value
                                )
                              }
                            >
                              <option value="subjects">
                                Subject
                              </option>

                              <option value="courses">
                                Course
                              </option>

                              <option value="categories">
                                Category
                              </option>
                            </select>
                          </label>

                          <label className="admin-field">
                            <span>Name</span>

                            <input
                              value={
                                catalogueName
                              }
                              onChange={(e) =>
                                setCatalogueName(
                                  e.target.value
                                )
                              }
                              placeholder="Enter a new name"
                              maxLength={100}
                              required
                            />
                          </label>

                          <button
                            className="admin-primary-button full"
                            disabled={busy}
                          >
                            {busy
                              ? "Adding..."
                              : "Add catalogue item"}
                          </button>
                        </form>
                      </section>

                      <section className="admin-panel">
                        <PanelHeader
                          eyebrow="CURRENT ITEMS"
                          title={`Existing ${catalogueType}`}
                          action={
                            `${catalogue[catalogueType].length} items`
                          }
                        />

                        <div className="catalogue-list">
                          {catalogue[
                            catalogueType
                          ].map((item) => (
                            <div
                              className="catalogue-item"
                              key={item.id}
                            >
                              <div className="catalogue-item-icon">
                                {catalogueType ===
                                "subjects"
                                  ? "S"
                                  : catalogueType ===
                                    "courses"
                                  ? "C"
                                  : "K"}
                              </div>

                              <span>
                                {item.name}
                              </span>

                              <span className="catalogue-check">
                                ✓
                              </span>
                            </div>
                          ))}

                          {catalogue[
                            catalogueType
                          ].length === 0 && (
                            <EmptyState
                              icon="◇"
                              title="Nothing here yet"
                              text="Create the first catalogue item."
                            />
                          )}
                        </div>
                      </section>
                    </div>
                  </section>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <AdminStyles />
    </>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

function SectionHeading({
  eyebrow,
  title,
  description,
  count,
}) {
  return (
    <div className="admin-section-heading">
      <div>
        <span>{eyebrow}</span>

        <h2>
          {title}

          {count !== undefined && (
            <b>{count}</b>
          )}
        </h2>

        <p>{description}</p>
      </div>
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  action,
}) {
  return (
    <div className="admin-panel-header">
      <div>
        <span>{eyebrow}</span>
        <h3>{title}</h3>
      </div>

      {action && (
        <small>{action}</small>
      )}
    </div>
  );
}

function AttentionItem({
  label,
  value,
  tone,
  onClick,
}) {
  return (
    <button
      type="button"
      className="attention-item"
      onClick={onClick}
    >
      <span className={`attention-dot ${tone}`} />

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <span className="attention-arrow">
        →
      </span>
    </button>
  );
}

function Avatar({ name }) {
  const initials =
    (name || "User")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="admin-avatar">
      {initials}
    </div>
  );
}

function RoleBadge({ role }) {
  return (
    <span
      className={`role-badge ${
        role === "ADMIN" ? "admin" : ""
      }`}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }) {
  const normalized = String(
    status || ""
  ).toLowerCase();

  let tone = "neutral";

  if (
    normalized === "active" ||
    normalized === "resolved"
  ) {
    tone = "success";
  } else if (
    normalized === "open" ||
    normalized === "suspended"
  ) {
    tone = "warning";
  } else if (
    normalized === "hidden" ||
    normalized === "dismissed"
  ) {
    tone = "danger";
  }

  return (
    <span className={`status-badge ${tone}`}>
      <i />
      {status || "—"}
    </span>
  );
}

function VisibilityBadge({ visibility }) {
  const normalized = String(
    visibility || ""
  ).toLowerCase();

  return (
    <span
      className={`visibility-badge ${normalized}`}
    >
      <i />

      {visibility === "LINK_ONLY"
        ? "Link-only"
        : visibility
        ? visibility.charAt(0) +
          visibility.slice(1).toLowerCase()
        : "—"}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  text,
}) {
  return (
    <div className="admin-empty">
      <div>{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function AdminLoading() {
  return (
    <div className="admin-loading">
      <div className="admin-spinner" />

      <strong>
        Loading administration data
      </strong>

      <span>
        Fetching users, content and activity...
      </span>
    </div>
  );
}

function getActionIcon(action) {
  const value = String(action || "").toLowerCase();

  if (value.includes("create")) return "+";
  if (value.includes("delete")) return "×";
  if (value.includes("update")) return "↻";
  if (value.includes("suspend")) return "!";
  if (value.includes("login")) return "→";
  if (value.includes("report")) return "⚑";

  return "•";
}

/* ---------- STYLES ---------- */

function AdminStyles() {
  return (
    <style>{`
      .admin-page {
        width: min(1240px, 94%);
        margin: 0 auto;
        padding: 30px 0 55px;
      }

      /* HERO */

      .admin-hero {
        min-height: 150px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 25px;
        padding: 28px 32px;
        background:
          linear-gradient(
            110deg,
            #f0efff 0%,
            #f8f7ff 58%,
            #edf5ff 100%
          );
        border: 1px solid #e4e2f6;
        border-radius: 18px;
      }

      .admin-eyebrow {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #6d64d0;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: .15em;
      }

      .admin-eyebrow span {
        width: 7px;
        height: 7px;
        background: #8bce6b;
        border-radius: 50%;
      }

      .admin-hero h1 {
        margin: 9px 0 5px;
        color: #292b47;
        font-family: 'Manrope', sans-serif;
        font-size: clamp(30px, 4vw, 41px);
        font-weight: 900;
        letter-spacing: -.055em;
      }

      .admin-hero-copy p {
        max-width: 600px;
        margin: 0;
        color: #878b9d;
        font-size: 9px;
        line-height: 1.8;
      }

      .admin-system-status {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 11px 12px;
        background: rgba(255,255,255,.7);
        border: 1px solid rgba(226,224,244,.9);
        border-radius: 10px;
      }

      .status-pulse {
        width: 29px;
        height: 29px;
        display: grid;
        place-items: center;
        background: #edf8ef;
        border-radius: 50%;
      }

      .status-pulse span {
        width: 7px;
        height: 7px;
        background: #67a974;
        border-radius: 50%;
        box-shadow: 0 0 0 5px rgba(103,169,116,.1);
      }

      .admin-system-status > div:nth-child(2) {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .admin-system-status strong {
        color: #4c7257;
        font-size: 8px;
        font-weight: 900;
      }

      .admin-system-status small {
        color: #a0a3af;
        font-size: 6px;
      }

      .admin-refresh {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-left: 8px;
        padding: 7px 8px;
        color: #696b80;
        background: white;
        border: 1px solid #e4e4eb;
        border-radius: 6px;
        font-size: 7px;
        font-weight: 800;
        cursor: pointer;
      }

      .admin-refresh:hover:not(:disabled) {
        color: #5e56c7;
        border-color: #d4d1ef;
      }

      .admin-refresh:disabled {
        opacity: .55;
        cursor: wait;
      }

      /* MESSAGES */

      .admin-message {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-top: 15px;
        padding: 11px 13px;
        border-radius: 8px;
        font-size: 8px;
      }

      .admin-message.success {
        color: #4e805b;
        background: #eef8f0;
        border: 1px solid #d8ecdc;
      }

      .admin-message.error {
        color: #a24853;
        background: #fff0f1;
        border: 1px solid #efd5d9;
      }

      .admin-message > span {
        width: 19px;
        height: 19px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: white;
        background: #68a977;
        border-radius: 50%;
        font-size: 8px;
        font-weight: 900;
      }

      .admin-message.error > span {
        background: #d45d69;
      }

      .admin-message p {
        flex: 1;
        margin: 0;
      }

      .admin-message button {
        padding: 0;
        color: currentColor;
        background: transparent;
        border: 0;
        font-size: 17px;
        line-height: 1;
        opacity: .5;
        cursor: pointer;
      }

      /* SHELL */

      .admin-shell {
        display: grid;
        grid-template-columns: 188px minmax(0,1fr);
        gap: 17px;
        margin-top: 19px;
        align-items: start;
      }

      /* SIDEBAR */

      .admin-sidebar {
        position: sticky;
        top: 83px;
        min-height: 530px;
        display: flex;
        flex-direction: column;
        padding: 16px 11px 11px;
        background: white;
        border: 1px solid #e7e8ef;
        border-radius: 14px;
      }

      .admin-sidebar-label {
        padding: 5px 10px 10px;
        color: #a3a5b2;
        font-size: 6px;
        font-weight: 900;
        letter-spacing: .14em;
      }

      .admin-nav {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .admin-nav-item {
        width: 100%;
        min-height: 38px;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 0 9px;
        color: #858897;
        background: transparent;
        border: 0;
        border-radius: 7px;
        font-family: inherit;
        font-size: 8px;
        font-weight: 800;
        text-align: left;
        cursor: pointer;
        transition:
          background .15s,
          color .15s,
          transform .15s;
      }

      .admin-nav-item:hover {
        color: #625ac7;
        background: #f7f7fc;
      }

      .admin-nav-item.active {
        color: #5e56c7;
        background: #efeeff;
      }

      .admin-nav-icon {
        width: 22px;
        text-align: center;
        font-size: 11px;
        opacity: .8;
      }

      .admin-nav-name {
        flex: 1;
        text-transform: capitalize;
      }

      .admin-nav-count {
        min-width: 18px;
        height: 18px;
        display: grid;
        place-items: center;
        color: #69627f;
        background: #e9e8f7;
        border-radius: 10px;
        font-size: 6px;
        font-weight: 900;
      }

      .admin-nav-count.alert-count {
        color: #a34c56;
        background: #ffe8ea;
      }

      .admin-sidebar-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: auto;
        padding: 12px 9px 5px;
        border-top: 1px solid #f0f0f4;
      }

      .admin-security-icon {
        width: 25px;
        height: 25px;
        display: grid;
        place-items: center;
        color: #5d9a68;
        background: #edf8ef;
        border-radius: 7px;
        font-size: 8px;
        font-weight: 900;
      }

      .admin-sidebar-footer > div:last-child {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .admin-sidebar-footer strong {
        color: #606278;
        font-size: 7px;
      }

      .admin-sidebar-footer span {
        color: #a4a6b2;
        font-size: 6px;
      }

      /* CONTENT */

      .admin-content {
        min-width: 0;
      }

      .admin-tab-content {
        min-width: 0;
      }

      .admin-section-heading {
        display: flex;
        justify-content: space-between;
        margin-bottom: 15px;
      }

      .admin-section-heading > div > span {
        color: #746bd3;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .14em;
      }

      .admin-section-heading h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 5px 0 4px;
        color: #33354f;
        font-family: 'Manrope', sans-serif;
        font-size: 19px;
        font-weight: 900;
        letter-spacing: -.025em;
      }

      .admin-section-heading h2 b {
        min-width: 21px;
        height: 19px;
        display: inline-grid;
        place-items: center;
        color: #665dca;
        background: #efeeff;
        border-radius: 10px;
        font-size: 7px;
      }

      .admin-section-heading p {
        margin: 0;
        color: #9699a9;
        font-size: 8px;
        line-height: 1.7;
      }

      /* OVERVIEW */

      .admin-overview-stats {
        display: grid;
        grid-template-columns: repeat(4,minmax(0,1fr));
        gap: 10px;
      }

      .admin-overview-card {
        min-height: 107px;
        position: relative;
        padding: 15px;
        overflow: hidden;
        background: white;
        border: 1px solid #e8e9ef;
        border-radius: 11px;
      }

      .admin-overview-card::after {
        content: "";
        position: absolute;
        width: 60px;
        height: 60px;
        right: -25px;
        bottom: -25px;
        border-radius: 50%;
        background: #f7f6ff;
      }

      .admin-overview-card.card-0 .admin-overview-icon {
        color: #665cd2;
        background: #efeeff;
      }

      .admin-overview-card.card-1 .admin-overview-icon {
        color: #528d65;
        background: #edf8ef;
      }

      .admin-overview-card.card-2 .admin-overview-icon {
        color: #5575b7;
        background: #edf2ff;
      }

      .admin-overview-card.card-3 .admin-overview-icon {
        color: #b57a43;
        background: #fff4e8;
      }

      .admin-overview-icon {
        width: 31px;
        height: 31px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 900;
      }

      .admin-overview-value {
        margin-top: 10px;
        color: #33354e;
        font-family: 'Manrope', sans-serif;
        font-size: 22px;
        font-weight: 900;
        letter-spacing: -.04em;
      }

      .admin-overview-label {
        margin-top: 2px;
        color: #9b9eac;
        font-size: 7px;
        font-weight: 700;
        text-transform: capitalize;
      }

      .admin-overview-grid {
        display: grid;
        grid-template-columns: minmax(0,1.35fr) minmax(260px,.65fr);
        gap: 12px;
        margin-top: 13px;
      }

      /* PANELS */

      .admin-panel {
        background: white;
        border: 1px solid #e7e8ef;
        border-radius: 13px;
        overflow: hidden;
      }

      .admin-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 17px 18px 14px;
        border-bottom: 1px solid #f0f0f4;
      }

      .admin-panel-header span {
        color: #7770c9;
        font-size: 6px;
        font-weight: 900;
        letter-spacing: .14em;
      }

      .admin-panel-header h3 {
        margin: 5px 0 0;
        color: #41435b;
        font-family: 'Manrope', sans-serif;
        font-size: 12px;
        font-weight: 800;
      }

      .admin-panel-header small {
        color: #a3a5b1;
        font-size: 6px;
      }

      /* ACTIVITY */

      .activity-list {
        display: flex;
        flex-direction: column;
      }

      .activity-item {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
        padding: 12px 18px;
        border-bottom: 1px solid #f3f3f6;
      }

      .activity-item:last-child {
        border-bottom: 0;
      }

      .activity-icon {
        width: 27px;
        height: 27px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #655ccc;
        background: #f0efff;
        border-radius: 7px;
        font-size: 10px;
        font-weight: 900;
      }

      .activity-body {
        min-width: 0;
        flex: 1;
      }

      .activity-body strong {
        display: block;
        color: #55576b;
        font-size: 8px;
        font-weight: 900;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .activity-body p {
        margin: 4px 0 0;
        color: #a2a4b0;
        font-size: 6px;
      }

      .activity-user {
        color: #7d7f91;
        font-size: 7px;
        font-weight: 800;
      }

      /* ATTENTION */

      .attention-list {
        padding: 7px 10px 10px;
      }

      .attention-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 11px 9px;
        color: inherit;
        background: transparent;
        border: 0;
        border-bottom: 1px solid #f2f2f5;
        text-align: left;
        cursor: pointer;
      }

      .attention-item:last-child {
        border-bottom: 0;
      }

      .attention-item:hover {
        background: #fafaff;
      }

      .attention-dot {
        width: 7px;
        height: 7px;
        flex-shrink: 0;
        border-radius: 50%;
      }

      .attention-dot.red {
        background: #d76570;
      }

      .attention-dot.purple {
        background: #786fd5;
      }

      .attention-dot.orange {
        background: #c58b51;
      }

      .attention-dot.green {
        background: #6eaa78;
      }

      .attention-item > div {
        display: flex;
        flex-direction: column;
        gap: 3px;
        flex: 1;
      }

      .attention-item > div span {
        color: #9699a8;
        font-size: 7px;
      }

      .attention-item > div strong {
        color: #4f5167;
        font-size: 11px;
      }

      .attention-arrow {
        color: #b1b3be;
        font-size: 12px;
      }

      /* SEARCH */

      .admin-search {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 12px;
      }

      .admin-search-input {
        flex: 1;
        position: relative;
      }

      .admin-search-input span {
        position: absolute;
        left: 11px;
        top: 50%;
        transform: translateY(-50%);
        color: #9a9dac;
        font-size: 14px;
      }

      .admin-search-input input {
        width: 100%;
        min-height: 36px;
        padding: 0 11px 0 31px;
        color: #4b4d63;
        background: white;
        border: 1px solid #e3e4ec;
        border-radius: 7px;
        outline: none;
        font-family: inherit;
        font-size: 8px;
      }

      .admin-search-input input:focus {
        border-color: #aaa5e7;
        box-shadow: 0 0 0 3px rgba(105,96,208,.07);
      }

      /* BUTTONS */

      .admin-primary-button,
      .admin-secondary-button {
        min-height: 36px;
        padding: 0 13px;
        border-radius: 7px;
        font-family: inherit;
        font-size: 8px;
        font-weight: 900;
        cursor: pointer;
      }

      .admin-primary-button {
        color: white;
        background: linear-gradient(110deg,#675dd4,#5148b5);
        border: 1px solid #675dd4;
        box-shadow: 0 5px 14px rgba(96,86,196,.13);
      }

      .admin-primary-button:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      .admin-primary-button:disabled {
        opacity: .55;
        cursor: wait;
      }

      .admin-primary-button.full {
        width: 100%;
      }

      .admin-secondary-button {
        color: #6c6f83;
        background: white;
        border: 1px solid #e2e3eb;
      }

      .admin-secondary-button:hover {
        color: #6259c9;
        border-color: #d1cef0;
      }

      /* TABLE */

      .admin-table-card {
        overflow: auto;
        background: white;
        border: 1px solid #e7e8ef;
        border-radius: 12px;
      }

      .admin-table {
        width: 100%;
        min-width: 760px;
        border-collapse: collapse;
      }

      .admin-table th {
        padding: 11px 13px;
        color: #9b9eac;
        background: #fafafd;
        border-bottom: 1px solid #ececf2;
        font-size: 6px;
        font-weight: 900;
        letter-spacing: .09em;
        text-align: left;
        text-transform: uppercase;
      }

      .admin-table td {
        padding: 13px;
        color: #77798b;
        border-bottom: 1px solid #f0f0f4;
        font-size: 7px;
        vertical-align: middle;
      }

      .admin-table tbody tr:last-child td {
        border-bottom: 0;
      }

      .admin-table tbody tr:hover {
        background: #fcfcff;
      }

      .admin-user-cell {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 170px;
      }

      .admin-avatar {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #6158c9;
        background: #efeeff;
        border-radius: 50%;
        font-size: 7px;
        font-weight: 900;
      }

      .admin-user-cell > div:last-child {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .admin-user-cell strong {
        color: #4d4f63;
        font-size: 8px;
        font-weight: 900;
      }

      .admin-user-cell span {
        color: #9da0ad;
        font-size: 6px;
        overflow-wrap: anywhere;
      }

      .role-badge,
      .status-badge,
      .visibility-badge,
      .entity-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 6px;
        border-radius: 5px;
        font-size: 6px;
        font-weight: 900;
      }

      .role-badge {
        color: #68708d;
        background: #f1f2f7;
      }

      .role-badge.admin {
        color: #665dca;
        background: #efeeff;
      }

      .status-badge {
        color: #747684;
        background: #f2f2f5;
      }

      .status-badge i,
      .visibility-badge i {
        width: 5px;
        height: 5px;
        border-radius: 50%;
      }

      .status-badge.success {
        color: #50855c;
        background: #edf8ef;
      }

      .status-badge.success i {
        background: #67a977;
      }

      .status-badge.warning {
        color: #a27240;
        background: #fff4e7;
      }

      .status-badge.warning i {
        background: #c48b51;
      }

      .status-badge.danger {
        color: #a04e59;
        background: #fff0f1;
      }

      .status-badge.danger i {
        background: #d45f6b;
      }

      .visibility-badge.public {
        color: #50845c;
        background: #edf8ef;
      }

      .visibility-badge.public i {
        background: #67a977;
      }

      .visibility-badge.link_only {
        color: #6278b5;
        background: #edf2ff;
      }

      .visibility-badge.link_only i {
        background: #7890ce;
      }

      .visibility-badge.private {
        color: #9c7045;
        background: #fff4e8;
      }

      .visibility-badge.private i {
        background: #c48c53;
      }

      .admin-note-cell {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 170px;
      }

      .admin-file-icon {
        width: 25px;
        height: 29px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #665cd1;
        background: #efeeff;
        border-radius: 5px;
        font-size: 5px;
        font-weight: 900;
      }

      .admin-note-cell strong,
      .table-primary-text {
        color: #4d4f63;
        font-size: 8px;
        font-weight: 900;
      }

      .report-reason strong {
        color: #55576b;
        font-size: 7px;
      }

      .target-text,
      .comment-cell {
        display: block;
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #858795;
      }

      .rating-value {
        color: #6259ca;
        font-weight: 900;
      }

      .action-group {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .admin-action-button {
        min-height: 26px;
        padding: 0 8px;
        border-radius: 5px;
        font-family: inherit;
        font-size: 6px;
        font-weight: 900;
        cursor: pointer;
        white-space: nowrap;
      }

      .admin-action-button.danger {
        color: #a04e59;
        background: #fff2f3;
        border: 1px solid #efd9dc;
      }

      .admin-action-button.warning {
        color: #a27240;
        background: #fff5e9;
        border: 1px solid #f0dfc9;
      }

      .admin-action-button.success {
        color: #4e845b;
        background: #eef8f0;
        border: 1px solid #d9ebdc;
      }

      .admin-action-button.muted {
        color: #777a8c;
        background: #f5f5f7;
        border: 1px solid #e6e6eb;
      }

      .admin-action-button:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      .admin-action-button:disabled {
        opacity: .45;
        cursor: wait;
      }

      .nowrap {
        white-space: nowrap;
      }

      /* AUDIT */

      .audit-action {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #55576b;
        font-weight: 800;
      }

      .audit-action:first-letter {
        color: #6a61ce;
      }

      .entity-badge {
        color: #65708c;
        background: #f1f2f7;
        text-transform: uppercase;
      }

      .metadata-cell {
        display: block;
        max-width: 260px;
        overflow: hidden;
        color: #9a9ca8;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* CATALOGUE */

      .catalogue-layout {
        display: grid;
        grid-template-columns: minmax(280px,.7fr) minmax(0,1.3fr);
        gap: 13px;
      }

      .catalogue-create form {
        padding: 17px;
      }

      .admin-field {
        display: block;
        margin-bottom: 15px;
      }

      .admin-field > span {
        display: block;
        margin-bottom: 6px;
        color: #65687d;
        font-size: 7px;
        font-weight: 900;
      }

      .admin-field input,
      .admin-field select {
        width: 100%;
        min-height: 36px;
        padding: 0 10px;
        color: #4c4e64;
        background: #fbfbfd;
        border: 1px solid #e2e3eb;
        border-radius: 7px;
        outline: none;
        font-family: inherit;
        font-size: 8px;
      }

      .admin-field input:focus,
      .admin-field select:focus {
        background: white;
        border-color: #aaa5e7;
        box-shadow: 0 0 0 3px rgba(105,96,208,.07);
      }

      .catalogue-list {
        padding: 8px 11px 11px;
      }

      .catalogue-item {
        min-height: 42px;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 7px 8px;
        border-bottom: 1px solid #f1f1f5;
      }

      .catalogue-item:last-child {
        border-bottom: 0;
      }

      .catalogue-item-icon {
        width: 26px;
        height: 26px;
        display: grid;
        place-items: center;
        color: #665cd1;
        background: #efeeff;
        border-radius: 6px;
        font-size: 6px;
        font-weight: 900;
      }

      .catalogue-item span:nth-child(2) {
        flex: 1;
        color: #5c5e72;
        font-size: 8px;
        font-weight: 800;
      }

      .catalogue-check {
        color: #6daa76;
        font-size: 9px;
        font-weight: 900;
      }

      /* EMPTY */

      .admin-empty {
        min-height: 170px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 25px;
        text-align: center;
      }

      .admin-empty > div {
        width: 35px;
        height: 35px;
        display: grid;
        place-items: center;
        margin-bottom: 8px;
        color: #7269d0;
        background: #efeeff;
        border-radius: 9px;
        font-size: 13px;
      }

      .admin-empty strong {
        color: #57596c;
        font-size: 9px;
        font-weight: 900;
      }

      .admin-empty p {
        max-width: 270px;
        margin: 5px 0 0;
        color: #a1a3af;
        font-size: 7px;
        line-height: 1.7;
      }

      /* LOADING */

      .admin-loading {
        min-height: 480px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #9699aa;
        background: white;
        border: 1px solid #e8e9ef;
        border-radius: 13px;
      }

      .admin-spinner {
        width: 29px;
        height: 29px;
        margin-bottom: 12px;
        border: 3px solid #e9e7ff;
        border-top-color: #675dd4;
        border-radius: 50%;
        animation: admin-spin .75s linear infinite;
      }

      @keyframes admin-spin {
        to {
          transform: rotate(360deg);
        }
      }

      .admin-loading strong {
        color: #5d5f73;
        font-size: 9px;
      }

      .admin-loading span {
        margin-top: 5px;
        color: #a2a4b0;
        font-size: 7px;
      }

      /* RESPONSIVE */

      @media (max-width: 1000px) {
        .admin-overview-stats {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }

        .admin-overview-grid {
          grid-template-columns: 1fr;
        }

        .catalogue-layout {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 800px) {
        .admin-shell {
          grid-template-columns: 1fr;
        }

        .admin-sidebar {
          position: static;
          min-height: auto;
        }

        .admin-nav {
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
        }

        .admin-nav-item {
          min-height: 42px;
        }

        .admin-sidebar-footer {
          display: none;
        }

        .admin-system-status {
          display: none;
        }
      }

      @media (max-width: 600px) {
        .admin-page {
          width: calc(100% - 30px);
          padding-top: 20px;
        }

        .admin-hero {
          padding: 24px 21px;
        }

        .admin-hero h1 {
          font-size: 31px;
        }

        .admin-nav {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }

        .admin-overview-stats {
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .admin-overview-card {
          min-height: 92px;
          padding: 12px;
        }

        .admin-overview-value {
          font-size: 19px;
        }

        .admin-search {
          flex-wrap: wrap;
        }

        .admin-search-input {
          flex-basis: 100%;
        }

        .admin-search .admin-primary-button,
        .admin-search .admin-secondary-button {
          flex: 1;
        }

        .admin-section-heading h2 {
          font-size: 17px;
        }

        .admin-panel-header {
          padding-left: 14px;
          padding-right: 14px;
        }

        .activity-item {
          padding-left: 14px;
          padding-right: 14px;
        }

        .activity-user {
          display: none;
        }
      }

      @media (max-width: 400px) {
        .admin-overview-stats {
          grid-template-columns: 1fr;
        }

        .admin-nav {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}