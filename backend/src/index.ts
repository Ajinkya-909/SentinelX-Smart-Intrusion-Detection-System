import dotenv from "dotenv";
import app from "./app";
import { initializePrisma } from "./config/db";
import { initializeRedis } from "./config/redis";
import { initializeQueue } from "./queue";

dotenv.config({
  path: "./.env",
});

const port = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Initialize Prisma with smart database detection
    const prisma = await initializePrisma();

    // Test the connection
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected successfully");

    // Initialize Redis with smart URL detection (non-blocking)
    try {
      await initializeRedis();
      // Initialize job queue after Redis is ready
      initializeQueue();
    } catch (error) {
      console.warn(
        "⚠️  Redis initialization failed, continuing without Redis:",
        error,
      );
    }

    app.listen(port, () => {
      console.log(`🚀 App listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }
};

startServer();
