import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.roleDefinition.upsert({
    where: { name: Role.STUDENT }, update: {}, create: { name: Role.STUDENT }
  });
  const adminRole = await prisma.roleDefinition.upsert({
    where: { name: Role.ADMIN }, update: {}, create: { name: Role.ADMIN }
  });

  const subjects = ["Database Management Systems","Operating Systems","Computer Networks","Object Oriented Programming","Data Structures & Algorithms","Computer Organization"];
  const courses = ["B.Tech CSE","Computer Science Core","Programming"];
  const categories = ["Lecture Notes","Handwritten Notes","Question Papers","Cheat Sheets","Lab Material","Reference Material"];
  for (const name of subjects) await prisma.subject.upsert({where:{name},update:{},create:{name}});
  for (const name of courses) await prisma.course.upsert({where:{name},update:{},create:{name}});
  for (const name of categories) await prisma.category.upsert({where:{name},update:{},create:{name}});

  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { roleId: adminRole.id, passwordHash: hash, status: "ACTIVE" },
    create: { name: "Platform Administrator", email, passwordHash: hash, roleId: adminRole.id, emailVerified: true }
  });
  console.log(`Admin ready: ${email}`);
  console.log("Change ADMIN_PASSWORD before production use.");
}
main().finally(()=>prisma.$disconnect());
