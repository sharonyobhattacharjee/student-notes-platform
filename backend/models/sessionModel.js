import { prisma } from "../src/prisma.js";
import { hashToken } from "../src/security.js";

const SESSION_PURPOSE = "SESSION";

/**
 * Create a database-backed session for a JWT.
 *
 * The JWT itself is never stored in the database.
 * Only its SHA-256 hash is stored.
 */
export async function createSession({
  userId,
  token,
  expiresAt,
  lastActivityAt = new Date(),
}) {
  if (!userId || !token || !expiresAt) {
    throw new Error("userId, token and expiresAt are required");
  }

  return prisma.authToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      purpose: SESSION_PURPOSE,
      expiresAt,
      lastActivityAt,
    },
  });
}

/**
 * Find an active database session for a bearer JWT.
 */
export async function findSessionByToken(token) {
  if (!token) {
    return null;
  }

  return prisma.authToken.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
    select: {
      id: true,
      userId: true,
      tokenHash: true,
      purpose: true,
      expiresAt: true,
      lastActivityAt: true,
      usedAt: true,
    },
  });
}

/**
 * Mark a session as active by updating its last activity timestamp.
 */
export async function touchSession(sessionId, activityAt = new Date()) {
  if (!sessionId) {
    throw new Error("sessionId is required");
  }

  return prisma.authToken.update({
    where: {
      id: sessionId,
    },
    data: {
      lastActivityAt: activityAt,
    },
  });
}

/**
 * Terminate one session.
 */
export async function revokeSession(sessionId, revokedAt = new Date()) {
  if (!sessionId) {
    throw new Error("sessionId is required");
  }

  return prisma.authToken.update({
    where: {
      id: sessionId,
    },
    data: {
      usedAt: revokedAt,
    },
  });
}

/**
 * Terminate every active session belonging to a user.
 */
export async function revokeAllUserSessions(
  userId,
  revokedAt = new Date(),
) {
  if (!userId) {
    throw new Error("userId is required");
  }

  return prisma.authToken.updateMany({
    where: {
      userId,
      purpose: SESSION_PURPOSE,
      usedAt: null,
    },
    data: {
      usedAt: revokedAt,
    },
  });
}

/**
 * Determine whether a session has exceeded its absolute expiry.
 */
export function isSessionExpired(session, now = new Date()) {
  if (!session?.expiresAt) {
    return true;
  }

  return session.expiresAt.getTime() <= now.getTime();
}

/**
 * Determine whether a session has exceeded the configured inactivity timeout.
 */
export function isSessionIdle(
  session,
  idleTimeoutMs,
  now = new Date(),
) {
  if (!session?.lastActivityAt) {
    return true;
  }

  if (!Number.isFinite(idleTimeoutMs) || idleTimeoutMs <= 0) {
    throw new Error("idleTimeoutMs must be a positive number");
  }

  return (
    now.getTime() - session.lastActivityAt.getTime() >= idleTimeoutMs
  );
}

/**
 * Check whether a database session is currently usable.
 */
export function isSessionActive(
  session,
  idleTimeoutMs,
  now = new Date(),
) {
  if (!session) {
    return false;
  }

  if (session.purpose !== SESSION_PURPOSE) {
    return false;
  }

  if (session.usedAt) {
    return false;
  }

  if (isSessionExpired(session, now)) {
    return false;
  }

  if (isSessionIdle(session, idleTimeoutMs, now)) {
    return false;
  }

  return true;
}
