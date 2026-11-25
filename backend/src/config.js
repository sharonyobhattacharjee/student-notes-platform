
import dotenv from "dotenv";
import path from "node:path";
import process from "node:process";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

/**
 * Application configuration
 *
 * All environment variables are read and validated here.
 * Other backend modules should import config instead of
 * reading process.env independently.
 */

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "DATABASE_URL",
  "JWT_SECRET",
];

for (const key of REQUIRED_ENVIRONMENT_VARIABLES) {
  if (
    typeof process.env[key] !== "string" ||
    process.env[key].trim().length === 0
  ) {
    throw new Error(`${key} is required`);
  }
}

const NODE_ENV = process.env.NODE_ENV || "development";

const IS_PRODUCTION = NODE_ENV === "production";

const DEFAULT_FRONTEND_URL = "http://localhost:5173";

const DEFAULT_APP_BASE_URL =
  process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;

/**
 * Parse and validate numeric environment variables.
 */
function getNumber(name, defaultValue, options = {}) {
  const {
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    integer = true,
  } = options;

  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue.trim() === "") {
    return defaultValue;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a valid number`);
  }

  if (integer && !Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }

  if (value < min || value > max) {
    throw new Error(
      `${name} must be between ${min} and ${max}`
    );
  }

  return value;
}

/**
 * Parse boolean environment variables.
 */
function getBoolean(name, defaultValue = false) {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue.trim() === "") {
    return defaultValue;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`${name} must be true or false`);
}

/**
 * Parse comma-separated environment values.
 */
function getList(name, defaultValues = []) {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue.trim() === "") {
    return [...defaultValues];
  }

  return [
    ...new Set(
      rawValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

/**
 * Validate an HTTP or HTTPS URL.
 */
function normalizeHttpUrl(value, variableName) {
  try {
    const parsed = new URL(value);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Unsupported URL protocol");
    }

    return parsed.origin;
  } catch {
    throw new Error(`${variableName} must be a valid HTTP or HTTPS URL`);
  }
}

/**
 * Application URLs.
 */
const frontendUrl = normalizeHttpUrl(
  process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL,
  "FRONTEND_URL"
);

const appBaseUrl = normalizeHttpUrl(
  process.env.APP_BASE_URL || frontendUrl,
  "APP_BASE_URL"
);

/**
 * CORS origins.
 *
 * FRONTEND_URL remains supported for existing deployments.
 * Additional origins can be configured through CORS_ORIGINS.
 */
const corsOrigins = [
  ...new Set([
    frontendUrl,
    ...getList("CORS_ORIGINS").map((origin) =>
      normalizeHttpUrl(origin, "CORS_ORIGINS")
    ),
  ]),
];

/**
 * File upload configuration.
 */
const maxFileSizeMb = getNumber(
  "MAX_FILE_SIZE_MB",
  20,
  {
    min: 1,
    max: 100,
  }
);

const maxFileSize = maxFileSizeMb * 1024 * 1024;

const allowedFileExtensions = Object.freeze([
  ".pdf",
  ".docx",
  ".pptx",
]);

const allowedMimeTypes = Object.freeze([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

/**
 * Storage configuration.
 *
 * IMPORTANT:
 * Vercel's /tmp directory is temporary.
 * It must not be treated as permanent production storage.
 *
 * A durable object-storage integration will be needed for
 * reliable production file retention.
 */
const storageDir = path.resolve(
  process.env.STORAGE_DIR ||
    (process.env.VERCEL
      ? "/tmp/student-notes-platform/notes"
      : "./storage/notes")
);

/**
 * Authentication configuration.
 */
const jwtSecret = process.env.JWT_SECRET;

const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

const sessionIdleTimeoutMs = getNumber(
  "SESSION_IDLE_TIMEOUT_MINUTES",
  30,
  {
    min: 1,
    max: 1440,
  }
) * 60 * 1000;

const maxFailedLoginAttempts = getNumber(
  "MAX_FAILED_LOGIN_ATTEMPTS",
  5,
  {
    min: 1,
    max: 20,
  }
);

const loginLockoutMinutes = getNumber(
  "LOGIN_LOCKOUT_MINUTES",
  15,
  {
    min: 1,
    max: 1440,
  }
) * 60 * 1000;

/**
 * Rate-limiting configuration.
 */
const rateLimitWindowMs = getNumber(
  "RATE_LIMIT_WINDOW_MINUTES",
  15,
  {
    min: 1,
    max: 1440,
  }
) * 60 * 1000;

const rateLimitMaxRequests = getNumber(
  "RATE_LIMIT_MAX_REQUESTS",
  100,
  {
    min: 1,
    max: 10000,
  }
);

const authRateLimitMaxRequests = getNumber(
  "AUTH_RATE_LIMIT_MAX_REQUESTS",
  100,
  {
    min: 1,
    max: 1000,
  }
);

/**
 * Request and application limits.
 */
const jsonBodyLimit = process.env.JSON_BODY_LIMIT || "1mb";

const urlEncodedBodyLimit =
  process.env.URL_ENCODED_BODY_LIMIT || "1mb";

const requestTimeoutMs = getNumber(
  "REQUEST_TIMEOUT_MS",
  30000,
  {
    min: 1000,
    max: 300000,
  }
);

/**
 * Sharing configuration.
 */
const defaultShareLinkExpiryHours = getNumber(
  "DEFAULT_SHARE_LINK_EXPIRY_HOURS",
  168,
  {
    min: 1,
    max: 8760,
  }
);

const maxShareLinkExpiryDays = getNumber(
  "MAX_SHARE_LINK_EXPIRY_DAYS",
  365,
  {
    min: 1,
    max: 3650,
  }
);

/**
 * Review and report limits.
 */
const maxReviewCommentLength = getNumber(
  "MAX_REVIEW_COMMENT_LENGTH",
  1000,
  {
    min: 1,
    max: 5000,
  }
);

const maxReportReasonLength = getNumber(
  "MAX_REPORT_REASON_LENGTH",
  2000,
  {
    min: 10,
    max: 10000,
  }
);

/**
 * Pagination limits.
 */
const defaultPageSize = getNumber(
  "DEFAULT_PAGE_SIZE",
  20,
  {
    min: 1,
    max: 100,
  }
);

const maxPageSize = getNumber(
  "MAX_PAGE_SIZE",
  100,
  {
    min: 1,
    max: 500,
  }
);

/**
 * Email configuration.
 *
 * Email functionality remains optional until an email provider
 * is configured.
 */
const email = Object.freeze({
  enabled: getBoolean("EMAIL_ENABLED", false),
  host: process.env.SMTP_HOST || null,
  port: getNumber("SMTP_PORT", 587, {
    min: 1,
    max: 65535,
  }),
  secure: getBoolean("SMTP_SECURE", false),
  user: process.env.SMTP_USER || null,
  password: process.env.SMTP_PASSWORD || null,
  from: process.env.EMAIL_FROM || null,
});

/**
 * Validate required email configuration if email is enabled.
 */
if (email.enabled) {
  const missingEmailSettings = [];

  if (!email.host) missingEmailSettings.push("SMTP_HOST");
  if (!email.user) missingEmailSettings.push("SMTP_USER");
  if (!email.password) missingEmailSettings.push("SMTP_PASSWORD");
  if (!email.from) missingEmailSettings.push("EMAIL_FROM");

  if (missingEmailSettings.length > 0) {
    throw new Error(
      `Email is enabled but these settings are missing: ${missingEmailSettings.join(", ")}`
    );
  }
}

/**
 * Security headers and browser protections.
 */
const security = Object.freeze({
  enableHelmet: getBoolean("ENABLE_HELMET", true),
  enableHsts: getBoolean("ENABLE_HSTS", IS_PRODUCTION),
  trustProxy: getBoolean("TRUST_PROXY", IS_PRODUCTION),
  allowCredentials: true,
  sameSiteCookie: process.env.SAME_SITE_COOKIE || "lax",
  secureCookies: getBoolean("SECURE_COOKIES", IS_PRODUCTION),
});

/**
 * Validate cookie configuration.
 */
if (!["strict", "lax", "none"].includes(security.sameSiteCookie)) {
  throw new Error(
    "SAME_SITE_COOKIE must be strict, lax or none"
  );
}

if (
  security.sameSiteCookie === "none" &&
  !security.secureCookies
) {
  throw new Error(
    "SameSite=None cookies require SECURE_COOKIES=true"
  );
}

/**
 * Database configuration.
 */
const database = Object.freeze({
  url: process.env.DATABASE_URL,
  connectionLimit: getNumber(
    "DATABASE_CONNECTION_LIMIT",
    10,
    {
      min: 1,
      max: 100,
    }
  ),
});

/**
 * Logging configuration.
 */
const logging = Object.freeze({
  level: process.env.LOG_LEVEL || (
    IS_PRODUCTION ? "info" : "debug"
  ),
  enableRequestLogging: getBoolean(
    "ENABLE_REQUEST_LOGGING",
    true
  ),
});

/**
 * Final application configuration.
 *
 * Existing property names are preserved:
 * port, frontendUrl, jwtSecret, jwtExpiresIn,
 * appBaseUrl, maxFileSize and storageDir.
 */
export const config = Object.freeze({
  nodeEnv: NODE_ENV,
  isProduction: IS_PRODUCTION,
  isDevelopment: NODE_ENV === "development",
  isTest: NODE_ENV === "test",

  port: getNumber("PORT", 3020, {
    min: 1,
    max: 65535,
  }),

  frontendUrl,
  appBaseUrl,
  corsOrigins,

  jwtSecret,
  jwtExpiresIn,
  jwtAlgorithm: "HS256",

  sessionIdleTimeoutMs,
  maxFailedLoginAttempts,
  loginLockoutMs: loginLockoutMinutes,

  maxFileSize,
  maxFileSizeMb,
  storageDir,
  allowedFileExtensions,
  allowedMimeTypes,

  rateLimitWindowMs,
  rateLimitMaxRequests,
  authRateLimitMaxRequests,

  jsonBodyLimit,
  urlEncodedBodyLimit,
  requestTimeoutMs,

  defaultShareLinkExpiryHours,
  maxShareLinkExpiryDays,

  maxReviewCommentLength,
  maxReportReasonLength,

  defaultPageSize,
  maxPageSize,

  email,
  security,
  database,
  logging,
});

/**
 * Export selected constants for testing and other modules.
 */
export const CONFIG_CONSTANTS = Object.freeze({
  DEFAULT_FRONTEND_URL,
  DEFAULT_APP_BASE_URL,
  DEFAULT_TOKEN_EXPIRY: "30m",
  DEFAULT_SESSION_IDLE_TIMEOUT_MINUTES: 30,
  DEFAULT_MAX_FAILED_LOGIN_ATTEMPTS: 5,
  DEFAULT_LOGIN_LOCKOUT_MINUTES: 15,
  DEFAULT_MAX_FILE_SIZE_MB: 20,
});
