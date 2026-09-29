import { readFile, mkdir, writeFile, unlink } from "node:fs/promises"
import { randomBytes } from "node:crypto"
import { connect, close, transaction, query, capabilities } from "../src/db.js"
import { hashPassword, requireThat, bangkokNow } from "../src/domain.js"
import { setupAdmin } from "../src/setup.js"

// Run only after choosing to import Figma starter data. Never overwrites data.
const password = () => randomBytes(12).toString("base64url") + "!A1"
const accounts = [
  {
    kind: "employee",
    username: "admin",
    password: password(),
    name: "ผู้ดูแลระบบ",
  },
  {
    kind: "employee",
    username: "driver",
    password: password(),
    name: "สมชาย ใจดี",
  },
  {
    kind: "employee",
    username: "sommai",
    password: password(),
    name: "สมหมาย ใจรัก",
  },
  {
    kind: "employee",
    username: "somkuan",
    password: password(),
    name: "สมควร ใจงาม",
  },
  {
    kind: "employee",
    username: "wipa",
    password: password(),
    name: "วิภา รักงาน",
  },
  {
    kind: "employee",
    username: "prayut",
    password: password(),
    name: "ประยุทธ์ ดีมาก",
  },
  { kind: "user", username: "user", password: password(), name: "นายกิตติ สุขใจ" },
]
let accountFileCreated = false,
  committed = false
const credentialsFile = new URL(
  "../private/starter-accounts.json",
  import.meta.url,
)
try {
  await connect()
  const source = JSON.parse(
    await readFile(new URL("./starter-routes.json", import.meta.url), "utf8"),
  )
  const now = bangkokNow(),
    start = now.slice(0, 10)
  await mkdir(new URL("../private/", import.meta.url), { recursive: true })
  // Reserve an account file first. A database failure removes no existing file.
  await writeFile(
    credentialsFile,
    JSON.stringify({ createdAt: now, accounts }, null, 2),
    { flag: "wx" },
  )
  accountFileCreated = true
  await transaction(async (db) => {
    for (const table of [
      "BUS_EMPLOYEES",
      "BUS_USERS",
      "BUS_ROUTES",
      "BUS_STOPS",
      "BUS_VEHICLES",
      "BUS_TRIP_ROUNDS",
      "BUS_BOOKINGS",
      "BUS_DEPARTMENTS",
      "BUS_POSITIONS",
      "BUS_SCREENS",
      "BUS_POSITION_PERMISSIONS",
      "BUS_ROUTE_STOPS",
      "BUS_BOOKING_DETAILS",
    ])
      requireThat(
        (await query(db, `SELECT COUNT(*) n FROM ${table}`))[0].n === 0,
        `หยุดนำเข้า: ${table} มีข้อมูลอยู่แล้ว`,
      )
    await setupAdmin(db, {
      fullName: accounts[0].name,
      username: accounts[0].username,
      password: accounts[0].password,
    })
    for (let i = 1; i <= 5; i++)
      await db.execute(
        "INSERT INTO BUS_EMPLOYEES(employee_id,full_name,username,password_hash,phone,email,department_id,position_id) VALUES(:employeeId,:fullName,:username,:passwordHash,:phone,:email,:departmentId,:positionId)",
        {
          employeeId: "E00" + i,
          fullName: accounts[i].name,
          username: accounts[i].username,
          passwordHash: await hashPassword(accounts[i].password),
          phone: [
            "081-111-2233",
            "082-222-3344",
            "083-333-4455",
            "084-444-5566",
            "085-555-6677",
          ][i - 1],
          email: accounts[i].username + "@example.com",
          departmentId: i <= 3 ? "TRN-01" : "SRV-02",
          positionId: i <= 3 ? "DRIVER" : i === 4 ? "STAFF" : "MANAGER",
        },
      )
    await db.execute(
      "INSERT INTO BUS_USERS(user_id,full_name,username,password_hash,phone,user_type) VALUES('U001',:name,'user',:passwordHash,'089-123-4567',:userType)",
      {
        name: accounts[6].name,
        passwordHash: await hashPassword(accounts[6].password),
        userType: "นักศึกษา",
      },
    )
    const plates = ["สาย 2591", "สาย 2599", "สาย 2588", "บก 1130", "บก 2244"]
    for (let i = 0; i < 5; i++) {
      const binds = {
        vehicleId: "V00" + (i + 1),
        plate: plates[i],
        type: i < 3 ? "รถตู้" : "รถบัส",
        seats: i < 3 ? 9 : 20,
      }
      if (capabilities.vehicleExtras)
        Object.assign(binds, {
          brand: i < 3 ? "Toyota Commuter" : "Hino Bus",
          modelYear: [2563, 2564, 2562, 2561, 2565][i],
          availability: i === 4 ? "MAINTENANCE" : "AVAILABLE",
        })
      await db.execute(
        `INSERT INTO BUS_VEHICLES(vehicle_id,license_plate,vehicle_type,seat_count${
          capabilities.vehicleExtras ? ",brand,model_year,availability" : ""
        }) VALUES(:vehicleId,:plate,:type,:seats${
          capabilities.vehicleExtras ? ",:brand,:modelYear,:availability" : ""
        })`,
        binds,
      )
    }
    const stopIds = new Map()
    let stopCounter = 0
    for (const route of source) {
      const routeId = "R00" + route.id
      await db.execute(
        "INSERT INTO BUS_ROUTES(route_id,route_name,total_minutes) VALUES(:routeId,:name,:minutes)",
        {
          routeId,
          name: route.name,
          minutes: route.stops.reduce((n, s) => n + (s.min || 0), 0),
        },
      )
      for (let i = 0; i < route.stops.length; i++) {
        const stop = route.stops[i]
        if (!stopIds.has(stop.name)) {
          const stopId = "S" + String(++stopCounter).padStart(3, "0")
          stopIds.set(stop.name, stopId)
          await db.execute(
            "INSERT INTO BUS_STOPS(stop_id,stop_name) VALUES(:stopId,:name)",
            { stopId, name: stop.name },
          )
        }
        await db.execute(
          "INSERT INTO BUS_ROUTE_STOPS(route_stop_id,route_id,stop_id,stop_sequence,minutes_from_prev) VALUES(:routeStopId,:routeId,:stopId,:seq,:minutes)",
          {
            routeStopId: routeId + "-S" + (i + 1),
            routeId,
            stopId: stopIds.get(stop.name),
            seq: i + 1,
            minutes: stop.min || 0,
          },
        )
      }
      for (let d = 0; d < 14; d++) {
        const day = new Date(start + "T00:00:00Z")
        day.setUTCDate(day.getUTCDate() + d)
        const date = day.toISOString().slice(0, 10)
        for (const time of ["09:30", "11:00", "13:00", "15:00"]) {
          const departureAt = date + "T" + time + ":00"
          if (departureAt <= now) continue
          // Each route gets its own driver. The Figma sample reused a driver at
          // overlapping times; that sample conflict is not imported.
          await db.execute(
            `INSERT INTO BUS_TRIP_ROUNDS(trip_id,route_id,driver_employee_id,vehicle_id,departure_at) VALUES(:tripId,:routeId,:driverId,:vehicleId,TO_TIMESTAMP(:departureAt,'YYYY-MM-DD"T"HH24:MI:SS'))`,
            {
              tripId: `T-${date}-${route.id}-${time.replace(":", "")}`,
              routeId,
              driverId: "E00" + route.id,
              vehicleId:
                route.id === 1 && time >= "13:00" ? "V004" : "V00" + route.id,
              departureAt,
            },
          )
        }
      }
    }
  })
  committed = true
  console.log(
    "Imported Figma starter data and 14 days of scheduled trips. Credentials: server/private/starter-accounts.json",
  )
} catch (error) {
  console.error("Starter import stopped:", error.message)
  process.exitCode = 1
} finally {
  if (accountFileCreated && !committed) await unlink(credentialsFile)
  await close()
}
