
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "node:fs/promises";

import { config } from "./config.js";
import { prisma } from "./prisma.js";

import authRoutes from "../routes/authRoutes.js";
import noteRoutes from "../routes/noteRoutes.js";
import adminRoutes from "../routes/adminRoutes.js";
import metaRoutes from "../routes/metaRoutes.js";

// --------------------------------------------------
// INITIALIZATION
// --------------------------------------------------

await fs.mkdir(config.storageDir, { recursive: true });

const app = express();

app.disable("x-powered-by");

if (config.security?.trustProxy || config.trustProxy) {
  app.set("trust proxy", 1);
}

// --------------------------------------------------
// SECURITY HEADERS
// --------------------------------------------------

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    },
    hsts: config.isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        }
      : false
  })
);

// --------------------------------------------------
// CORS
// --------------------------------------------------

const configuredOrigins =
  config.corsOrigins?.length
    ? config.corsOrigins
    : [config.frontendUrl];

const allowedOrigins = new Set(
  configuredOrigins
    .filter(Boolean)
    .map(origin => {
      try {
        return new URL(origin).origin;
      } catch {
        return origin;
      }
    })
);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header include server-to-server calls.
      if (!origin) {
        return callback(null, true);
      }

      let normalizedOrigin;

      try {
        normalizedOrigin = new URL(origin).origin;
      } catch {
        return callback(new Error("Invalid request origin"));
      }

      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400
  })
);

// --------------------------------------------------
// REQUEST PARSING
// --------------------------------------------------

app.use(
  express.json({
    limit: config.jsonBodyLimit || "1mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: config.jsonBodyLimit || "1mb"
  })
);

// --------------------------------------------------
// RATE LIMITING
// --------------------------------------------------

const rateLimitWindow =
  config.rateLimitWindowMs || 15 * 60 * 1000;

const apiLimiter = rateLimit({
  windowMs: rateLimitWindow,
  max: config.rateLimitMax || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later."
  },
  skip: req => req.path === "/health"
});

const authLimiter = rateLimit({
  windowMs: rateLimitWindow,
  max: config.rateLimitAuthMax || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication requests. Please try again later."
  }
});

app.use("/api", apiLimiter);

// Apply stricter limits to authentication endpoints.
app.use("/api/auth", authLimiter);

// --------------------------------------------------
// HEALTH CHECK
// GET /api/health
// --------------------------------------------------

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      service: "note-sharing-platform-api",
      database: "connected"
    });
  } catch (error) {
    console.error("Health check database failure:", error.message);

    res.status(503).json({
      status: "unavailable",
      service: "note-sharing-platform-api",
      database: "disconnected"
    });
  }
});

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/meta", metaRoutes);

// --------------------------------------------------
// API NOT FOUND
// --------------------------------------------------

app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API endpoint not found"
  });
});

// --------------------------------------------------
// CENTRAL ERROR HANDLER
// --------------------------------------------------

/*app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Zod validation errors
  if (err.name === "ZodError") {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.issues?.map(issue => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  // Multer upload errors
  if (err.name === "MulterError") {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;

    return res.status(status).json({
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "Uploaded file exceeds the permitted size"
          : "File upload failed"
    });
  }

  // Prisma errors
  if (err.code === "P2002") {
    return res.status(409).json({
      message: "A record with this information already exists"
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      message: "Requested record was not found"
    });
  }

  if (err.code === "P2003") {
    return res.status(400).json({
      message: "This operation conflicts with related records"
    });
  }

  const status =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status <= 599
      ? err.status
      : 500;

  if (status >= 500) {
    console.error("API error:", err);
  }

  const message =
    status >= 500 && config.isProduction
      ? "Internal server error"
      : err.message || "Internal server error";

  res.status(status).json({
    message
  });
});*/
// --------------------------------------------------
// CENTRAL ERROR HANDLER
// --------------------------------------------------

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Zod validation errors
  if (err.name === "ZodError") {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.issues?.map(issue => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  // Multer upload errors
  if (err.name === "MulterError") {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;

    return res.status(status).json({
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "Uploaded file exceeds the permitted size"
          : "File upload failed"
    });
  }

  // Prisma errors
  if (err.code === "P2002") {
    return res.status(409).json({
      message: "A record with this information already exists"
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      message: "Requested record was not found"
    });
  }

  if (err.code === "P2003") {
    return res.status(400).json({
      message: "This operation conflicts with related records"
    });
  }

  // IMPORTANT:
  // Validation errors use statusCode, while some other errors
  // may use status.
  const status =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : Number.isInteger(err.status) &&
        err.status >= 400 &&
        err.status <= 599
        ? err.status
        : 500;

  if (status >= 500) {
    console.error("API error:", err);
  }

  const message =
    status >= 500 && config.isProduction
      ? "Internal server error"
      : err.message || "Internal server error";

  res.status(status).json({
    message
  });
});

// --------------------------------------------------
// SERVER STARTUP
// Vercel imports the app without starting a local server.
// --------------------------------------------------

export default app;

if (!process.env.VERCEL) {
  const server = app.listen(config.port, () => {
    console.log(
      `API listening on http://localhost:${config.port}`
    );
  });

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`${signal} received. Shutting down API...`);

    server.close(async error => {
      if (error) {
        console.error("Server shutdown error:", error);
      }

      try {
        await prisma.$disconnect();
        console.log("Database connection closed.");
      } catch (disconnectError) {
        console.error(
          "Database disconnect error:",
          disconnectError
        );
      }

      process.exit(error ? 1 : 0);
    });

    setTimeout(() => {
      console.error("Forced shutdown after timeout.");
      process.exit(1);
    }, 10000).unref();
  }

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}
