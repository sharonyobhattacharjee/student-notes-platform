
import { createAuditLog } from "../models/auditModel.js";

/**
 * Central audit logging service.
 *
 * Audit logs should record important platform activity without
 * storing passwords, authentication tokens, private file contents
 * or other sensitive information.
 *
 * Existing API remains compatible:
 *
 * await audit(userId, action, entityType, entityId, metadata);
 */

const MAX_METADATA_DEPTH = 6;
const MAX_METADATA_STRING_LENGTH = 2000;
const MAX_METADATA_ARRAY_LENGTH = 100;
const MAX_METADATA_KEYS = 100;
const MAX_METADATA_SIZE_BYTES = 16000;

const REDACTED_VALUE = "[REDACTED]";

const SENSITIVE_KEY_PATTERN =
  /password|passwordhash|token|secret|authorization|cookie|credential|privatekey|apikey|accesskey|refreshkey|sessionid|otp|verificationcode/i;

/**
 * Convert arbitrary values into safe JSON-compatible values.
 *
 * This function:
 * - Removes sensitive fields.
 * - Handles circular references.
 * - Handles BigInt values.
 * - Limits nesting depth.
 * - Limits string and array sizes.
 * - Removes undefined values.
 */
function sanitizeValue(value, depth = 0, visited = new WeakSet()) {
  if (depth > MAX_METADATA_DEPTH) {
    return "[MAX_DEPTH_REACHED]";
  }

  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return Number.isFinite(value) || typeof value !== "number"
      ? value
      : null;
  }

  if (typeof value === "string") {
    return value.slice(0, MAX_METADATA_STRING_LENGTH);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "undefined") {
    return null;
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return "[BUFFER_OMITTED]";
  }

  if (Array.isArray(value)) {
    if (visited.has(value)) {
      return "[CIRCULAR_REFERENCE]";
    }

    visited.add(value);

    const result = value
      .slice(0, MAX_METADATA_ARRAY_LENGTH)
      .map((item) => sanitizeValue(item, depth + 1, visited));

    visited.delete(value);

    return result;
  }

  if (typeof value === "object") {
    if (visited.has(value)) {
      return "[CIRCULAR_REFERENCE]";
    }

    visited.add(value);

    const result = {};

    const entries = Object.entries(value).slice(0, MAX_METADATA_KEYS);

    for (const [key, nestedValue] of entries) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        result[key] = REDACTED_VALUE;
        continue;
      }

      const sanitized = sanitizeValue(
        nestedValue,
        depth + 1,
        visited
      );

      if (sanitized !== null || nestedValue === null) {
        result[key] = sanitized;
      }
    }

    visited.delete(value);

    return result;
  }

  return null;
}

/**
 * Ensure metadata can be safely stored in a Prisma JSON column.
 */
function prepareMetadata(metadata) {
  if (
    metadata === null ||
    metadata === undefined
  ) {
    return {};
  }

  if (
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return {
      value: sanitizeValue(metadata),
    };
  }

  let sanitized = sanitizeValue(metadata);

  if (
    !sanitized ||
    typeof sanitized !== "object" ||
    Array.isArray(sanitized)
  ) {
    sanitized = {};
  }

  let serialized;

  try {
    serialized = JSON.stringify(sanitized);
  } catch {
    return {
      warning: "Metadata could not be serialized",
    };
  }

  if (
    Buffer.byteLength(serialized, "utf8") >
    MAX_METADATA_SIZE_BYTES
  ) {
    return {
      warning: "Metadata exceeded the audit size limit",
      truncated: true,
    };
  }

  return sanitized;
}

/**
 * Validate and normalize an audit event.
 */
function normalizeAuditEvent(
  userId,
  action,
  entityType,
  entityId,
  metadata
) {
  if (
    userId !== null &&
    userId !== undefined &&
    typeof userId !== "string"
  ) {
    throw new TypeError("Audit userId must be a string or null.");
  }

  if (
    typeof action !== "string" ||
    action.trim().length === 0
  ) {
    throw new TypeError("Audit action is required.");
  }

  if (
    typeof entityType !== "string" ||
    entityType.trim().length === 0
  ) {
    throw new TypeError("Audit entityType is required.");
  }

  if (
    entityId !== null &&
    entityId !== undefined &&
    typeof entityId !== "string"
  ) {
    throw new TypeError("Audit entityId must be a string or null.");
  }

  return {
    userId: userId ?? null,
    action: action.trim().slice(0, 100),
    entityType: entityType.trim().slice(0, 100),
    entityId: entityId ?? null,
    metadata: prepareMetadata(metadata),
  };
}

/**
 * Internal audit persistence function.
 *
 * The database schema currently defines:
 * - userId
 * - action
 * - entityType
 * - entityId
 * - metadata
 * - createdAt
 *
 * This implementation uses only those existing fields.
 */
async function persistAuditEvent(event) {
  return createAuditLog({
    userId: event.userId,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    metadata: event.metadata,
  });
}

/**
 * Record an audit event.
 *
 * This function intentionally does not interrupt the primary
 * application operation if audit persistence fails.
 *
 * This preserves the behavior of your existing implementation.
 */
export async function audit(
  userId,
  action,
  entityType,
  entityId = null,
  metadata = {}
) {
  try {
    const event = normalizeAuditEvent(
      userId,
      action,
      entityType,
      entityId,
      metadata
    );

    return await persistAuditEvent(event);
  } catch (error) {
    console.error("Audit log failed:", error.message);
    return null;
  }
}

/**
 * Strict audit logging.
 *
 * Use this only when the caller must know that the audit record
 * was persisted successfully.
 *
 * Unlike audit(), this function throws on failure.
 */
export async function auditStrict(
  userId,
  action,
  entityType,
  entityId = null,
  metadata = {}
) {
  const event = normalizeAuditEvent(
    userId,
    action,
    entityType,
    entityId,
    metadata
  );

  return persistAuditEvent(event);
}

/**
 * Record an authentication event.
 */
export async function auditAuthentication(
  userId,
  action,
  metadata = {}
) {
  return audit(
    userId,
    action,
    "AUTHENTICATION",
    userId ?? null,
    metadata
  );
}

/**
 * Record a note-related event.
 */
export async function auditNote(
  userId,
  action,
  noteId,
  metadata = {}
) {
  return audit(
    userId,
    action,
    "NOTE",
    noteId,
    metadata
  );
}

/**
 * Record an administrator action.
 */
export async function auditAdminAction(
  adminId,
  action,
  entityType,
  entityId = null,
  metadata = {}
) {
  return audit(
    adminId,
    action,
    entityType,
    entityId,
    {
      ...metadata,
      administratorAction: true,
    }
  );
}

/**
 * Record a moderation event.
 */
export async function auditModeration(
  adminId,
  action,
  entityType,
  entityId,
  metadata = {}
) {
  return audit(
    adminId,
    action,
    entityType,
    entityId,
    {
      ...metadata,
      moderationAction: true,
    }
  );
}

/**
 * Record a review-related event.
 */
export async function auditReview(
  userId,
  action,
  reviewId,
  metadata = {}
) {
  return audit(
    userId,
    action,
    "REVIEW",
    reviewId,
    metadata
  );
}

/**
 * Record a report-related event.
 */
export async function auditReport(
  userId,
  action,
  reportId,
  metadata = {}
) {
  return audit(
    userId,
    action,
    "REPORT",
    reportId,
    metadata
  );
}

/**
 * Record a file-related event.
 */
export async function auditFile(
  userId,
  action,
  fileId,
  metadata = {}
) {
  return audit(
    userId,
    action,
    "NOTE_FILE",
    fileId,
    metadata
  );
}

/**
 * Record a sharing-related event.
 */
export async function auditSharing(
  userId,
  action,
  shareId,
  metadata = {}
) {
  return audit(
    userId,
    action,
    "NOTE_SHARING",
    shareId,
    metadata
  );
}

/**
 * Record a download event.
 */
export async function auditDownload(
  userId,
  noteId,
  metadata = {}
) {
  return audit(
    userId,
    "NOTE_DOWNLOADED",
    "NOTE",
    noteId,
    metadata
  );
}

/**
 * Record a user-management event.
 */
export async function auditUserManagement(
  adminId,
  action,
  targetUserId,
  metadata = {}
) {
  return audit(
    adminId,
    action,
    "USER",
    targetUserId,
    {
      ...metadata,
      administratorAction: true,
    }
  );
}

/**
 * Export limits for tests.
 */
export const AUDIT_LIMITS = Object.freeze({
  maxMetadataDepth: MAX_METADATA_DEPTH,
  maxMetadataStringLength: MAX_METADATA_STRING_LENGTH,
  maxMetadataArrayLength: MAX_METADATA_ARRAY_LENGTH,
  maxMetadataKeys: MAX_METADATA_KEYS,
  maxMetadataSizeBytes: MAX_METADATA_SIZE_BYTES,
});
