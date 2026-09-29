import { mkdir, readFile, writeFile } from "node:fs/promises"
import {
  connect,
  close,
  read,
  transaction,
  query,
  capabilities,
} from "../src/db.js"
import { hashPassword, bangkokNow } from "../src/domain.js"
import {
  generateDemo,
  validateDemo,
  DEMO_PREFIX,
  DEMO_BATCH,
} from "./report-demo-data.js"

// Opt-in data import. No DDL, UPDATE, DELETE, TRUNCATE, or existing-account reset.
// IDs continue numeric maxima under table locks. SQL 003 is not installed here.
const apply = process.argv.includes("--apply"),
  now = bangkokNow()
const directory = new URL("../private/", import.meta.url),
  manifestFile = new URL(`${DEMO_BATCH}.json`, directory)
const specs = [
  ["employees", "BUS_EMPLOYEES", "employee_id", "E"],
  ["users", "BUS_USERS", "user_id", "U"],
  ["vehicles", "BUS_VEHICLES", "vehicle_id", "V"],
  ["trips", "BUS_TRIP_ROUNDS", "trip_id", "T"],
  ["bookings", "BUS_BOOKINGS", "booking_id", "BK"],
  ["tickets", "BUS_BOOKING_DETAILS", "booking_id"],
  ["events", "BUS_TRIP_EVENTS", "event_id"],
]
let receipt,
  committed = false
const safeWrite = async () =>
  writeFile(manifestFile, JSON.stringify(receipt, null, 2))
try {
  await connect()
  if (
    !capabilities.vehicleExtras ||
    !capabilities.tripEvents ||
    !capabilities.bookingCancellation
  )
    throw Error("Approved migrations 002 and 004 must already be installed")
  if (capabilities.readableIds)
    throw Error(
      "Sequence IDs are enabled. Reserve IDs from sequences before adapting this one-time import.",
    )
  const existing = await read((db) =>
    query(
      db,
      "SELECT username FROM BUS_EMPLOYEES WHERE username LIKE :pattern UNION ALL SELECT username FROM BUS_USERS WHERE username LIKE :pattern",
      { pattern: DEMO_PREFIX + "%" },
    ),
  )
  if (existing.length) {
    const prior = JSON.parse(
      await readFile(manifestFile, "utf8").catch(() => '{"state":"missing"}'),
    )
    if (
      prior.batch === DEMO_BATCH &&
      prior.state === "committed" &&
      existing.length === 508
    ) {
      console.log("This demo batch is already imported; no rows changed.")
      console.log(JSON.stringify(prior.summary))
    } else
      throw Error(
        "Demo usernames already exist; inspect the private manifest before retrying. No rows changed.",
      )
  } else {
    let hashes = []
    if (apply) {
      const password = process.env.DEMO_PASSWORD
      if (!password || password.length < 8)
        throw Error(
          "Set DEMO_PASSWORD (at least 8 characters) for the new synthetic accounts only",
        )
      console.log("Preparing 508 independently salted password hashes...")
      for (let i = 0; i < 508; i += 4)
        hashes.push(
          ...(await Promise.all(
            Array.from({ length: Math.min(4, 508 - i) }, () =>
              hashPassword(password),
            ),
          )),
        )
    }
    const run = async (db) => {
      if (apply)
        for (const table of [
          "BUS_EMPLOYEES",
          "BUS_USERS",
          "BUS_VEHICLES",
          "BUS_ROUTES",
          "BUS_ROUTE_STOPS",
          "BUS_TRIP_ROUNDS",
          "BUS_BOOKINGS",
          "BUS_BOOKING_DETAILS",
          "BUS_TRIP_EVENTS",
        ])
          await db.execute(
            `LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE NOWAIT`,
          )
      const duplicates = await query(
        db,
        "SELECT username FROM BUS_EMPLOYEES WHERE username LIKE :pattern UNION ALL SELECT username FROM BUS_USERS WHERE username LIKE :pattern",
        { pattern: DEMO_PREFIX + "%" },
      )
      if (duplicates.length)
        throw Error("Concurrent demo import detected; stopped")
      const starts = {},
        before = {}
      for (const [key, table, column, prefix] of specs) {
        before[key] = await query(
          db,
          `SELECT * FROM ${table} ORDER BY ${column}`,
        )
        if (prefix) {
          const [{ n }] = await query(
            db,
            `SELECT NVL(MAX(CASE WHEN REGEXP_LIKE(${column},'^${prefix}[0-9]+$') THEN TO_NUMBER(SUBSTR(${column},${prefix.length + 1})) END),0) n FROM ${table}`,
          )
          starts[prefix] = n
        }
      }
      const routes = await query(
          db,
          "SELECT * FROM BUS_ROUTES WHERE route_id IN ('R001','R002','R003') ORDER BY route_id",
        ),
        stops = await query(
          db,
          "SELECT * FROM BUS_ROUTE_STOPS ORDER BY route_id,stop_sequence",
        )
      const data = generateDemo({ routes, stops, now, starts }),
        summary = validateDemo(data, { routes, stops, now })
      const plates = new Set(before.vehicles.map((v) => v.licensePlate))
      if (data.vehicles.some((v) => plates.has(v.licensePlate)))
        throw Error("Demo license plate collision; no rows changed")
      console.log(
        JSON.stringify(
          {
            mode: apply ? "apply" : "preview",
            period: "2026-01-01 through 2026-12-31",
            asOf: now,
            summary,
          },
          null,
          2,
        ),
      )
      if (!apply) return
      let hashIndex = 0
      for (const row of [...data.employees, ...data.users])
        row.passwordHash = hashes[hashIndex++]
      await mkdir(directory, { recursive: true })
      const old = await readFile(manifestFile, "utf8").catch((e) => {
        if (e.code === "ENOENT") return null
        throw e
      })
      if (old && JSON.parse(old).state !== "rolled-back")
        throw Error(
          "A private import manifest already exists. Inspect its state before retrying.",
        )
      receipt = {
        batch: DEMO_BATCH,
        state: "prepared",
        createdAt: now,
        summary,
        beforeCounts: Object.fromEntries(
          specs.map(([k]) => [k, before[k].length]),
        ),
        ids: Object.fromEntries(
          specs.map(([key, , column]) => [
            key,
            data[key].map(
              (r) => r[column.replace(/_([a-z])/g, (_, c) => c.toUpperCase())],
            ),
          ]),
        ),
        accounts: [
          ...data.employees.map(({ passwordHash, ...r }) => ({
            ...r,
            kind: "employee",
          })),
          ...data.users.map(({ passwordHash, ...r }) => ({
            ...r,
            kind: "user",
          })),
        ],
        password: process.env.DEMO_PASSWORD,
      }
      // A private pre-import snapshot and ID manifest make the added batch identifiable.
      receipt.backupFile = `${DEMO_BATCH}-before-${Date.now()}.json`
      await writeFile(
        new URL(receipt.backupFile, directory),
        JSON.stringify(before, null, 2),
        { flag: "wx" },
      )
      await safeWrite()
      const timestamp = (bind) =>
        `TO_TIMESTAMP(:${bind},'YYYY-MM-DD"T"HH24:MI:SS')`
      const insert = async (key, sql) => {
        for (let i = 0; i < data[key].length; i += 500) {
          const batch = data[key].slice(i, i + 500)
          const result = await db.executeMany(sql, batch, { autoCommit: false })
          if (result.rowsAffected !== batch.length)
            throw Error(`Unexpected inserted row count for ${key}`)
        }
        console.log(
          `Inserted ${key}: ${data[key].length} (transaction pending)`,
        )
      }
      await insert(
        "employees",
        "INSERT INTO BUS_EMPLOYEES(employee_id,full_name,username,phone,email,department_id,position_id,password_hash) VALUES(:employeeId,:fullName,:username,:phone,:email,:departmentId,:positionId,:passwordHash)",
      )
      await insert(
        "users",
        "INSERT INTO BUS_USERS(user_id,full_name,username,phone,user_type,password_hash) VALUES(:userId,:fullName,:username,:phone,:userType,:passwordHash)",
      )
      await insert(
        "vehicles",
        "INSERT INTO BUS_VEHICLES(vehicle_id,license_plate,vehicle_type,seat_count,brand,model_year,availability) VALUES(:vehicleId,:licensePlate,:vehicleType,:seatCount,:brand,:modelYear,:availability)",
      )
      await insert(
        "trips",
        `INSERT INTO BUS_TRIP_ROUNDS(trip_id,route_id,driver_employee_id,vehicle_id,departure_at,status) VALUES(:tripId,:routeId,:driverId,:vehicleId,${timestamp("departureAt")},:status)`,
      )
      await insert(
        "bookings",
        `INSERT INTO BUS_BOOKINGS(booking_id,trip_id,user_id,booked_at,status,cancellation_reason,cancelled_at,cancelled_by) VALUES(:bookingId,:tripId,:userId,${timestamp("bookedAt")},:status,:cancellationReason,${timestamp("cancelledAt")},:cancelledBy)`,
      )
      await insert(
        "tickets",
        `INSERT INTO BUS_BOOKING_DETAILS(booking_id,ticket_no,trip_id,vehicle_id,pickup_route_stop_id,dropoff_route_stop_id,seat_number,travel_at,checked_in_at,status,qr_token) VALUES(:bookingId,:ticketNo,:tripId,:vehicleId,:pickupId,:dropoffId,:seatNumber,${timestamp("travelAt")},${timestamp("checkedInAt")},:status,:qrToken)`,
      )
      await insert(
        "events",
        `INSERT INTO BUS_TRIP_EVENTS(event_id,trip_id,route_stop_id,event_type,event_at) VALUES(:eventId,:tripId,:routeStopId,:eventType,${timestamp("eventAt")})`,
      )
      for (const [key, table, column] of specs) {
        const after = await query(
            db,
            `SELECT * FROM ${table} ORDER BY ${column}`,
          ),
          camel = column.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
          oldIds = new Set(before[key].map((r) => r[camel]))
        if (after.length !== before[key].length + data[key].length)
          throw Error("Unexpected final count: " + table)
        if (
          JSON.stringify(after.filter((r) => oldIds.has(r[camel]))) !==
          JSON.stringify(before[key])
        )
          throw Error("Pre-existing data changed: " + table)
      }
      receipt.state = "validated-before-commit"
      await safeWrite()
    }
    if (apply) {
      await transaction(run)
      committed = true
      receipt.state = "committed"
      await safeWrite()
      console.log(
        "COMMITTED. Existing rows unchanged. Private manifest: server/private/" +
          DEMO_BATCH +
          ".json",
      )
    } else await read(run)
  }
} catch (error) {
  if (receipt && !committed) {
    receipt.state = "rolled-back"
    receipt.error = error.message
    await safeWrite().catch(() => {})
  }
  console.error("Demo import stopped:", error.message)
  process.exitCode = 1
} finally {
  await close()
}
