import { requireThat } from "./domain.js"

export const protectedAdminId = "E-ADMIN"
export function assertEmployeeDelete(actor, targetId, positionId) {
  requireThat(targetId !== protectedAdminId, "ไม่สามารถลบบัญชีผู้ดูแลหลัก E-ADMIN", 403)
  requireThat(targetId !== actor.id, "ไม่สามารถลบบัญชีที่กำลังใช้งาน", 403)
  requireThat(positionId !== "ADMIN" || (actor.kind === "employee" && actor.id === protectedAdminId && actor.positionId === "ADMIN"), "เฉพาะ E-ADMIN เท่านั้นที่ลบบัญชี Admin อื่นได้", 403)
}
export function assertEmployeeEdit(actor, targetId) {
  requireThat(targetId !== protectedAdminId || (actor.kind === "employee" && actor.id === protectedAdminId && actor.positionId === "ADMIN"), "เฉพาะ E-ADMIN เท่านั้นที่แก้ไขบัญชีผู้ดูแลหลักได้", 403)
}
