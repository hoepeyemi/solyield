import { defineConfig } from "drizzle-kit";

if (!import.meta.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: import.meta.env.DATABASE_URL,
  },
});
