import "dotenv/config";

import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required"
    );
  }

  if (password.length < 12) {
    throw new Error(
      "Bootstrap administrator password must contain at least 12 characters"
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  const role = await prisma.role.upsert({
    where: {
      name: "HR_ADMIN",
    },
    update: {},
    create: {
      name: "HR_ADMIN",
    },
  });

  await prisma.role.upsert({
    where: {
      name: "HR_MANAGER",
    },
    update: {},
    create: {
      name: "HR_MANAGER",
    },
  });

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    console.log("Administrator already exists. No changes made.");
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      roleId: role.id,
    },
  });

  console.log("Initial HR administrator created successfully.");
}

main()
  .catch((error) => {
    console.error("Administrator provisioning failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });