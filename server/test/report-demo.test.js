import test from "node:test"
import assert from "node:assert/strict"
import { generateDemo, validateDemo } from "../scripts/report-demo-data.js"

const routes = [1, 2, 3].map((i) => ({ routeId: "R00" + i, totalMinutes: 15 })),
  stops = routes.flatMap((r) =>
    Array.from({ length: 4 }, (_, i) => ({
      routeId: r.routeId,
      routeStopId: r.routeId + "-S" + (i + 1),
      stopSequence: i + 1,
      minutesFromPrev: i ? 5 : 0,
    })),
  )
const context = { routes, stops, now: "2026-09-29T13:30:00" }
test("annual demo preserves travel, cancellation, capacity and event chronology; covers all new accounts and 12 months", () => {
  const data = generateDemo({
      ...context,
      starts: { E: 5, U: 1, V: 5, BK: 10, T: 100 },
    }),
    summary = validateDemo(data, context)
  assert.equal(data.employees[0].employeeId, "E006")
  assert.equal(data.users[0].userId, "U002")
  assert.equal(summary.monthly.length, 12)
  assert(summary.monthly.every((m) => m.bookings > 0 && m.trips > 0))
  for (const status of ["CANCELLED", "COMPLETED", "NO_SHOW", "CONFIRMED"])
    assert(summary.bookingStatuses[status] > 0)
  assert.equal(summary.employees.DRIVER, 25)
  assert.equal(summary.employees.ADMIN, 3)
  assert.equal(summary.employees.STAFF, 30)
  const broken = structuredClone(data)
  broken.tickets[0].seatNumber = "999"
  assert.throws(() => validateDemo(broken, context))
})
