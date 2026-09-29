import assert from "node:assert/strict"
import { readFile, writeFile } from "node:fs/promises"
import { once } from "node:events"
import { connect, close, read, query, ts } from "../src/db.js"
import { createApp } from "../src/index.js"
import { validateDemo, DEMO_PREFIX } from "./report-demo-data.js"

// Read-only database verification. Login creates in-memory sessions only.
const receipt = JSON.parse(
  await readFile(
    new URL("../private/report-demo-2026.json", import.meta.url),
    "utf8",
  ),
)
let server
try {
  assert.equal(receipt.state, "committed")
  await connect()
  const result = await read(async (db) => {
    const binds = { pattern: DEMO_PREFIX + "%" }
    const employees = await query(
      db,
      "SELECT * FROM BUS_EMPLOYEES WHERE username LIKE :pattern ORDER BY employee_id",
      binds,
    )
    const users = await query(
      db,
      "SELECT * FROM BUS_USERS WHERE username LIKE :pattern ORDER BY user_id",
      binds,
    )
    const vehicles = await query(
      db,
      "SELECT DISTINCT v.* FROM BUS_VEHICLES v JOIN BUS_TRIP_ROUNDS t ON t.vehicle_id=v.vehicle_id JOIN BUS_EMPLOYEES e ON e.employee_id=t.driver_employee_id WHERE e.username LIKE :pattern",
      binds,
    )
    const trips = await query(
      db,
      `SELECT t.trip_id,t.route_id,t.vehicle_id,t.driver_employee_id driver_id,${ts("t.departure_at")} departure_at,t.status FROM BUS_TRIP_ROUNDS t JOIN BUS_EMPLOYEES e ON e.employee_id=t.driver_employee_id WHERE e.username LIKE :pattern ORDER BY t.departure_at,t.route_id`,
      binds,
    )
    const bookings = await query(
      db,
      `SELECT b.booking_id,b.trip_id,b.user_id,b.status,${ts("b.booked_at")} booked_at,b.cancellation_reason,${ts("b.cancelled_at")} cancelled_at,b.cancelled_by FROM BUS_BOOKINGS b JOIN BUS_USERS u ON u.user_id=b.user_id WHERE u.username LIKE :pattern`,
      binds,
    )
    const tickets = await query(
      db,
      `SELECT d.booking_id,d.ticket_no,d.trip_id,d.vehicle_id,d.pickup_route_stop_id pickup_id,d.dropoff_route_stop_id dropoff_id,d.seat_number,d.status,d.qr_token,${ts("d.travel_at")} travel_at,${ts("d.checked_in_at")} checked_in_at FROM BUS_BOOKING_DETAILS d JOIN BUS_BOOKINGS b ON b.booking_id=d.booking_id JOIN BUS_USERS u ON u.user_id=b.user_id WHERE u.username LIKE :pattern`,
      binds,
    )
    const events = await query(
      db,
      `SELECT ev.event_id,ev.trip_id,ev.route_stop_id,ev.event_type,${ts("ev.event_at")} event_at FROM BUS_TRIP_EVENTS ev JOIN BUS_TRIP_ROUNDS t ON t.trip_id=ev.trip_id JOIN BUS_EMPLOYEES e ON e.employee_id=t.driver_employee_id WHERE e.username LIKE :pattern`,
      binds,
    )
    const routes = await query(
        db,
        "SELECT * FROM BUS_ROUTES WHERE route_id IN ('R001','R002','R003') ORDER BY route_id",
      ),
      stops = await query(
        db,
        "SELECT * FROM BUS_ROUTE_STOPS ORDER BY route_id,stop_sequence",
      )
    for (const a of [...employees, ...users])
      assert(
        a.fullName &&
          a.phone &&
          a.username &&
          a.passwordHash.startsWith("scrypt$"),
      )
    for (const e of employees) assert(e.email && e.departmentId && e.positionId)
    assert.equal(
      new Set([...employees, ...users].map((a) => a.passwordHash)).size,
      508,
    )
    const summary = validateDemo(
      { employees, users, vehicles, trips, bookings, tickets, events },
      { routes, stops, now: receipt.createdAt },
    )
    assert.equal(summary.bookings, receipt.summary.bookings)
    assert.equal(summary.tickets, receipt.summary.tickets)
    const tripIds = new Set(trips.map((t) => t.tripId)),
      eventTripIds = new Set(events.map((e) => e.tripId))
    assert(events.every((e) => tripIds.has(e.tripId)))
    assert.equal(eventTripIds.size, summary.tripStatuses.COMPLETED)
    console.log(
      "Oracle validation passed: counts, full profiles, independent password salts, all 450 users, all 25 drivers/vehicles, seats, stop order, timestamps, events and 12 months.",
    )
    return { summary, tripIds: [...tripIds] }
  })
  server = createApp().listen(0, "127.0.0.1")
  await once(server, "listening")
  const base = `http://127.0.0.1:${server.address().port}/api`
  const login = async (username, expectedRole) => {
    const r = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shuttle-Client": "1" },
      body: JSON.stringify({ username, password: receipt.password }),
    })
    assert.equal(r.status, 200)
    const data = await r.json()
    assert.equal(data.user.role, expectedRole)
    assert(!JSON.stringify(data).includes("scrypt$"))
    console.log("Login passed:", username, "role=" + data.user.role)
    return r.headers.get("set-cookie").split(";")[0]
  }
  const get = async (path, cookie) => {
    const r = await fetch(base + path, { headers: { cookie } })
    assert.equal(r.status, 200)
    return r.json()
  }
  const admin = await login("demo26.admin01", "admin")
  const report = await get("/reports?year=2026", admin)
  assert(report.monthly.every((m) => m.bookings > 0))
  assert(report.routes.every((r) => r.bookings > 0))
  assert.equal(
    report.summary.bookings,
    result.summary.bookings + receipt.beforeCounts.bookings,
  )
  const start = performance.now(),
    all = await get("/admin/bookings", admin),
    elapsedMs = Math.round(performance.now() - start)
  assert.equal(all.length, report.summary.bookings)
  assert.equal(
    all.reduce((n, b) => n + b.tickets.length, 0),
    report.summary.seats,
  )
  assert(all.every((b) => b.tickets.length >= 1 && b.tickets.length <= 4))
  assert(!JSON.stringify(all).includes("passwordHash"))
  const user = await login("demo26.user001", "user"),
    mine = await get("/bookings", user)
  assert(mine.length > 0)
  assert(mine.every((b) => b.username === "demo26.user001"))
  assert(mine.some((b) => b.status === "CANCELLED" && b.cancellationReason))
  const driver = await login("demo26.driver01", "driver"),
    driverJobs = await get("/trips?date=2026-09-30", driver)
  assert(
    driverJobs.every(
      (t) =>
        t.driverEmployeeId ===
        receipt.accounts.find((a) => a.username === "demo26.driver01")
          .employeeId,
    ),
  )
  await login("demo26.staff01", "admin")
  await writeFile(
    new URL("../private/report-demo-2026-verification.json", import.meta.url),
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        readOnly: true,
        summary: result.summary,
        report,
        adminBookingsApiMs: elapsedMs,
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify(
      {
        reportSummary: report.summary,
        monthly: report.monthly,
        adminBookingsApiMs: elapsedMs,
        checks: "passed",
      },
      null,
      2,
    ),
  )
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  await close()
}
