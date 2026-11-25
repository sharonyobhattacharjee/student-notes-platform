import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { z } from "zod";

import { prisma } from "../src/prisma.js";

import {
  optionalAuth,
  requireAuth,
  canAccessPrivateShare,
} from "../src/auth.js";

import { config } from "../src/config.js";
import { validateUploadedFile } from "../src/fileValidation.js";
import { randomToken, hashToken } from "../src/security.js";
import { audit } from "../src/audit.js";

import { uploadSingleNote } from "../middleware/uploadMiddleware.js";

import { createReport } from "../models/reportModel.js";

import {
  findUserReviewForNote,
  createReview,
  updateReview,
  deleteReview,
} from "../models/reviewModel.js";

import {
  findShareLinkByTokenHash,
} from "../models/shareModel.js";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, STORAGE_BUCKET } from "../src/objectStorage.js";

const r = express.Router();

const MAX_PAGE_SIZE = config.maxPageSize || 50;
const DEFAULT_PAGE_SIZE = config.defaultPageSize || 12;

const VISIBILITIES = ["PUBLIC", "LINK_ONLY", "PRIVATE"];

/**
 * Parse optional multipart form values.
 */
function optionalNumber(value) {
  if (value === "" || value === undefined || value === null) {
    return undefined;
  }

  return value;
}

function parseBoolean(value) {
  if (value === true || value === "true" || value === "1" || value === 1) {
    return true;
  }

  if (value === false || value === "false" || value === "0" || value === 0) {
    return false;
  }

  return value;
}

/**
 * Note input validation.
 */
const noteInput = z.object({
  title: z.string().trim().min(1).max(200),

  subjectId: z.coerce.number().int().positive(),

  courseId: z.preprocess(
    optionalNumber,
    z.union([
      z.coerce.number().int().positive(),
      z.null(),
    ]).optional()
  ),

  categoryId: z.preprocess(
    optionalNumber,
    z.union([
      z.coerce.number().int().positive(),
      z.null(),
    ]).optional()
  ),

  semester: z.coerce.number().int().min(1).max(12),

  topic: z.string().trim().max(200).optional(),

  description: z.string().trim().max(2000).optional(),

  visibility: z.enum(VISIBILITIES),

  rightsConfirmed: z.preprocess(
    parseBoolean,
    z.boolean()
  ),
});

const noteUpdateSchema = noteInput
  .partial()
  .omit({ rightsConfirmed: true });

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),

  comment: z.string().trim().max(1000).optional(),
});

const reportSchema = z.object({
  reason: z.string().trim().min(5).max(500),
  noteId: z.string().optional(),
  reviewId: z.string().uuid().optional(),
});

const shareLinkSchema = z.object({
  expiresInHours: z.preprocess(
    value =>
      value === "" ||
      value === undefined ||
      value === null
        ? null
        : value,

    z.union([
      z.coerce.number().int().min(1).max(8760),
      z.null(),
    ]).optional()
  ),
});

const shareUserSchema = z.object({
  email: z.string().trim().email().max(254),
});

/**
 * Standard note relation selection.
 *
 * Do not expose password hashes, token hashes,
 * or internal storage paths through note responses.
 */
const noteRelations = {
  uploader: {
    select: {
      id: true,
      name: true,
    },
  },

  subject: true,
  course: true,
  category: true,

  reviews: {
    where: {
      status: "ACTIVE",
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },

  file: {
    select: {
      id: true,
      originalName: true,
      fileType: true,
      fileSizeBytes: true,
      uploadedAt: true,
    },
  },
};

/**
 * Lightweight relations used by search.
 *
 * Search should not load complete review objects and users
 * for every candidate note.
 */
const searchNoteRelations = {
  subject: {
    select: {
      id: true,
      name: true,
    },
  },

  course: {
    select: {
      id: true,
      name: true,
    },
  },

  category: {
    select: {
      id: true,
      name: true,
    },
  },

  reviews: {
    where: {
      status: "ACTIVE",
    },

    select: {
      rating: true,
    },
  },
};

/**
 * Calculate average rating using active reviews only.
 */
function calculateAverageRating(reviews = []) {
  if (!reviews.length) {
    return 0;
  }

  const total = reviews.reduce(
    (sum, review) => sum + review.rating,
    0
  );

  return Number(
    (total / reviews.length).toFixed(2)
  );
}

/**
 * Remove internal fields before returning a note.
 */
function formatNote(note) {
  if (!note) {
    return null;
  }

  const reviews = note.reviews || [];

  return {
    id: note.id,
    title: note.title,
    topic: note.topic,
    description: note.description,
    semester: note.semester,
    visibility: note.visibility,
    status: note.status,
    downloadCount: note.downloadCount,
    uploadedAt: note.uploadedAt,
    updatedAt: note.updatedAt,

    uploader: note.uploader,

    subject: note.subject,
    course: note.course,
    category: note.category,

    file: note.file
      ? {
          originalName: note.file.originalName,
          fileType: note.file.fileType,
          fileSizeBytes: note.file.fileSizeBytes,
          uploadedAt: note.file.uploadedAt,
        }
      : null,

    reviews,

    averageRating: calculateAverageRating(reviews),
    ratingCount: reviews.length,
  };
}

/**
 * Convert a lightweight search result into
 * the data needed for relevance ranking.
 */
function getSearchText(note) {
  return {
    title: String(note.title || "").toLowerCase(),
    subject: String(note.subject?.name || "").toLowerCase(),
    topic: String(note.topic || "").toLowerCase(),
    course: String(note.course?.name || "").toLowerCase(),
    category: String(note.category?.name || "").toLowerCase(),
    description: String(note.description || "").toLowerCase(),
  };
}

/**
 * Calculate a deterministic relevance score.
 *
 * Higher score = stronger match.
 *
 * Exact match receives more weight than a contains match.
 */
function calculateRelevanceScore(note, query) {
  const normalizedQuery = String(query || "")
    .trim()
    .toLowerCase();

  if (!normalizedQuery) {
    return 0;
  }

  const fields = getSearchText(note);

  const weights = {
    title: {
      exact: 100,
      contains: 60,
    },

    subject: {
      exact: 50,
      contains: 30,
    },

    topic: {
      exact: 40,
      contains: 25,
    },

    course: {
      exact: 35,
      contains: 20,
    },

    category: {
      exact: 30,
      contains: 15,
    },

    description: {
      exact: 10,
      contains: 5,
    },
  };

  let score = 0;

  for (const [field, value] of Object.entries(fields)) {
    if (!value) {
      continue;
    }

    if (value === normalizedQuery) {
      score += weights[field].exact;
    } else if (value.includes(normalizedQuery)) {
      score += weights[field].contains;
    }
  }

  return score;
}

/**
 * Calculate rating information for a search result.
 */
function getRatingStats(note) {
  const ratings = note.reviews || [];

  if (!ratings.length) {
    return {
      averageRating: 0,
      ratingCount: 0,
    };
  }

  const total = ratings.reduce(
    (sum, review) => sum + review.rating,
    0
  );

  return {
    averageRating: total / ratings.length,
    ratingCount: ratings.length,
  };
}

/**
 * Compare two notes for relevance sorting.
 */
function compareByRelevance(query) {
  return (a, b) => {
    const scoreA = calculateRelevanceScore(a, query);
    const scoreB = calculateRelevanceScore(b, query);

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    const dateA = new Date(a.uploadedAt).getTime();
    const dateB = new Date(b.uploadedAt).getTime();

    if (dateA !== dateB) {
      return dateB - dateA;
    }

    return String(a.id).localeCompare(String(b.id));
  };
}

/**
 * Compare two notes for highest-rated sorting.
 */
function compareByHighestRated(a, b) {
  const ratingA = getRatingStats(a);
  const ratingB = getRatingStats(b);

  if (ratingA.averageRating !== ratingB.averageRating) {
    return ratingB.averageRating - ratingA.averageRating;
  }

  if (ratingA.ratingCount !== ratingB.ratingCount) {
    return ratingB.ratingCount - ratingA.ratingCount;
  }

  const dateA = new Date(a.uploadedAt).getTime();
  const dateB = new Date(b.uploadedAt).getTime();

  if (dateA !== dateB) {
    return dateB - dateA;
  }

  return String(a.id).localeCompare(String(b.id));
}

/**
 * Determine whether the authenticated or anonymous visitor
 * can access a note.
 *
 * A valid share-link token grants access to LINK_ONLY notes.
 * PRIVATE notes require ownership or an individual user share.
 */
async function hasNoteAccess(
  note,
  user,
  shareLinkValid = false
) {
  if (!note || note.status !== "ACTIVE") {
    return false;
  }

  if (user && note.uploaderId === user.id) {
    return true;
  }

  if (note.visibility === "PUBLIC") {
    return true;
  }

  if (
    note.visibility === "LINK_ONLY" &&
    shareLinkValid
  ) {
    return true;
  }

  if (
    note.visibility === "PRIVATE" &&
    user &&
    await canAccessPrivateShare(note.id, user.id)
  ) {
    return true;
  }

  return false;
}

/**
 * Validate a share link.
 *
 * The database stores only a hash of the raw token.
 */
async function findValidShareLink(noteId, rawToken) {
  if (
    typeof rawToken !== "string" ||
    rawToken.length < 16 ||
    rawToken.length > 512
  ) {
    return null;
  }

  const shareLink = await findShareLinkByTokenHash(
    hashToken(rawToken)
  );

  if (
    !shareLink ||
    shareLink.noteId !== noteId
  ) {
    return null;
  }

  if (!shareLink.isActive) {
    return null;
  }

  if (
    shareLink.expiresAt &&
    shareLink.expiresAt <= new Date()
  ) {
    return null;
  }

  return shareLink;
}

/**
 * Find a note and its permitted relations.
 */
async function findNoteDetails(noteId) {
  return prisma.note.findUnique({
    where: {
      id: noteId,
    },

    include: noteRelations,
  });
}

/**
 * Check note ownership.
 */
function isOwner(note, user) {
  return Boolean(
    note &&
    user &&
    note.uploaderId === user.id
  );
}

/**
 * Check owner or administrator access.
 */
function isOwnerOrAdmin(note, user) {
  return Boolean(
    note &&
    user &&
    (
      note.uploaderId === user.id ||
      user.role?.name === "ADMIN"
    )
  );
}

/**
 * Safely remove an uploaded temporary file.
 */
async function removeFile(filePath) {
  if (!filePath) {
    return;
  }

  await fs.unlink(filePath).catch(() => {});
}

/**
 * Resolve a stored file path.
 *
 * Prevents stored filenames from escaping
 * the configured storage directory.
 */
function resolveStoredPath(storedName) {
  if (
    typeof storedName !== "string" ||
    storedName.length === 0 ||
    path.basename(storedName) !== storedName
  ) {
    throw new Error("Invalid stored filename");
  }

  return path.join(
    config.storageDir,
    storedName
  );
}

/**
 * Handle Multer errors consistently.
 */
function handleUploadError(error, res) {
  if (!error) {
    return false;
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({
      message:
        `File exceeds the ${
          config.maxFileSize / 1024 / 1024
        } MB limit`,
    });

    return true;
  }

  if (
    error.code === "LIMIT_FILE_COUNT" ||
    error.code === "LIMIT_UNEXPECTED_FILE"
  ) {
    res.status(400).json({
      message:
        "Only one file can be uploaded at a time",
    });

    return true;
  }

  res.status(400).json({
    message: "File upload failed",
  });

  return true;
}

/**
 * Optional authentication.
 *
 * Public notes and valid share links can be accessed
 * without signing in. Protected operations explicitly
 * use requireAuth.
 */
r.use(optionalAuth);

/* ============================================================
   PUBLIC NOTE SEARCH
   GET /
   ============================================================ */

r.get("/", async (req, res, next) => {
  try {
    const pagination = paginationSchema.parse({
      page: req.query.page,
      limit: req.query.limit,
    });

    const page = pagination.page;
    const limit = pagination.limit;

    const searchQuery = String(
      req.query.q || ""
    ).trim();

    if (searchQuery.length > 200) {
      return res.status(400).json({
        message: "Search query is too long",
      });
    }

    /**
     * Only notes the current user is allowed to discover
     * are included in search results.
     *
     * Anonymous users:
     *   PUBLIC only
     *
     * Authenticated users:
     *   PUBLIC
     *   their own notes
     *   PRIVATE notes explicitly shared with them
     */
    const visibilityConditions = [
      {
        visibility: "PUBLIC",
      },
    ];

    if (req.user) {
      visibilityConditions.push(
        {
          uploaderId: req.user.id,
        },
        {
          visibility: "PRIVATE",
          shares: {
            some: {
              sharedWith: req.user.id,
            },
          },
        }
      );
    }

    const where = {
      status: "ACTIVE",

      OR: visibilityConditions,
    };

    const filters = [];

    /**
     * Keyword search.
     *
     * SRS:
     * Search across:
     * - title
     * - subject
     * - topic
     * - description
     *
     * We also search course/category because they are
     * meaningful catalogue metadata exposed by the platform.
     */
    if (searchQuery) {
      filters.push({
        OR: [
          {
            title: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },

          {
            topic: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },

          {
            description: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },

          {
            subject: {
              name: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
          },

          {
            course: {
              name: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
          },

          {
            category: {
              name: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
          },
        ],
      });
    }

    /**
     * Semester filter.
     */
    if (req.query.semester !== undefined) {
      const semester = Number(
        req.query.semester
      );

      if (
        !Number.isInteger(semester) ||
        semester < 1 ||
        semester > 12
      ) {
        return res.status(400).json({
          message: "Invalid semester filter",
        });
      }

      filters.push({
        semester,
      });
    }

    /**
     * Subject/course/category filters.
     */
    for (
      const field of [
        "subjectId",
        "courseId",
        "categoryId",
      ]
    ) {
      if (req.query[field] !== undefined) {
        const value = Number(
          req.query[field]
        );

        if (
          !Number.isInteger(value) ||
          value <= 0
        ) {
          return res.status(400).json({
            message:
              `Invalid ${field} filter`,
          });
        }

        filters.push({
          [field]: value,
        });
      }
    }

    if (filters.length > 0) {
      where.AND = filters;
    }

    /**
     * Supported sorting modes.
     *
     * SRS-required:
     * - relevance
     * - newest
     * - highest rated
     * - most downloaded
     *
     * Also preserve:
     * - oldest
     * - title
     */
    const supportedSorts = new Set([
      "relevance",
      "newest",
      "highestRated",
      "downloads",
      "oldest",
      "title",
    ]);

    const sortKey = String(
      req.query.sort || "newest"
    );

    if (!supportedSorts.has(sortKey)) {
      return res.status(400).json({
        message: "Unsupported sort option",
        supportedSorts: [
          "relevance",
          "newest",
          "highestRated",
          "downloads",
          "oldest",
          "title",
        ],
      });
    }

    /**
     * Relevance and highest-rated sorting require
     * global ranking before pagination.
     *
     * We intentionally retrieve only lightweight
     * search relations here instead of full reviews
     * and uploader data for every candidate.
     */
    if (
      sortKey === "relevance" ||
      sortKey === "highestRated"
    ) {
      const candidates =
        await prisma.note.findMany({
          where,

          orderBy: {
            uploadedAt: "desc",
          },

          include:
            searchNoteRelations,
        });

      if (sortKey === "relevance") {
        candidates.sort(
          compareByRelevance(
            searchQuery
          )
        );
      } else {
        candidates.sort(
          compareByHighestRated
        );
      }

      const total =
        candidates.length;

      const start =
        (page - 1) * limit;

      const selected =
        candidates.slice(
          start,
          start + limit
        );

      /**
       * Fetch complete relations only for the
       * notes that will actually be returned.
       */
      const selectedIds =
        selected.map(
          note => note.id
        );

      let fullItems = [];

      if (selectedIds.length > 0) {
        const selectedNotes =
          await prisma.note.findMany({
            where: {
              id: {
                in: selectedIds,
              },
            },

            include:
              noteRelations,
          });

        const byId =
          new Map(
            selectedNotes.map(
              note => [
                note.id,
                note,
              ]
            )
          );

        /**
         * Restore the ranking order.
         */
        fullItems =
          selectedIds
            .map(id =>
              byId.get(id)
            )
            .filter(Boolean);
      }

      return res.json({
        items:
          fullItems.map(
            formatNote
          ),

        page,
        limit,
        total,
        pages:
          Math.ceil(
            total / limit
          ),
      });
    }

    /**
     * DB-sortable modes.
     *
     * These can safely paginate at the
     * database level.
     */
    const sortOptions = {
      newest: {
        uploadedAt: "desc",
      },

      oldest: {
        uploadedAt: "asc",
      },

      downloads: {
        downloadCount: "desc",
      },

      title: {
        title: "asc",
      },
    };

    const [items, total] =
      await Promise.all([
        prisma.note.findMany({
          where,

          orderBy: [
            sortOptions[
              sortKey
            ],

            {
              id: "asc",
            },
          ],

          skip:
            (page - 1) *
            limit,

          take: limit,

          include:
            noteRelations,
        }),

        prisma.note.count({
          where,
        }),
      ]);

    return res.json({
      items:
        items.map(
          formatNote
        ),

      page,
      limit,
      total,

      pages:
        Math.ceil(
          total / limit
        ),
    });
  } catch (error) {
    next(error);
  }
});

/* ============================================================
   UPLOAD NOTE
   POST /upload
   ============================================================ */

r.post(
  "/upload",
  requireAuth,

  (req, res, next) => {
    uploadSingleNote(
      req,
      res,
      error => {
        if (error) {
          handleUploadError(
            error,
            res
          );

          return;
        }

        next();
      }
    );
  },

  async (req, res, next) => {
    let finalPath = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            "A note file is required",
        });
      }

      console.log("UPLOAD BODY:", req.body);

      if (Array.isArray(req.body.rightsConfirmed)) {
        req.body.rightsConfirmed = req.body.rightsConfirmed.at(-1);
      }

      const values =
        noteInput.parse(
          req.body
        );

      if (!values.rightsConfirmed) {
        return res.status(400).json({
          message:
            "You must confirm that you have the right to share this file",
        });
      }

      /**
       * Validate referenced catalogue
       * entities before creating the note.
       */
      const [
        subject,
        course,
        category,
      ] = await Promise.all([
        prisma.subject.findUnique({
          where: {
            id: values.subjectId,
          },
        }),

        values.courseId !== undefined &&
        values.courseId !== null
          ? prisma.course.findUnique({
              where: {
                id: values.courseId,
              },
            })
          : null,

        values.categoryId !== undefined &&
        values.categoryId !== null
          ? prisma.category.findUnique({
              where: {
                id: values.categoryId,
              },
            })
          : null,
      ]);

      if (!subject) {
        return res.status(400).json({
          message:
            "Invalid subject",
        });
      }

      if (
        values.courseId !== undefined &&
        values.courseId !== null &&
        !course
      ) {
        return res.status(400).json({
          message:
            "Invalid course",
        });
      }

      if (
        values.categoryId !== undefined &&
        values.categoryId !== null &&
        !category
      ) {
        return res.status(400).json({
          message:
            "Invalid category",
        });
      }

      /**
       * Validate:
       * - extension
       * - MIME
       * - file signature
       * - non-empty content
       * - checksum
       * - size
       */
      const fileInfo =
        await validateUploadedFile(
          req.file
        );

      /**
       * Duplicate checksum warning/block.
       *
       * The SRS requires duplicate-file detection.
       * We block an identical file rather than
       * storing duplicate physical content.
       */
      const duplicate =
        await prisma.noteFile.findFirst({
          where: {
            checksumSha256:
              fileInfo.checksum,
          },

          select: {
            noteId: true,
          },
        });

      if (duplicate) {
        return res.status(409).json({
          message:
            "An identical file already exists on the platform",

          noteId:
            duplicate.noteId,
        });
      }

      /**
       * Generate a server-side stored filename.
       *
       * Never use the user's original filename
       * as the physical storage filename.
       */
      const storedName =
        `${crypto.randomUUID()}.${fileInfo.ext}`;

      /**
       * Upload the temporary Multer file
       * to durable Neon Object Storage.
       */
      await fs.readFile(req.file.path).then(async body => {
        await s3.send(
          new PutObjectCommand({
            Bucket: STORAGE_BUCKET,
            Key: storedName,
            Body: body,
            ContentType: fileInfo.mime,
            ContentLength: req.file.size,
          })
        );
      });

      /**
       * Remove the temporary Multer file
       * after the object is safely stored.
       */
      await fs.unlink(req.file.path);

      /**
       * Database transaction:
       *
       * NOTE + NOTE_FILE are created together.
       *
       * If either operation fails,
       * the transaction rolls back.
       */
      const note =
        await prisma.$transaction(
          async tx => {
            const createdNote =
              await tx.note.create({
                data: {
                  uploaderId:
                    req.user.id,

                  subjectId:
                    values.subjectId,

                  courseId:
                    values.courseId ??
                    null,

                  categoryId:
                    values.categoryId ??
                    null,

                  title:
                    values.title,

                  topic:
                    values.topic,

                  semester:
                    values.semester,

                  description:
                    values.description,

                  visibility:
                    values.visibility,
                },
              });

            await tx.noteFile.create({
              data: {
                noteId:
                  createdNote.id,

                originalName:
                  path.basename(
                    req.file.originalname
                  ),

                storedName,

                fileType:
                  fileInfo.mime,

                fileSizeBytes:
                  req.file.size,

                checksumSha256:
                  fileInfo.checksum,
              },
            });

            return createdNote;
          }
        );

      await audit(
        req.user.id,
        "UPLOAD_NOTE",
        "NOTE",
        note.id,
        {
          visibility:
            values.visibility,

          fileType:
            fileInfo.mime,

          fileSizeBytes:
            req.file.size,
        }
      );

      return res.status(201).json({
        message:
          "Note uploaded successfully",

        noteId:
          note.id,
      });
    } catch (error) {
      /**
       * Database failure after the physical
       * file was moved must not leave an orphan
       * file behind.
       */
      await removeFile(
        finalPath
      );

      await removeFile(
        req.file?.path
      );

      next(error);
    }
  }
);


/* ============================================================
   OPEN NOTE THROUGH SHARE LINK
   GET /shared/:noteId/:token

   This route intentionally works without
   authentication.
   ============================================================ */

r.get(
  "/shared/:noteId/:token",
  async (req, res, next) => {
    try {
      const note =
        await findNoteDetails(
          req.params.noteId
        );

      if (
        !note ||
        note.status !== "ACTIVE"
      ) {
        return res.status(404).json({
          message:
            "Shared note not found",
        });
      }

      const link =
        await findValidShareLink(
          note.id,
          req.params.token
        );

      if (!link) {
        return res.status(404).json({
          message:
            "Share link is invalid, expired, or revoked",
        });
      }

      /**
       * A private note should not become
       * accessible merely because somebody
       * possesses a link.
       */
      if (
        note.visibility ===
          "PRIVATE" &&
        (
          !req.user ||
          !(
            await canAccessPrivateShare(
              note.id,
              req.user.id
            )
          )
        )
      ) {
        return res.status(403).json({
          message:
            "This private note requires individual access",
        });
      }

      return res.json(
        formatNote(note)
      );
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   GET SINGLE NOTE
   GET /:id
   ============================================================ */

r.get(
  "/:id",
  async (req, res, next) => {
    try {
      const note =
        await findNoteDetails(
          req.params.id
        );

      if (
        !note ||
        note.status !== "ACTIVE"
      ) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      /**
       * Optional share-link token.
       *
       * The raw token is never stored in
       * the database. Only its hash is checked.
       */
      const rawToken =
        typeof req.query.token ===
        "string"
          ? req.query.token
          : "";

      const link =
        rawToken
          ? await findValidShareLink(
              note.id,
              rawToken
            )
          : null;

      const allowed =
        await hasNoteAccess(
          note,
          req.user,
          Boolean(link)
        );

      if (!allowed) {
        return res.status(403).json({
          message:
            "You do not have permission to view this note",
        });
      }

      return res.json(
        formatNote(note)
      );
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   DOWNLOAD NOTE
   GET /:id/download
   ============================================================ */

r.get(
  "/:id/download",
  requireAuth,
  async (req, res, next) => {
    try {
      const note =
        await prisma.note.findUnique({
          where: {
            id: req.params.id,
          },

          include: {
            file: true,
          },
        });

      if (
        !note ||
        note.status !== "ACTIVE" ||
        !note.file
      ) {
        return res.status(404).json({
          message:
            "Note or file not found",
        });
      }

      /**
       * A share-link token is optional here.
       * Ownership / PUBLIC / PRIVATE-share
       * access is still checked server-side.
       */
      const rawToken =
        typeof req.query.token ===
        "string"
          ? req.query.token
          : "";

      const link =
        rawToken
          ? await findValidShareLink(
              note.id,
              rawToken
            )
          : null;

      const allowed =
        await hasNoteAccess(
          note,
          req.user,
          Boolean(link)
        );

      if (!allowed) {
        return res.status(403).json({
          message:
            "You do not have permission to download this note",
        });
      }

      /**
       * Check Neon Object Storage before
       * changing the download counter.
       */
      let storedObject;

      try {
        storedObject = await s3.send(
          new GetObjectCommand({
            Bucket: STORAGE_BUCKET,
            Key: note.file.storedName,
          })
        );
      } catch {
        return res.status(404).json({
          message:
            "Stored note file is unavailable",
        });
      }

      /**
       * Count + log the download together.
       */
      await prisma.$transaction([
        prisma.note.update({
          where: {
            id: note.id,
          },

          data: {
            downloadCount: {
              increment: 1,
            },
          },
        }),

        prisma.downloadLog.create({
          data: {
            noteId:
              note.id,

            userId:
              req.user.id,
          },
        }),
      ]);

      await audit(
        req.user.id,
        "DOWNLOAD_NOTE",
        "NOTE",
        note.id
      );

      /**
       * Stream the file from Neon Object Storage.
       *
       * The internal stored filename
       * is never exposed to the client.
       */
      res.setHeader(
        "Content-Type",
        note.file.fileType
      );

      res.setHeader(
        "Content-Length",
        String(note.file.fileSizeBytes)
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${path.basename(note.file.originalName).replace(/["\\]/g, "_")}"`
      );

      return storedObject.Body.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   EDIT NOTE METADATA
   PATCH /:id
   ============================================================ */

r.patch(
  "/:id",
  requireAuth,
  async (req, res, next) => {
    try {
      const values =
        noteUpdateSchema.parse(
          req.body
        );

      if (
        Object.keys(values)
          .length === 0
      ) {
        return res.status(400).json({
          message:
            "No note fields were provided",
        });
      }

      const note =
        await prisma.note.findUnique({
          where: {
            id: req.params.id,
          },
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      /**
       * Only the uploader may edit
       * note metadata.
       */
      if (
        !isOwner(
          note,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You can only edit your own notes",
        });
      }

      /**
       * Validate subject when supplied.
       */
      if (
        values.subjectId !==
        undefined
      ) {
        const exists =
          await prisma.subject.findUnique({
            where: {
              id:
                values.subjectId,
            },

            select: {
              id: true,
            },
          });

        if (!exists) {
          return res.status(400).json({
            message:
              "Invalid subject",
          });
        }
      }

      /**
       * Explicitly handle null.
       *
       * This allows the uploader to
       * remove an optional course.
       */
      if (
        values.courseId !==
          undefined &&
        values.courseId !==
          null
      ) {
        const exists =
          await prisma.course.findUnique({
            where: {
              id:
                values.courseId,
            },

            select: {
              id: true,
            },
          });

        if (!exists) {
          return res.status(400).json({
            message:
              "Invalid course",
          });
        }
      }

      /**
       * Explicitly handle null.
       *
       * This allows the uploader to
       * remove an optional category.
       */
      if (
        values.categoryId !==
          undefined &&
        values.categoryId !==
          null
      ) {
        const exists =
          await prisma.category.findUnique({
            where: {
              id:
                values.categoryId,
            },

            select: {
              id: true,
            },
          });

        if (!exists) {
          return res.status(400).json({
            message:
              "Invalid category",
          });
        }
      }

      const updated =
        await prisma.note.update({
          where: {
            id:
              note.id,
          },

          data:
            values,

          include:
            noteRelations,
        });

      await audit(
        req.user.id,
        "UPDATE_NOTE",
        "NOTE",
        note.id
      );

      return res.json({
        message:
          "Note updated successfully",

        note:
          formatNote(
            updated
          ),
      });
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   REPLACE NOTE FILE
   PUT /:id/file
   ============================================================ */

r.put(
  "/:id/file",
  requireAuth,

  (req, res, next) => {
    uploadSingleNote(
      req,
      res,
      error => {
        if (error) {
          handleUploadError(
            error,
            res
          );

          return;
        }

        next();
      }
    );
  },

  async (req, res, next) => {
    let newFilePath =
      null;

    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            "Replacement file is required",
        });
      }

      const note =
        await prisma.note.findUnique({
          where: {
            id:
              req.params.id,
          },

          include: {
            file: true,
          },
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      if (
        !isOwner(
          note,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You can only replace your own note file",
        });
      }

      /**
       * Validate replacement file
       * before touching the existing file.
       */
      const info =
        await validateUploadedFile(
          req.file
        );

      /**
       * Do not allow another note's
       * identical file to be duplicated.
       *
       * The current note is excluded
       * because replacing it with the
       * same file is harmless.
       */
      const duplicate =
        await prisma.noteFile.findFirst({
          where: {
            checksumSha256:
              info.checksum,

            noteId: {
              not:
                note.id,
            },
          },

          select: {
            noteId: true,
          },
        });

      if (duplicate) {
        return res.status(409).json({
          message:
            "An identical file already exists on the platform",

          noteId:
            duplicate.noteId,
        });
      }

      const storedName =
        `${crypto.randomUUID()}.${info.ext}`;

      newFilePath =
        resolveStoredPath(
          storedName
        );

      /**
       * Move the new file into
       * protected storage first.
       */
      await fs.rename(
        req.file.path,
        newFilePath
      );

      const oldStoredName =
        note.file?.storedName;

      try {
        /**
         * Replace database metadata
         * transactionally.
         */
        await prisma.$transaction(
          async tx => {
            await tx.noteFile.upsert({
              where: {
                noteId:
                  note.id,
              },

              update: {
                originalName:
                  path.basename(
                    req.file.originalname
                  ),

                storedName,

                fileType:
                  info.mime,

                fileSizeBytes:
                  req.file.size,

                checksumSha256:
                  info.checksum,

                uploadedAt:
                  new Date(),
              },

              create: {
                noteId:
                  note.id,

                originalName:
                  path.basename(
                    req.file.originalname
                  ),

                storedName,

                fileType:
                  info.mime,

                fileSizeBytes:
                  req.file.size,

                checksumSha256:
                  info.checksum,
              },
            });

            await tx.note.update({
              where: {
                id:
                  note.id,
              },

              data: {
                updatedAt:
                  new Date(),
              },
            });
          }
        );
      } catch (error) {
        /**
         * Database update failed.
         * Remove the new physical file
         * and preserve the old one.
         */
        await removeFile(
          newFilePath
        );

        newFilePath =
          null;

        throw error;
      }

      /**
       * Only remove the old physical file
       * after the DB transaction succeeds.
       */
      if (oldStoredName) {
        await removeFile(
          resolveStoredPath(
            oldStoredName
          )
        );
      }

      await audit(
        req.user.id,
        "REPLACE_NOTE_FILE",
        "NOTE",
        note.id
      );

      return res.json({
        message:
          "Note file replaced successfully",
      });
    } catch (error) {
      /**
       * If anything fails before the new
       * file becomes authoritative,
       * clean up the temporary/new file.
       */
      await removeFile(
        newFilePath
      );

      await removeFile(
        req.file?.path
      );

      next(error);
    }
  }
);

/* ============================================================
   DELETE NOTE
   DELETE /:id
   ============================================================ */

r.delete(
  "/:id",
  requireAuth,
  async (req, res, next) => {
    try {
      const note =
        await prisma.note.findUnique({
          where: {
            id:
              req.params.id,
          },

          include: {
            file: true,
          },
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      if (
        !isOwnerOrAdmin(
          note,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You can only delete your own notes",
        });
      }

      /**
       * Capture the physical file path
       * before the database record is removed.
       */
      const storedName =
        note.file?.storedName;

      /**
       * Immediately remove the note
       * from normal search/view results.
       *
       * The SRS requires deleted notes
       * to disappear from search immediately.
       */
      await prisma.$transaction(
        async tx => {
          await tx.note.update({
            where: {
              id:
                note.id,
            },

            data: {
              status:
                "DELETED",
            },
          });

          /**
           * Existing share links are
           * deactivated immediately.
           */
          await tx.shareLink.updateMany({
            where: {
              noteId:
                note.id,
            },

            data: {
              revokedAt:
                new Date(),
            },
          });
        }
      );

      /**
       * Physical file is purged after
       * the note has been made inaccessible.
       *
       * This satisfies the SRS requirement
       * that deleted content is no longer
       * accessible immediately.
       */
      if (storedName) {
        await removeFile(
          resolveStoredPath(
            storedName
          )
        );
      }

      await audit(
        req.user.id,
        "DELETE_NOTE",
        "NOTE",
        note.id
      );

      return res.json({
        message:
          "Note deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   CREATE SHARE LINK
   POST /:id/share-link
   ============================================================ */

r.post(
  "/:id/share-link",
  requireAuth,
  async (req, res, next) => {
    try {
      const values =
        shareLinkSchema.parse(
          req.body
        );

      const note =
        await prisma.note.findUnique({
          where: {
            id:
              req.params.id,
          },
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      if (
        note.status !==
        "ACTIVE"
      ) {
        return res.status(404).json({
          message:
            "This note is no longer available",
        });
      }

      /**
       * Only the uploader or an admin
       * can create a share link.
       */
      if (
        !isOwnerOrAdmin(
          note,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You can only create share links for your own notes",
        });
      }

      /**
       * A link is most useful for
       * PUBLIC/LINK_ONLY content.
       *
       * PRIVATE notes are intended for
       * explicit user sharing.
       */
      if (
        note.visibility ===
        "PRIVATE"
      ) {
        return res.status(400).json({
          message:
            "Private notes should be shared with specific users",
        });
      }

      const rawToken =
        crypto.randomBytes(
          32
        ).toString(
          "hex"
        );

      const tokenHash =
        hashToken(
          rawToken
        );

      const expiresAt =
        values.expiresAt
          ? new Date(
              values.expiresAt
            )
          : null;

      if (
        expiresAt &&
        expiresAt <=
          new Date()
      ) {
        return res.status(400).json({
          message:
            "Share-link expiry must be in the future",
        });
      }

      const link =
        await prisma.shareLink.create({
          data: {
            noteId:
              note.id,

            tokenHash,

            expiresAt,
          },

          select: {
            id: true,
            noteId: true,
            expiresAt: true,
            createdAt: true,
          },
        });

      await audit(
        req.user.id,
        "CREATE_SHARE_LINK",
        "NOTE",
        note.id,
        {
          shareLinkId:
            link.id,
        }
      );

      /**
       * The raw token is returned exactly once.
       * Only its hash is stored in the database.
       */
      return res.status(201).json({
        message:
          "Share link created successfully",

        shareLink: {
          id:
            link.id,

          noteId:
            link.noteId,

          expiresAt:
            link.expiresAt,

          createdAt:
            link.createdAt,

          token:
            rawToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   LIST SHARE LINKS
   GET /:id/share-links
   ============================================================ */

r.get(
  "/:id/share-links",
  requireAuth,
  async (req, res, next) => {
    try {
      const note =
        await prisma.note.findUnique({
          where: {
            id:
              req.params.id,
          },
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      if (
        !isOwnerOrAdmin(
          note,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You can only manage share links for your own notes",
        });
      }

      const links =
        await prisma.shareLink.findMany({
          where: {
            noteId:
              note.id,
          },

          select: {
            id: true,
            noteId: true,
            expiresAt: true,
            revokedAt: true,
            createdAt: true,
          },

          orderBy: {
            createdAt:
              "desc",
          },
        });

      return res.json({
        items:
          links,
      });
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   REVOKE SHARE LINK
   DELETE /:id/share-links/:linkId
   ============================================================ */

r.delete(
  "/:id/share-links/:linkId",
  requireAuth,
  async (req, res, next) => {
    try {
      const note =
        await prisma.note.findUnique({
          where: {
            id:
              req.params.id,
          },
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      if (
        !isOwnerOrAdmin(
          note,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You can only manage share links for your own notes",
        });
      }

      const link =
        await prisma.shareLink.findFirst({
          where: {
            id:
              req.params.linkId,

            noteId:
              note.id,
          },
        });

      if (!link) {
        return res.status(404).json({
          message:
            "Share link not found",
        });
      }

      if (!link.revokedAt) {
        await prisma.shareLink.update({
          where: {
            id:
              link.id,
          },

          data: {
            revokedAt:
              new Date(),
          },
        });
      }

      await audit(
        req.user.id,
        "REVOKE_SHARE_LINK",
        "NOTE",
        note.id,
        {
          shareLinkId:
            link.id,
        }
      );

      return res.json({
        message:
          "Share link revoked successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   SHARE NOTE WITH SPECIFIC USER
   POST /:id/share-user
   ============================================================ */

r.post(
  "/:id/share-user",
  requireAuth,
  async (req, res, next) => {
    try {
      const values =
        userShareSchema.parse(
          req.body
        );

      const note =
        await prisma.note.findUnique({
          where: {
            id:
              req.params.id,
          },
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      if (
        note.status !==
        "ACTIVE"
      ) {
        return res.status(404).json({
          message:
            "This note is no longer available",
        });
      }

      if (
        !isOwnerOrAdmin(
          note,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You can only share your own notes",
        });
      }

      const targetUser =
        await prisma.user.findUnique({
          where: {
            id:
              values.userId,
          },

          select: {
            id: true,
            email: true,
            name: true,
            status: true,
          },
        });

      if (!targetUser) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      if (
        targetUser.status !==
        "ACTIVE"
      ) {
        return res.status(400).json({
          message:
            "The selected user account is not active",
        });
      }

      if (
        targetUser.id ===
        req.user.id
      ) {
        return res.status(400).json({
          message:
            "You cannot share a note with yourself",
        });
      }

      /**
       * PRIVATE visibility is the intended
       * mode for explicit user sharing.
       *
       * If the note is currently PUBLIC
       * or LINK_ONLY, sharing it directly
       * with a user is still allowed.
       */
      const existing =
        await prisma.noteShare.findFirst({
          where: {
            noteId:
              note.id,

            sharedWith:
              targetUser.id,
          },
        });

      let share;

      if (existing) {
        share =
          await prisma.noteShare.update({
            where: {
              id:
                existing.id,
            },

            data: {
              revokedAt:
                null,
            },
          });
      } else {
        share =
          await prisma.noteShare.create({
            data: {
              noteId:
                note.id,

              sharedWith:
                targetUser.id,

              sharedBy:
                req.user.id,
            },
          });
      }

      await audit(
        req.user.id,
        "SHARE_NOTE_WITH_USER",
        "NOTE",
        note.id,
        {
          sharedWith:
            targetUser.id,
        }
      );

      return res.status(201).json({
        message:
          "Note shared successfully",

        share: {
          id:
            share.id,

          noteId:
            share.noteId,

          sharedWith:
            share.sharedWith,

          createdAt:
            share.createdAt,

          revokedAt:
            share.revokedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   LIST USERS WHO HAVE ACCESS
   GET /:id/shared-users
   ============================================================ */

r.get(
  "/:id/shared-users",
  requireAuth,
  async (req, res, next) => {
    try {
      const note =
        await prisma.note.findUnique({
          where: {
            id:
              req.params.id,
          },
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      if (
        !isOwnerOrAdmin(
          note,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You can only manage shares for your own notes",
        });
      }

      const shares =
        await prisma.noteShare.findMany({
          where: {
            noteId:
              note.id,
          },

          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
              },
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },
        });

      return res.json({
        items:
          shares.map(
            share => ({
              id:
                share.id,

              user: {
                id:
                  share.user.id,

                name:
                  share.user.name,

                email:
                  share.user.email,

                status:
                  share.user.status,
              },

              createdAt:
                share.createdAt,

              revokedAt:
                share.revokedAt,
            })
          ),
      });
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   REVOKE USER SHARE
   DELETE /:id/shared-users/:shareId
   ============================================================ */

r.delete(
  "/:id/shared-users/:shareId",
  requireAuth,
  async (req, res, next) => {
    try {
      const note =
        await prisma.note.findUnique({
          where: {
            id:
              req.params.id,
          },
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      if (
        !isOwnerOrAdmin(
          note,
          req.user
        )
      ) {
        return res.status(403).json({
          message:
            "You can only manage shares for your own notes",
        });
      }

      const share =
        await prisma.noteShare.findFirst({
          where: {
            id:
              req.params.shareId,

            noteId:
              note.id,
          },
        });

      if (!share) {
        return res.status(404).json({
          message:
            "User share not found",
        });
      }

      if (!share.revokedAt) {
        await prisma.noteShare.update({
          where: {
            id:
              share.id,
          },

          data: {
            revokedAt:
              new Date(),
          },
        });
      }

      await audit(
        req.user.id,
        "REVOKE_USER_SHARE",
        "NOTE",
        note.id,
        {
          shareId:
            share.id,

          sharedWith:
            share.sharedWith,
        }
      );

      return res.json({
        message:
          "User access revoked successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   CREATE REVIEW / RATING
   POST /:id/reviews
   ============================================================ */

r.post(
  "/:id/reviews",
  requireAuth,
  async (req, res, next) => {
    try {
      const values =
        reviewSchema.parse(
          req.body
        );

      const note =
        await prisma.note.findUnique({
          where: {
            id:
              req.params.id,
          },

          select: {
            id: true,
            uploaderId: true,
            status: true,
          },
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      if (
        note.status !==
        "ACTIVE"
      ) {
        return res.status(404).json({
          message:
            "This note is no longer available",
        });
      }

      /**
       * The uploader cannot review
       * their own note.
       */
      if (
        note.uploaderId ===
        req.user.id
      ) {
        return res.status(403).json({
          message:
            "You cannot review your own note",
        });
      }

      /**
       * Review creation requires
       * access to the note.
       */
      const fullNote =
        await findNoteDetails(
          note.id
        );

      const allowed =
        await hasNoteAccess(
          fullNote,
          req.user,
          false
        );

      if (!allowed) {
        return res.status(403).json({
          message:
            "You do not have permission to review this note",
        });
      }

      const existing =
        await findUserReviewForNote(
          note.id,
          req.user.id
        );

      if (existing) {
        return res.status(409).json({
          message:
            "You have already reviewed this note",
        });
      }

      const review =
        await createReview({
          noteId:
            note.id,

          userId:
            req.user.id,

          rating:
            values.rating,

          comment:
            values.comment,
        });

      await audit(
        req.user.id,
        "CREATE_REVIEW",
        "REVIEW",
        review.id,
        {
          noteId:
            note.id,

          rating:
            values.rating,
        }
      );

      return res.status(201).json({
        message:
          "Review submitted successfully",

        review,
      });
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   LIST REVIEWS
   GET /:id/reviews
   ============================================================ */

r.get(
  "/:id/reviews",
  async (req, res, next) => {
    try {
      const note =
        await findNoteDetails(
          req.params.id
        );

      if (
        !note ||
        note.status !==
          "ACTIVE"
      ) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      /**
       * Reviews are only visible when
       * the requester can access the note.
       */
      const allowed =
        await hasNoteAccess(
          note,
          req.user,
          false
        );

      if (!allowed) {
        return res.status(403).json({
          message:
            "You do not have permission to view these reviews",
        });
      }

      const pagination =
        paginationSchema.parse({
          page:
            req.query.page,

          limit:
            req.query.limit,
        });

      const [
        reviews,
        total,
      ] =
        await Promise.all([
          listReviewsForNote(
            note.id,
            pagination
          ),

          countReviews(
            note.id
          ),
        ]);

      return res.json({
        items:
          reviews,

        page:
          pagination.page,

        limit:
          pagination.limit,

        total,

        pages:
          Math.ceil(
            total /
              pagination.limit
          ),
      });
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   UPDATE OWN REVIEW
   PATCH /:id/reviews/:reviewId
   ============================================================ */

r.patch(
  "/:id/reviews/:reviewId",
  requireAuth,
  async (req, res, next) => {
    try {
      const values =
        reviewSchema.parse(
          req.body
        );

      const review =
        await findReviewById(
          req.params.reviewId
        );

      if (!review) {
        return res.status(404).json({
          message:
            "Review not found",
        });
      }

      if (
        review.noteId !==
        req.params.id
      ) {
        return res.status(404).json({
          message:
            "Review does not belong to this note",
        });
      }

      if (
        review.userId !==
        req.user.id
      ) {
        return res.status(403).json({
          message:
            "You can only edit your own review",
        });
      }

      const updated =
        await updateReview(
          review.id,
          values
        );

      await audit(
        req.user.id,
        "UPDATE_REVIEW",
        "REVIEW",
        review.id,
        {
          noteId:
            review.noteId,
        }
      );

      return res.json({
        message:
          "Review updated successfully",

        review:
          updated,
      });
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   DELETE OWN REVIEW
   DELETE /:id/reviews/:reviewId
   ============================================================ */

r.delete(
  "/:id/reviews/:reviewId",
  requireAuth,
  async (req, res, next) => {
    try {
      const review =
        await findReviewById(
          req.params.reviewId
        );

      if (!review) {
        return res.status(404).json({
          message:
            "Review not found",
        });
      }

      if (
        review.noteId !==
        req.params.id
      ) {
        return res.status(404).json({
          message:
            "Review does not belong to this note",
        });
      }

      if (
        review.userId !==
        req.user.id
      ) {
        return res.status(403).json({
          message:
            "You can only delete your own review",
        });
      }

      await deleteReview(
        review.id
      );

      await audit(
        req.user.id,
        "DELETE_REVIEW",
        "REVIEW",
        review.id,
        {
          noteId:
            review.noteId,
        }
      );

      return res.json({
        message:
          "Review deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ============================================================
   REPORT NOTE OR REVIEW
   POST /:id/report
   ============================================================ */

r.post(
  "/:id/report",
  requireAuth,
  async (req, res, next) => {
    try {
      const values =
        reportSchema.parse(
          req.body
        );

      const note =
        await prisma.note.findUnique({
          where: {
            id:
              req.params.id,
          },

          select: {
            id: true,
            status: true,
          },
        });

      if (!note) {
        return res.status(404).json({
          message:
            "Note not found",
        });
      }

      if (
        note.status !==
        "ACTIVE"
      ) {
        return res.status(404).json({
          message:
            "This note is no longer available",
        });
      }

      let review = null;

      if (
        values.reviewId
      ) {
        review =
          await findReviewById(
            values.reviewId
          );

        if (!review) {
          return res.status(404).json({
            message:
              "Review not found",
          });
        }

        if (
          review.noteId !==
          note.id
        ) {
          return res.status(400).json({
            message:
              "The review does not belong to this note",
          });
        }
      }

      /**
       * The SRS requires a report
       * to target exactly one object:
       *
       *   note OR review
       *
       * Never both and never neither.
       */
      if (
        Boolean(
          values.noteId
        ) ===
        Boolean(
          values.reviewId
        )
      ) {
        return res.status(400).json({
          message:
            "A report must target exactly one note or one review",
        });
      }

      if (
        values.noteId &&
        values.noteId !==
          note.id
      ) {
        return res.status(400).json({
          message:
            "Invalid note report target",
        });
      }

      /**
       * Prevent duplicate active reports
       * from the same user against the
       * same target.
       */
      const existing =
        await prisma.report.findFirst({
          where: {
            reporterId:
              req.user.id,

            noteId:
              values.noteId ??
              null,

            reviewId:
              values.reviewId ??
              null,

            status: {
              in: [
                "OPEN",
                "UNDER_REVIEW",
              ],
            },
          },
        });

      if (existing) {
        return res.status(409).json({
          message:
            "You already have an active report for this item",
        });
      }

      const report =
        await createReport({
          reporterId:
            req.user.id,

          noteId:
            values.noteId ??
            null,

          reviewId:
            values.reviewId ??
            null,

          reason:
            values.reason,

          details:
            values.details,
        });

      await audit(
        req.user.id,
        "CREATE_REPORT",
        "REPORT",
        report.id,
        {
          noteId:
            values.noteId ??
            null,

          reviewId:
            values.reviewId ??
            null,
        }
      );

      return res.status(201).json({
        message:
          "Report submitted successfully",

        report: {
          id:
            report.id,

          status:
            report.status,

          createdAt:
            report.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);


/* ============================================================
   EXPORT ROUTER
   ============================================================ */

export default r;
