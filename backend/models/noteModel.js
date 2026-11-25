import { prisma } from "../src/prisma.js";

const noteRelations = {
  subject: true,
  course: true,
  category: true,
  uploader: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  file: true,
};

export async function findNoteById(noteId) {
  if (!noteId) {
    return null;
  }

  return prisma.note.findUnique({
    where: {
      id: noteId,
    },
    include: noteRelations,
  });
}

export async function findNoteByIdWithFile(noteId) {
  if (!noteId) {
    return null;
  }

  return prisma.note.findUnique({
    where: {
      id: noteId,
    },
    include: {
      file: true,
      subject: true,
      course: true,
      category: true,
      uploader: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function createNote(data) {
  return prisma.note.create({
    data,
    include: noteRelations,
  });
}

export async function updateNote(noteId, data) {
  return prisma.note.update({
    where: {
      id: noteId,
    },
    data,
    include: noteRelations,
  });
}

export async function deleteNote(noteId) {
  return prisma.note.delete({
    where: {
      id: noteId,
    },
  });
}

export async function countNotes(where = {}) {
  return prisma.note.count({
    where,
  });
}

export async function listNotes({
  where = {},
  skip = 0,
  take = 12,
  orderBy = {
    uploadedAt: "desc",
  },
} = {}) {
  const [items, total] = await Promise.all([
    prisma.note.findMany({
      where,
      skip,
      take,
      orderBy,
      include: noteRelations,
    }),

    prisma.note.count({
      where,
    }),
  ]);

  return {
    items,
    total,
  };
}

export async function findNotesForSearch({
  where = {},
  skip = 0,
  take = 12,
  orderBy = {
    uploadedAt: "desc",
  },
} = {}) {
  return listNotes({
    where,
    skip,
    take,
    orderBy,
  });
}

export async function findNoteFile(noteId) {
  if (!noteId) {
    return null;
  }

  return prisma.noteFile.findUnique({
    where: {
      noteId,
    },
  });
}

export async function createNoteFile(data) {
  return prisma.noteFile.create({
    data,
  });
}

export async function updateNoteFile(noteFileId, data) {
  return prisma.noteFile.update({
    where: {
      id: noteFileId,
    },
    data,
  });
}

export async function deleteNoteFile(noteFileId) {
  return prisma.noteFile.delete({
    where: {
      id: noteFileId,
    },
  });
}
