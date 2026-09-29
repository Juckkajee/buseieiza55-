import { randomBytes } from "node:crypto"
import { query, read, transaction } from "./db.js"
import { nextRecordId } from "./record-ids.js"
import {
  HttpError,
  requireThat,
  text,
  optional,
  hashPassword,
  verifyPassword,
} from "./domain.js"
const sessions = new Map(),
  attempts = new Map()
const lifetime = 8 * 3600000
setInterval(() => {
  for (const [k, v] of sessions) if (v.expires < Date.now()) sessions.delete(k)
  for (const [k, v] of attempts) if (v.until < Date.now()) attempts.delete(k)
}, 60000).unref()
export async function profile(db, kind, accountId) {
  if (kind === "user") {
    const [row] = await query(
      db,
      "SELECT user_id,full_name,username,phone,user_type FROM BUS_USERS WHERE user_id=:accountId",
      { accountId },
    )
    return row
      ? { ...row, id: row.userId, role: "user", kind: "user", permissions: {} }
      : null
  }
  const [row] = await query(
    db,
    `SELECT e.employee_id,e.full_name,e.username,e.phone,e.email,e.position_id,p.position_name FROM BUS_EMPLOYEES e JOIN BUS_POSITIONS p ON p.position_id=e.position_id WHERE employee_id=:accountId`,
    { accountId },
  )
  if (!row) return null
  const rows = await query(
    db,
    "SELECT screen_id,can_view,can_modify FROM BUS_POSITION_PERMISSIONS WHERE position_id=:positionId",
    { positionId: row.positionId },
  )
  const permissions = Object.fromEntries(
    rows.map((p) => [p.screenId, { view: !!p.canView, modify: !!p.canModify }]),
  )
  return {
    ...row,
    id: row.employeeId,
    kind: "employee",
    role: row.positionId === "DRIVER" ? "driver" : "admin",
    permissions,
  }
}
export function allowed(user, screen, modify = false) {
  return (
    user?.kind === "employee" &&
    (user.positionId === "ADMIN" ||
      !!user.permissions[screen]?.[modify ? "modify" : "view"])
  )
}
export const guard =
  (screen, modify = false) =>
  (req, res, next) => {
    if (!allowed(req.user, screen, modify))
      return next(new HttpError(403, "ไม่มีสิทธิ์ดำเนินการในหน้านี้"))
    next()
  }
export async function authenticate(req, res, next) {
  const token = (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("bus_sid="))
    ?.slice(8)
  const session = token && sessions.get(token)
  if (!session || session.expires < Date.now())
    throw new HttpError(401, "กรุณาเข้าสู่ระบบ")
  req.sessionToken = token
  req.user = await read((db) => profile(db, session.kind, session.id))
  if (!req.user) throw new HttpError(401, "ไม่พบบัญชีผู้ใช้")
  next()
}
function rateLimit(req) {
  const key = req.ip
  let item = attempts.get(key)
  if (!item || item.until < Date.now()) {
    item = { count: 0, until: Date.now() + 15 * 60000 }
    attempts.set(key, item)
  }
  requireThat(++item.count <= 30, "ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที", 429)
}
function signIn(res, user) {
  const token = randomBytes(32).toString("hex")
  sessions.set(token, {
    kind: user.kind,
    id: user.id,
    expires: Date.now() + lifetime,
  })
  res.cookie("bus_sid", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    maxAge: lifetime,
    path: "/api",
  })
  res.json({ user })
}
export function authRoutes(app) {
  app.post("/api/auth/login", async (req, res) => {
    rateLimit(req)
    const username = text(req.body.username, "ชื่อผู้ใช้", 100).toLowerCase()
    const result = await read(async (db) => {
      const matches = await query(
        db,
        `SELECT employee_id account_id,password_hash,'employee' account_kind FROM BUS_EMPLOYEES WHERE LOWER(username)=:username
         UNION ALL SELECT user_id account_id,password_hash,'user' account_kind FROM BUS_USERS WHERE LOWER(username)=:username`,
        { username },
      )
      requireThat(
        matches.length <= 1,
        "Username นี้ซ้ำระหว่างบัญชี กรุณาติดต่อ Admin เพื่อแก้ชื่อ",
        409,
      )
      const row = matches[0]
      requireThat(
        row && (await verifyPassword(req.body.password, row.passwordHash)),
        "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        401,
      )
      return profile(db, row.accountKind, row.accountId)
    })
    signIn(res, result)
  })
  app.post("/api/auth/register", async (req, res) => {
    rateLimit(req)
    const b = req.body
    const binds = {
      userId: null,
      fullName: text(b.fullName, "ชื่อ–นามสกุล"),
      username: text(b.username, "ชื่อผู้ใช้", 100).toLowerCase(),
      phone: optional(b.phone, "เบอร์โทร", 30),
      userType: text(b.userType, "ประเภทผู้ใช้", 50),
      passwordHash: await hashPassword(b.password),
    }
    requireThat(
      ["นักศึกษา", "เจ้าหน้าที่", "บุคคลทั่วไป"].includes(binds.userType),
      "ประเภทผู้ใช้ไม่ถูกต้อง",
    )
    const user = await transaction(async (db) => {
      await uniqueUsername(db, binds.username)
      binds.userId = await nextRecordId(db, "U")
      await db.execute(
        "INSERT INTO BUS_USERS(user_id,full_name,username,password_hash,phone,user_type) VALUES(:userId,:fullName,:username,:passwordHash,:phone,:userType)",
        binds,
      )
      return profile(db, "user", binds.userId)
    })
    signIn(res, user)
  })
  app.get("/api/auth/me", authenticate, (req, res) =>
    res.json({ user: req.user }),
  )
  app.post("/api/auth/logout", authenticate, (req, res) => {
    sessions.delete(req.sessionToken)
    res.clearCookie("bus_sid", { path: "/api" })
    res.json({ ok: true })
  })
}
export async function uniqueUsername(
  db,
  username,
  employeeId = "-",
  userId = "-",
) {
  await db.execute("LOCK TABLE BUS_EMPLOYEES IN SHARE ROW EXCLUSIVE MODE")
  await db.execute("LOCK TABLE BUS_USERS IN SHARE ROW EXCLUSIVE MODE")
  const matches = await query(
    db,
    `SELECT employee_id account_id FROM BUS_EMPLOYEES WHERE LOWER(username)=:username AND employee_id<>:employeeId
    UNION ALL SELECT user_id account_id FROM BUS_USERS WHERE LOWER(username)=:username AND user_id<>:userId`,
    { username, employeeId, userId },
  )
  requireThat(matches.length === 0, "Username นี้ถูกใช้แล้วในระบบ", 409)
}
