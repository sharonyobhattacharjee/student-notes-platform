
import express from "express";
import { z } from "zod";

import { prisma } from "../src/prisma.js";

import {
  hashPassword,
  comparePassword,
  signUser,
  randomToken,
  hashToken,
} from "../src/security.js";

import { requireAuth } from "../src/auth.js";
import { audit } from "../src/audit.js";
import { createSession } from "../models/sessionModel.js";

import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from "../src/email.js";

import { config } from "../src/config.js";

const r = express.Router();

const TOKEN_EXPIRY = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 30 * 60 * 1000,
};

const PASSWORD_MAX_BYTES = 72;

/**
 * Password validation.
 *
 * bcrypt has a 72-byte input limit. Enforcing this explicitly
 * prevents two different long passwords from being treated
 * as equivalent by bcrypt.
 */
const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one digit")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= PASSWORD_MAX_BYTES,
    "Password must not exceed 72 UTF-8 bytes"
  );

/**
 * Registration validation.
 */
const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),

  email: z
    .string()
    .trim()
    .email()
    .max(254),

  password: passwordSchema,

  institution: z
    .string()
    .trim()
    .max(150)
    .optional(),
});

/**
 * Login validation.
 */
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

/**
 * Password reset request validation.
 */
const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

/**
 * Reset token validation.
 */
const tokenSchema = z.object({
  token: z.string().trim().min(32).max(512),
});

/**
 * Reset password validation.
 */
const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(512),
  password: passwordSchema,
});

/**
 * Profile update validation.
 */
const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),

    institution: z
      .string()
      .trim()
      .max(150)
      .optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.institution !== undefined,
    "At least one profile field must be supplied"
  );

/**
 * Change password validation.
 */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

/**
 * Construct a verification URL.
 */
function createVerificationUrl(token) {
  return `${config.appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * Construct a password reset URL.
 */
function createPasswordResetUrl(token) {
  return `${config.appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Create a single-use authentication token.
 *
 * Only the SHA-256 hash is stored in the database.
 */
async function createAuthToken({
  userId,
  purpose,
  expiresIn,
}) {
  const rawToken = randomToken();

  const record = await prisma.authToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      purpose,
      expiresAt: new Date(Date.now() + expiresIn),
    },
  });

  return {
    rawToken,
    record,
  };
}

/**
 * Find a valid, unused authentication token.
 */
async function findValidAuthToken(token, purpose) {
  if (typeof token !== "string" || token.length < 32) {
    return null;
  }

  return prisma.authToken.findFirst({
    where: {
      tokenHash: hashToken(token),
      purpose,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });
}

/**
 * Registration
 *
 * POST /api/auth/register
 */
r.post("/register", async (req, res, next) => {
  try {
    const values = registerSchema.parse(req.body);

    const email = values.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const studentRole = await prisma.roleDefinition.findUnique({
      where: {
        name: "STUDENT",
      },
    });

    if (!studentRole) {
      console.error("STUDENT role is missing from the database.");

      return res.status(500).json({
        message: "Registration is temporarily unavailable",
      });
    }

    const passwordHash = await hashPassword(values.password);

    const user = await prisma.user.create({
      data: {
        name: values.name,
        email,
        passwordHash,
        institution: values.institution,
        roleId: studentRole.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        institution: true,
        emailVerified: true,
      },
    });

    const { rawToken } = await createAuthToken({
      userId: user.id,
      purpose: "EMAIL_VERIFICATION",
      expiresIn: TOKEN_EXPIRY.EMAIL_VERIFICATION,
    });

    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl: createVerificationUrl(rawToken),
      expiresInHours: 24,
    });

    await audit(
      user.id,
      "REGISTER",
      "USER",
      user.id
    );

    return res.status(201).json({
      message:
        "Registration successful. Check your email to verify your account.",
      user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Verify email address
 *
 * POST /api/auth/verify-email
 */
r.post("/verify-email", async (req, res, next) => {
  try {
    const { token } = tokenSchema.parse(req.body);

    const record = await findValidAuthToken(
      token,
      "EMAIL_VERIFICATION"
    );

    if (!record || record.user.status !== "ACTIVE") {
      return res.status(400).json({
        message: "Verification link is invalid or expired",
      });
    }

    if (record.user.emailVerified) {
      return res.json({
        message: "Email address is already verified",
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: record.userId,
        },
        data: {
          emailVerified: true,
        },
      }),

      prisma.authToken.update({
        where: {
          id: record.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    await audit(
      record.userId,
      "VERIFY_EMAIL",
      "USER",
      record.userId
    );

    return res.json({
      message: "Email verified successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Resend email verification link.
 *
 * POST /api/auth/resend-verification
 *
 * Does not reveal whether an email address is registered.
 */
r.post("/resend-verification", async (req, res, next) => {
  try {
    const { email: suppliedEmail } = forgotPasswordSchema.parse(req.body);

    const email = suppliedEmail.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (
      user &&
      user.status === "ACTIVE" &&
      !user.emailVerified
    ) {
      await prisma.authToken.updateMany({
        where: {
          userId: user.id,
          purpose: "EMAIL_VERIFICATION",
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      const { rawToken } = await createAuthToken({
        userId: user.id,
        purpose: "EMAIL_VERIFICATION",
        expiresIn: TOKEN_EXPIRY.EMAIL_VERIFICATION,
      });

      await sendVerificationEmail({
        to: user.email,
        name: user.name,
        verificationUrl: createVerificationUrl(rawToken),
        expiresInHours: 24,
      });

      await audit(
        user.id,
        "RESEND_VERIFICATION",
        "USER",
        user.id
      );
    }

    return res.json({
      message:
        "If the account requires verification, a new link has been sent.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Forgot password
 *
 * POST /api/auth/forgot-password
 *
 * Always returns the same response to reduce account enumeration.
 */
r.post("/forgot-password", async (req, res, next) => {
  try {
    const { email: suppliedEmail } =
      forgotPasswordSchema.parse(req.body);

    const email = suppliedEmail.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && user.status === "ACTIVE") {
      await prisma.authToken.updateMany({
        where: {
          userId: user.id,
          purpose: "PASSWORD_RESET",
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      const { rawToken } = await createAuthToken({
        userId: user.id,
        purpose: "PASSWORD_RESET",
        expiresIn: TOKEN_EXPIRY.PASSWORD_RESET,
      });

      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: createPasswordResetUrl(rawToken),
        expiresInMinutes: 30,
      });

      await audit(
        user.id,
        "PASSWORD_RESET_REQUEST",
        "USER",
        user.id
      );
    }

    return res.json({
      message:
        "If that email is registered, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Reset password
 *
 * POST /api/auth/reset-password
 *
 * Invalidates all outstanding reset tokens after success.
 */
r.post("/reset-password", async (req, res, next) => {
  try {
    const values = resetPasswordSchema.parse(req.body);

    const record = await findValidAuthToken(
      values.token,
      "PASSWORD_RESET"
    );

    if (!record || record.user.status !== "ACTIVE") {
      return res.status(400).json({
        message: "Reset link is invalid or expired",
      });
    }

    const passwordHash = await hashPassword(values.password);
    const now = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: record.userId,
        },
        data: {
          passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),

      prisma.authToken.updateMany({
        where: {
          userId: record.userId,
          purpose: "PASSWORD_RESET",
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      }),
    ]);

    await audit(
      record.userId,
      "RESET_PASSWORD",
      "USER",
      record.userId
    );

    return res.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Login
 *
 * POST /api/auth/login
 *
 * Uses configurable failed-login limits and lockout duration.
 */
r.post("/login", async (req, res, next) => {
  try {
    const values = loginSchema.parse(req.body);

    const email = values.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        message: "This account is suspended or unavailable",
      });
    }

    const now = new Date();

    if (user.lockedUntil && user.lockedUntil > now) {
      return res.status(429).json({
        message: "Too many failed attempts. Try again later",
        retryAfter: user.lockedUntil,
      });
    }

    const passwordMatches = await comparePassword(
      values.password,
      user.passwordHash
    );

    if (!passwordMatches) {
      const updatedUser = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          failedLoginCount: {
            increment: 1,
          },
        },
        select: {
          failedLoginCount: true,
        },
      });

      const maximumAttempts = config.maxFailedLoginAttempts;
      const lockoutDuration = config.loginLockoutMs;

      if (updatedUser.failedLoginCount >= maximumAttempts) {
        const lockedUntil = new Date(
          Date.now() + lockoutDuration
        );

        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            failedLoginCount: 0,
            lockedUntil,
          },
        });

        await audit(
          user.id,
          "ACCOUNT_TEMPORARILY_LOCKED",
          "USER",
          user.id
        );

        return res.status(429).json({
          message: "Too many failed attempts. Try again later",
          retryAfter: lockedUntil,
        });
      }

      await audit(
        user.id,
        "FAILED_LOGIN",
        "USER",
        user.id
      );

      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.role) {
      return res.status(403).json({
        message: "Account role is unavailable",
      });
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: now,
      },
    });

    await audit(
      user.id,
      "LOGIN",
      "USER",
      user.id
    );

    const token = signUser(user);

    const tokenPayload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8")
    );

    if (!tokenPayload.exp) {
      throw new Error("Authentication token expiry is missing");
    }

    await createSession({
      userId: user.id,
      token,
      expiresAt: new Date(tokenPayload.exp * 1000),
      lastActivityAt: now,
    });

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        institution: user.institution,
        role: user.role.name,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Current authenticated user
 *
 * GET /api/auth/me
 */
r.get("/me", requireAuth, (req, res) => {
  return res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      institution: req.user.institution,
      role: req.user.role.name,
      emailVerified: req.user.emailVerified,
      status: req.user.status,
    },
  });
});

/**
 * Update profile
 *
 * PATCH /api/auth/profile
 */
r.patch("/profile", requireAuth, async (req, res, next) => {
  try {
    const values = profileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        ...(values.name !== undefined
          ? { name: values.name }
          : {}),

        ...(values.institution !== undefined
          ? { institution: values.institution }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        institution: true,
        emailVerified: true,
      },
    });

    await audit(
      req.user.id,
      "UPDATE_PROFILE",
      "USER",
      user.id
    );

    return res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * Change password
 *
 * PATCH /api/auth/password
 */
r.patch("/password", requireAuth, async (req, res, next) => {
  try {
    const values = changePasswordSchema.parse(req.body);

    const currentPasswordMatches = await comparePassword(
      values.currentPassword,
      req.user.passwordHash
    );

    if (!currentPasswordMatches) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    if (values.currentPassword === values.newPassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    const passwordHash = await hashPassword(
      values.newPassword
    );

    await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        passwordHash,
      },
    });

    await audit(
      req.user.id,
      "CHANGE_PASSWORD",
      "USER",
      req.user.id
    );

    /**
     * Notification failure should not undo a successful
     * password change.
     */
    try {
      await sendPasswordChangedEmail({
        to: req.user.email,
        name: req.user.name,
      });
    } catch (emailError) {
      console.error(
        "Password-change notification failed:",
        emailError.message
      );
    }

    return res.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
});


/**
 * Logout
 *
 * POST /api/auth/logout
 *
 * Revokes only the currently authenticated database session.
 */
r.post("/logout", requireAuth, async (req, res, next) => {
  try {
    if (req.auth?.sessionId) {
      await prisma.authToken.update({
        where: {
          id: req.auth.sessionId,
        },
        data: {
          usedAt: new Date(),
        },
      });
    }

    await audit(
      req.user.id,
      "LOGOUT",
      "USER",
      req.user.id
    );

    return res.json({
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
});

export default r;
