import {
  randomUUID,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto"
import { promisify } from "node:util"
const scrypt = promisify(scryptCb)
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
export function requireThat(condition, message, status = 400) {
  if (!condition) throw new HttpError(status, message)
}
export const id = (prefix) =>
  prefix + "-" + randomUUID().replaceAll("-", "").slice(0, 24)
export function text(value, label, max = 200) {
  requireThat(typeof value === "string", `กรุณาระบุ${label}`)
  const result = value.trim()
  requireThat(
    result.length > 0 && result.length <= max,
    `${label}ต้องมี 1–${max} ตัวอักษร`,
  )
  return result
}
export function optional(value, label, max = 200) {
  return value == null || value === "" ? null : text(value, label, max)
}
export function integer(value, label, min = 0, max = 9999) {
  const n = Number(value)
  requireThat(
    Number.isInteger(n) && n >= min && n <= max,
    `${label}ต้องอยู่ระหว่าง ${min}–${max}`,
  )
  return n
}
export function date(value) {
  requireThat(
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
    "วันที่ไม่ถูกต้อง",
  )
  const parsed = new Date(value + "T00:00:00Z")
  requireThat(
    Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value,
    "วันที่ไม่ถูกต้อง",
  )
  return value
}
export function timestamp(value) {
  requireThat(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value),
    "วันเวลาไม่ถูกต้อง",
  )
  date(value.slice(0, 10))
  requireThat(
    Number(value.slice(11, 13)) < 24 &&
      Number(value.slice(14, 16)) < 60 &&
      Number(value.slice(17, 19) || 0) < 60,
    "เวลาไม่ถูกต้อง",
  )
  return value.length === 16 ? value + ":00" : value
}
export const bangkokNow = () =>
  new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 19)
export const epoch = (value) => new Date(value + "+07:00").getTime()
export const overlaps = (startA, minutesA, startB, minutesB) =>
  epoch(startA) < epoch(startB) + minutesB * 60000 &&
  epoch(startB) < epoch(startA) + minutesA * 60000
export function seats(value, capacity) {
  requireThat(
    Array.isArray(value) && value.length >= 1 && value.length <= 4,
    "จองครั้งละ 1–4 ที่นั่ง",
  )
  const result = value.map((v) => String(integer(v, "เลขที่นั่ง", 1, capacity)))
  requireThat(new Set(result).size === result.length, "มีที่นั่งซ้ำในรายการ")
  return result
}
export function stopOrder(stops, pickupId, dropoffId) {
  const pickup = stops.find((s) => s.routeStopId === pickupId),
    dropoff = stops.find((s) => s.routeStopId === dropoffId)
  requireThat(
    pickup && dropoff && pickup.stopSequence < dropoff.stopSequence,
    "จุดขึ้นและจุดลงต้องอยู่ในเส้นทางนี้ และจุดลงอยู่หลังจุดขึ้น",
  )
  return stops
    .filter((s) => s.stopSequence <= pickup.stopSequence)
    .reduce((sum, s) => sum + s.minutesFromPrev, 0)
}
export async function hashPassword(value) {
  requireThat(
    typeof value === "string" && value.length >= 8 && value.length <= 128,
    "รหัสผ่านต้องมี 8–128 ตัวอักษร",
  )
  const salt = randomBytes(16).toString("hex"),
    derived = await scrypt(value, salt, 64)
  return `scrypt$${salt}$${derived.toString("hex")}`
}
export async function verifyPassword(value, stored) {
  if (
    typeof value !== "string" ||
    value.length > 128 ||
    typeof stored !== "string"
  )
    return false
  const [kind, salt, hash] = stored.split("$")
  if (kind !== "scrypt" || !salt || !/^[a-f0-9]{128}$/.test(hash || ""))
    return false
  return timingSafeEqual(
    await scrypt(value, salt, 64),
    Buffer.from(hash, "hex"),
  )
}
export const screens = [
  ["admin-routes", "จัดการเส้นทาง"],
  ["admin-schedule", "ตารางเดินรถ"],
  ["admin-employees", "จัดการพนักงาน"],
  ["admin-vehicles", "ข้อมูลรถ"],
  ["admin-permissions", "สิทธิ์การเข้าถึง"],
  ["reports", "รายงาน"],
  ["driver", "ตารางงานคนขับ"],
]
