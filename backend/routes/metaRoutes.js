
import express from "express";

import { prisma } from "../src/prisma.js";
import { optionalAuth } from "../src/auth.js";

const r = express.Router();

// Metadata is not sensitive. Guests can retrieve it too.
r.use(optionalAuth);

// GET /api/meta
r.get("/", async (req, res, next) => {
  try {
    const [subjects, courses, categories] = await Promise.all([
      prisma.subject.findMany({
        orderBy: { name: "asc" }
      }),
      prisma.course.findMany({
        orderBy: { name: "asc" }
      }),
      prisma.category.findMany({
        orderBy: { name: "asc" }
      })
    ]);

    res.set("Cache-Control", "public, max-age=60");

    res.status(200).json({
      subjects,
      courses,
      categories
    });
  } catch (error) {
    next(error);
  }
});

export default r;
