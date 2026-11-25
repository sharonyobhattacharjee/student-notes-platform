import { prisma } from "../src/prisma.js";

const reportRelations = {
  reporter: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  note: {
    select: {
      id: true,
      title: true,
      uploaderId: true,
      status: true,
    },
  },
  review: {
    select: {
      id: true,
      noteId: true,
      userId: true,
      rating: true,
      comment: true,
      status: true,
    },
  },
};

function validateReportTarget(data) {
  const hasNote = Boolean(data.noteId);
  const hasReview = Boolean(data.reviewId);

  if (hasNote === hasReview) {
    throw new Error(
      "A report must target exactly one note or one review"
    );
  }
}

export async function createReport(data) {
  validateReportTarget(data);

  return prisma.report.create({
    data,
    include: reportRelations,
  });
}

export async function findReportById(reportId) {
  if (!reportId) {
    return null;
  }

  return prisma.report.findUnique({
    where: {
      id: reportId,
    },
    include: reportRelations,
  });
}

export async function listReports({
  where = {},
  skip = 0,
  take = 50,
  orderBy = {
    createdAt: "desc",
  },
} = {}) {
  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take,
      orderBy,
      include: reportRelations,
    }),

    prisma.report.count({
      where,
    }),
  ]);

  return {
    items,
    total,
  };
}

export async function updateReportStatus(
  reportId,
  status,
  resolvedBy = undefined,
) {
  return prisma.report.update({
    where: {
      id: reportId,
    },
    data: {
      status,
      ...(resolvedBy !== undefined
        ? { resolvedBy }
        : {}),
    },
    include: reportRelations,
  });
}

export async function countReports(where = {}) {
  return prisma.report.count({
    where,
  });
}

export async function countReportsByStatus() {
  return prisma.report.groupBy({
    by: ["status"],
    _count: {
      id: true,
    },
  });
}
