import { reportTimeline, summarizeTickets } from "./report-period.js"

const weekdays = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]
const boarded = (ticket) =>
  Boolean(ticket.checkedInAt) &&
  !["CANCELLED", "NO_SHOW"].includes(ticket.status)
const alighted = (ticket) =>
  boarded(ticket) && ticket.tripStatus === "COMPLETED"
const atStop = (departure, minutes) =>
  new Date(Date.parse(departure + "Z") + Number(minutes) * 60000)
    .toISOString()
    .slice(11, 16)

// Pure aggregation shared by the API and regression tests. Dates are the Bangkok
// departure day of the trip, consistently across all five reports.
export function requirementReports(
  tickets,
  trips,
  stops,
  routes,
  routeStops,
  range,
  drivers = [],
  vehicles = [],
) {
  const buckets = reportTimeline(tickets, range)
  const bucketSize = buckets[0]?.key.length || 7
  const byBucket = new Map(buckets.map((b) => [b.key, b]))
  const stationSeries = stops.map((s, i) => ({
    id: s.stopId,
    name: s.stopName,
    key: `s${i}`,
  }))
  const stationKeys = new Map(stationSeries.map((s) => [s.id, s.key]))
  const movements = buckets.map(({ key, name }) => ({
    key,
    name,
    ...Object.fromEntries(
      stationSeries.flatMap((s) => [
        [`${s.key}Up`, 0],
        [`${s.key}Down`, 0],
      ]),
    ),
  }))
  const movementMap = new Map(movements.map((m) => [m.key, m]))
  const users = new Map()
  const routeSeries = routes.map((r, i) => ({
    id: r.routeId,
    name: r.routeName,
    key: `r${i}`,
  }))
  const routeKeys = new Map(routeSeries.map((r) => [r.id, r.key]))
  const routeWeekdays = weekdays.map((name) => ({
    name,
    total: 0,
    ...Object.fromEntries(routeSeries.map((r) => [r.key, 0])),
  }))
  const tripMap = new Map(trips.map((t) => [t.tripId, t]))
  const stopMap = new Map(routeStops.map((s) => [s.routeStopId, s]))
  const slots = new Map()
  const slotKey = (stop, trip) =>
    `${stop.stopId}|${atStop(trip.departureAt, stop.offsetMinutes)}`
  const ensureSlot = (stop, trip) => {
    const key = slotKey(stop, trip)
    if (!slots.has(key))
      slots.set(key, {
        stopId: stop.stopId,
        name: stop.stopName,
        time: atStop(trip.departureAt, stop.offsetMinutes),
        up: 0,
        down: 0,
      })
    return slots.get(key)
  }
  const stopsByRoute = new Map()
  for (const stop of routeStops) {
    if (!stopsByRoute.has(stop.routeId)) stopsByRoute.set(stop.routeId, [])
    stopsByRoute.get(stop.routeId).push(stop)
  }
  for (const trip of trips) {
    if (trip.status !== "CANCELLED")
      for (const stop of stopsByRoute.get(trip.routeId) || [])
        ensureSlot(stop, trip)
  }
  for (const ticket of tickets) {
    if (!byBucket.has(ticket.departureAt.slice(0, bucketSize))) continue
    const userKey = ticket.userId
    if (!users.has(userKey))
      users.set(userKey, {
        userId: userKey,
        name: ticket.userName,
        tickets: [],
      })
    users.get(userKey).tickets.push(ticket)
    const movement = movementMap.get(ticket.departureAt.slice(0, bucketSize))
    if (boarded(ticket)) {
      const upKey = stationKeys.get(ticket.stopId)
      if (upKey !== undefined) movement[`${upKey}Up`]++
      const weekday =
        (new Date(ticket.departureAt.slice(0, 10) + "T00:00:00Z").getUTCDay() +
          6) %
        7
      const routeKey = routeKeys.get(ticket.routeId)
      if (routeKey !== undefined) {
        routeWeekdays[weekday][routeKey]++
        routeWeekdays[weekday].total++
      }
      const trip = tripMap.get(ticket.tripId),
        stop = stopMap.get(ticket.pickupRouteStopId)
      if (trip && stop) ensureSlot(stop, trip).up++
    }
    if (alighted(ticket)) {
      const downKey = stationKeys.get(ticket.dropoffStopId)
      if (downKey !== undefined) movement[`${downKey}Down`]++
      const trip = tripMap.get(ticket.tripId),
        stop = stopMap.get(ticket.dropoffRouteStopId)
      if (trip && stop) ensureSlot(stop, trip).down++
    }
  }
  const behavior = [...users.values()]
    .map(({ tickets: items, ...user }) => {
      const summary = summarizeTickets(items)
      const checkin = items.filter(boarded).length
      return {
        ...user,
        ...summary,
        checkin,
        pending: summary.seats - checkin - summary.cancelled - summary.noshow,
      }
    })
    .sort(
      (a, b) =>
        b.seats - a.seats ||
        a.name.localeCompare(b.name, "th") ||
        a.userId.localeCompare(b.userId),
    )
  const jobs = trips.filter(t => t.status !== "CANCELLED")
  const driverMap = new Map(drivers.map(d => [d.employeeId, {id:d.employeeId, name:d.fullName, total:0, before17:0, after17:0}]))
  const vehicleMap = new Map(vehicles.map(v => [v.vehicleId, {id:v.vehicleId, name:v.licensePlate, type:v.vehicleType, seats:v.seatCount, total:0}]))
  for (const trip of jobs) {
    if (!driverMap.has(trip.driverEmployeeId)) driverMap.set(trip.driverEmployeeId, {id:trip.driverEmployeeId, name:trip.driverName, total:0, before17:0, after17:0})
    const driver = driverMap.get(trip.driverEmployeeId)
    driver.total++
    driver[trip.departureAt.slice(11,16) < "17:00" ? "before17" : "after17"]++
    if (!vehicleMap.has(trip.vehicleId)) vehicleMap.set(trip.vehicleId, {id:trip.vehicleId, name:trip.licensePlate, type:trip.vehicleType, seats:trip.seatCount, total:0})
    vehicleMap.get(trip.vehicleId).total++
  }
  const vehicleAssignments = [...vehicleMap.values()].sort((a,b) => String(a.type).localeCompare(String(b.type), "th") || a.seats-b.seats || String(a.name).localeCompare(String(b.name), "th"))
  const typeMap = new Map()
  for (const vehicle of vehicleAssignments) {
    const name = `${vehicle.type} ${vehicle.seats} ที่นั่ง`
    if (!typeMap.has(name)) typeMap.set(name, {name, total:0})
    typeMap.get(name).total += vehicle.total
  }
  return {
    driverAssignments: [...driverMap.values()].sort((a,b) => String(a.name).localeCompare(String(b.name), "th") || String(a.id).localeCompare(String(b.id))),
    vehicleAssignments,
    vehicleTypes: [...typeMap.values()],
    stationSeries,
    movements,
    behavior,
    routeSeries,
    routeWeekdays,
    stopTimes: [...slots.values()].sort(
      (a, b) =>
        a.name.localeCompare(b.name, "th") ||
        a.stopId.localeCompare(b.stopId) ||
        a.time.localeCompare(b.time),
    ),
    movementSummary: {
      up: tickets.filter(boarded).length,
      down: tickets.filter(alighted).length,
    },
  }
}
