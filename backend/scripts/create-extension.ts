import "dotenv/config";
import { Pool } from "pg";

async function createExtension() {
  const useDocker = process.env.USE_DOCKER === "true";
  const connectionString = useDocker
    ? (process.env.DOCKER_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DEFAULT_DATABASE_URL)
    : (process.env.NEON_DATABASE_URL || process.env.DOCKER_DATABASE_URL || process.env.DEFAULT_DATABASE_URL);

  if (!connectionString) {
    console.error(
      "❌ No database connection URL found. Set USE_DOCKER, DOCKER_DATABASE_URL, NEON_DATABASE_URL, or DEFAULT_DATABASE_URL in .env",
    );
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
  });

  try {
    const isNeon = connectionString === process.env.NEON_DATABASE_URL;
    console.log(`🔌 Connecting to ${isNeon ? "Neon Online PostgreSQL" : "Docker/Local PostgreSQL"}...`);

    console.log("📦 Creating uuid-ossp extension...");
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    console.log("✅ UUID extension created successfully");
  } catch (error) {
    console.error("❌ Failed to create extension:", error);
  } finally {
    await pool.end();
  }
}

createExtension();
