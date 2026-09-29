import { query } from "./db.js"
import { uniqueUsername } from "./auth.js"
import { hashPassword, requireThat, text, optional, screens } from "./domain.js"
export async function setupAdmin(db, data) {
  await db.execute("LOCK TABLE BUS_EMPLOYEES IN EXCLUSIVE MODE")
  requireThat(
    (await query(db, "SELECT COUNT(*) n FROM BUS_EMPLOYEES"))[0].n === 0,
    "ระบบมีบัญชีพนักงานแล้ว",
    409,
  )
  await referenceData(db)
  const binds = {
    fullName: text(data.fullName, "ชื่อ–นามสกุล"),
    username: text(data.username, "Username", 100).toLowerCase(),
    passwordHash: await hashPassword(data.password),
    phone: optional(data.phone, "เบอร์โทร", 30),
  }
  await uniqueUsername(db, binds.username)
  await db.execute(
    "INSERT INTO BUS_EMPLOYEES(employee_id,full_name,username,password_hash,phone,department_id,position_id) VALUES('E-ADMIN',:fullName,:username,:passwordHash,:phone,'ADM-03','ADMIN')",
    binds,
  )
}
export async function referenceData(db) {
  for (const [table, key, label, rows] of [
    [
      "BUS_DEPARTMENTS",
      "department_id",
      "department_name",
      [
        ["TRN-01", "ฝ่ายขนส่ง"],
        ["SRV-02", "ฝ่ายบริการ"],
        ["ADM-03", "ฝ่ายบริหาร"],
        ["ICT-04", "ฝ่ายเทคโนโลยี"],
      ],
    ],
    [
      "BUS_POSITIONS",
      "position_id",
      "position_name",
      [
        ["ADMIN", "Admin"],
        ["DRIVER", "คนขับรถ"],
        ["STAFF", "เจ้าหน้าที่"],
        ["MANAGER", "ผู้จัดการ"],
        ["ASSISTANT", "ผู้ช่วยผู้จัดการ"],
      ],
    ],
    ["BUS_SCREENS", "screen_id", "screen_name", screens],
  ])
    for (const [keyValue, name] of rows)
      await db.execute(
        `MERGE INTO ${table} d USING(SELECT :keyValue k,:name n FROM dual) s ON(d.${key}=s.k) WHEN NOT MATCHED THEN INSERT(${key},${label}) VALUES(s.k,s.n)`,
        { keyValue, name },
      )
  for (const positionId of ["ADMIN", "DRIVER", "STAFF", "MANAGER", "ASSISTANT"])
    for (const [screenId] of screens) {
      const view =
        positionId === "ADMIN" ||
        positionId === "MANAGER" ||
        (positionId === "DRIVER" && screenId === "driver") ||
        (positionId === "STAFF" &&
          ["admin-routes", "admin-schedule"].includes(screenId))
      await db.execute(
        "MERGE INTO BUS_POSITION_PERMISSIONS d USING(SELECT :positionId p,:screenId s FROM dual) x ON(d.position_id=x.p AND d.screen_id=x.s) WHEN NOT MATCHED THEN INSERT(permission_id,position_id,screen_id,can_view,can_modify) VALUES(:permissionId,:positionId,:screenId,:v,:v)",
        {
          positionId,
          screenId,
          permissionId: positionId + "-" + screenId,
          v: view ? 1 : 0,
        },
      )
    }
}
