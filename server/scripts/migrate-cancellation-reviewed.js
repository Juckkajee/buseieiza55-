import { readFile } from "node:fs/promises"
import { connect, close, read, query } from "../src/db.js"
try {
  if (!process.argv.includes("--apply-reviewed"))
    throw new Error(
      "Review 004-booking-cancellation-REVIEW.sql and approve before using --apply-reviewed.",
    )
  await connect()
  await read(async (db) => {
    const [{ n }] = await query(
      db,
      "SELECT COUNT(*) n FROM user_tab_columns WHERE table_name='BUS_BOOKINGS' AND column_name IN ('CANCELLATION_REASON','CANCELLED_AT','CANCELLED_BY')",
    )
    if (n)
      throw new Error(
        "Cancellation columns already exist or are partially installed; inspect before retrying.",
      )
    const sql = (
      await readFile(
        new URL(
          "../../database-review/004-booking-cancellation-REVIEW.sql",
          import.meta.url,
        ),
        "utf8",
      )
    )
      .replace(/^\s*--.*$/gm, "")
      .trim()
      .replace(/;$/, "")
    await db.execute(sql)
  })
  console.log("Reviewed cancellation columns installed. Restart the server.")
} catch (error) {
  console.error("Cancellation migration stopped:", error.message)
  process.exitCode = 1
} finally {
  await close()
}
