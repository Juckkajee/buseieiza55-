import { query, read, transaction, capabilities, ts } from "./db.js"
import { guard, allowed, uniqueUsername } from "./auth.js"
import {
  requireThat,
  text,
  optional,
  integer,
  id,
  hashPassword,
  date,
  timestamp,
  bangkokNow,
  overlaps,
  screens,
} from "./domain.js"

export async function routes(db) {
  const result = await query(db, "SELECT * FROM BUS_ROUTES ORDER BY route_name")
  const stops = await query(
    db,
    "SELECT rs.*,s.stop_name FROM BUS_ROUTE_STOPS rs JOIN BUS_STOPS s ON s.stop_id=rs.stop_id ORDER BY rs.stop_sequence",
  )
  return result.map((r) => ({
    ...r,
    stops: stops.filter((s) => s.routeId === r.routeId),
  }))
}
export const vehicles = (db) =>
  query(
    db,
    `SELECT vehicle_id,license_plate,vehicle_type,seat_count${
      capabilities.vehicleExtras
        ? ",brand,model_year,availability"
        : ",NULL brand,NULL model_year,'AVAILABLE' availability"
    } FROM BUS_VEHICLES ORDER BY license_plate`,
  )
export const employees = (db) =>
  query(
    db,
    `SELECT e.employee_id,e.full_name,e.username,e.phone,e.email,e.department_id,e.position_id,d.department_name,p.position_name FROM BUS_EMPLOYEES e JOIN BUS_DEPARTMENTS d ON d.department_id=e.department_id JOIN BUS_POSITIONS p ON p.position_id=e.position_id ORDER BY e.employee_id`,
  )
export async function trips(db, day, user) {
  const binds = { day }
  if (user.role === "driver") binds.driver = user.id
  const result = await query(
    db,
    `SELECT t.trip_id,t.route_id,t.driver_employee_id,t.vehicle_id,t.status,${ts("t.departure_at")} departure_at,r.route_name,r.total_minutes,e.full_name driver_name,v.license_plate,v.vehicle_type,v.seat_count,
    (SELECT COUNT(*) FROM BUS_BOOKING_DETAILS d WHERE d.trip_id=t.trip_id AND d.status NOT IN ('CANCELLED','NO_SHOW')) occupied_count
    FROM BUS_TRIP_ROUNDS t JOIN BUS_ROUTES r ON r.route_id=t.route_id JOIN BUS_EMPLOYEES e ON e.employee_id=t.driver_employee_id JOIN BUS_VEHICLES v ON v.vehicle_id=t.vehicle_id
    WHERE t.departure_at>=TO_TIMESTAMP(:day,'YYYY-MM-DD') AND t.departure_at<TO_TIMESTAMP(:day,'YYYY-MM-DD')+INTERVAL '1' DAY ${
      user.role === "driver" ? "AND t.driver_employee_id=:driver" : ""
    } ORDER BY t.departure_at,r.route_name`,
    binds,
  )
  if (capabilities.tripEvents && user.role !== "user") {
    const events = await query(
      db,
      `SELECT ev.event_id,ev.trip_id,ev.route_stop_id,ev.event_type,${ts("ev.event_at")} event_at FROM BUS_TRIP_EVENTS ev JOIN BUS_TRIP_ROUNDS t ON t.trip_id=ev.trip_id WHERE t.departure_at>=TO_TIMESTAMP(:day,'YYYY-MM-DD') AND t.departure_at<TO_TIMESTAMP(:day,'YYYY-MM-DD')+INTERVAL '1' DAY ${
        user.role === "driver" ? "AND t.driver_employee_id=:driver" : ""
      }`,
      binds,
    )
    return result.map((t) => ({
      ...t,
      events: events.filter((e) => e.tripId === t.tripId),
    }))
  }
  return result.map((t) => ({ ...t, events: [] }))
}
const changed = (result) =>
  requireThat(result.rowsAffected > 0, "ไม่พบข้อมูลที่ต้องการ", 404)
async function routeUnlocked(db, routeId) {
  const [route] = await query(
    db,
    "SELECT route_id FROM BUS_ROUTES WHERE route_id=:routeId FOR UPDATE",
    { routeId },
  )
  requireThat(route, "ไม่พบเส้นทาง", 404)
  requireThat(
    !(
      await query(
        db,
        "SELECT b.booking_id FROM BUS_BOOKINGS b JOIN BUS_TRIP_ROUNDS t ON t.trip_id=b.trip_id WHERE t.route_id=:routeId AND ROWNUM=1",
        { routeId },
      )
    ).length,
    "เส้นทางนี้มีประวัติการจองแล้ว กรุณาเพิ่มเส้นทางใหม่เพื่อเก็บประวัติเดิม",
    409,
  )
  requireThat(
    !(
      await query(
        db,
        "SELECT trip_id FROM BUS_TRIP_ROUNDS WHERE route_id=:routeId AND status IN ('IN_PROGRESS','COMPLETED') AND ROWNUM=1",
        { routeId },
      )
    ).length,
    "ไม่สามารถเปลี่ยนจุดจอดของเส้นทางที่เริ่มเดินรถแล้ว",
    409,
  )
}
async function resequence(db, routeId, ordered) {
  // Move to disjoint positive numbers first; Oracle's immediate unique constraint
  // otherwise rejects a swap of neighboring stop_sequence values.
  await db.execute(
    "UPDATE BUS_ROUTE_STOPS SET stop_sequence=stop_sequence+100000 WHERE route_id=:routeId",
    { routeId },
  )
  for (let i = 0; i < ordered.length; i++)
    await db.execute(
      "UPDATE BUS_ROUTE_STOPS SET stop_sequence=:seq,minutes_from_prev=:minutes WHERE route_stop_id=:routeStopId",
      {
        seq: i + 1,
        minutes: i === 0 ? 0 : ordered[i].minutesFromPrev,
        routeStopId: ordered[i].routeStopId,
      },
    )
  await db.execute(
    "UPDATE BUS_ROUTES SET total_minutes=(SELECT NVL(SUM(minutes_from_prev),0) FROM BUS_ROUTE_STOPS WHERE route_id=:routeId) WHERE route_id=:routeId",
    { routeId },
  )
}
export async function validateTrip(db, data, excludeId = "-") {
  const routeId = text(data.routeId, "เส้นทาง", 40),
    driverEmployeeId = text(data.driverEmployeeId, "คนขับ", 40),
    vehicleId = text(data.vehicleId, "รถ", 40),
    departureAt = timestamp(data.departureAt)
  requireThat(departureAt > bangkokNow(), "กรุณาเลือกรอบรถในอนาคต")
  const [route] = await query(
    db,
    "SELECT * FROM BUS_ROUTES WHERE route_id=:routeId",
    { routeId },
  )
  requireThat(route, "ไม่พบเส้นทาง")
  const [stopCount] = await query(
    db,
    "SELECT COUNT(*) n FROM BUS_ROUTE_STOPS WHERE route_id=:routeId",
    { routeId },
  )
  requireThat(
    stopCount.n >= 2 && route.totalMinutes > 0,
    "เส้นทางต้องมีจุดจอดอย่างน้อย 2 จุดและเวลาเดินทางมากกว่า 0",
  )
  requireThat(
    (
      await query(
        db,
        "SELECT employee_id FROM BUS_EMPLOYEES WHERE employee_id=:driverEmployeeId AND position_id='DRIVER'",
        { driverEmployeeId },
      )
    ).length,
    "พนักงานต้องมีตำแหน่งคนขับรถ",
  )
  const [vehicle] = await query(
    db,
    `SELECT vehicle_id${
      capabilities.vehicleExtras ? ",availability" : ""
    } FROM BUS_VEHICLES WHERE vehicle_id=:vehicleId`,
    { vehicleId },
  )
  requireThat(vehicle, "ไม่พบรถ")
  requireThat(vehicle.availability !== "MAINTENANCE", "รถอยู่ระหว่างซ่อมบำรุง")
  const existing = await query(
    db,
    `SELECT t.trip_id,${ts("t.departure_at")} departure_at,r.total_minutes FROM BUS_TRIP_ROUNDS t JOIN BUS_ROUTES r ON r.route_id=t.route_id WHERE t.status<>'CANCELLED' AND t.trip_id<>:excludeId AND (t.driver_employee_id=:driverEmployeeId OR t.vehicle_id=:vehicleId)`,
    { excludeId, driverEmployeeId, vehicleId },
  )
  requireThat(
    !existing.some((t) =>
      overlaps(departureAt, route.totalMinutes, t.departureAt, t.totalMinutes),
    ),
    "รถหรือคนขับมีรอบเดินรถทับซ้อนในช่วงเวลานี้",
    409,
  )
  return { routeId, driverEmployeeId, vehicleId, departureAt }
}
export function catalogRoutes(app) {
  app.get("/api/bootstrap", async (req, res) =>
    res.json(
      await read(async (db) => ({
        capabilities,
        routes: await routes(db),
        vehicles: await vehicles(db),
        departments:
          req.user.role === "user"
            ? []
            : await query(
                db,
                "SELECT * FROM BUS_DEPARTMENTS ORDER BY department_id",
              ),
        positions:
          req.user.role === "user"
            ? []
            : await query(
                db,
                "SELECT * FROM BUS_POSITIONS ORDER BY position_id",
              ),
        drivers:
          allowed(req.user, "admin-routes") ||
          allowed(req.user, "admin-schedule")
            ? await query(
                db,
                "SELECT employee_id,full_name FROM BUS_EMPLOYEES WHERE position_id='DRIVER' ORDER BY full_name",
              )
            : [],
        screens: screens.map(([screenId, screenName]) => ({
          screenId,
          screenName,
        })),
      })),
    ),
  )
  app.get("/api/trips", async (req, res) =>
    res.json(await read((db) => trips(db, date(req.query.date), req.user))),
  )
  app.get("/api/trips/:id/seats", async (req, res) =>
    res.json(
      await read(async (db) => {
        const [trip] = await query(
          db,
          `SELECT t.trip_id,t.status,${ts("t.departure_at")} departure_at,v.seat_count FROM BUS_TRIP_ROUNDS t JOIN BUS_VEHICLES v ON v.vehicle_id=t.vehicle_id WHERE t.trip_id=:tripId`,
          { tripId: req.params.id },
        )
        requireThat(trip, "ไม่พบรอบรถ", 404)
        const taken = await query(
          db,
          "SELECT seat_number FROM BUS_BOOKING_DETAILS WHERE trip_id=:tripId AND status NOT IN ('CANCELLED','NO_SHOW')",
          { tripId: req.params.id },
        )
        return { ...trip, occupied: taken.map((s) => s.seatNumber) }
      }),
    ),
  )
  app.get("/api/employees", guard("admin-employees"), async (req, res) =>
    res.json(await read(employees)),
  )
  app.post("/api/employees", guard("admin-employees", true), async (req, res) =>
    res.json(await saveEmployee(req.body)),
  )
  app.put(
    "/api/employees/:id",
    guard("admin-employees", true),
    async (req, res) => res.json(await saveEmployee(req.body, req.params.id)),
  )
  app.delete(
    "/api/employees/:id",
    guard("admin-employees", true),
    async (req, res) => {
      requireThat(req.params.id !== req.user.id, "ไม่สามารถลบบัญชีที่กำลังใช้งาน")
      await transaction(async (db) => {
        const [e] = await query(
          db,
          "SELECT position_id FROM BUS_EMPLOYEES WHERE employee_id=:employeeId FOR UPDATE",
          { employeeId: req.params.id },
        )
        requireThat(e, "ไม่พบพนักงาน", 404)
        requireThat(e.positionId !== "ADMIN", "ไม่สามารถลบบัญชี Admin")
        changed(
          await db.execute(
            "DELETE FROM BUS_EMPLOYEES WHERE employee_id=:employeeId",
            { employeeId: req.params.id },
          ),
        )
      })
      res.json({ ok: true })
    },
  )
  async function saveEmployee(b, employeeId) {
    const binds = {
      employeeId: employeeId || id("E"),
      fullName: text(b.fullName, "ชื่อ–นามสกุล"),
      username: text(b.username, "Username", 100).toLowerCase(),
      phone: optional(b.phone, "เบอร์โทร", 30),
      email: optional(b.email, "Email", 254),
      departmentId: text(b.departmentId, "แผนก", 40),
      positionId: text(b.positionId, "ตำแหน่ง", 40),
    }
    requireThat(
      !binds.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(binds.email),
      "Email ไม่ถูกต้อง",
    )
    if (!employeeId || b.password)
      binds.passwordHash = await hashPassword(b.password)
    return transaction(async (db) => {
      await uniqueUsername(db, binds.username, binds.employeeId)
      if (employeeId) {
        const [e] = await query(
          db,
          "SELECT position_id FROM BUS_EMPLOYEES WHERE employee_id=:employeeId",
          { employeeId },
        )
        requireThat(e, "ไม่พบพนักงาน", 404)
        requireThat(
          e.positionId !== "ADMIN" || binds.positionId === "ADMIN",
          "ไม่สามารถเปลี่ยนตำแหน่งของ Admin",
        )
        if (e.positionId === "DRIVER" && binds.positionId !== "DRIVER")
          requireThat(
            !(
              await query(
                db,
                "SELECT trip_id FROM BUS_TRIP_ROUNDS WHERE driver_employee_id=:employeeId AND status IN ('SCHEDULED','IN_PROGRESS') AND ROWNUM=1",
                { employeeId },
              )
            ).length,
            "คนขับยังมีรอบเดินรถที่ต้องรับผิดชอบ",
          )
      }
      requireThat(
        !(
          await query(
            db,
            "SELECT employee_id FROM BUS_EMPLOYEES WHERE LOWER(username)=:username AND employee_id<>:employeeId",
            { username: binds.username, employeeId: binds.employeeId },
          )
        ).length,
        "Username นี้ถูกใช้แล้ว",
        409,
      )
      if (employeeId)
        changed(
          await db.execute(
            `UPDATE BUS_EMPLOYEES SET full_name=:fullName,username=:username,phone=:phone,email=:email,department_id=:departmentId,position_id=:positionId${
              binds.passwordHash ? ",password_hash=:passwordHash" : ""
            } WHERE employee_id=:employeeId`,
            binds,
          ),
        )
      else
        await db.execute(
          "INSERT INTO BUS_EMPLOYEES(employee_id,full_name,username,password_hash,phone,email,department_id,position_id) VALUES(:employeeId,:fullName,:username,:passwordHash,:phone,:email,:departmentId,:positionId)",
          binds,
        )
      return { employeeId: binds.employeeId }
    })
  }
  app.post("/api/vehicles", guard("admin-vehicles", true), async (req, res) =>
    res.json(await saveVehicle(req.body)),
  )
  app.put(
    "/api/vehicles/:id",
    guard("admin-vehicles", true),
    async (req, res) => res.json(await saveVehicle(req.body, req.params.id)),
  )
  async function saveVehicle(b, vehicleId) {
    const binds = {
      vehicleId: vehicleId || id("V"),
      licensePlate: text(b.licensePlate, "ทะเบียน", 30),
      vehicleType: text(b.vehicleType, "ประเภทรถ", 50),
      seatCount: integer(b.seatCount, "จำนวนที่นั่ง", 1, 100),
    }
    requireThat(["รถตู้", "รถบัส"].includes(binds.vehicleType), "ประเภทรถไม่ถูกต้อง")
    if (capabilities.vehicleExtras)
      Object.assign(binds, {
        brand: optional(b.brand, "ยี่ห้อ", 150),
        modelYear: b.modelYear ? integer(b.modelYear, "ปีรถ", 1900, 2700) : null,
        availability:
          b.availability === "MAINTENANCE" ? "MAINTENANCE" : "AVAILABLE",
      })
    return transaction(async (db) => {
      await db.execute("LOCK TABLE BUS_TRIP_ROUNDS IN SHARE ROW EXCLUSIVE MODE")
      if (vehicleId) {
        const [current] = await query(
          db,
          "SELECT * FROM BUS_VEHICLES WHERE vehicle_id=:vehicleId FOR UPDATE",
          { vehicleId },
        )
        requireThat(current, "ไม่พบรถ", 404)
        if (current.seatCount !== binds.seatCount)
          requireThat(
            !(
              await query(
                db,
                "SELECT booking_id FROM BUS_BOOKING_DETAILS WHERE vehicle_id=:vehicleId AND ROWNUM=1",
                { vehicleId },
              )
            ).length,
            "รถนี้มีประวัติตั๋วแล้ว ไม่สามารถเปลี่ยนจำนวนที่นั่ง",
            409,
          )
        if (binds.availability === "MAINTENANCE")
          requireThat(
            !(
              await query(
                db,
                "SELECT trip_id FROM BUS_TRIP_ROUNDS WHERE vehicle_id=:vehicleId AND status IN ('SCHEDULED','IN_PROGRESS') AND ROWNUM=1",
                { vehicleId },
              )
            ).length,
            "กรุณาย้ายหรือยกเลิกรอบรถก่อนส่งรถซ่อม",
            409,
          )
        changed(
          await db.execute(
            `UPDATE BUS_VEHICLES SET license_plate=:licensePlate,vehicle_type=:vehicleType,seat_count=:seatCount${
              capabilities.vehicleExtras
                ? ",brand=:brand,model_year=:modelYear,availability=:availability"
                : ""
            } WHERE vehicle_id=:vehicleId`,
            binds,
          ),
        )
      } else
        await db.execute(
          `INSERT INTO BUS_VEHICLES(vehicle_id,license_plate,vehicle_type,seat_count${
            capabilities.vehicleExtras ? ",brand,model_year,availability" : ""
          }) VALUES(:vehicleId,:licensePlate,:vehicleType,:seatCount${
            capabilities.vehicleExtras ? ",:brand,:modelYear,:availability" : ""
          })`,
          binds,
        )
      return { vehicleId: binds.vehicleId }
    })
  }
  app.delete(
    "/api/vehicles/:id",
    guard("admin-vehicles", true),
    async (req, res) => {
      await transaction(async (db) =>
        changed(
          await db.execute(
            "DELETE FROM BUS_VEHICLES WHERE vehicle_id=:vehicleId",
            { vehicleId: req.params.id },
          ),
        ),
      )
      res.json({ ok: true })
    },
  )
  app.post("/api/routes", guard("admin-routes", true), async (req, res) => {
    const routeId = id("R")
    await transaction((db) =>
      db.execute(
        "INSERT INTO BUS_ROUTES(route_id,route_name,total_minutes) VALUES(:routeId,:routeName,0)",
        { routeId, routeName: text(req.body.routeName, "ชื่อเส้นทาง", 150) },
      ),
    )
    res.json({ routeId })
  })
  app.put("/api/routes/:id", guard("admin-routes", true), async (req, res) => {
    await transaction(async (db) => {
      await routeUnlocked(db, req.params.id)
      changed(
        await db.execute(
          "UPDATE BUS_ROUTES SET route_name=:name WHERE route_id=:routeId",
          {
            name: text(req.body.routeName, "ชื่อเส้นทาง", 150),
            routeId: req.params.id,
          },
        ),
      )
    })
    res.json({ ok: true })
  })
  app.delete(
    "/api/routes/:id",
    guard("admin-routes", true),
    async (req, res) => {
      await transaction(async (db) => {
        await routeUnlocked(db, req.params.id)
        requireThat(
          !(
            await query(
              db,
              "SELECT trip_id FROM BUS_TRIP_ROUNDS WHERE route_id=:routeId AND ROWNUM=1",
              { routeId: req.params.id },
            )
          ).length,
          "เส้นทางยังมีรอบรถอยู่ กรุณาจัดการรอบรถก่อน",
          409,
        )
        await db.execute(
          "DELETE FROM BUS_ROUTE_STOPS WHERE route_id=:routeId",
          { routeId: req.params.id },
        )
        changed(
          await db.execute("DELETE FROM BUS_ROUTES WHERE route_id=:routeId", {
            routeId: req.params.id,
          }),
        )
      })
      res.json({ ok: true })
    },
  )
  app.post(
    "/api/routes/:id/stops",
    guard("admin-routes", true),
    async (req, res) => res.json(await saveStop(req.params.id, req.body)),
  )
  app.put(
    "/api/routes/:id/stops/:stopId",
    guard("admin-routes", true),
    async (req, res) =>
      res.json(await saveStop(req.params.id, req.body, req.params.stopId)),
  )
  async function saveStop(routeId, b, routeStopId) {
    const stopName = text(b.stopName, "ชื่อจุดจอด"),
      minutesFromPrev = integer(b.minutesFromPrev, "นาทีเดินทาง", 0, 1440)
    return transaction(async (db) => {
      await db.execute("LOCK TABLE BUS_TRIP_ROUNDS IN SHARE ROW EXCLUSIVE MODE")
      await routeUnlocked(db, routeId)
      const ordered = await query(
        db,
        "SELECT * FROM BUS_ROUTE_STOPS WHERE route_id=:routeId ORDER BY stop_sequence",
        { routeId },
      )
      requireThat(ordered.length < 500, "เส้นทางมีจุดจอดมากเกินไป")
      let [stop] = await query(
        db,
        "SELECT stop_id FROM BUS_STOPS WHERE stop_name=:stopName",
        { stopName },
      )
      if (!stop) {
        stop = { stopId: id("S") }
        await db.execute(
          "INSERT INTO BUS_STOPS(stop_id,stop_name) VALUES(:stopId,:stopName)",
          { stopId: stop.stopId, stopName },
        )
      }
      if (routeStopId) {
        const entry = ordered.find((s) => s.routeStopId === routeStopId)
        requireThat(entry, "ไม่พบจุดจอด", 404)
        entry.minutesFromPrev = minutesFromPrev
        await db.execute(
          "UPDATE BUS_ROUTE_STOPS SET stop_id=:stopId WHERE route_stop_id=:routeStopId",
          { stopId: stop.stopId, routeStopId },
        )
      } else {
        const newId = id("RS")
        let index = ordered.length
        if (b.anchorId) {
          const anchor = ordered.findIndex((s) => s.routeStopId === b.anchorId)
          requireThat(anchor >= 0, "ไม่พบจุดอ้างอิง")
          index = anchor + (b.placement === "before" ? 0 : 1)
        }
        await db.execute(
          "INSERT INTO BUS_ROUTE_STOPS(route_stop_id,route_id,stop_id,stop_sequence,minutes_from_prev) VALUES(:routeStopId,:routeId,:stopId,99999,:minutesFromPrev)",
          { routeStopId: newId, routeId, stopId: stop.stopId, minutesFromPrev },
        )
        ordered.splice(index, 0, { routeStopId: newId, minutesFromPrev })
      }
      await resequence(db, routeId, ordered)
      await assertExistingTripClashes(db, routeId)
      return { ok: true }
    })
  }
  app.delete(
    "/api/routes/:id/stops/:stopId",
    guard("admin-routes", true),
    async (req, res) => {
      await transaction(async (db) => {
        await db.execute(
          "LOCK TABLE BUS_TRIP_ROUNDS IN SHARE ROW EXCLUSIVE MODE",
        )
        await routeUnlocked(db, req.params.id)
        changed(
          await db.execute(
            "DELETE FROM BUS_ROUTE_STOPS WHERE route_id=:routeId AND route_stop_id=:routeStopId",
            { routeId: req.params.id, routeStopId: req.params.stopId },
          ),
        )
        await resequence(
          db,
          req.params.id,
          await query(
            db,
            "SELECT * FROM BUS_ROUTE_STOPS WHERE route_id=:routeId ORDER BY stop_sequence",
            { routeId: req.params.id },
          ),
        )
        const [count] = await query(
          db,
          "SELECT COUNT(*) n FROM BUS_ROUTE_STOPS WHERE route_id=:routeId",
          { routeId: req.params.id },
        )
        if (count.n < 2)
          requireThat(
            !(
              await query(
                db,
                "SELECT trip_id FROM BUS_TRIP_ROUNDS WHERE route_id=:routeId AND status<>'CANCELLED' AND ROWNUM=1",
                { routeId: req.params.id },
              )
            ).length,
            "ต้องเหลืออย่างน้อย 2 จุดสำหรับเส้นทางที่มีรอบรถ",
          )
      })
      res.json({ ok: true })
    },
  )
  app.post("/api/trips", guard("admin-schedule", true), async (req, res) => {
    res.json(
      await transaction(async (db) => {
        await db.execute(
          "LOCK TABLE BUS_TRIP_ROUNDS IN SHARE ROW EXCLUSIVE MODE",
        )
        const binds = await validateTrip(db, req.body)
        binds.tripId = id("T")
        await db.execute(
          `INSERT INTO BUS_TRIP_ROUNDS(trip_id,route_id,driver_employee_id,vehicle_id,departure_at,status) VALUES(:tripId,:routeId,:driverEmployeeId,:vehicleId,TO_TIMESTAMP(:departureAt,'YYYY-MM-DD"T"HH24:MI:SS'),'SCHEDULED')`,
          binds,
        )
        return { tripId: binds.tripId }
      }),
    )
  })
  app.put("/api/trips/:id", guard("admin-schedule", true), async (req, res) => {
    await transaction(async (db) => {
      await db.execute("LOCK TABLE BUS_TRIP_ROUNDS IN SHARE ROW EXCLUSIVE MODE")
      const [current] = await query(
        db,
        "SELECT status FROM BUS_TRIP_ROUNDS WHERE trip_id=:tripId FOR UPDATE",
        { tripId: req.params.id },
      )
      requireThat(current, "ไม่พบรอบรถ", 404)
      requireThat(current.status === "SCHEDULED", "แก้ไขได้เฉพาะรอบที่ยังไม่เริ่ม")
      requireThat(
        !(
          await query(
            db,
            "SELECT booking_id FROM BUS_BOOKINGS WHERE trip_id=:tripId AND ROWNUM=1",
            { tripId: req.params.id },
          )
        ).length,
        "รอบนี้มีประวัติการจองแล้ว กรุณายกเลิกรอบเดิมและสร้างรอบใหม่",
        409,
      )
      const binds = await validateTrip(db, req.body, req.params.id)
      changed(
        await db.execute(
          `UPDATE BUS_TRIP_ROUNDS SET route_id=:routeId,driver_employee_id=:driverEmployeeId,vehicle_id=:vehicleId,departure_at=TO_TIMESTAMP(:departureAt,'YYYY-MM-DD"T"HH24:MI:SS') WHERE trip_id=:tripId`,
          { ...binds, tripId: req.params.id },
        ),
      )
    })
    res.json({ ok: true })
  })
  app.delete(
    "/api/trips/:id",
    guard("admin-schedule", true),
    async (req, res) => {
      const result = await transaction(async (db) => {
        const tripId = req.params.id
        const [trip] = await query(
          db,
          "SELECT status FROM BUS_TRIP_ROUNDS WHERE trip_id=:tripId FOR UPDATE",
          { tripId },
        )
        requireThat(trip, "ไม่พบรอบรถ", 404)
        requireThat(
          trip.status === "SCHEDULED" || trip.status === "CANCELLED",
          "ไม่สามารถลบรอบที่เริ่มงานแล้ว",
        )
        const hasBookings = (
          await query(
            db,
            "SELECT COUNT(*) n FROM BUS_BOOKINGS WHERE trip_id=:tripId",
            { tripId },
          )
        )[0].n
        if (hasBookings || tripId.startsWith("DAILY-")) {
          await db.execute(
            "UPDATE BUS_BOOKING_DETAILS SET status='CANCELLED' WHERE trip_id=:tripId",
            { tripId },
          )
          await db.execute(
            "UPDATE BUS_BOOKINGS SET status='CANCELLED' WHERE trip_id=:tripId",
            { tripId },
          )
          await db.execute(
            "UPDATE BUS_TRIP_ROUNDS SET status='CANCELLED' WHERE trip_id=:tripId",
            { tripId },
          )
          return { message: "ยกเลิกรอบรถและคืนที่นั่งแล้ว เก็บประวัติการจองไว้" }
        }
        changed(
          await db.execute(
            "DELETE FROM BUS_TRIP_ROUNDS WHERE trip_id=:tripId",
            { tripId },
          ),
        )
        return { message: "ลบรอบเดินรถแล้ว" }
      })
      res.json(result)
    },
  )
  app.get("/api/permissions", guard("admin-permissions"), async (req, res) =>
    res.json(
      await read((db) => query(db, "SELECT * FROM BUS_POSITION_PERMISSIONS")),
    ),
  )
  app.put(
    "/api/permissions",
    guard("admin-permissions", true),
    async (req, res) => {
      const positions = req.body.positions
      requireThat(
        Array.isArray(positions) && positions.length <= 100,
        "รูปแบบสิทธิ์ไม่ถูกต้อง",
      )
      requireThat(
        new Set(positions.map((p) => p.positionId)).size === positions.length,
        "มีตำแหน่งซ้ำ",
      )
      await transaction(async (db) => {
        for (const entry of [...positions].sort((a, b) =>
          String(a.positionId).localeCompare(String(b.positionId)),
        )) {
          const positionId = text(entry.positionId, "รหัสตำแหน่ง", 40)
          requireThat(
            positionId !== "ADMIN" && Array.isArray(entry.permissions),
            "ไม่สามารถแก้ไขสิทธิ์ Admin หรือข้อมูลไม่ถูกต้อง",
          )
          requireThat(
            (
              await query(
                db,
                "SELECT position_id FROM BUS_POSITIONS WHERE position_id=:positionId FOR UPDATE",
                { positionId },
              )
            ).length,
            "ไม่พบตำแหน่ง",
            404,
          )
          for (const [screenId] of screens) {
            const p = entry.permissions.find((p) => p.screenId === screenId)
            const canView = p?.view === true ? 1 : 0,
              canModify = p?.modify === true && canView ? 1 : 0
            await db.execute(
              "DELETE FROM BUS_POSITION_PERMISSIONS WHERE position_id=:positionId AND screen_id=:screenId",
              { positionId, screenId },
            )
            await db.execute(
              "INSERT INTO BUS_POSITION_PERMISSIONS(permission_id,position_id,screen_id,can_view,can_modify) VALUES(:permissionId,:positionId,:screenId,:canView,:canModify)",
              {
                permissionId: id("P"),
                positionId,
                screenId,
                canView,
                canModify,
              },
            )
          }
        }
      })
      res.json({ ok: true })
    },
  )
  app.put(
    "/api/permissions/:id",
    guard("admin-permissions", true),
    async (req, res) => {
      requireThat(req.params.id !== "ADMIN", "สิทธิ์ Admin ไม่สามารถเปลี่ยนได้")
      requireThat(Array.isArray(req.body.permissions), "รูปแบบสิทธิ์ไม่ถูกต้อง")
      await transaction(async (db) => {
        const positionId = req.params.id
        requireThat(
          (
            await query(
              db,
              "SELECT position_id FROM BUS_POSITIONS WHERE position_id=:positionId FOR UPDATE",
              { positionId },
            )
          ).length,
          "ไม่พบตำแหน่ง",
          404,
        )
        for (const [screenId] of screens) {
          const p = req.body.permissions.find((p) => p.screenId === screenId)
          const canView = p?.view ? 1 : 0,
            canModify = p?.modify && canView ? 1 : 0
          await db.execute(
            "DELETE FROM BUS_POSITION_PERMISSIONS WHERE position_id=:positionId AND screen_id=:screenId",
            { positionId, screenId },
          )
          await db.execute(
            "INSERT INTO BUS_POSITION_PERMISSIONS(permission_id,position_id,screen_id,can_view,can_modify) VALUES(:permissionId,:positionId,:screenId,:canView,:canModify)",
            { permissionId: id("P"), positionId, screenId, canView, canModify },
          )
        }
      })
      res.json({ ok: true })
    },
  )
  app.post(
    "/api/positions",
    guard("admin-permissions", true),
    async (req, res) => {
      const positionId = id("POS")
      await transaction((db) =>
        db.execute(
          "INSERT INTO BUS_POSITIONS(position_id,position_name) VALUES(:positionId,:name)",
          { positionId, name: text(req.body.positionName, "ชื่อตำแหน่ง", 100) },
        ),
      )
      res.json({ positionId })
    },
  )
  app.delete(
    "/api/positions/:id",
    guard("admin-permissions", true),
    async (req, res) => {
      requireThat(
        !["ADMIN", "DRIVER"].includes(req.params.id),
        "ไม่สามารถลบตำแหน่งหลักของระบบ",
      )
      await transaction(async (db) => {
        await db.execute(
          "DELETE FROM BUS_POSITION_PERMISSIONS WHERE position_id=:positionId",
          { positionId: req.params.id },
        )
        changed(
          await db.execute(
            "DELETE FROM BUS_POSITIONS WHERE position_id=:positionId",
            { positionId: req.params.id },
          ),
        )
      })
      res.json({ ok: true })
    },
  )
}
async function assertExistingTripClashes(db, routeId) {
  const all = await query(
    db,
    `SELECT t.trip_id,t.route_id,t.vehicle_id,t.driver_employee_id,${ts("t.departure_at")} departure_at,r.total_minutes FROM BUS_TRIP_ROUNDS t JOIN BUS_ROUTES r ON r.route_id=t.route_id WHERE t.status<>'CANCELLED'`,
  )
  for (const a of all.filter((t) => t.routeId === routeId))
    for (const b of all) {
      if (
        a.tripId !== b.tripId &&
        (a.vehicleId === b.vehicleId ||
          a.driverEmployeeId === b.driverEmployeeId)
      )
        requireThat(
          !overlaps(
            a.departureAt,
            a.totalMinutes,
            b.departureAt,
            b.totalMinutes,
          ),
          "เวลาเส้นทางใหม่ทำให้รถหรือคนขับทับซ้อนกับรอบอื่น",
          409,
        )
    }
}
