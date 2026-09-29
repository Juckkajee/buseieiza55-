import { query, read, transaction } from "./db.js"
import { guard, uniqueUsername } from "./auth.js"
import { text, optional, requireThat, hashPassword } from "./domain.js"
import { nextRecordId } from "./record-ids.js"

export function userManagementRoutes(app) {
  app.get("/api/users", guard("admin-users"), async (req, res) => {
    res.json(
      await read((db) =>
        query(
          db,
          `SELECT u.user_id,u.full_name,u.username,u.phone,u.user_type,
      (SELECT COUNT(*) FROM BUS_BOOKINGS b WHERE b.user_id=u.user_id) booking_count
      FROM BUS_USERS u ORDER BY u.user_id`,
        ),
      ),
    )
  })
  const save = async (b, userId) => {
    const binds = {
      userId: userId || null,
      fullName: text(b.fullName, "ชื่อ–นามสกุล"),
      username: text(b.username, "Username", 100).toLowerCase(),
      phone: optional(b.phone, "เบอร์โทร", 30),
      userType: text(b.userType, "ประเภทผู้ใช้", 50),
    }
    requireThat(
      ["นักศึกษา", "เจ้าหน้าที่", "บุคคลทั่วไป"].includes(binds.userType),
      "ประเภทผู้ใช้ไม่ถูกต้อง",
    )
    if (!userId || b.password)
      binds.passwordHash = await hashPassword(b.password)
    return transaction(async (db) => {
      await uniqueUsername(db, binds.username, "-", userId || "-")
      if (userId) {
        const result = await db.execute(
          `UPDATE BUS_USERS SET full_name=:fullName,username=:username,phone=:phone,user_type=:userType${
            binds.passwordHash ? ",password_hash=:passwordHash" : ""
          } WHERE user_id=:userId`,
          binds,
        )
        requireThat(result.rowsAffected === 1, "ไม่พบผู้ใช้งาน", 404)
      } else {
        binds.userId = await nextRecordId(db, "U")
        await db.execute(
          "INSERT INTO BUS_USERS(user_id,full_name,username,password_hash,phone,user_type) VALUES(:userId,:fullName,:username,:passwordHash,:phone,:userType)",
          binds,
        )
      }
      return { userId: binds.userId }
    })
  }
  app.post("/api/users", guard("admin-users", true), async (req, res) =>
    res.json(await save(req.body)),
  )
  app.put("/api/users/:id", guard("admin-users", true), async (req, res) =>
    res.json(await save(req.body, req.params.id)),
  )
  app.delete("/api/users/:id", guard("admin-users", true), async (req, res) => {
    await transaction(async (db) => {
      const userId = req.params.id
      const [user] = await query(
        db,
        "SELECT user_id FROM BUS_USERS WHERE user_id=:userId FOR UPDATE",
        { userId },
      )
      requireThat(user, "ไม่พบผู้ใช้งาน", 404)
      const [{ n }] = await query(
        db,
        "SELECT COUNT(*) n FROM BUS_BOOKINGS WHERE user_id=:userId",
        { userId },
      )
      requireThat(
        n === 0,
        `ลบผู้ใช้นี้ไม่ได้ เนื่องจากมีประวัติการจอง ${n} รายการ รวมรายการที่ยกเลิกแล้ว กรุณาจัดการและลบประวัติที่หน้าจัดการการจองก่อน`,
        409,
      )
      await db.execute("DELETE FROM BUS_USERS WHERE user_id=:userId", {
        userId,
      })
    })
    res.json({ ok: true })
  })
}
