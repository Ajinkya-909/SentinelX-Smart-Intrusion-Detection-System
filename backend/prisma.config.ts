import "dotenv/config";
import { defineConfig } from "prisma/config";

const useDocker = process.env.USE_DOCKER === "true";
const dbUrl = useDocker
  ? (process.env.DOCKER_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DEFAULT_DATABASE_URL)
  : (process.env.NEON_DATABASE_URL || process.env.DOCKER_DATABASE_URL || process.env.DEFAULT_DATABASE_URL);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: dbUrl || "",
  },
});