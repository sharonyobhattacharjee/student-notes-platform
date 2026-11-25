/**
 * Central Express error handler.
 *
 * All unexpected route/service errors should eventually reach
 * this middleware through next(error).
 *
 * In production, internal error details are never exposed to
 * the client.
 */

export function notFoundMiddleware(req, res) {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
}

export function errorMiddleware(error, req, res, next) {
  const statusCode =
    Number.isInteger(error?.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode < 600
      ? error.statusCode
      : 500;

  const isProduction =
    process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.error(error);
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500 && isProduction
        ? "Internal server error"
        : error?.message || "Internal server error",

    ...(error?.code
      ? { code: error.code }
      : {}),

    ...(isProduction
      ? {}
      : {
          ...(error?.stack
            ? { stack: error.stack }
            : {}),
        }),
  });
}
