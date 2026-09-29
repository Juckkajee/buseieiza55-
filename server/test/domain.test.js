import test from "node:test"
import assert from "node:assert/strict"
import {
  seats,
  stopOrder,
  overlaps,
  date,
  timestamp,
  hashPassword,
  verifyPassword,
} from "../src/domain.js"
test("seat limits, duplicates and vehicle capacity are enforced", () => {
  assert.deepEqual(seats([1, 2], 9), ["1", "2"])
  for (const value of [[], [1, 1], [1, 2, 3, 4, 5], [10], ["A1"], [-1], [1.5]])
    assert.throws(() => seats(value, 9))
})
test("repeated physical stop names still use route-stop IDs and direction", () => {
  const stops = [
    { routeStopId: "a", stopSequence: 1, minutesFromPrev: 0 },
    { routeStopId: "b", stopSequence: 2, minutesFromPrev: 5 },
    { routeStopId: "c", stopSequence: 3, minutesFromPrev: 7 },
  ]
  assert.equal(stopOrder(stops, "b", "c"), 5)
  assert.throws(() => stopOrder(stops, "c", "a"))
  assert.throws(() => stopOrder(stops, "a", "a"))
  assert.throws(() => stopOrder(stops, "missing", "c"))
})
test("schedule overlap handles midnight and permits touching endpoints", () => {
  assert.equal(
    overlaps("2026-09-28T23:50:00", 30, "2026-09-29T00:05:00", 15),
    true,
  )
  assert.equal(
    overlaps("2026-09-28T09:00:00", 30, "2026-09-28T09:30:00", 30),
    false,
  )
})
test("dates and time inputs reject normalized invalid calendar values", () => {
  assert.equal(date("2028-02-29"), "2028-02-29")
  assert.throws(() => date("2026-02-29"))
  assert.throws(() => timestamp("2026-09-28T25:00"))
  assert.equal(timestamp("2026-09-28T09:30"), "2026-09-28T09:30:00")
})
test("password hashes are salted and never authenticate incorrect passwords", async () => {
  const a = await hashPassword("Test-Password!"),
    b = await hashPassword("Test-Password!")
  assert.notEqual(a, b)
  assert.equal(await verifyPassword("Test-Password!", a), true)
  assert.equal(await verifyPassword("wrong", a), false)
  assert.equal(await verifyPassword("1234", "1234"), false)
})
