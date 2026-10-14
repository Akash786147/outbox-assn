import path from "path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";

// same relative path from src/db (dev) and dist/db (build)
export function runMigrations() {
  return migrate(db, { migrationsFolder: path.join(__dirname, "../../drizzle") });
}
