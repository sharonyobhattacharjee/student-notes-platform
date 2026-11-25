/**
 * Generic Zod validation middleware.
 *
 * Usage:
 *   router.post(
 *     "/example",
 *     validateBody(schema),
 *     handler
 *   );
 *
 * Validation errors are returned as HTTP 400 responses.
 */

function formatZodError(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function validate(schema, source) {
  if (!schema || typeof schema.safeParse !== "function") {
    throw new Error(
      `A valid Zod schema is required for ${source} validation`
    );
  }

  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodError(result.error),
      });
    }

    req[source] = result.data;
    return next();
  };
}

export function validateBody(schema) {
  return validate(schema, "body");
}

export function validateQuery(schema) {
  return validate(schema, "query");
}

export function validateParams(schema) {
  return validate(schema, "params");
}

export function validateRequest({
  body,
  query,
  params,
} = {}) {
  const middleware = [];

  if (body) {
    middleware.push(validateBody(body));
  }

  if (query) {
    middleware.push(validateQuery(query));
  }

  if (params) {
    middleware.push(validateParams(params));
  }

  return middleware;
}
