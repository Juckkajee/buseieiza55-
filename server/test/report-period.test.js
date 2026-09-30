import test from "node:test"
import assert from "node:assert/strict"
import {
  reportPeriod,
  reportTimeline,
  summarizeTickets,
} from "../src/report-period.js"

test("report ranges use exclusive calendar boundaries, including leap years and December", () => {
  assert.deepEqual(reportPeriod({ year: "2026" }), {
    period: "year",
    year: 2026,
    fromDate: "2026-01-01",
    toDate: "2027-01-01",
  })
  for (const [input, from, to] of [
    [{ period: "day", date: "2026-12-31" }, "2026-12-31", "2027-01-01"],
    [{ period: "day", date: "2028-02-29" }, "2028-02-29", "2028-03-01"],
    [{ period: "month", year: 2026, month: 12 }, "2026-12-01", "2027-01-01"],
    [{ period: "month", year: 2028, month: 2 }, "2028-02-01", "2028-03-01"],
  ]) {
    const range = reportPeriod(input)
    assert.equal(range.fromDate, from)
    assert.equal(range.toDate, to)
  }
  for (const input of [
    { period: "week", year: 2026 },
    { period: "day", date: "2026-02-29" },
    { period: "month", year: 2026, month: 13 },
    { period: "day", date: "" },
    { period: "day", date: "1999-01-01" },
    { period: "year", year: "NaN" },
  ])
    assert.throws(() => reportPeriod(input), { status: 400 })
})

test("all timeline granularities preserve seat totals, distinct bookings and zero buckets", () => {
  const tickets = [
    {
      bookingId: "A",
      departureAt: "2028-02-29T00:00:00",
      status: "COMPLETED",
      checkedInAt: "2028-02-28T23:59:00",
    },
    { bookingId: "A", departureAt: "2028-02-29T00:00:00", status: "NO_SHOW" },
    { bookingId: "B", departureAt: "2028-02-29T23:59:59", status: "CANCELLED" },
  ]
  assert.deepEqual(summarizeTickets(tickets), {
    bookings: 2,
    seats: 3,
    cancelled: 1,
    checkin: 1,
    noshow: 1,
  })
  for (const [params, count] of [
    [{ period: "year", year: 2028 }, 12],
    [{ period: "month", year: 2028, month: 2 }, 29],
    [{ period: "day", date: "2028-02-29" }, 24],
  ]) {
    const rows = reportTimeline(tickets, reportPeriod(params))
    assert.equal(rows.length, count)
    for (const key of ["seats", "bookings", "cancelled", "checkin", "noshow"])
      assert.equal(
        rows.reduce((sum, row) => sum + row[key], 0),
        summarizeTickets(tickets)[key],
      )
    assert(rows.some((r) => r.seats === 0))
  }
  assert.equal(
    reportTimeline(
      tickets,
      reportPeriod({ period: "day", date: "2028-03-01" }),
    ).every((r) => r.seats === 0),
    true,
  )
  assert.equal(
    reportTimeline([], reportPeriod({ period: "month", year: 2026, month: 2 }))
      .length,
    28,
  )
})
