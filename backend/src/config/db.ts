import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { getDatabaseUrl } from "../utils/dbConnection";
import "dotenv/config";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

let prisma: PrismaClient;

/**
 * Initialize Prisma Client with the appropriate database connection
 * This should be called once at application startup
 */
export async function initializePrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const databaseUrl = await getDatabaseUrl();

  prisma = new PrismaClient({
    adapter: new PrismaPg(
      new Pool({
        connectionString: databaseUrl,
      }),
    ),
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}

/**
 * Get the initialized Prisma Client
 * Make sure initializePrisma() has been called first
 */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma && !prisma) {
    throw new Error(
      "Prisma not initialized! Call initializePrisma() first in your app startup.",
    );
  }
  return globalForPrisma.prisma ?? prisma;
}

// For backwards compatibility, try to export a prisma instance
// This will throw if initializePrisma hasn't been called
export { prisma };
