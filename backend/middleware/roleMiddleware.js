/**
 * Reusable server-side role authorization middleware.
 *
 * Authentication must run before this middleware:
 *
 *   requireAuth
 *   requireRole("ADMIN")
 *
 * Roles are checked from req.auth, which is populated only
 * after the JWT + database session + current database user
 * have all been validated.
 */

export function requireRole(...allowedRoles) {
  const roles = allowedRoles
    .flat()
    .filter(
      (role) =>
        typeof role === "string" &&
        role.trim().length > 0
    )
    .map((role) => role.trim().toUpperCase());

  if (roles.length === 0) {
    throw new Error(
      "requireRole requires at least one valid role"
    );
  }

  return (req, res, next) => {
    if (!req.user || !req.auth) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const currentRole = String(
      req.auth.role || req.user.role?.name || ""
    ).toUpperCase();

    if (!roles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    return next();
  };
}

export const requireAdmin = requireRole("ADMIN");

export const requireStudent = requireRole("STUDENT");
