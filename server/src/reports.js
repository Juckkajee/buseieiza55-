import { query, read, ts, capabilities } from "./db.js"
import { guard } from "./auth.js"
import { epoch } from "./domain.js"
import {
  reportPeriod,
  reportTimeline,
  summarizeTickets as summarize,
} from "./report-period.js"
export function reportRoutes(app) {
  app.get("/api/reports", guard("reports"), async (req, res) => {
    const range = reportPeriod(req.query)
    const { fromDate, toDate } = range
    res.json(
      await read(async (db) => {
        const binds = { fromDate, toDate }
        const tickets = await query(
          db,
          `SELECT d.booking_id,d.status,d.checked_in_at,${ts("t.departure_at")} departure_at,t.trip_id,t.route_id,t.driver_employee_id,s.stop_id,s.stop_name
        FROM BUS_BOOKING_DETAILS d JOIN BUS_TRIP_ROUNDS t ON t.trip_id=d.trip_id JOIN BUS_ROUTE_STOPS rs ON rs.route_stop_id=d.pickup_route_stop_id JOIN BUS_STOPS s ON s.stop_id=rs.stop_id WHERE t.departure_at>=TO_TIMESTAMP(:fromDate,'YYYY-MM-DD') AND t.departure_at<TO_TIMESTAMP(:toDate,'YYYY-MM-DD')`,
          binds,
        )
        const trips = await query(
          db,
          `SELECT t.trip_id,t.route_id,t.driver_employee_id,t.status,${ts("t.departure_at")} departure_at,r.route_name,v.seat_count,e.full_name driver_name${
            capabilities.tripEvents
              ? `,(SELECT ${ts("ev.event_at")} FROM BUS_TRIP_EVENTS ev WHERE ev.trip_id=t.trip_id AND ev.event_type='START') started_at`
              : ""
          }
        FROM BUS_TRIP_ROUNDS t JOIN BUS_ROUTES r ON r.route_id=t.route_id JOIN BUS_VEHICLES v ON v.vehicle_id=t.vehicle_id JOIN BUS_EMPLOYEES e ON e.employee_id=t.driver_employee_id WHERE t.departure_at>=TO_TIMESTAMP(:fromDate,'YYYY-MM-DD') AND t.departure_at<TO_TIMESTAMP(:toDate,'YYYY-MM-DD')`,
          binds,
        )
        const monthly = reportTimeline(tickets, { ...range, period: "year" })
        const stops = await query(
          db,
          "SELECT stop_id,stop_name FROM BUS_STOPS ORDER BY stop_name",
        )
        const stations = stops.map((s) => ({
          name: s.stopName,
          ...summarize(tickets.filter((d) => d.stopId === s.stopId)),
        }))
        const allRoutes = await query(
          db,
          "SELECT route_id,route_name FROM BUS_ROUTES ORDER BY route_name",
        )
        const routes = allRoutes.map((r) => {
          const actual = trips.filter(
            (t) => t.routeId === r.routeId && t.status !== "CANCELLED",
          )
          const rows = tickets.filter((d) => d.routeId === r.routeId)
          const capacity = actual.reduce((n, t) => n + t.seatCount, 0),
            used = rows.filter((d) => d.status !== "CANCELLED").length
          return {
            name: r.routeName,
            trips: actual.length,
            completed: actual.filter((t) => t.status === "COMPLETED").length,
            capacity,
            utilization: capacity ? Math.round((used / capacity) * 100) : 0,
            ...summarize(rows),
          }
        })
        const allDrivers = await query(
          db,
          "SELECT employee_id,full_name FROM BUS_EMPLOYEES WHERE position_id='DRIVER' ORDER BY full_name",
        )
        const drivers = allDrivers.map((e) => {
          const jobs = trips.filter((t) => t.driverEmployeeId === e.employeeId)
          return {
            name: e.fullName,
            trips: jobs.length,
            completed: jobs.filter((t) => t.status === "COMPLETED").length,
            ontime: jobs.filter(
              (t) => t.startedAt && epoch(t.startedAt) <= epoch(t.departureAt),
            ).length,
            late: jobs.filter(
              (t) => t.startedAt && epoch(t.startedAt) > epoch(t.departureAt),
            ).length,
            ...summarize(
              tickets.filter((d) => d.driverEmployeeId === e.employeeId),
            ),
          }
        })
        const daily = [
          ...new Set(tickets.map((t) => t.departureAt.slice(0, 10))),
        ]
          .sort()
          .map((day) => ({
            name: day,
            ...summarize(tickets.filter((t) => t.departureAt.startsWith(day))),
          }))
        return {
          ...range,
          timeline: reportTimeline(tickets, range),
          summary: summarize(tickets),
          monthly,
          stations,
          routes,
          drivers,
          daily,
        }
      }),
    )
  })
}
