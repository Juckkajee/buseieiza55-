export type User = {
  id: string
  fullName: string
  username: string
  phone: string
  userType?: string
  email?: string
  kind: "user" | "employee"
  role: "admin" | "driver" | "user"
  positionId?: string
  positionName?: string
  permissions: Record<string, { view: boolean; modify: boolean }>
}
export type Stop = {
  routeStopId: string
  routeId: string
  stopId: string
  stopName: string
  stopSequence: number
  minutesFromPrev: number
}
export type Route = {
  routeId: string
  routeName: string
  totalMinutes: number
  stops: Stop[]
}
export type Vehicle = {
  vehicleId: string
  licensePlate: string
  vehicleType: string
  seatCount: number
  brand: string | null
  modelYear: number | null
  availability: string
}
export type Employee = {
  employeeId: string
  fullName: string
  username: string
  phone: string
  email: string
  departmentId: string
  departmentName: string
  positionId: string
  positionName: string
}
export type TripEvent = {
  eventId: string
  tripId: string
  routeStopId: string | null
  eventType: "START" | "STOP" | "FINISH"
  eventAt: string
}
export type Trip = {
  tripId: string
  routeId: string
  routeName: string
  totalMinutes: number
  departureAt: string
  status: string
  vehicleId: string
  licensePlate: string
  vehicleType: string
  seatCount: number
  driverEmployeeId: string
  driverName: string
  occupiedCount: number
  events: TripEvent[]
}
export type Ticket = {
  bookingId: string
  ticketNo: string
  seatNumber: string
  status: string
  qrToken: string
  travelAt: string
  checkedInAt: string | null
  pickupName: string
  dropoffName: string
  pickupSequence: number
  dropoffSequence: number
}
export type Booking = {
  bookingId: string
  tripId: string
  status: string
  bookedAt: string
  routeId: string
  routeName: string
  departureAt: string
  tripStatus: string
  vehicleId: string
  licensePlate: string
  vehicleType: string
  driverName: string
  tickets: Ticket[]
}
export type Draft = {
  id: string
  trip: Trip
  pickup: Stop
  dropoff: Stop
  seats: string[]
}
export type Data = {
  capabilities: { vehicleExtras: boolean; tripEvents: boolean }
  routes: Route[]
  vehicles: Vehicle[]
  departments: { departmentId: string; departmentName: string }[]
  positions: { positionId: string; positionName: string }[]
  drivers: { employeeId: string; fullName: string }[]
  screens: { screenId: string; screenName: string }[]
}
export type Permission = {
  permissionId: string
  positionId: string
  screenId: string
  canView: number
  canModify: number
}
