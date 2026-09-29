import { readFile } from "node:fs/promises"
import { connect, close, read } from "../src/db.js"
try {
  if (!process.argv.includes("--apply-reviewed")) throw new Error("Review database-review/003-readable-ids-REVIEW.sql and approve it before using --apply-reviewed.")
  await connect()
  const sql = (await readFile(new URL("../../database-review/003-readable-ids-REVIEW.sql",import.meta.url),"utf8")).replace(/^\s*--.*$/gm, "").replace(/\/\s*$/, "").trim()
  await read(db => db.execute(sql))
  console.log("Reviewed ID sequences created. Restart the server to enable running IDs.")
} catch(error) {
  console.error("Sequence migration stopped:",error.message)
  process.exitCode=1
} finally {await close()}
