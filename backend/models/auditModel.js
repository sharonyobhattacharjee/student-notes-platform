import { prisma } from "../src/prisma.js";

export async function createAuditLog(data) {
  return prisma.auditLog.create({
    data,
  });
}

export async function listAuditLogs({
  where = {},
  skip = 0,
  take = 50,
  orderBy = {
    createdAt: "desc",
  },
} = {}) {
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy,
    }),

    prisma.auditLog.count({
      where,
    }),
  ]);

  return {
    items,
    total,
  };
}

export async function countAuditLogs(where = {}) {
  return prisma.auditLog.count({
    where,
  });
}

export async function findAuditLogsByUser(
  userId,
  {
    skip = 0,
    take = 50,
  } = {},
) {
  return listAuditLogs({
    where: {
      userId,
    },
    skip,
    take,
  });
}
