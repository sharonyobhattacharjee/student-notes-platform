
import { PrismaClient } from "@prisma/client";

/**
 * Prisma database client.
 *
 * Designed for:
 * - Express applications
 * - Vercel serverless deployments
 * - Local development with automatic reloads
 * - PostgreSQL databases hosted on Neon
 *
 * A shared Prisma Client instance helps avoid unnecessary
 * database connections caused by repeated module initialization.
 */

const GLOBAL_PRISMA_KEY = "__STUDENT_NOTES_PLATFORM_PRISMA__";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Configure Prisma logging.
 *
 * Production:
 * - Errors only.
 *
 * Development:
 * - Warnings and errors.
 *
 * Query logging is deliberately disabled by default because
 * SQL logs can expose sensitive application information.
 */
const prismaLogLevels = isProduction
  ? ["error"]
  : ["warn", "error"];

/**
 * Reuse the existing Prisma Client instance if one exists.
 */
function createPrismaClient() {
  return new PrismaClient({
    log: prismaLogLevels,
    errorFormat: isProduction ? "minimal" : "pretty",
  });
}

/**
 * Store the client on globalThis.
 *
 * This prevents multiple clients from being created when
 * modules are reloaded or reused by the runtime.
 */
const prismaGlobal = globalThis;

if (!prismaGlobal[GLOBAL_PRISMA_KEY]) {
  prismaGlobal[GLOBAL_PRISMA_KEY] = createPrismaClient();
}

/**
 * Shared Prisma Client.
 *
 * Existing imports remain compatible:
 *
 * import { prisma } from "./prisma.js";
 */
export const prisma = prismaGlobal[GLOBAL_PRISMA_KEY];

/**
 * Check whether the database is reachable.
 *
 * Useful for health checks and deployment diagnostics.
 */
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      connected: true,
      message: "Database connection successful",
    };
  } catch (error) {
    return {
      connected: false,
      message: "Database connection failed",
      error: isProduction
        ? undefined
        : error.message,
    };
  }
}

/**
 * Explicitly connect to the database.
 *
 * Normally Prisma connects lazily when the first query runs.
 * This helper is available for controlled startup checks.
 */
export async function connectDatabase() {
  await prisma.$connect();

  return true;
}

/**
 * Disconnect Prisma.
 *
 * Use this for local scripts and controlled shutdowns.
 * Avoid calling it after every Vercel request.
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();

  return true;
}

/**
 * Execute a transaction with the supplied callback.
 *
 * Example:
 *
 * await withTransaction(async (tx) => {
 *   await tx.note.create({ data: noteData });
 *   await tx.noteFile.create({ data: fileData });
 * });
 *
 * Transaction options can be supplied as the second argument.
 */
export async function withTransaction(callback, options = {}) {
  if (typeof callback !== "function") {
    throw new TypeError(
      "withTransaction requires a callback function."
    );
  }

  return prisma.$transaction(callback, {
    maxWait: options.maxWait ?? 5000,
    timeout: options.timeout ?? 10000,
    ...options,
  });
}

/**
 * Execute multiple independent Prisma operations in one batch.
 *
 * Example:
 *
 * await executeBatch([
 *   prisma.note.count(),
 *   prisma.user.count(),
 * ]);
 */
export async function executeBatch(operations) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new TypeError(
      "executeBatch requires a non-empty array of Prisma operations."
    );
  }

  return prisma.$transaction(operations);
}

/**
 * Export the current database configuration status.
 *
 * This does not expose the DATABASE_URL or database credentials.
 */
export function getDatabaseConfigurationStatus() {
  return {
    configured: Boolean(process.env.DATABASE_URL),
    environment: process.env.NODE_ENV || "development",
    provider: "postgresql",
    client: "Prisma",
  };
}
