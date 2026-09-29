import { query, read, transaction, ts, capabilities } from "./db.js"
import { guard } from "./auth.js"
import { nextRecordId } from "./record-ids.js"
import {
  requireThat,
  text,
  id,
  seats,
  stopOrder,
  bangkokNow,
  epoch,
} from "./domain.js"

export async function bookings(db, userId) {
  const rows = await query(
    db,
    `SELECT b.booking_id,b.trip_id,b.status,${ts("b.booked_at")} booked_at,r.route_name,t.route_id,${ts("t.departure_at")} departure_at,t.status trip_status,v.vehicle_id,v.license_plate,v.vehicle_type,e.full_name driver_name
    FROM BUS_BOOKINGS b JOIN BUS_TRIP_ROUNDS t ON t.trip_id=b.trip_id JOIN BUS_ROUTES r ON r.route_id=t.route_id JOIN BUS_VEHICLES v ON v.vehicle_id=t.vehicle_id JOIN BUS_EMPLOYEES e ON e.employee_id=t.driver_employee_id WHERE b.user_id=:userId ORDER BY b.booked_at DESC,b.booking_id`,
    { userId },
  )
  const details = await query(
    db,
    `SELECT d.booking_id,d.ticket_no,d.seat_number,d.status,d.qr_token,${ts("d.travel_at")} travel_at,${ts("d.checked_in_at")} checked_in_at,p.stop_name pickup_name,q.stop_name dropoff_name,rp.stop_sequence pickup_sequence,rq.stop_sequence dropoff_sequence
    FROM BUS_BOOKING_DETAILS d JOIN BUS_BOOKINGS b ON b.booking_id=d.booking_id JOIN BUS_ROUTE_STOPS rp ON rp.route_stop_id=d.pickup_route_stop_id JOIN BUS_STOPS p ON p.stop_id=rp.stop_id JOIN BUS_ROUTE_STOPS rq ON rq.route_stop_id=d.dropoff_route_stop_id JOIN BUS_STOPS q ON q.stop_id=rq.stop_id WHERE b.user_id=:userId ORDER BY d.ticket_no`,
    { userId },
  )
  return rows.map((b) => ({
    ...b,
    tickets: details.filter((d) => d.bookingId === b.bookingId),
  }))
}
export async function createBookings(db, userId, items, now = Date.now()) {
  requireThat(
    Array.isArray(items) && items.length > 0 && items.length <= 20,
    "เลือกยืนยัน 1–20 รายการต่อครั้ง",
  )
  // Lock trips in a stable order. This makes validation + multi-cart confirmation
  // atomic across clients and avoids reversing lock order in two carts.
  const trips = new Map()
  for (const tripId of [
    ...new Set(items.map((i) => text(i.tripId, "รอบรถ", 40))),
  ].sort()) {
    const [trip] = await query(
      db,
      `SELECT trip_id,route_id,vehicle_id,status,${ts("departure_at")} departure_at FROM BUS_TRIP_ROUNDS WHERE trip_id=:tripId FOR UPDATE`,
      { tripId },
    )
    requireThat(trip, "ไม่พบรอบรถ", 404)
    requireThat(trip.status === "SCHEDULED", "รอบรถนี้ไม่เปิดรับจองแล้ว", 409)
    requireThat(
      epoch(trip.departureAt) - now >= 20 * 60000,
      "ต้องจองล่วงหน้าอย่างน้อย 20 นาทีก่อนรถออก",
      409,
    )
    const [vehicle] = await query(
      db,
      `SELECT seat_count${
        capabilities.vehicleExtras ? ",availability" : ""
      } FROM BUS_VEHICLES WHERE vehicle_id=:vehicleId`,
      { vehicleId: trip.vehicleId },
    )
    requireThat(vehicle.availability !== "MAINTENANCE", "รถอยู่ระหว่างซ่อมบำรุง")
    trip.capacity = vehicle.seatCount
    trip.stops = await query(
      db,
      "SELECT * FROM BUS_ROUTE_STOPS WHERE route_id=:routeId ORDER BY stop_sequence",
      { routeId: trip.routeId },
    )
    trips.set(tripId, trip)
  }
  const created = []
  for (const item of items) {
    const trip = trips.get(item.tripId),
      seatNumbers = seats(item.seats, trip.capacity)
    const pickupId = text(item.pickupId, "จุดขึ้น", 40),
      dropoffId = text(item.dropoffId, "จุดลง", 40),
      minutes = stopOrder(trip.stops, pickupId, dropoffId)
    const occupied = (
      await query(
        db,
        "SELECT seat_number FROM BUS_BOOKING_DETAILS WHERE trip_id=:tripId AND status NOT IN ('CANCELLED','NO_SHOW')",
        { tripId: trip.tripId },
      )
    ).map((r) => r.seatNumber)
    requireThat(
      !seatNumbers.some((s) => occupied.includes(s)),
      "บางที่นั่งถูกจองแล้ว กรุณาเลือกที่นั่งใหม่ รายการชุดนี้ยังไม่ถูกบันทึก",
      409,
    )
    const bookingId = await nextRecordId(db, "BK")
    await db.execute(
      "INSERT INTO BUS_BOOKINGS(booking_id,trip_id,user_id,status) VALUES(:bookingId,:tripId,:userId,'CONFIRMED')",
      { bookingId, tripId: trip.tripId, userId },
    )
    for (let i = 0; i < seatNumbers.length; i++) {
      await db.execute(
        `INSERT INTO BUS_BOOKING_DETAILS(booking_id,ticket_no,trip_id,vehicle_id,pickup_route_stop_id,dropoff_route_stop_id,seat_number,travel_at,status,qr_token)
        VALUES(:bookingId,:ticketNo,:tripId,:vehicleId,:pickupId,:dropoffId,:seatNumber,TO_TIMESTAMP(:departureAt,'YYYY-MM-DD"T"HH24:MI:SS')+NUMTODSINTERVAL(:minutes,'MINUTE'),'CONFIRMED',:qrToken)`,
        {
          bookingId,
          ticketNo: String(i + 1).padStart(2, "0"),
          tripId: trip.tripId,
          vehicleId: trip.vehicleId,
          pickupId,
          dropoffId,
          seatNumber: seatNumbers[i],
          departureAt: trip.departureAt,
          minutes,
          qrToken: id("QR"),
        },
      )
    }
    created.push(bookingId)
  }
  return { bookingIds: created }
}
export function bookingRoutes(app) {
  const userOnly = (req, res, next) => {
    requireThat(req.user.kind === "user", "หน้านี้สำหรับผู้ใช้จองรถ", 403)
    next()
  }
  app.get("/api/bookings", userOnly, async (req, res) =>
    res.json(await read((db) => bookings(db, req.user.id))),
  )
  app.post("/api/bookings", userOnly, async (req, res) =>
    res.json(
      await transaction((db) =>
        createBookings(db, req.user.id, req.body.items),
      ),
    ),
  )
  app.post("/api/bookings/:id/cancel", userOnly, async (req, res) => {
    await transaction(async (db) => {
      const bookingId = req.params.id
      const [booking] = await query(
        db,
        "SELECT trip_id FROM BUS_BOOKINGS WHERE booking_id=:bookingId AND user_id=:userId",
        { bookingId, userId: req.user.id },
      )
      requireThat(booking, "ไม่พบการจอง", 404)
      const [trip] = await query(
        db,
        `SELECT status,${ts("departure_at")} departure_at FROM BUS_TRIP_ROUNDS WHERE trip_id=:tripId FOR UPDATE`,
        { tripId: booking.tripId },
      )
      requireThat(
        trip.status === "SCHEDULED" && epoch(trip.departureAt) > Date.now(),
        "ยกเลิกได้ก่อนรอบรถเริ่มเดินทางเท่านั้น",
        409,
      )
      const [current] = await query(
        db,
        "SELECT status FROM BUS_BOOKINGS WHERE booking_id=:bookingId FOR UPDATE",
        { bookingId },
      )
      requireThat(
        current.status === "CONFIRMED",
        "รายการนี้ไม่อยู่ในสถานะที่ยกเลิกได้",
        409,
      )
      await db.execute(
        "UPDATE BUS_BOOKING_DETAILS SET status='CANCELLED' WHERE booking_id=:bookingId",
        { bookingId },
      )
      await db.execute(
        "UPDATE BUS_BOOKINGS SET status='CANCELLED' WHERE booking_id=:bookingId",
        { bookingId },
      )
    })
    res.json({ ok: true })
  })
}
export function driverRoutes(app) {
  const driver = guard("driver", true)
  app.get(
    "/api/driver/trips/:id/passengers",
    guard("driver"),
    async (req, res) =>
      res.json(
        await read(async (db) => {
          await assigned(db, req.params.id, req.user.id, false)
          return query(
            db,
            `SELECT b.booking_id,u.full_name,d.ticket_no,d.seat_number,d.status,${ts("d.checked_in_at")} checked_in_at,p.stop_name pickup_name,q.stop_name dropoff_name
      FROM BUS_BOOKING_DETAILS d JOIN BUS_BOOKINGS b ON b.booking_id=d.booking_id JOIN BUS_USERS u ON u.user_id=b.user_id JOIN BUS_ROUTE_STOPS rp ON rp.route_stop_id=d.pickup_route_stop_id JOIN BUS_STOPS p ON p.stop_id=rp.stop_id JOIN BUS_ROUTE_STOPS rq ON rq.route_stop_id=d.dropoff_route_stop_id JOIN BUS_STOPS q ON q.stop_id=rq.stop_id WHERE d.trip_id=:tripId AND d.status<>'CANCELLED' ORDER BY d.seat_number`,
            { tripId: req.params.id },
          )
        }),
      ),
  )
  app.post("/api/driver/trips/:id/start", driver, async (req, res) => {
    requireThat(
      capabilities.tripEvents,
      "ยังไม่ได้ติดตั้ง SQL ประวัติการเช็กอินจุดจอด",
      409,
    )
    await transaction(async (db) => {
      // Driver row serializes attempts to start two different jobs at once.
      await query(
        db,
        "SELECT employee_id FROM BUS_EMPLOYEES WHERE employee_id=:employeeId FOR UPDATE",
        { employeeId: req.user.id },
      )
      const trip = await assigned(db, req.params.id, req.user.id)
      requireThat(trip.status === "SCHEDULED", "รอบนี้เริ่มงานแล้วหรือถูกยกเลิก", 409)
      requireThat(
        trip.departureAt.slice(0, 10) === bangkokNow().slice(0, 10),
        "เริ่มงานได้เฉพาะรอบของวันนี้",
      )
      requireThat(
        !(
          await query(
            db,
            "SELECT trip_id FROM BUS_TRIP_ROUNDS WHERE driver_employee_id=:employeeId AND status='IN_PROGRESS'",
            { employeeId: req.user.id },
          )
        ).length,
        "กรุณาจบงานที่กำลังทำอยู่ก่อน",
        409,
      )
      await db.execute(
        "UPDATE BUS_TRIP_ROUNDS SET status='IN_PROGRESS' WHERE trip_id=:tripId",
        { tripId: trip.tripId },
      )
      await event(db, trip.tripId, "START")
    })
    res.json({ ok: true })
  })
  app.post("/api/driver/trips/:id/checkpoint", driver, async (req, res) => {
    requireThat(capabilities.tripEvents, "ยังไม่ได้ติดตั้ง SQL ประวัติจุดจอด", 409)
    await transaction(async (db) => {
      const trip = await assigned(db, req.params.id, req.user.id)
      requireThat(trip.status === "IN_PROGRESS", "กรุณาเริ่มงานก่อน")
      const pending = await query(
        db,
        "SELECT rs.route_stop_id FROM BUS_ROUTE_STOPS rs WHERE rs.route_id=:routeId AND NOT EXISTS(SELECT 1 FROM BUS_TRIP_EVENTS e WHERE e.trip_id=:tripId AND e.route_stop_id=rs.route_stop_id AND e.event_type='STOP') ORDER BY rs.stop_sequence",
        { routeId: trip.routeId, tripId: trip.tripId },
      )
      requireThat(
        pending[0]?.routeStopId === req.body.routeStopId,
        "กรุณาเช็กอินตามลำดับจุดจอด",
        409,
      )
      await event(db, trip.tripId, "STOP", pending[0].routeStopId)
    })
    res.json({ ok: true })
  })
  app.post("/api/driver/trips/:id/finish", driver, async (req, res) => {
    requireThat(capabilities.tripEvents, "ยังไม่ได้ติดตั้ง SQL ประวัติจุดจอด", 409)
    await transaction(async (db) => {
      const trip = await assigned(db, req.params.id, req.user.id)
      requireThat(trip.status === "IN_PROGRESS", "รอบนี้ไม่ได้กำลังเดินรถ")
      const [count] = await query(
        db,
        "SELECT COUNT(*) n FROM BUS_ROUTE_STOPS rs WHERE rs.route_id=:routeId AND NOT EXISTS(SELECT 1 FROM BUS_TRIP_EVENTS e WHERE e.trip_id=:tripId AND e.route_stop_id=rs.route_stop_id AND e.event_type='STOP')",
        { routeId: trip.routeId, tripId: trip.tripId },
      )
      requireThat(count.n === 0, "กรุณาเช็กอินให้ครบทุกจุดก่อนจบงาน")
      await event(db, trip.tripId, "FINISH")
      await db.execute(
        "UPDATE BUS_TRIP_ROUNDS SET status='COMPLETED' WHERE trip_id=:tripId",
        { tripId: trip.tripId },
      )
      await db.execute(
        "UPDATE BUS_BOOKING_DETAILS SET status=CASE WHEN status='CHECKED_IN' THEN 'COMPLETED' ELSE 'NO_SHOW' END WHERE trip_id=:tripId AND status IN ('CONFIRMED','CHECKED_IN')",
        { tripId: trip.tripId },
      )
      const rows = await query(
        db,
        "SELECT booking_id FROM BUS_BOOKINGS WHERE trip_id=:tripId",
        { tripId: trip.tripId },
      )
      for (const b of rows) await syncBookingStatus(db, b.bookingId)
    })
    res.json({ ok: true })
  })
  app.post("/api/driver/check-in", driver, async (req, res) => {
    await transaction(async (db) => {
      const qrToken = text(req.body.qrToken, "QR บนตั๋ว", 100)
      const [ticket] = await query(
        db,
        "SELECT booking_id,ticket_no,trip_id FROM BUS_BOOKING_DETAILS WHERE qr_token=:qrToken",
        { qrToken },
      )
      requireThat(ticket, "ไม่พบตั๋วนี้", 404)
      const trip = await assigned(db, ticket.tripId, req.user.id)
      requireThat(trip.status === "IN_PROGRESS", "กรุณาเริ่มงานรอบรถของตั๋วนี้ก่อน")
      const result = await db.execute(
        "UPDATE BUS_BOOKING_DETAILS SET status='CHECKED_IN',checked_in_at=LOCALTIMESTAMP WHERE qr_token=:qrToken AND status='CONFIRMED'",
        { qrToken },
      )
      requireThat(result.rowsAffected === 1, "ตั๋วนี้เช็กอินแล้วหรือถูกยกเลิก", 409)
      await syncBookingStatus(db, ticket.bookingId)
    })
    res.json({ ok: true })
  })
}
async function assigned(db, tripId, employeeId, lock = true) {
  const [trip] = await query(
    db,
    `SELECT trip_id,route_id,status,${ts("departure_at")} departure_at FROM BUS_TRIP_ROUNDS WHERE trip_id=:tripId AND driver_employee_id=:employeeId${
      lock ? " FOR UPDATE" : ""
    }`,
    { tripId, employeeId },
  )
  requireThat(trip, "ไม่พบงานที่มอบหมายให้คุณ", 404)
  return trip
}
async function event(db, tripId, eventType, routeStopId = null) {
  await db.execute(
    "INSERT INTO BUS_TRIP_EVENTS(event_id,trip_id,event_type,route_stop_id) VALUES(:eventId,:tripId,:eventType,:routeStopId)",
    { eventId: id("EV"), tripId, eventType, routeStopId },
  )
}
async function syncBookingStatus(db, bookingId) {
  const details = await query(
    db,
    "SELECT status FROM BUS_BOOKING_DETAILS WHERE booking_id=:bookingId",
    { bookingId },
  )
  const states = details.map((d) => d.status)
  const status = states.every((s) => s === "CANCELLED")
    ? "CANCELLED"
    : states.every((s) => s === "NO_SHOW")
      ? "NO_SHOW"
      : states.every((s) => ["COMPLETED", "NO_SHOW", "CANCELLED"].includes(s))
        ? "COMPLETED"
        : states.some((s) => s === "CHECKED_IN")
          ? "CHECKED_IN"
          : states.some((s) => s === "CANCELLED")
            ? "PARTIALLY_CANCELLED"
            : "CONFIRMED"
  await db.execute(
    "UPDATE BUS_BOOKINGS SET status=:status WHERE booking_id=:bookingId",
    { status, bookingId },
  )
}
