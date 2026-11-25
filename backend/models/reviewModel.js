import { prisma } from "../src/prisma.js";

const reviewRelations = {
  user: {
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
    },
  },
};

export async function findReviewById(reviewId) {
  if (!reviewId) {
    return null;
  }

  return prisma.review.findUnique({
    where: {
      id: reviewId,
    },
    include: reviewRelations,
  });
}

export async function findUserReviewForNote(userId, noteId) {
  if (!userId || !noteId) {
    return null;
  }

  return prisma.review.findUnique({
    where: {
      noteId_userId: {
        userId,
        noteId,
      },
    },
    include: reviewRelations,
  });
}

export async function createReview(data) {
  return prisma.review.create({
    data,
    include: reviewRelations,
  });
}

export async function updateReview(reviewId, data) {
  return prisma.review.update({
    where: {
      id: reviewId,
    },
    data,
    include: reviewRelations,
  });
}

export async function deleteReview(reviewId) {
  return prisma.review.delete({
    where: {
      id: reviewId,
    },
  });
}

export async function listReviewsForNote({
  noteId,
  skip = 0,
  take = 20,
  where = {},
  orderBy = {
    createdAt: "desc",
  },
} = {}) {
  const reviewWhere = {
    noteId,
    ...where,
  };

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where: reviewWhere,
      skip,
      take,
      orderBy,
      include: reviewRelations,
    }),

    prisma.review.count({
      where: reviewWhere,
    }),
  ]);

  return {
    items,
    total,
  };
}

export async function countReviews(where = {}) {
  return prisma.review.count({
    where,
  });
}

export async function getNoteRatingSummary(noteId) {
  const result = await prisma.review.aggregate({
    where: {
      noteId,
      status: "ACTIVE",
    },
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
  });

  return {
    averageRating: result._avg.rating ?? 0,
    reviewCount: result._count.rating ?? 0,
  };
}
