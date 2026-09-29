import { query, capabilities } from "./db.js"
import { id } from "./domain.js"

const records = {
  E: ["BUS_SEQ_EMPLOYEE", "BUS_EMPLOYEES", "EMPLOYEE_ID"],
  U: ["BUS_SEQ_USER", "BUS_USERS", "USER_ID"],
  BK: ["BUS_SEQ_BOOKING", "BUS_BOOKINGS", "BOOKING_ID"],
  V: ["BUS_SEQ_VEHICLE", "BUS_VEHICLES", "VEHICLE_ID"],
  R: ["BUS_SEQ_ROUTE", "BUS_ROUTES", "ROUTE_ID"],
  S: ["BUS_SEQ_STOP", "BUS_STOPS", "STOP_ID"],
  RS: ["BUS_SEQ_ROUTE_STOP", "BUS_ROUTE_STOPS", "ROUTE_STOP_ID"],
  T: ["BUS_SEQ_TRIP", "BUS_TRIP_ROUNDS", "TRIP_ID"],
  POS: ["BUS_SEQ_POSITION", "BUS_POSITIONS", "POSITION_ID"],
}
export function formatRecordId(prefix, value) {
  if (!records[prefix] || !Number.isSafeInteger(value) || value < 1 || value > 999999999) throw new Error("Invalid record ID")
  return prefix + String(value).padStart(3, "0")
}
export async function nextRecordId(db, prefix) {
  const spec = records[prefix]
  if (!spec) throw new Error("Unknown record ID prefix")
  // Keep the existing app usable until the owner approves/install sequences.
  if (!capabilities.readableIds) return id(prefix)
  const [sequence, table, column] = spec
  for (let retry = 0; retry < 100; retry++) {
    const [row] = await query(db, `SELECT ${sequence}.NEXTVAL n FROM dual`)
    const value = formatRecordId(prefix, row.n)
    if (!(await query(db, `SELECT ${column} FROM ${table} WHERE ${column}=:value`, {value})).length) return value
  }
  throw new Error("Sequence conflicts with manually imported IDs; inspect sequence position")
}
