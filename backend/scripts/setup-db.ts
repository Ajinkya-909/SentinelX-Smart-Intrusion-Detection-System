import "dotenv/config"
import { Pool } from "pg"
import fs from "fs"
import path from "path"

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log("🔌 Connecting to DB...")

    // 1. DANGER ZONE: Wipe the existing schema and all data completely
    console.log("🧹 Wiping existing database (dropping public schema)...")
    await pool.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `)
    console.log("🗑️  All old tables, types, and data deleted.")

    // 2. Read SQL file
    const schemaPath = path.join(__dirname, "./schema.sql") // adjust if needed
    const schemaSQL = fs.readFileSync(schemaPath, "utf-8")

    console.log("📄 Running new schema SQL...")

    // 3. Execute SQL
    await pool.query(schemaSQL)

    console.log("✅ New schema applied successfully")

    // 4. Verify tables
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `)

    console.log("\n📊 Tables in database:")
    if (result.rows.length === 0) {
      console.log("No tables found. Something might have gone wrong.")
    } else {
      result.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.table_name}`)
      })
    }

  } catch (error) {
    console.error("❌ DB setup failed:", error)
  } finally {
    await pool.end()
  }
}

setupDatabase()