import test from "node:test"
import assert from "node:assert/strict"
import { reportPeriod, reportTimeline } from "../src/report-period.js"
import { requirementReports } from "../src/report-requirements.js"

test("custom ranges include the last date, cross years, validate dates and reject reversed/unbounded ranges", () => {
  for (const [input, from, to] of [
    [
      { period: "months", fromMonth: "2025-12", toMonth: "2026-02" },
      "2025-12-01",
      "2026-03-01",
    ],
    [
      { period: "months", fromMonth: "2028-02", toMonth: "2028-02" },
      "2028-02-01",
      "2028-03-01",
    ],
    [
      { period: "range", fromDate: "2026-12-31", endDate: "2027-01-01" },
      "2026-12-31",
      "2027-01-02",
    ],
    [
      { period: "range", fromDate: "2028-02-29", endDate: "2028-02-29" },
      "2028-02-29",
      "2028-03-01",
    ],
  ]) {
    const range = reportPeriod(input)
    assert.equal(range.fromDate, from)
    assert.equal(range.toDate, to)
  }
  for (const input of [
    { period: "months", fromMonth: "2026-13", toMonth: "2027-01" },
    { period: "months", fromMonth: "2026-03", toMonth: "2026-02" },
    { period: "months", fromMonth: "2026-1", toMonth: "2026-02" },
    { period: "range", fromDate: "2026-02-29", endDate: "2026-03-01" },
    { period: "range", fromDate: "2026-04-02", endDate: "2026-04-01" },
    { period: "range", fromDate: "2020-01-01", endDate: "2026-01-01" },
    { period: "months", fromMonth: "1999-12", toMonth: "2000-02" },
    { period: "range", fromDate: "2026-01-01", endDate: "" },
  ])
    assert.throws(() => reportPeriod(input), { status: 400 })
})

test("partial-month ranges exclude out-of-range days even when sharing a monthly bucket", () => {
  const range = reportPeriod({
    period: "range",
    fromDate: "2025-12-20",
    endDate: "2026-03-03",
  })
  const dates = ["2025-12-19", "2025-12-20", "2026-03-03", "2026-03-04"]
  const rows = reportTimeline(
    dates.map((d, i) => ({
      bookingId: String(i),
      departureAt: d + "T12:00:00",
      status: "CONFIRMED",
    })),
    range,
  )
  assert.equal(rows.length, 4)
  assert.deepEqual(
    rows.map((r) => r.seats),
    [1, 0, 0, 1],
  )
  assert.notEqual(rows[0].name, rows[3].name)
})

test("reports 1–5 count seats, separate duplicate user names, combine Mondays and keep repeated stop times distinct", () => {
  const range = reportPeriod({
    period: "range",
    fromDate: "2026-09-07",
    endDate: "2026-09-14",
  })
  const trips = [
    {
      tripId: "T1",
      routeId: "R1",
      departureAt: "2026-09-07T09:30:00",
      status: "COMPLETED",
    },
    {
      tripId: "T2",
      routeId: "R1",
      departureAt: "2026-09-14T09:30:00",
      status: "IN_PROGRESS",
    },
    {
      tripId: "T3",
      routeId: "R2",
      departureAt: "2026-09-08T23:55:00",
      status: "SCHEDULED",
    },
  ]
  const stops = [
    { stopId: "A", stopName: "มหาวิทยาลัย" },
    { stopId: "B", stopName: "โลตัส" },
  ]
  const routes = [
    { routeId: "R1", routeName: "เส้นทาง 1" },
    { routeId: "R2", routeName: "เส้นทาง 2" },
  ]
  const routeStops = [
    {
      routeStopId: "A1",
      routeId: "R1",
      stopId: "A",
      stopName: "มหาวิทยาลัย",
      offsetMinutes: 0,
    },
    {
      routeStopId: "B1",
      routeId: "R1",
      stopId: "B",
      stopName: "โลตัส",
      offsetMinutes: 5,
    },
    {
      routeStopId: "A2",
      routeId: "R1",
      stopId: "A",
      stopName: "มหาวิทยาลัย",
      offsetMinutes: 15,
    },
    {
      routeStopId: "B2",
      routeId: "R2",
      stopId: "B",
      stopName: "โลตัส",
      offsetMinutes: 10,
    },
  ]
  const base = {
    bookingId: "BK1",
    userId: "U1",
    userName: "ชื่อซ้ำ",
    stopId: "A",
    dropoffStopId: "A",
    pickupRouteStopId: "A1",
    dropoffRouteStopId: "A2",
    routeId: "R1",
    tripId: "T1",
    departureAt: trips[0].departureAt,
    tripStatus: "COMPLETED",
    checkedInAt: "2026-09-07T09:25:00",
    status: "COMPLETED",
  }
  const tickets = [
    { ...base },
    { ...base },
    {
      ...base,
      bookingId: "BK2",
      userId: "U2",
      status: "CANCELLED",
      checkedInAt: null,
    },
    { ...base, bookingId: "BK3", status: "NO_SHOW", checkedInAt: null },
    {
      ...base,
      bookingId: "BK4",
      tripId: "T2",
      departureAt: trips[1].departureAt,
      tripStatus: "IN_PROGRESS",
      status: "CHECKED_IN",
    },
    {
      ...base,
      bookingId: "BK5",
      tripId: "T2",
      departureAt: trips[1].departureAt,
      tripStatus: "IN_PROGRESS",
      status: "CONFIRMED",
      checkedInAt: null,
    },
  ]
  const r = requirementReports(tickets, trips, stops, routes, routeStops, range)
  assert.deepEqual(r.movementSummary, { up: 3, down: 2 })
  assert.equal(
    r.movements.reduce((n, b) => n + b.s0Up, 0),
    3,
  )
  assert.equal(
    r.movements.reduce((n, b) => n + b.s0Down, 0),
    2,
  )
  assert.equal(r.behavior.length, 2)
  const u = r.behavior.find((u) => u.userId === "U1")
  assert.equal(u.bookings, 4)
  assert.equal(u.seats, 5)
  assert.equal(u.pending, 1)
  assert.equal(r.routeWeekdays.length, 7)
  assert.equal(r.routeWeekdays[0].name, "จันทร์")
  assert.equal(r.routeWeekdays[0].r0, 3)
  assert.equal(r.routeWeekdays[1].total, 0)
  assert.equal(
    r.stopTimes.find((s) => s.stopId === "A" && s.time === "09:30").up,
    3,
  )
  assert.equal(
    r.stopTimes.find((s) => s.stopId === "A" && s.time === "09:45").down,
    2,
  )
  assert.equal(
    r.stopTimes.find((s) => s.stopId === "B" && s.time === "00:05").up,
    0,
  )
  for (const k of ["up", "down"])
    assert.equal(
      r.stopTimes.reduce((n, s) => n + s[k], 0),
      r.movementSummary[k],
    )
  const empty = requirementReports([], [], stops, routes, routeStops, range)
  assert.deepEqual(empty.behavior, [])
  assert.deepEqual(empty.stopTimes, [])
  assert(empty.routeWeekdays.every((r) => r.total === 0))
})
