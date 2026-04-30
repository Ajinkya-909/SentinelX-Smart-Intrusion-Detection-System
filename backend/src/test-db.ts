import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
// Note: Import from your custom 'output' path defined in the schema
import { PrismaClient } from "./generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

// 1. Create the native driver pool
const pool = new Pool({ connectionString });

// 2. Wrap the pool in the Prisma adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to the Client constructor
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Testing database connection...");
  try {
    const newUser = await prisma.user.create({
      data: {
        name: "Test User",
        email: `test-${Date.now()}@sentinelx.com`,
      },
    });
    console.log("Successfully inserted user:", newUser);

    const allUsers = await prisma.user.findMany();
    console.log("Current user count:", allUsers.length);
  } catch (error) {
    console.error("Database operation failed:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end(); // Ensure the pool is closed
  }
}

main();