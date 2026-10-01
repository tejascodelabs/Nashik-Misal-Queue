import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

pool.on("connect", () => {
  console.log("🔌 PostgreSQL pool connected");
});

pool.on("error", (error) => {
  console.error("❌ PostgreSQL pool error:", error);
});

export const db = drizzle({ client: pool });

export const checkDatabaseConnection = async () => {
  try {
    const result = await pool.query("SELECT NOW()");

    console.log("✅ PostgreSQL Database Connected");
    console.log("🕐 DB Time:", result.rows[0].now);

    return true;
  } catch (error) {
    console.error("❌ PostgreSQL Database Connection Failed");
    console.error(error);

    return false;
  }
};

export { pool };