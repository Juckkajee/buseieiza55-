import { query, read, transaction, capabilities } from "./db.js"
import { guard } from "./auth.js"
import { requireThat, text } from "./domain.js"
import { bookings } from "./bookings.js"

async function lockBooking(db, bookingId) {
  const [ref] = await query(
    db,
    "SELECT trip_id FROM BUS_BOOKINGS WHERE booking_id=:bookingId",
    { bookingId },
  )
  requireThat(ref, "ไม่พบการจอง", 404)
  const [trip] = await query(
    db,
    "SELECT status FROM BUS_TRIP_ROUNDS WHERE trip_id=:tripId FOR UPDATE",
    { tripId: ref.tripId },
  )
  const [booking] = await query(
    db,
    "SELECT status,user_id FROM BUS_BOOKINGS WHERE booking_id=:bookingId FOR UPDATE",
    { bookingId },
  )
  requireThat(booking, "รายการนี้ถูกลบแล้ว กรุณาโหลดใหม่", 404)
  requireThat(
    trip.status !== "IN_PROGRESS",
    "รอบรถกำลังเดินทาง กรุณารอจนจบงานก่อนจัดการประวัติ",
    409,
  )
  return booking
}
export function adminBookingRoutes(app) {
  app.get("/api/admin/bookings", guard("admin-bookings"), async (req, res) =>
    res.json(await read((db) => bookings(db))),
  )
  app.post(
    "/api/admin/bookings/:id/cancel",
    guard("admin-bookings", true),
    async (req, res) => {
      requireThat(
        capabilities.bookingCancellation,
        "ต้องติดตั้ง SQL เก็บเหตุผลยกเลิกก่อนใช้งาน",
        409,
      )
      const reason = text(req.body.reason, "เหตุผลยกเลิก", 500),
        bookingId = req.params.id
      await transaction(async (db) => {
        const booking = await lockBooking(db, bookingId)
        requireThat(
          ["CONFIRMED", "PARTIALLY_CANCELLED"].includes(booking.status),
          "รายการนี้ไม่อยู่ในสถานะที่ยกเลิกได้",
          409,
        )
        const [{ n }] = await query(
          db,
          "SELECT COUNT(*) n FROM BUS_BOOKING_DETAILS WHERE booking_id=:bookingId AND status NOT IN ('CONFIRMED','CANCELLED')",
          { bookingId },
        )
        requireThat(n === 0, "มีตั๋วเช็กอินหรือเดินทางแล้ว ไม่สามารถยกเลิกย้อนหลังได้", 409)
        await db.execute(
          "UPDATE BUS_BOOKING_DETAILS SET status='CANCELLED' WHERE booking_id=:bookingId",
          { bookingId },
        )
        await db.execute(
          "UPDATE BUS_BOOKINGS SET status='CANCELLED',cancellation_reason=:reason,cancelled_at=LOCALTIMESTAMP,cancelled_by=:actor WHERE booking_id=:bookingId",
          { bookingId, reason, actor: req.user.username },
        )
      })
      res.json({ ok: true })
    },
  )
  app.delete(
    "/api/admin/bookings/:id",
    guard("admin-bookings", true),
    async (req, res) => {
      const bookingId = req.params.id
      requireThat(
        req.body.confirmBookingId === bookingId,
        "กรุณายืนยันรหัสการจองที่จะลบถาวร",
      )
      await transaction(async (db) => {
        const booking = await lockBooking(db, bookingId)
        requireThat(
          ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.status),
          "ต้องยกเลิกการจองหรือจบการเดินทางก่อนลบถาวร",
          409,
        )
        const [{ n }] = await query(
          db,
          "SELECT COUNT(*) n FROM BUS_BOOKING_DETAILS WHERE booking_id=:bookingId AND status IN ('CONFIRMED','CHECKED_IN')",
          { bookingId },
        )
        requireThat(n === 0, "ยังมีตั๋วที่ใช้งานอยู่ ไม่สามารถลบถาวรได้", 409)
        await db.execute(
          "DELETE FROM BUS_BOOKING_DETAILS WHERE booking_id=:bookingId",
          { bookingId },
        )
        await db.execute(
          "DELETE FROM BUS_BOOKINGS WHERE booking_id=:bookingId",
          { bookingId },
        )
      })
      res.json({ ok: true })
    },
  )
}
