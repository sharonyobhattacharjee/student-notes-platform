import { prisma } from "../src/prisma.js";

const shareLinkRelations = {
  note: {
    select: {
      id: true,
      title: true,
      uploaderId: true,
      visibility: true,
    },
  },
};

const noteShareRelations = {
  note: {
    select: {
      id: true,
      title: true,
      uploaderId: true,
      visibility: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

export async function createShareLink(data) {
  return prisma.shareLink.create({
    data,
    include: shareLinkRelations,
  });
}

export async function findShareLinkByTokenHash(tokenHash) {
  if (!tokenHash) {
    return null;
  }

  return prisma.shareLink.findUnique({
    where: {
      tokenHash,
    },
    include: shareLinkRelations,
  });
}

export async function listShareLinksForNote(noteId) {
  return prisma.shareLink.findMany({
    where: {
      noteId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: shareLinkRelations,
  });
}

export async function deactivateShareLink(shareLinkId) {
  return prisma.shareLink.update({
    where: {
      id: shareLinkId,
    },
    data: {
      isActive: false,
    },
    include: shareLinkRelations,
  });
}

export async function deactivateShareLinksForNote(noteId) {
  return prisma.shareLink.updateMany({
    where: {
      noteId,
    },
    data: {
      isActive: false,
    },
  });
}

export async function createNoteShare(data) {
  return prisma.noteShare.create({
    data,
    include: noteShareRelations,
  });
}

export async function findNoteShare(noteId, userId) {
  if (!noteId || !userId) {
    return null;
  }

  return prisma.noteShare.findUnique({
    where: {
      noteId_userId: {
        noteId,
        userId,
      },
    },
    include: noteShareRelations,
  });
}

export async function listNoteSharesForNote(noteId) {
  return prisma.noteShare.findMany({
    where: {
      noteId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: noteShareRelations,
  });
}

export async function listNotesSharedWithUser(userId) {
  return prisma.noteShare.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: noteShareRelations,
  });
}

export async function removeNoteShare(noteId, userId) {
  return prisma.noteShare.delete({
    where: {
      noteId_userId: {
        noteId,
        userId,
      },
    },
  });
}

export async function removeAllNoteShares(noteId) {
  return prisma.noteShare.deleteMany({
    where: {
      noteId,
    },
  });
}
