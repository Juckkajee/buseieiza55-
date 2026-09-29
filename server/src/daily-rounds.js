import { readFile } from "node:fs/promises"
import { transaction, query, ts, capabilities } from "./db.js"
import { bangkokNow, overlaps, timestamp } from "./domain.js"

// Materialize the next 90 days so bookings always reference real Oracle trips.
// Stable IDs preserve edits and cancellation; never recreate a cancelled round.
export async function ensureDailyRounds() {
  const config = JSON.parse(
    await readFile(
      new URL("../config/daily-rounds.json", import.meta.url),
      "utf8",
    ),
  )
  const now = bangkokNow(),
    firstDay = now.slice(0, 10)
  return transaction(async (db) => {
    await db.execute("LOCK TABLE BUS_TRIP_ROUNDS IN SHARE ROW EXCLUSIVE MODE")
    const routes = await query(
      db,
      "SELECT route_id,total_minutes FROM BUS_ROUTES WHERE total_minutes>0 AND (SELECT COUNT(*) FROM BUS_ROUTE_STOPS s WHERE s.route_id=BUS_ROUTES.route_id)>=2",
    )
    const drivers = await query(
      db,
      "SELECT employee_id FROM BUS_EMPLOYEES WHERE position_id='DRIVER'",
    )
    const vehicles = await query(
      db,
      "SELECT vehicle_id FROM BUS_VEHICLES" +
        (capabilities.vehicleExtras ? " WHERE availability='AVAILABLE'" : ""),
    )
    const trips = await query(
      db,
      `SELECT t.trip_id,t.route_id,t.driver_employee_id,t.vehicle_id,t.status,${ts("t.departure_at")} departure_at,r.total_minutes FROM BUS_TRIP_ROUNDS t JOIN BUS_ROUTES r ON r.route_id=t.route_id`,
    )
    let added = 0,
      conflicts = 0
    for (const rule of config) {
      timestamp(firstDay + "T" + rule.time)
      const route = routes.find((r) => r.routeId === rule.routeId)
      if (
        !route ||
        !drivers.some((d) => d.employeeId === rule.driverEmployeeId) ||
        !vehicles.some((v) => v.vehicleId === rule.vehicleId)
      )
        continue
      for (let offset = 0; offset < 90; offset++) {
        const day = new Date(firstDay + "T00:00:00Z")
        day.setUTCDate(day.getUTCDate() + offset)
        const date = day.toISOString().slice(0, 10),
          departureAt = date + "T" + rule.time + ":00"
        const tripId = `DAILY-${rule.routeId}-${date}-${rule.time.replace(":", "")}`
        if (
          departureAt <= now ||
          trips.some(
            (t) =>
              t.tripId === tripId ||
              (t.routeId === rule.routeId && t.departureAt === departureAt),
          )
        )
          continue
        if (
          trips.some(
            (t) =>
              t.status !== "CANCELLED" &&
              (t.driverEmployeeId === rule.driverEmployeeId ||
                t.vehicleId === rule.vehicleId) &&
              overlaps(
                departureAt,
                route.totalMinutes,
                t.departureAt,
                t.totalMinutes,
              ),
          )
        ) {
          conflicts++
          continue
        }
        await db.execute(
          `INSERT INTO BUS_TRIP_ROUNDS(trip_id,route_id,driver_employee_id,vehicle_id,departure_at) VALUES(:tripId,:routeId,:driverEmployeeId,:vehicleId,TO_TIMESTAMP(:departureAt,'YYYY-MM-DD"T"HH24:MI:SS'))`,
          {
            tripId,
            routeId: rule.routeId,
            driverEmployeeId: rule.driverEmployeeId,
            vehicleId: rule.vehicleId,
            departureAt,
          },
        )
        trips.push({
          ...rule,
          tripId,
          departureAt,
          totalMinutes: route.totalMinutes,
          status: "SCHEDULED",
        })
        added++
      }
    }
    return { added, conflicts }
  })
}
