
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { logout } from "../lib/api";

export function Navbar() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = (user?.name || "User")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  function handleLogout() {
    logout();
    nav("/login", { replace: true });
  }

  const navClass = ({ isActive }) =>
    `nav-link${isActive ? " active" : ""}`;

  return (
    <header className="navbar">
      <NavLink to="/" className="brand" aria-label="NoteShare home">
        <span className="brand-mark">N</span>
        <span className="brand-name">NoteShare</span>
      </NavLink>

      <nav className={menuOpen ? "nav-links open" : "nav-links"}>
        <NavLink
          to="/"
          end
          className={navClass}
          onClick={() => setMenuOpen(false)}
        >
          Overview
        </NavLink>

        <NavLink
          to="/read"
          className={navClass}
          onClick={() => setMenuOpen(false)}
        >
          Browse Notes
        </NavLink>

        <NavLink
          to="/upload"
          className={navClass}
          onClick={() => setMenuOpen(false)}
        >
          Upload
        </NavLink>

        <NavLink
          to="/my-notes"
          className={navClass}
          onClick={() => setMenuOpen(false)}
        >
          My Notes
        </NavLink>

        {user?.role === "ADMIN" && (
          <NavLink
            to="/admin"
            className={navClass}
            onClick={() => setMenuOpen(false)}
          >
            Administration
          </NavLink>
        )}
      </nav>

      <div className="nav-user">
        <NavLink to="/profile" className="nav-profile">
          <span className="nav-avatar">{initials}</span>

          <span className="nav-profile-info">
            <strong>{user?.name || "User"}</strong>
            <small>
              {user?.role === "ADMIN" ? "Administrator" : "Student"}
            </small>
          </span>
        </NavLink>

        <button
          type="button"
          className="nav-logout"
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
            <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
          </svg>
          <span>Logout</span>
        </button>
      </div>

      <button
        type="button"
        className="nav-mobile-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <style>{`
        .navbar {
          justify-content: space-between;
        }

        .brand-name {
          letter-spacing: -0.7px;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 5px;
          flex: 1;
        }

        .nav-links .nav-link {
          display: inline-flex;
          align-items: center;
          padding: 10px 13px;
          border-radius: 10px;
          color: #777d94;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          transition: all 180ms ease;
        }

        .nav-links .nav-link:hover {
          color: #635bdb;
          background: #eeedff;
        }

        .nav-links .nav-link.active {
          color: #635bdb;
          background: #eeedff;
        }

        .nav-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 5px 10px 5px 5px;
          border-radius: 12px;
          transition: background 180ms ease;
        }

        .nav-profile:hover {
          background: #f5f4ff;
        }

        .nav-avatar {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: linear-gradient(140deg, #8178f3, #5148c8);
          color: white;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 4px 10px rgba(99, 91, 219, 0.18);
        }

        .nav-profile-info {
          display: flex;
          flex-direction: column;
          line-height: 1.35;
        }

        .nav-profile-info strong {
          color: #252842;
          font-size: 12px;
          font-weight: 800;
          max-width: 125px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nav-profile-info small {
          color: #9297a9;
          font-size: 10px;
          font-weight: 600;
        }

        .nav-logout {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 12px;
          color: #858ba0;
          background: transparent;
          border: 1px solid #e9eaf2;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          transition: all 180ms ease;
        }

        .nav-logout:hover {
          color: #d94c62;
          background: #fff0f2;
          border-color: #f8d4da;
        }

        .nav-mobile-toggle {
          display: none;
          width: 39px;
          height: 39px;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          background: white;
          border: 1px solid #e9eaf2;
          border-radius: 10px;
        }

        .nav-mobile-toggle span {
          display: block;
          width: 17px;
          height: 2px;
          background: #252842;
          border-radius: 4px;
        }

        @media (max-width: 850px) {
          .navbar {
            flex-wrap: wrap;
            padding: 12px 20px;
            gap: 12px;
          }

          .nav-links {
            order: 3;
            flex-basis: 100%;
            display: flex;
            flex-wrap: wrap;
          }
        }

        @media (max-width: 650px) {
          .navbar {
            min-height: 66px;
            padding: 11px 15px;
            flex-wrap: wrap;
          }

          .nav-profile-info {
            display: none;
          }

          .nav-profile {
            padding: 3px;
          }

          .nav-user {
            margin-left: auto;
            gap: 7px;
          }

          .nav-logout {
            padding: 9px;
          }

          .nav-logout span {
            display: none;
          }

          .nav-mobile-toggle {
            display: flex;
          }

          .nav-links {
            display: none;
            flex-direction: column;
            align-items: stretch;
            width: 100%;
            flex-basis: 100%;
            gap: 4px;
            padding: 8px 0 3px;
            border-top: 1px solid #eeeef5;
          }

          .nav-links.open {
            display: flex;
          }

          .nav-links .nav-link {
            padding: 12px;
          }
        }
      `}</style>
    </header>
  );
}
