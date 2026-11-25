import { prisma } from "../src/prisma.js";

const downloadRelations = {
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
      uploaderId: true,
    },
  },
};

export async function createDownloadLog(data) {
  return prisma.downloadLog.create({
    data,
    include: downloadRelations,
  });
}

export async function countDownloadsForNote(noteId) {
  if (!noteId) {
    return 0;
  }

  return prisma.downloadLog.count({
    where: {
      noteId,
    },
  });
}

export async function listDownloadsForNote({
  noteId,
  skip = 0,
  take = 50,
} = {}) {
  const where = {
    noteId,
  };

  const [items, total] = await Promise.all([
    prisma.downloadLog.findMany({
      where,
      skip,
      take,
      orderBy: {
        downloadedAt: "desc",
      },
      include: downloadRelations,
    }),

    prisma.downloadLog.count({
      where,
    }),
  ]);

  return {
    items,
    total,
  };
}

export async function countDownloads(where = {}) {
  return prisma.downloadLog.count({
    where,
  });
}

export async function getDownloadStatistics() {
  const [totalDownloads, uniqueUsers, downloadsByNote] =
    await Promise.all([
      prisma.downloadLog.count(),

      prisma.downloadLog.findMany({
        distinct: ["userId"],
        select: {
          userId: true,
        },
      }),

      prisma.downloadLog.groupBy({
        by: ["noteId"],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      }),
    ]);

  return {
    totalDownloads,
    uniqueUsers: uniqueUsers.length,
    downloadsByNote,
  };
}
