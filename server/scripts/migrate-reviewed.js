import { readFile } from "node:fs/promises"
import { connect, read, query, close } from "../src/db.js"
try {
  if (!process.argv.includes("--apply-reviewed"))
    throw new Error(
      "Review database-review/002-web-features-REVIEW.sql first. Then add -- --apply-reviewed to this command.",
    )
  await connect()
  await read(async (db) => {
    const existing = (
      await query(
        db,
        "SELECT COUNT(*) n FROM user_tab_columns WHERE table_name='BUS_VEHICLES' AND column_name IN ('BRAND','MODEL_YEAR','AVAILABILITY')",
      )
    )[0].n
    const events = (
      await query(
        db,
        "SELECT COUNT(*) n FROM user_tables WHERE table_name='BUS_TRIP_EVENTS'",
      )
    )[0].n
    if (existing || events)
      throw new Error(
        "Extension objects already exist or are partially applied. Inspect first; migration will not overwrite them.",
      )
    const source = await readFile(
      new URL(
        "../../database-review/002-web-features-REVIEW.sql",
        import.meta.url,
      ),
      "utf8",
    )
    const statements = source
      .replace(/^\s*--.*$/gm, "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
    for (const sql of statements) await db.execute(sql)
    console.log("Reviewed web-features migration applied. Restart the server.")
  })
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  await close()
}
