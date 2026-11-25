
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import { AuthProvider, useAuth } from "./lib/auth";

import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { SignUp } from "./pages/SignUp";
import { ReadNotes } from "./pages/ReadNotes";
import { UploadNotes } from "./pages/UploadNotes";
import { NoteDetails } from "./pages/NoteDetails";
import { Profile } from "./pages/Profile";
import { EditNote } from "./pages/EditNote";
import { MyNotes } from "./pages/MyNotes";
import { AdminDashboard } from "./pages/AdminDashboard";
import { SharedNote } from "./pages/SharedNote";

// --------------------------------------------------
// LOADING SCREEN
// --------------------------------------------------

function PageLoader() {
  return (
    <main className="app-loading" role="status" aria-live="polite">
      <div className="loading-brand">
        <div className="loading-logo">N</div>
        <span>NoteSpace</span>
      </div>

      <div className="loading-spinner" />

      <p>Preparing your workspace...</p>
    </main>
  );
}

// --------------------------------------------------
// AUTHENTICATED ROUTES
// --------------------------------------------------

function Protected({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// --------------------------------------------------
// ADMIN ROUTES
// --------------------------------------------------

function Admin({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return children;
}

// --------------------------------------------------
// APPLICATION ROUTES
// --------------------------------------------------

function AppRoutes() {
  return (
    <Routes>
      {/* Public authentication pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Main workspace */}
      <Route
        path="/"
        element={
          <Protected>
            <Home />
          </Protected>
        }
      />

      <Route
        path="/read"
        element={
          <Protected>
            <ReadNotes />
          </Protected>
        }
      />

      <Route
        path="/upload"
        element={
          <Protected>
            <UploadNotes />
          </Protected>
        }
      />

      <Route
        path="/my-notes"
        element={
          <Protected>
            <MyNotes />
          </Protected>
        }
      />

      {/* Individual notes */}
      <Route
        path="/notes/:id"
        element={
          <Protected>
            <NoteDetails />
          </Protected>
        }
      />

      <Route
        path="/notes/:id/edit"
        element={
          <Protected>
            <EditNote />
          </Protected>
        }
      />

      <Route
        path="/shared/:id/:token"
        element={
          <Protected>
            <SharedNote />
          </Protected>
        }
      />

      {/* User account */}
      <Route
        path="/profile"
        element={
          <Protected>
            <Profile />
          </Protected>
        }
      />

      {/* Administration */}
      <Route
        path="/admin"
        element={
          <Protected>
            <Admin>
              <AdminDashboard />
            </Admin>
          </Protected>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// --------------------------------------------------
// ROOT APPLICATION
// --------------------------------------------------

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
