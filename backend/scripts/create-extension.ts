import "dotenv/config";
import { Pool } from "pg";

async function createExtension() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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
