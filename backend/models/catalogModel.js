import { prisma } from "../src/prisma.js";

const catalogueOrder = {
  name: "asc",
};

export async function listSubjects({
  where = {},
  skip = 0,
  take = 100,
} = {}) {
  const [items, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      skip,
      take,
      orderBy: catalogueOrder,
    }),
    prisma.subject.count({ where }),
  ]);

  return { items, total };
}

export async function findSubjectById(subjectId) {
  if (!subjectId) return null;

  return prisma.subject.findUnique({
    where: { id: subjectId },
  });
}

export async function findSubjectByName(name) {
  if (!name) return null;

  return prisma.subject.findUnique({
    where: {
      name: name.trim(),
    },
  });
}

export async function createSubject(data) {
  return prisma.subject.create({
    data,
  });
}

export async function updateSubject(subjectId, data) {
  return prisma.subject.update({
    where: { id: subjectId },
    data,
  });
}

export async function deleteSubject(subjectId) {
  return prisma.subject.delete({
    where: { id: subjectId },
  });
}

export async function listCourses({
  where = {},
  skip = 0,
  take = 100,
} = {}) {
  const [items, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip,
      take,
      orderBy: catalogueOrder,
    }),
    prisma.course.count({ where }),
  ]);

  return { items, total };
}

export async function findCourseById(courseId) {
  if (!courseId) return null;

  return prisma.course.findUnique({
    where: { id: courseId },
  });
}

export async function findCourseByName(name) {
  if (!name) return null;

  return prisma.course.findUnique({
    where: {
      name: name.trim(),
    },
  });
}

export async function createCourse(data) {
  return prisma.course.create({
    data,
  });
}

export async function updateCourse(courseId, data) {
  return prisma.course.update({
    where: { id: courseId },
    data,
  });
}

export async function deleteCourse(courseId) {
  return prisma.course.delete({
    where: { id: courseId },
  });
}

export async function listCategories({
  where = {},
  skip = 0,
  take = 100,
} = {}) {
  const [items, total] = await Promise.all([
    prisma.category.findMany({
      where,
      skip,
      take,
      orderBy: catalogueOrder,
    }),
    prisma.category.count({ where }),
  ]);

  return { items, total };
}

export async function findCategoryById(categoryId) {
  if (!categoryId) return null;

  return prisma.category.findUnique({
    where: { id: categoryId },
  });
}

export async function findCategoryByName(name) {
  if (!name) return null;

  return prisma.category.findUnique({
    where: {
      name: name.trim(),
    },
  });
}

export async function createCategory(data) {
  return prisma.category.create({
    data,
  });
}

export async function updateCategory(categoryId, data) {
  return prisma.category.update({
    where: { id: categoryId },
    data,
  });
}

export async function deleteCategory(categoryId) {
  return prisma.category.delete({
    where: { id: categoryId },
  });
}
