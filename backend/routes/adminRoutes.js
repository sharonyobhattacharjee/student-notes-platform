
import express from "express";
import { z } from "zod";

import { prisma } from "../src/prisma.js";
import { requireAuth, requireAdmin } from "../src/auth.js";
import { audit } from "../src/audit.js";

const r = express.Router();

r.use(requireAuth, requireAdmin);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const statusSchema = z.enum(["ACTIVE", "SUSPENDED", "DELETED"]);
const noteStatusSchema = z.enum(["ACTIVE", "HIDDEN", "REMOVED"]);
const reviewStatusSchema = z.enum(["ACTIVE", "HIDDEN", "REMOVED"]);
const reportStatusSchema = z.enum(["RESOLVED", "DISMISSED"]);

function getPagination(query) {
  return paginationSchema.parse({
    page: query.page ?? 1,
    limit: query.limit ?? 20
  });
}

function paginationResult(page, limit, total) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
}

function getSearch(query) {
  return String(query || "").trim().slice(0, 150);
}

function handleNotFound(res, message = "Record not found") {
  return res.status(404).json({ message });
}

// --------------------------------------------------
// DASHBOARD STATISTICS
// GET /admin/stats
// --------------------------------------------------

r.get("/stats", async (req, res, next) => {
  try {
    const [
      activeUsers,
      suspendedUsers,
      totalUsers,
      activeNotes,
      hiddenNotes,
      removedNotes,
      totalDownloads,
      activeReviews,
      hiddenReviews,
      openReports,
      resolvedReports,
      dismissedReports
    ] = await Promise.all([
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "SUSPENDED" } }),
      prisma.user.count(),
      prisma.note.count({ where: { status: "ACTIVE" } }),
      prisma.note.count({ where: { status: "HIDDEN" } }),
      prisma.note.count({ where: { status: "REMOVED" } }),
      prisma.downloadLog.count(),
      prisma.review.count({ where: { status: "ACTIVE" } }),
      prisma.review.count({ where: { status: "HIDDEN" } }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.report.count({ where: { status: "RESOLVED" } }),
      prisma.report.count({ where: { status: "DISMISSED" } })
    ]);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers
      },
      notes: {
        active: activeNotes,
        hidden: hiddenNotes,
        removed: removedNotes
      },
      downloads: totalDownloads,
      reviews: {
        active: activeReviews,
        hidden: hiddenReviews
      },
      reports: {
        open: openReports,
        resolved: resolvedReports,
        dismissed: dismissedReports
      },

      // Backward-compatible fields
      activeUsers,
      activeNotes,
      totalDownloads,
      activeReviews,
      openReports
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// USER MANAGEMENT
// GET /admin/users
// --------------------------------------------------

r.get("/users", async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const q = getSearch(req.query.q);

    const where = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(req.query.status
        ? { status: statusSchema.parse(req.query.status) }
        : {})
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          role: true
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      items: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        institution: user.institution,
        status: user.status,
        role: user.role.name,
        emailVerified: user.emailVerified,
        failedLoginCount: user.failedLoginCount,
        lockedUntil: user.lockedUntil,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      })),
      ...paginationResult(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /admin/users/:id/status

r.patch("/users/:id/status", async (req, res, next) => {
  try {
    const status = statusSchema.parse(req.body.status);

    if (req.params.id === req.user.id) {
      return res.status(400).json({
        message: "You cannot change your own account status"
      });
    }

    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { role: true }
    });

    if (!target) {
      return handleNotFound(res, "User not found");
    }

    // Prevent accidentally disabling the last active administrator.
    if (
      target.role.name === "ADMIN" &&
      status !== "ACTIVE" &&
      target.status === "ACTIVE"
    ) {
      const activeAdmins = await prisma.user.count({
        where: {
          status: "ACTIVE",
          role: { name: "ADMIN" }
        }
      });

      if (activeAdmins <= 1) {
        return res.status(400).json({
          message: "The last active administrator cannot be disabled"
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: target.id },
      data: {
        status,
        ...(status === "ACTIVE"
          ? { failedLoginCount: 0, lockedUntil: null }
          : {})
      }
    });

    await audit(
      req.user.id,
      "UPDATE_USER_STATUS",
      "USER",
      user.id,
      {
        previousStatus: target.status,
        newStatus: status
      }
    );

    res.json({
      message: "User status updated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// NOTE MANAGEMENT AND MODERATION
// GET /admin/notes
// --------------------------------------------------

r.get("/notes", async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const q = getSearch(req.query.q);

    const where = {
      ...(req.query.status
        ? { status: z.enum([
            "ACTIVE",
            "HIDDEN",
            "REMOVED",
            "DELETED"
          ]).parse(req.query.status) }
        : {}),
      ...(req.query.visibility
        ? {
            visibility: z.enum([
              "PUBLIC",
              "LINK_ONLY",
              "PRIVATE"
            ]).parse(req.query.visibility)
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { topic: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              {
                uploader: {
                  name: { contains: q, mode: "insensitive" }
                }
              }
            ]
          }
        : {})
    };

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          topic: true,
          semester: true,
          description: true,
          visibility: true,
          status: true,
          downloadCount: true,
          uploadedAt: true,
          updatedAt: true,
          uploader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          subject: true,
          course: true,
          category: true,
          file: {
            select: {
              id: true,
              originalName: true,
              fileType: true,
              fileSizeBytes: true,
              checksumSha256: true,
              uploadedAt: true
            }
          }
        }
      }),
      prisma.note.count({ where })
    ]);

    res.json({
      items: notes,
      ...paginationResult(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /admin/notes/:id/status

r.patch("/notes/:id/status", async (req, res, next) => {
  try {
    const status = noteStatusSchema.parse(req.body.status);
    const reason = z.string().trim().max(500).optional()
      .parse(req.body.reason);

    const existing = await prisma.note.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return handleNotFound(res, "Note not found");
    }

    const note = await prisma.$transaction(async tx => {
      const updated = await tx.note.update({
        where: { id: existing.id },
        data: { status }
      });

      if (status !== "ACTIVE") {
        await tx.shareLink.updateMany({
          where: {
            noteId: existing.id,
            isActive: true
          },
          data: { isActive: false }
        });
      }

      return updated;
    });

    await audit(
      req.user.id,
      "MODERATE_NOTE",
      "NOTE",
      note.id,
      {
        previousStatus: existing.status,
        status,
        reason: reason || ""
      }
    );

    res.json({
      message: "Note moderation status updated",
      note: {
        id: note.id,
        title: note.title,
        status: note.status
      }
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// REPORT MANAGEMENT
// GET /admin/reports
// --------------------------------------------------

r.get("/reports", async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);

    const where = {
      ...(req.query.status
        ? {
            status: z.enum([
              "OPEN",
              "RESOLVED",
              "DISMISSED"
            ]).parse(req.query.status)
          }
        : {})
    };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          note: {
            select: {
              id: true,
              title: true,
              status: true
            }
          },
          review: {
            select: {
              id: true,
              comment: true,
              rating: true,
              status: true
            }
          },
          resolver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.report.count({ where })
    ]);

    res.json({
      items: reports,
      ...paginationResult(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /admin/reports/:id

r.patch("/reports/:id", async (req, res, next) => {
  try {
    const status = reportStatusSchema.parse(req.body.status);

    const existing = await prisma.report.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return handleNotFound(res, "Report not found");
    }

    const report = await prisma.report.update({
      where: { id: existing.id },
      data: {
        status,
        resolvedBy: req.user.id,
        resolvedAt: new Date()
      }
    });

    await audit(
      req.user.id,
      "RESOLVE_REPORT",
      "REPORT",
      report.id,
      {
        previousStatus: existing.status,
        status
      }
    );

    res.json({
      message: "Report updated successfully",
      report
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// REVIEW MANAGEMENT
// GET /admin/reviews
// --------------------------------------------------

r.get("/reviews", async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);

    const where = {
      ...(req.query.status
        ? { status: reviewStatusSchema.parse(req.query.status) }
        : {})
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          note: {
            select: {
              id: true,
              title: true,
              uploaderId: true
            }
          }
        }
      }),
      prisma.review.count({ where })
    ]);

    res.json({
      items: reviews,
      ...paginationResult(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /admin/reviews/:id/status

r.patch("/reviews/:id/status", async (req, res, next) => {
  try {
    const status = reviewStatusSchema.parse(req.body.status);

    const existing = await prisma.review.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return handleNotFound(res, "Review not found");
    }

    const review = await prisma.review.update({
      where: { id: existing.id },
      data: { status }
    });

    await audit(
      req.user.id,
      "MODERATE_REVIEW",
      "REVIEW",
      review.id,
      {
        previousStatus: existing.status,
        status
      }
    );

    res.json({
      message: "Review status updated successfully",
      review
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// SUBJECT, COURSE AND CATEGORY MANAGEMENT
// --------------------------------------------------

const listModels = {
  subjects: "subject",
  courses: "course",
  categories: "category"
};

const listNameSchema = z.object({
  name: z.string().trim().min(2).max(100)
});

async function createListItem(model, name, req, res, next) {
  try {
    const { name: value } = listNameSchema.parse({ name });

    const item = await prisma[model].create({
      data: { name: value }
    });

    await audit(
      req.user.id,
      "CREATE_METADATA",
      model.toUpperCase(),
      String(item.id),
      { name: item.name }
    );

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

async function listItems(model, req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const q = getSearch(req.query.q);

    const where = q
      ? { name: { contains: q, mode: "insensitive" } }
      : {};

    const [items, total] = await Promise.all([
      prisma[model].findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma[model].count({ where })
    ]);

    res.json({
      items,
      ...paginationResult(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
}

for (const [route, model] of Object.entries(listModels)) {
  r.get(`/${route}`, (req, res, next) =>
    listItems(model, req, res, next)
  );

  r.post(`/${route}`, (req, res, next) =>
    createListItem(model, req.body.name, req, res, next)
  );
}

// --------------------------------------------------
// AUDIT LOGS
// GET /admin/audit-logs
// --------------------------------------------------

r.get("/audit-logs", async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const q = getSearch(req.query.q);

    const where = {
      ...(req.query.action
        ? { action: getSearch(req.query.action) }
        : {}),
      ...(req.query.entityType
        ? { entityType: getSearch(req.query.entityType) }
        : {}),
      ...(q
        ? {
            OR: [
              { action: { contains: q, mode: "insensitive" } },
              { entityType: { contains: q, mode: "insensitive" } },
              { entityId: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      items: logs,
      ...paginationResult(page, limit, total)
    });
  } catch (error) {
    next(error);
  }
});

export default r;
