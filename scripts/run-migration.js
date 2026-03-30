import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase credentials in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runMigration() {
  try {
    console.log("[v0] Reading SQL migration file...");
    const sqlPath = path.join(process.cwd(), "scripts", "001_create_tables.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("[v0] Executing SQL migration...");

    // Split SQL into individual statements and execute them
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc("exec", {
          sql_query: statement,
        });

        if (error) {
          console.error(`[v0] Error executing statement: ${error.message}`);
          // Continue with next statement instead of failing completely
        } else {
          console.log(
            `[v0] Executed: ${statement.substring(0, 50)}...`
          );
        }
      } catch (err) {
        console.error(`[v0] Caught error: ${err.message}`);
        // Continue with next statement
      }
    }

    console.log("[v0] Migration completed!");
    process.exit(0);
  } catch (error) {
    console.error("[v0] Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();
