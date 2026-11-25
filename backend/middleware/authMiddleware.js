import { prisma } from "../src/prisma.js";
import { config } from "../src/config.js";
import { verifyToken, extractBearerToken } from "../src/security.js";
import {
  findSessionByToken,
  isSessionActive,
  touchSession,
  revokeSession,
} from "../models/sessionModel.js";

function unauthorized(message = "Authentication required") {
  const error = new Error(message);
  error.statusCode = 401;
  error.code = "UNAUTHORIZED";
  return error;
}

export async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw unauthorized();
    }

    let payload;

    try {
      payload = verifyToken(token);
    } catch {
      throw unauthorized("Invalid or expired authentication token");
    }

    if (!payload?.sub) {
      throw unauthorized("Invalid authentication token");
    }

    const session = await findSessionByToken(token);

    if (!session) {
      throw unauthorized("Session not found");
    }

    const active = isSessionActive(
      session,
      config.sessionIdleTimeoutMs,
    );

    if (!active) {
      if (!session.usedAt) {
        try {
          await revokeSession(session.id);
        } catch {
          // The authentication request must still fail even if
          // session cleanup encounters a database race/error.
        }
      }

      throw unauthorized("Session expired due to inactivity");
    }

    if (session.userId !== payload.sub) {
      throw unauthorized("Invalid authentication session");
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw unauthorized("User account not found");
    }

    if (user.status !== "ACTIVE") {
      throw unauthorized("User account is not active");
    }

    if (!user.role) {
      throw unauthorized("User role is not configured");
    }

    const now = new Date();

    await touchSession(session.id, now);

    req.user = user;

    req.auth = {
      userId: user.id,
      role: user.role.name,
      sessionId: session.id,
      tokenIssuedAt: payload.iat
        ? new Date(payload.iat * 1000)
        : null,
      tokenExpiresAt: payload.exp
        ? new Date(payload.exp * 1000)
        : null,
      lastActivityAt: now,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return next();
    }

    let payload;

    try {
      payload = verifyToken(token);
    } catch {
      return next();
    }

    if (!payload?.sub) {
      return next();
    }

    const session = await findSessionByToken(token);

    if (!session) {
      return next();
    }

    if (
      !isSessionActive(
        session,
        config.sessionIdleTimeoutMs,
      )
    ) {
      if (!session.usedAt) {
        try {
          await revokeSession(session.id);
        } catch {
          // Treat an unusable optional session as anonymous.
        }
      }

      return next();
    }

    if (session.userId !== payload.sub) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      include: {
        role: true,
      },
    });

    if (!user || user.status !== "ACTIVE" || !user.role) {
      return next();
    }

    const now = new Date();

    await touchSession(session.id, now);

    req.user = user;

    req.auth = {
      userId: user.id,
      role: user.role.name,
      sessionId: session.id,
      tokenIssuedAt: payload.iat
        ? new Date(payload.iat * 1000)
        : null,
      tokenExpiresAt: payload.exp
        ? new Date(payload.exp * 1000)
        : null,
      lastActivityAt: now,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user || !req.auth) {
        throw unauthorized();
      }

      if (!allowedRoles.includes(req.auth.role)) {
        const error = new Error("Insufficient permissions");
        error.statusCode = 403;
        error.code = "FORBIDDEN";
        throw error;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAdmin(req, res, next) {
  return requireRole("ADMIN")(req, res, next);
}

export function requireStudent(req, res, next) {
  return requireRole("STUDENT")(req, res, next);
}

export function requireActiveAccount(req, res, next) {
  try {
    if (!req.user || req.user.status !== "ACTIVE") {
      throw unauthorized("User account is not active");
    }

    next();
  } catch (error) {
    next(error);
  }
}
