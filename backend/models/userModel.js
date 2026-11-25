import { prisma } from "../src/prisma.js";

const userWithRole = {
  role: true,
};

export async function findUserById(userId) {
  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: userWithRole,
  });
}

export async function findUserByEmail(email) {
  if (!email) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      email: email.toLowerCase().trim(),
    },
    include: userWithRole,
  });
}

export async function createUser(data) {
  return prisma.user.create({
    data: {
      ...data,
      email: data.email.toLowerCase().trim(),
    },
    include: userWithRole,
  });
}

export async function updateUserProfile(userId, data) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data,
    include: userWithRole,
  });
}

export async function updateUserPassword(userId, passwordHash) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      passwordHash,
    },
    include: userWithRole,
  });
}

export async function updateLoginState(
  userId,
  {
    failedLoginCount,
    lockedUntil,
    lastLoginAt,
  },
) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      failedLoginCount,
      lockedUntil,
      lastLoginAt,
    },
    include: userWithRole,
  });
}

export async function listUsers({
  skip = 0,
  take = 50,
  where = {},
  orderBy = {
    createdAt: "desc",
  },
} = {}) {
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take,
      include: userWithRole,
    }),

    prisma.user.count({
      where,
    }),
  ]);

  return {
    items,
    total,
  };
}

export async function updateUserStatus(userId, status) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      status,
    },
    include: userWithRole,
  });
}
