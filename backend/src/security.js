
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "./config.js";

/**
 * Security configuration
 *
 * Password hashing uses bcrypt with 12 salt rounds.
 * Authentication tokens use cryptographically secure random bytes.
 * JWT signing and verification are restricted to HS256.
 */

const BCRYPT_ROUNDS = 12;
const MAX_BCRYPT_PASSWORD_BYTES = 72;
const DEFAULT_TOKEN_BYTES = 32;
const MIN_TOKEN_BYTES = 16;
const MAX_TOKEN_BYTES = 128;

const JWT_ALGORITHM = "HS256";

/**
 * Validate that a value is a non-empty string.
 */
function requireNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }

  return value;
}

/**
 * Validate password input without silently modifying it.
 */
function validatePasswordInput(password) {
  requireNonEmptyString(password, "Password");

  const passwordBytes = Buffer.byteLength(password, "utf8");

  if (passwordBytes > MAX_BCRYPT_PASSWORD_BYTES) {
    throw new Error(
      `Password exceeds the bcrypt limit of ${MAX_BCRYPT_PASSWORD_BYTES} UTF-8 bytes.`
    );
  }

  return password;
}

/**
 * Generate a cryptographically secure random token.
 *
 * The returned token uses URL-safe Base64 encoding.
 */
export function randomToken(bytes = DEFAULT_TOKEN_BYTES) {
  if (
    !Number.isInteger(bytes) ||
    bytes < MIN_TOKEN_BYTES ||
    bytes > MAX_TOKEN_BYTES
  ) {
    throw new RangeError(
      `Token byte length must be between ${MIN_TOKEN_BYTES} and ${MAX_TOKEN_BYTES}.`
    );
  }

  return crypto.randomBytes(bytes).toString("base64url");
}

/**
 * Generate a SHA-256 hash of a token.
 *
 * Store the hash in the database rather than the original token.
 */
export function hashToken(token) {
  requireNonEmptyString(token, "Token");

  return crypto
    .createHash("sha256")
    .update(token, "utf8")
    .digest("hex");
}

/**
 * Compare two strings without ordinary early-exit comparison.
 *
 * This is useful when comparing fixed-length cryptographic values.
 */
export function safeEqual(first, second) {
  if (typeof first !== "string" || typeof second !== "string") {
    return false;
  }

  const firstBuffer = Buffer.from(first, "utf8");
  const secondBuffer = Buffer.from(second, "utf8");

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(firstBuffer, secondBuffer);
}

/**
 * Hash a user's password.
 *
 * Existing application code can continue using:
 * await hashPassword(password)
 */
export async function hashPassword(password) {
  validatePasswordInput(password);

  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare a supplied password with its stored bcrypt hash.
 *
 * Invalid input returns false instead of exposing an exception
 * to authentication callers.
 */
export async function comparePassword(password, passwordHash) {
  if (
    typeof password !== "string" ||
    typeof passwordHash !== "string" ||
    password.length === 0 ||
    passwordHash.length === 0
  ) {
    return false;
  }

  if (Buffer.byteLength(password, "utf8") > MAX_BCRYPT_PASSWORD_BYTES) {
    return false;
  }

  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}

/**
 * Validate the minimum user information required for JWT creation.
 */
function validateUserForToken(user) {
  if (!user || typeof user !== "object") {
    throw new TypeError("A valid user object is required.");
  }

  requireNonEmptyString(user.id, "User ID");

  if (!user.role || typeof user.role !== "object") {
    throw new TypeError("User role information is required.");
  }

  requireNonEmptyString(user.role.name, "User role name");

  return {
    id: user.id,
    role: user.role.name,
  };
}

/**
 * Create an authentication JWT.
 *
 * Existing token payload compatibility is preserved:
 * {
 *   sub: user.id,
 *   role: user.role.name
 * }
 */
export function signUser(user) {
  const safeUser = validateUserForToken(user);

  if (!config.jwtSecret || typeof config.jwtSecret !== "string") {
    throw new Error("JWT_SECRET is not configured correctly.");
  }

  if (!config.jwtExpiresIn) {
    throw new Error("JWT expiration configuration is missing.");
  }

  return jwt.sign(
    {
      sub: safeUser.id,
      role: safeUser.role,
    },
    config.jwtSecret,
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: config.jwtExpiresIn,
    }
  );
}

/**
 * Verify an authentication JWT.
 *
 * This function intentionally throws JWT verification errors.
 * Existing authentication middleware can distinguish:
 * - TokenExpiredError
 * - JsonWebTokenError
 * - NotBeforeError
 */
export function verifyToken(token) {
  requireNonEmptyString(token, "Authentication token");

  if (!config.jwtSecret || typeof config.jwtSecret !== "string") {
    throw new Error("JWT_SECRET is not configured correctly.");
  }

  return jwt.verify(token, config.jwtSecret, {
    algorithms: [JWT_ALGORITHM],
  });
}

/**
 * Extract a Bearer token from an Authorization header.
 *
 * Returns null if the header is missing or malformed.
 */
export function extractBearerToken(authorizationHeader) {
  if (
    typeof authorizationHeader !== "string" ||
    authorizationHeader.length === 0
  ) {
    return null;
  }

  const parts = authorizationHeader.trim().split(/\s+/);

  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;

  if (scheme.toLowerCase() !== "bearer" || token.length === 0) {
    return null;
  }

  return token;
}

/**
 * Generate a token and its database-safe representation.
 *
 * Store tokenHash in the database.
 * Return rawToken to the user only when issuing the token.
 */
export function createTokenPair(bytes = DEFAULT_TOKEN_BYTES) {
  const rawToken = randomToken(bytes);

  return {
    rawToken,
    tokenHash: hashToken(rawToken),
    tokenHint: rawToken.slice(-8),
  };
}

/**
 * Check whether a supplied raw token matches a stored hash.
 */
export function verifyHashedToken(rawToken, storedHash) {
  if (
    typeof rawToken !== "string" ||
    typeof storedHash !== "string" ||
    rawToken.length === 0 ||
    storedHash.length !== 64
  ) {
    return false;
  }

  const calculatedHash = hashToken(rawToken);

  return safeEqual(calculatedHash, storedHash);
}

/**
 * Generate a secure random identifier.
 *
 * Useful for non-secret correlation identifiers.
 * Do not use this as a replacement for database UUIDs.
 */
export function randomIdentifier(bytes = 16) {
  if (!Number.isInteger(bytes) || bytes < 8 || bytes > 64) {
    throw new RangeError("Identifier byte length must be between 8 and 64.");
  }

  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Generate a SHA-256 checksum for a buffer or string.
 *
 * Useful for file-integrity and duplicate-file checks.
 */
export function sha256(value) {
  if (!Buffer.isBuffer(value) && typeof value !== "string") {
    throw new TypeError("SHA-256 input must be a Buffer or string.");
  }

  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

/**
 * Generate a cryptographically secure opaque identifier.
 *
 * Intended for internal security-related operations.
 */
export function generateOpaqueId() {
  return crypto.randomUUID();
}

/**
 * Check whether a string is a valid hexadecimal SHA-256 digest.
 */
export function isSha256Hash(value) {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{64}$/i.test(value)
  );
}

/**
 * Expose security constants for tests and validation modules.
 */
export const SECURITY_CONSTANTS = Object.freeze({
  BCRYPT_ROUNDS,
  MAX_BCRYPT_PASSWORD_BYTES,
  DEFAULT_TOKEN_BYTES,
  MIN_TOKEN_BYTES,
  MAX_TOKEN_BYTES,
  JWT_ALGORITHM,
});
