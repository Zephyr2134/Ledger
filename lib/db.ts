import { neon } from "@neondatabase/serverless";

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to access the Ledger database.");
  }
  return neon(process.env.DATABASE_URL);
}
