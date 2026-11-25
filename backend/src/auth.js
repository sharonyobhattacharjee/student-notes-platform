import { prisma } from "./prisma.js";
import {
  requireAuth as sessionRequireAuth,
  optionalAuth as sessionOptionalAuth,
  requireAdmin as sessionRequireAdmin,
  requireRole as sessionRequireRole,
  requireStudent as sessionRequireStudent,
  requireActiveAccount as sessionRequireActiveAccount,
} from "../middleware/authMiddleware.js";

/**
 * Authentication and authorization middleware.
 *
 * Authentication is delegated to middleware/authMiddleware.js.
 * This file retains the resource-level authorization helpers used
 * throughout the existing note routes.
 *
 * Supported account roles:
 * - STUDENT
 * - ADMIN
 *
 * Supported account statuses:
 * - ACTIVE
 * - SUSPENDED
 * - DELETED
 */

const AUTH_MESSAGES = Object.freeze({
  REQUIRED: "Authentication required",
  INVALID: "Invalid or expired session",
  UNAVAILABLE: "Account unavailable",
  FORBIDDEN: "You do not have permission to perform this action",
  ADMIN: "Administrator access required",
  OWNER: "You do not have permission to manage this resource",
  NOTE_NOT_FOUND: "Note not found",
  NOTE_ACCESS: "You do not have permission to access this note",
});

/**
 * New session-aware authentication middleware.
 *
 * This preserves the existing requireAuth API while adding:
 * - database-backed session validation
 * - session revocation
 * - inactivity timeout enforcement
 * - last-activity tracking
 * - current database role/status validation
 */
export const requireAuth = sessionRequireAuth;

/**
 * Optional session-aware authentication.
 *
 * Public routes remain accessible without authentication,
 * but a valid active session is attached to req when present.
 */
export const optionalAuth = sessionOptionalAuth;

/**
 * Server-side role authorization.
 */
export const requireRole = sessionRequireRole;

/**
 * Administrator authorization.
 */
export const requireAdmin = sessionRequireAdmin;

/**
 * Student authorization.
 */
export const requireStudent = sessionRequireStudent;

/**
 * Require an active account.
 */
export const requireActiveAccount = sessionRequireActiveAccount;

/**
 * Check whether the authenticated user owns a resource.
 */
export function requireOwnership(
  getOwnerId,
  message = AUTH_MESSAGES.OWNER,
) {
  return async function ownershipMiddleware(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: AUTH_MESSAGES.REQUIRED,
        });
      }

      const ownerId = await getOwnerId(req);

      if (!ownerId || ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message,
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Determine whether a user can access a note.
 *
 * Rules:
 * - ADMIN can access active notes.
 * - PUBLIC notes are accessible to everyone.
 * - LINK_ONLY notes require a valid share-link context.
 * - PRIVATE notes are accessible to the owner or an explicit share.
 * - The owner can access their own note regardless of visibility.
 */
export function canAccessNote(note, userId, options = {}) {
  if (!note || note.status === "DELETED") {
    return false;
  }

  const {
    hasPrivateShare = false,
    hasValidShareLink = false,
    isAdmin = false,
  } = options;

  if (isAdmin) {
    return true;
  }

  if (userId && note.uploaderId === userId) {
    return true;
  }

  if (note.visibility === "PUBLIC") {
    return true;
  }

  if (
    note.visibility === "LINK_ONLY" &&
    hasValidShareLink
  ) {
    return true;
  }

  if (
    note.visibility === "PRIVATE" &&
    hasPrivateShare
  ) {
    return true;
  }

  return false;
}

/**
 * Verify access through a specific-user note share.
 */
export async function canAccessPrivateShare(noteId, userId) {
  if (!noteId || !userId) {
    return false;
  }

  const share = await prisma.noteShare.findUnique({
    where: {
      noteId_userId: {
        noteId,
        userId,
      },
    },
    include: {
      note: {
        select: {
          id: true,
          status: true,
          visibility: true,
        },
      },
    },
  });

  if (!share || !share.note) {
    return false;
  }

  if (share.note.status === "DELETED") {
    return false;
  }

  if (share.note.visibility !== "PRIVATE") {
    return false;
  }

  if (share.revokedAt) {
    return false;
  }

  return true;
}

/**
 * Verify a link-share token.
 *
 * The raw token is never stored in the database.
 * Routes should pass the SHA-256 hash of the token or use
 * the existing security helper before calling this function.
 */
export async function verifyShareLink(tokenHash) {
  if (!tokenHash) {
    return null;
  }

  const shareLink = await prisma.shareLink.findUnique({
    where: {
      tokenHash,
    },
    include: {
      note: true,
    },
  });

  if (!shareLink) {
    return null;
  }

  if (!shareLink.isActive) {
    return null;
  }

  if (
    shareLink.expiresAt &&
    shareLink.expiresAt.getTime() <= Date.now()
  ) {
    return null;
  }

  if (!shareLink.note || shareLink.note.status === "DELETED") {
    return null;
  }

  return shareLink;
}

/**
 * Combined note-access check.
 */
export async function canAccessNoteWithPermissions(
  note,
  userId,
  options = {},
) {
  const {
    shareLinkTokenHash = null,
    isAdmin = false,
  } = options;

  let hasPrivateShare = false;
  let hasValidShareLink = false;

  if (userId) {
    hasPrivateShare = await canAccessPrivateShare(
      note.id,
      userId,
    );
  }

  if (shareLinkTokenHash) {
    const shareLink = await verifyShareLink(
      shareLinkTokenHash,
    );

    hasValidShareLink = Boolean(
      shareLink &&
      shareLink.noteId === note.id,
    );
  }

  return canAccessNote(
    note,
    userId,
    {
      hasPrivateShare,
      hasValidShareLink,
      isAdmin,
    },
  );
}

/**
 * Require authenticated ownership of a note.
 */
export function requireNoteOwner() {
  return async function noteOwnerMiddleware(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: AUTH_MESSAGES.REQUIRED,
        });
      }

      const noteId =
        req.params.noteId ||
        req.params.id ||
        req.body?.noteId;

      if (!noteId) {
        return res.status(400).json({
          success: false,
          message: "Note ID is required",
        });
      }

      const note = await prisma.note.findUnique({
        where: {
          id: noteId,
        },
        select: {
          id: true,
          uploaderId: true,
          status: true,
        },
      });

      if (!note || note.status === "DELETED") {
        return res.status(404).json({
          success: false,
          message: AUTH_MESSAGES.NOTE_NOT_FOUND,
        });
      }

      if (note.uploaderId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: AUTH_MESSAGES.OWNER,
        });
      }

      req.note = note;

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Require access to a note.
 *
 * This middleware supports:
 * - PUBLIC notes
 * - owner access
 * - PRIVATE user shares
 * - LINK_ONLY share links
 * - ADMIN access
 */
export function requireNoteAccess(options = {}) {
  return async function noteAccessMiddleware(req, res, next) {
    try {
      const noteId =
        req.params.noteId ||
        req.params.id ||
        req.body?.noteId;

      if (!noteId) {
        return res.status(400).json({
          success: false,
          message: "Note ID is required",
        });
      }

      const note = await prisma.note.findUnique({
        where: {
          id: noteId,
        },
        include: {
          file: true,
        },
      });

      if (!note || note.status === "DELETED") {
        return res.status(404).json({
          success: false,
          message: AUTH_MESSAGES.NOTE_NOT_FOUND,
        });
      }

      const userId = req.user?.id ?? null;
      const isAdmin =
        req.user?.role?.name === "ADMIN";

      let shareLinkTokenHash = null;

      if (options.allowShareLink !== false) {
        shareLinkTokenHash =
          req.query?.share ||
          req.query?.token ||
          req.body?.shareToken ||
          req.headers["x-share-token"] ||
          null;
      }

      const allowed =
        await canAccessNoteWithPermissions(
          note,
          userId,
          {
            shareLinkTokenHash,
            isAdmin,
          },
        );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: AUTH_MESSAGES.NOTE_ACCESS,
        });
      }

      req.note = note;

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
