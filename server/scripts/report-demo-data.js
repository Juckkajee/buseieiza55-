import assert from "node:assert/strict"
import { id } from "../src/domain.js"

// Synthetic people and activity only. No external personal-data sources.
export const DEMO_PREFIX = "demo26."
export const DEMO_BATCH = "report-demo-2026"
const firstNames = [
  "กิตติ",
  "ณัฐพล",
  "ธนกร",
  "ศุภชัย",
  "วีรภัทร",
  "ปกรณ์",
  "ภาคิน",
  "ชานนท์",
  "อนุชา",
  "ธนวัฒน์",
  "สุรศักดิ์",
  "พีรพัฒน์",
  "วรุตม์",
  "ธีรภัทร",
  "กวิน",
  "ปริญญา",
  "นครินทร์",
  "ศราวุธ",
  "ปิยวัฒน์",
  "อัครพล",
  "ณัฐวุฒิ",
  "พงศกร",
  "ธนากร",
  "ชัยวัฒน์",
  "นรวิชญ์",
  "ศิริพร",
  "กมลชนก",
  "ณัฐธิดา",
  "สุชาดา",
  "พรทิพย์",
  "นภัสสร",
  "ปวีณา",
  "วราภรณ์",
  "อรทัย",
  "ชลธิชา",
  "พิมพ์ชนก",
  "มนัสนันท์",
  "กัญญารัตน์",
  "จิราพร",
  "รัตนาภรณ์",
  "อภิญญา",
  "ธัญญารัตน์",
  "วิภาวี",
  "สุพัตรา",
  "วรรณวิสา",
  "ปิยธิดา",
  "อรปรียา",
  "นฤมล",
  "ศศิธร",
  "ปาริชาติ",
]
const lastNames = [
  "สุขสวัสดิ์",
  "วัฒนากุล",
  "ศรีประเสริฐ",
  "รุ่งเรืองกิจ",
  "ทองประเสริฐ",
  "บุญรักษา",
  "แก้ววิชัย",
  "ชูเกียรติ",
  "จันทร์กระจ่าง",
  "อินทรรักษ์",
  "พัฒนพงศ์",
  "สุวรรณศรี",
  "เกษมสุข",
  "ประเสริฐผล",
  "ชัยมงคล",
  "อรุณสวัสดิ์",
  "ศรีวิไล",
  "เจริญทรัพย์",
  "รัตนกุล",
  "พิพัฒน์ชัย",
  "ธนาสกุล",
  "วงศ์สวัสดิ์",
  "พูลสวัสดิ์",
  "สุนทรกุล",
  "ตั้งเจริญ",
  "ศรีสมบัติ",
  "อ่อนน้อม",
  "คงเจริญ",
  "มณีรัตน์",
  "บุญส่ง",
]
const minute = 60000,
  dayMs = 86400000
const time = (s) => Date.parse(s + "Z") // wall-clock Bangkok values, no host TZ conversion
const stamp = (ms) => new Date(ms).toISOString().slice(0, 19)
const plus = (s, m) => stamp(time(s) + m * minute)
export const demoFullName = (i) =>
  firstNames[i % firstNames.length] +
  " " +
  lastNames[(i * 7 + Math.floor(i / firstNames.length) * 3) % lastNames.length]
const tally = (rows, key) =>
  rows.reduce((m, r) => ((m[r[key]] = (m[r[key]] || 0) + 1), m), {})

export function generateDemo({ routes, stops, now, starts = {} }) {
  assert(now.startsWith("2026-"), "This reviewed dataset is for the year 2026")
  assert.equal(routes.length, 3)
  let seed = 20260929
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const integer = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1))
  const choose = (a) => a[integer(0, a.length - 1)]
  const next = (prefix) =>
    prefix +
    String((starts[prefix] = (starts[prefix] || 0) + 1)).padStart(3, "0")
  const employees = [],
    users = [],
    vehicles = [],
    trips = [],
    bookings = [],
    tickets = [],
    events = []
  for (const [kind, count, departmentId, positionId] of [
    ["driver", 25, "TRN-01", "DRIVER"],
    ["admin", 3, "ADM-03", "ADMIN"],
    ["staff", 30, "SRV-02", "STAFF"],
  ]) {
    for (let i = 1; i <= count; i++) {
      const n = employees.length,
        username = `${DEMO_PREFIX}${kind}${String(i).padStart(2, "0")}`
      employees.push({
        employeeId: next("E"),
        fullName: demoFullName(n),
        username,
        phone: "080" + String(7100000 + n),
        email: username + "@example.com",
        departmentId,
        positionId,
      })
    }
  }
  for (let i = 1; i <= 450; i++)
    users.push({
      userId: next("U"),
      fullName: demoFullName(i + 100),
      username: `${DEMO_PREFIX}user${String(i).padStart(3, "0")}`,
      phone: "090" + String(8200000 + i),
      userType: i <= 315 ? "นักศึกษา" : i <= 405 ? "เจ้าหน้าที่" : "บุคคลทั่วไป",
    })
  for (let i = 0; i < 25; i++)
    vehicles.push({
      vehicleId: next("V"),
      licensePlate: (i < 15 ? "ฮท " : "ฮบ ") + String(7001 + i),
      vehicleType: i < 15 ? "รถตู้" : "รถบัส",
      seatCount: i < 15 ? 9 : 20,
      brand: i < 15 ? "Toyota Commuter" : i % 2 ? "Hino Bus" : "Isuzu Bus",
      modelYear: 2562 + (i % 6),
      availability: "AVAILABLE",
    })
  const drivers = employees.filter((e) => e.positionId === "DRIVER"),
    admins = employees.filter((e) => e.positionId === "ADMIN")
  const userReasons = [
    "เปลี่ยนแผนการเดินทาง",
    "เปลี่ยนเวลาเรียนหรือเวลางาน",
    "มีธุระส่วนตัว ไม่สามารถเดินทางได้",
    "เลือกจองรอบเวลาใหม่แทน",
    "เปลี่ยนไปเดินทางด้วยรถส่วนตัว",
  ]
  const adminReasons = [
    "ผู้โดยสารแจ้งขอยกเลิกผ่านเจ้าหน้าที่",
    "ผู้โดยสารเลือกวันเดินทางผิดและขอจองใหม่",
    "ผู้โดยสารขอเปลี่ยนจุดขึ้นรถและจองรอบใหม่",
  ]
  let userCursor = 0
  const userSlots = new Set()
  for (
    let d = 0, day = time("2026-01-01T00:00:00");
    day < time("2027-01-01T00:00:00");
    d++, day += dayMs
  ) {
    const date = stamp(day).slice(0, 10),
      dow = new Date(day).getUTCDay(),
      weekend = dow === 0 || dow === 6
    const slots = weekend ? ["10:00", "16:00"] : ["07:30", "12:00", "18:00"]
    for (let slot = 0; slot < slots.length; slot++)
      for (let r = 0; r < routes.length; r++) {
        const route = routes[r],
          routeStops = stops
            .filter((s) => s.routeId === route.routeId)
            .sort((a, b) => a.stopSequence - b.stopSequence)
        assert(routeStops.length >= 2)
        const departureAt = `${date}T${slots[slot]}:00`,
          historical =
            time(departureAt) + (route.totalMinutes + 20) * minute < time(now)
        // Leave an in-progress wall-clock window to the real application.
        if (!historical && time(departureAt) <= time(now) + 30 * minute)
          continue
        const vehicle = vehicles[(d * 9 + slot * 3 + r) % vehicles.length],
          driver = drivers[(d * 9 + slot * 3 + r) % drivers.length]
        const tripId = next("T"),
          status = historical ? "COMPLETED" : "SCHEDULED"
        trips.push({
          tripId,
          routeId: route.routeId,
          driverId: driver.employeeId,
          vehicleId: vehicle.vehicleId,
          departureAt,
          status,
        })
        const delay = historical ? (random() < 0.18 ? integer(2, 12) : 0) : 0,
          startedAt = plus(departureAt, delay)
        let elapsed = 0
        const arrivals = routeStops.map(
          (s) => ((elapsed += s.minutesFromPrev), plus(departureAt, elapsed)),
        )
        if (historical) {
          events.push({
            eventId: id("EV"),
            tripId,
            routeStopId: null,
            eventType: "START",
            eventAt: startedAt,
          })
          routeStops.forEach((s, i) =>
            events.push({
              eventId: id("EV"),
              tripId,
              routeStopId: s.routeStopId,
              eventType: "STOP",
              eventAt: plus(arrivals[i], delay),
            }),
          )
          events.push({
            eventId: id("EV"),
            tripId,
            routeStopId: null,
            eventType: "FINISH",
            eventAt: plus(
              departureAt,
              Math.max(elapsed, route.totalMinutes) + delay + 2,
            ),
          })
        }
        const month = Number(date.slice(5, 7)),
          season = [
            0.76, 0.82, 0.62, 0.4, 0.58, 0.85, 0.88, 0.83, 0.91, 0.62, 0.79,
            0.58,
          ][month - 1]
        const daysAhead = Math.max(0, (time(departureAt) - time(now)) / dayMs)
        const advance = historical ? 1 : Math.max(0.22, 0.7 - daysAhead / 200)
        const load =
          season *
          (weekend ? 0.65 : 1) *
          (slot === 0 ? 1.1 : slot === 1 ? 0.85 : 1.05) *
          [1, 0.88, 0.78][r] *
          advance *
          (0.75 + random() * 0.45)
        const demand = Math.max(
          1,
          Math.min(vehicle.seatCount, Math.round(vehicle.seatCount * load)),
        )
        const seatOrder = Array.from(
          { length: vehicle.seatCount },
          (_, i) => i + 1,
        )
        for (let i = seatOrder.length - 1; i > 0; i--) {
          const j = integer(0, i)
          ;[seatOrder[i], seatOrder[j]] = [seatOrder[j], seatOrder[i]]
        }
        let assigned = 0
        while (assigned < demand) {
          const size = Math.min(
            demand - assigned,
            random() < 0.84 ? 1 : random() < 0.85 ? 2 : 3,
          )
          let user
          do {
            user =
              userCursor < users.length
                ? users[userCursor++]
                : users[Math.floor(Math.pow(random(), 1.45) * users.length)]
          } while (userSlots.has(`${user.userId}|${date}|${slot}`))
          userSlots.add(`${user.userId}|${date}|${slot}`)
          const pickup =
              random() < 0.62 ? 0 : integer(0, routeStops.length - 2),
            dropoff =
              random() < 0.58
                ? routeStops.length - 1
                : integer(pickup + 1, routeStops.length - 1)
          const cancelled = random() < (historical ? 0.12 : 0.065),
            noShow = historical && !cancelled && random() < 0.055
          const bookingStatus = cancelled
            ? "CANCELLED"
            : historical
              ? noShow
                ? "NO_SHOW"
                : "COMPLETED"
              : "CONFIRMED"
          const departure = time(departureAt),
            earliest = Math.max(
              time("2026-01-01T00:00:00"),
              departure - (historical ? 7 : 100) * dayMs,
            ),
            latest = Math.min(time(now), departure - 40 * minute)
          const bookedAt = stamp(
            Math.floor((earliest + random() * (latest - earliest)) / 1000) *
              1000,
          )
          const byAdmin = cancelled && random() < 0.24
          const cancelledAt = cancelled
            ? stamp(
                Math.floor(
                  (time(bookedAt) +
                    random() *
                      (Math.min(time(now), departure - 25 * minute) -
                        time(bookedAt))) /
                    1000,
                ) * 1000,
              )
            : null
          const bookingId = next("BK")
          bookings.push({
            bookingId,
            tripId,
            userId: user.userId,
            bookedAt,
            status: bookingStatus,
            cancellationReason: cancelled
              ? choose(byAdmin ? adminReasons : userReasons)
              : null,
            cancelledAt,
            cancelledBy: cancelled
              ? byAdmin
                ? choose(admins).username
                : user.username
              : null,
          })
          for (let s = 0; s < size; s++)
            tickets.push({
              bookingId,
              ticketNo: String(s + 1).padStart(2, "0"),
              tripId,
              vehicleId: vehicle.vehicleId,
              pickupId: routeStops[pickup].routeStopId,
              dropoffId: routeStops[dropoff].routeStopId,
              seatNumber: String(seatOrder[assigned++]),
              travelAt: arrivals[pickup],
              checkedInAt:
                bookingStatus === "COMPLETED"
                  ? plus(arrivals[pickup], delay)
                  : null,
              status: bookingStatus,
              qrToken: id("QR"),
            })
        }
      }
  }
  const data = { employees, users, vehicles, trips, bookings, tickets, events }
  validateDemo(data, { routes, stops, now })
  return data
}

export function validateDemo(data, { routes, stops, now }) {
  const { employees, users, vehicles, trips, bookings, tickets, events } = data
  assert.equal(employees.length, 58)
  assert.equal(users.length, 450)
  assert.equal(vehicles.length, 25)
  const tripMap = new Map(trips.map((t) => [t.tripId, t])),
    bookingMap = new Map(bookings.map((b) => [b.bookingId, b])),
    vehicleMap = new Map(vehicles.map((v) => [v.vehicleId, v])),
    stopMap = new Map(stops.map((s) => [s.routeStopId, s]))
  assert.equal(tripMap.size, trips.length)
  assert.equal(bookingMap.size, bookings.length)
  assert.equal(new Set(tickets.map((t) => t.qrToken)).size, tickets.length)
  assert.equal(new Set(bookings.map((b) => b.userId)).size, 450)
  assert.equal(new Set(trips.map((t) => t.vehicleId)).size, 25)
  assert.equal(new Set(trips.map((t) => t.driverId)).size, 25)
  const seatKeys = new Set(),
    userTimes = new Set(),
    eventsByTrip = new Map()
  for (const e of events) {
    assert(e.eventAt <= now)
    const a = eventsByTrip.get(e.tripId) || []
    a.push(e)
    eventsByTrip.set(e.tripId, a)
  }
  for (const b of bookings) {
    const t = tripMap.get(b.tripId)
    assert(time(b.bookedAt) <= time(t.departureAt) - 20 * minute)
    assert(b.bookedAt <= now)
    if (b.status === "CANCELLED") {
      assert(b.cancellationReason && b.cancelledBy)
      assert(
        b.cancelledAt >= b.bookedAt &&
          b.cancelledAt < t.departureAt &&
          b.cancelledAt <= now,
      )
    }
    const key = b.userId + "|" + t.departureAt
    assert(!userTimes.has(key))
    userTimes.add(key)
  }
  for (const t of tickets) {
    const b = bookingMap.get(t.bookingId),
      trip = tripMap.get(t.tripId),
      pickup = stopMap.get(t.pickupId),
      dropoff = stopMap.get(t.dropoffId)
    assert.equal(b.tripId, t.tripId)
    assert.equal(trip.vehicleId, t.vehicleId)
    assert.equal(b.status, t.status)
    assert.equal(pickup.routeId, trip.routeId)
    assert.equal(dropoff.routeId, trip.routeId)
    assert(pickup.stopSequence < dropoff.stopSequence)
    const offset = stops
      .filter(
        (s) =>
          s.routeId === trip.routeId && s.stopSequence <= pickup.stopSequence,
      )
      .reduce((n, s) => n + s.minutesFromPrev, 0)
    assert.equal(t.travelAt, plus(trip.departureAt, offset))
    assert(
      Number(t.seatNumber) >= 1 &&
        Number(t.seatNumber) <= vehicleMap.get(t.vehicleId).seatCount,
    )
    const key = t.tripId + "|" + t.seatNumber
    assert(!seatKeys.has(key))
    seatKeys.add(key)
    if (t.status === "COMPLETED") {
      assert(t.checkedInAt <= now)
      assert(trip.status === "COMPLETED")
      assert(t.checkedInAt >= trip.departureAt)
    } else assert.equal(t.checkedInAt, null)
  }
  const assignments = new Map()
  for (const t of trips) {
    assert(t.departureAt.startsWith("2026-"))
    const ev = eventsByTrip.get(t.tripId) || [],
      rs = stops.filter((s) => s.routeId === t.routeId)
    if (t.status === "COMPLETED") {
      assert.equal(ev.length, rs.length + 2)
      assert.equal(ev.filter((e) => e.eventType === "START").length, 1)
      assert.equal(ev.filter((e) => e.eventType === "FINISH").length, 1)
      const ordered = ev
        .slice()
        .sort((a, b) => a.eventAt.localeCompare(b.eventAt))
      assert.equal(ordered.at(-1).eventType, "FINISH")
      assert.equal(
        new Set(
          ev.filter((e) => e.eventType === "STOP").map((e) => e.routeStopId),
        ).size,
        rs.length,
      )
    } else {
      assert.equal(ev.length, 0)
      assert(t.departureAt > now)
    }
    const duration = routes.find((r) => r.routeId === t.routeId).totalMinutes
    for (const key of ["driver:" + t.driverId, "vehicle:" + t.vehicleId]) {
      const last = assignments.get(key)
      if (last) assert(time(t.departureAt) >= last)
      assignments.set(key, time(t.departureAt) + (duration + 20) * minute)
    }
  }
  return {
    employees: tally(employees, "positionId"),
    users: users.length,
    userTypes: tally(users, "userType"),
    vehicles: tally(vehicles, "vehicleType"),
    trips: trips.length,
    tripStatuses: tally(trips, "status"),
    bookings: bookings.length,
    bookingStatuses: tally(bookings, "status"),
    tickets: tickets.length,
    ticketStatuses: tally(tickets, "status"),
    events: events.length,
    monthly: Array.from({ length: 12 }, (_, i) => {
      const month = `2026-${String(i + 1).padStart(2, "0")}`
      const ids = new Set(
        trips
          .filter((t) => t.departureAt.startsWith(month))
          .map((t) => t.tripId),
      )
      return {
        month,
        trips: ids.size,
        bookings: bookings.filter((b) => ids.has(b.tripId)).length,
        tickets: tickets.filter((t) => ids.has(t.tripId)).length,
      }
    }),
  }
}
