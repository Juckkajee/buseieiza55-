import express from "express"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { connect, close, read, query, transaction, capabilities } from "./db.js"
import { authRoutes, authenticate } from "./auth.js"
import { catalogRoutes } from "./catalog.js"
import { bookingRoutes, driverRoutes } from "./bookings.js"
import { reportRoutes } from "./reports.js"
import { setupAdmin, ensureScreenCatalog } from "./setup.js"
import { userManagementRoutes } from "./users.js"
import { adminBookingRoutes } from "./admin-bookings.js"
import { HttpError } from "./domain.js"
import { ensureDailyRounds } from "./daily-rounds.js"
export function createApp() {
  const app = express()
  app.disable("x-powered-by")
  app.use(express.json({ limit: "128kb" }))
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "X-Frame-Options": "DENY",
    })
    if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store")
    next()
  })
  app.use("/api", (req, res, next) => {
    const allowedOrigins = [
      process.env.CLIENT_ORIGIN || "http://localhost:5173",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:5173",
    ]
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      ((req.headers.origin && !allowedOrigins.includes(req.headers.origin)) ||
        req.headers["x-shuttle-client"] !== "1")
    )
      return next(new HttpError(403, "คำขอไม่ถูกต้อง กรุณาเปิดเว็บผ่าน localhost"))
    next()
  })
  app.get("/api/health", async (req, res) =>
    res.json(
      await read(async (db) => {
        await query(db, "SELECT 1 n FROM dual")
        return { ok: true, database: "Oracle", capabilities }
      }),
    ),
  )
  app.get("/api/setup", async (req, res) =>
    res.json(
      await read(async (db) => ({
        required:
          (await query(db, "SELECT COUNT(*) n FROM BUS_EMPLOYEES"))[0].n === 0,
      })),
    ),
  )
  app.post("/api/setup", async (req, res) => {
    await transaction((db) => setupAdmin(db, req.body))
    res.json({ ok: true })
  })
  authRoutes(app)
  app.use("/api", authenticate)
  catalogRoutes(app)
  userManagementRoutes(app)
  adminBookingRoutes(app)
  bookingRoutes(app)
  driverRoutes(app)
  reportRoutes(app)
  app.use("/api", (req, res) => res.status(404).json({ message: "ไม่พบ API นี้" }))
  const dist = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../client/dist",
  )
  app.use(express.static(dist))
  app.get("/{*path}", (req, res) => res.sendFile(path.join(dist, "index.html")))
  app.use((error, req, res, next) => {
    const ora = error.errorNum
    let status = error.status || 500,
      message = error.message
    if (ora === 1) {
      status = 409
      message = "ข้อมูลซ้ำหรือที่นั่งนี้ถูกจองแล้ว กรุณาตรวจสอบใหม่"
    } else if (ora === 2292) {
      status = 409
      message = "ข้อมูลนี้ถูกใช้อ้างอิงอยู่ จึงลบไม่ได้ เพื่อรักษาประวัติเดิม"
    } else if (ora === 2291) {
      status = 409
      message = "ข้อมูลที่อ้างอิงถูกลบหรือเปลี่ยนแล้ว กรุณาโหลดหน้าใหม่"
    } else if (ora === 60 || ora === 54) {
      status = 409
      message = "ข้อมูลกำลังถูกแก้ไขจากคำขออื่น กรุณาลองใหม่"
    } else if (status >= 500) {
      console.error(
        "Server error:",
        error.code || error.name,
        error.message?.replaceAll(
          process.env.DB_PASSWORD || "__not_set__",
          "[hidden]",
        ),
      )
      message = "เชื่อมต่อหรือบันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่"
    }
    res.status(status).json({ message })
  })
  return app
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await connect()
    await transaction(ensureScreenCatalog)
    console.log("Daily rounds:", await ensureDailyRounds())
    const dailyTimer = setInterval(() => {
      void ensureDailyRounds()
        .then((result) => console.log("Daily rounds:", result))
        .catch((error) =>
          console.error("Daily rounds failed:", error.code || error.name),
        )
    }, 3600000)
    dailyTimer.unref()
    const app = createApp()
    const port = Number(process.env.PORT || 3001),
      host = process.env.HOST || "127.0.0.1"
    const server = app.listen(port, host, () =>
      console.log(
        `MUT Shuttle server: http://localhost:${port} (Oracle connected)`,
      ),
    )
    for (const signal of ["SIGINT", "SIGTERM"])
      process.on(signal, () =>
        server.close(() => close().finally(() => process.exit(0))),
      )
  } catch (error) {
    console.error("Cannot start server:", error.code || error.name)
    process.exitCode = 1
  }
}
