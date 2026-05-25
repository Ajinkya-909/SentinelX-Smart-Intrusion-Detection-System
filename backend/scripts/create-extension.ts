import "dotenv/config";
import { Pool } from "pg";

async function createExtension() {
  const connectionString =
    process.env.NEON_DATABASE_URL || process.env.DOCKER_DATABASE_URL;

  if (!connectionString) {
    console.error(
      "❌ No database connection URL found. Set NEON_DATABASE_URL or DATABASE_URL in .env",
    );
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
  });

  try {
    console.log("🔌 Connecting to Neon...");
    await pool.connect();

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
