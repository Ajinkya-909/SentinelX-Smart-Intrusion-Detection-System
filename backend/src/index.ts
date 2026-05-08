import dotenv from "dotenv";
import app from "./app";
import { prisma } from "./config/db";

dotenv.config({
  path: "./.env",
});

const port = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected successfully");

    app.listen(port, () => {
      console.log(`🚀 App listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }
};

startServer();
