import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import {
  connect,
  close,
  query,
  transaction,
  read,
  capabilities,
} from "../src/db.js"
import { hashPassword, bangkokNow } from "../src/domain.js"
import { createApp } from "../src/index.js"
import { nextRecordId } from "../src/record-ids.js"

// Integration fixtures use unique IDs. Cleanup only removes IDs owned by this run.
const prefix = "QA" + randomUUID().slice(0, 8),
  key = (s) => prefix + "-" + s
const pw = "Local-test-" + randomUUID(),
  owned = {
    users: [],
    vehicles: [],
    employees: [],
    positions: [],
    routes: [],
    trips: [],
    stops: [],
    screens: [],
  }
let server,
  base,
  cookies = {},
  tests = 0
const check = (label, fn) =>
  Promise.resolve()
    .then(fn)
    .then(() => {
      tests++
      console.log("PASS", label)
    })
async function request(path, method = "GET", body, who = "admin") {
  const response = await fetch(base + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Shuttle-Client": "1",
      ...(cookies[who] ? { Cookie: cookies[who] } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return {
    status: response.status,
    body: await response.json(),
    cookie: response.headers.get("set-cookie"),
  }
}
const nextDay = new Date(Date.now() + 7 * 3600000 + 86400000)
  .toISOString()
  .slice(0, 10)
try {
  await connect()
  if (capabilities.readableIds) await check("Oracle sequences allocate distinct IDs concurrently and do not reuse rolled-back IDs", async () => {
    const ids = await Promise.all(Array.from({length:4}, () => transaction(db=>nextRecordId(db,"R"))))
    assert.equal(new Set(ids).size,4)
    for (const value of ids) assert.match(value,/^R[0-9]{3,}$/)
    let rolledBack
    try { await transaction(async db=>{rolledBack=await nextRecordId(db,"R"); throw new Error("intentional ID rollback")}) } catch (e) {assert.equal(e.message,"intentional ID rollback")}
    const next=await transaction(db=>nextRecordId(db,"R"))
    assert.ok(Number(next.slice(1))>Number(rolledBack.slice(1)))
  })
  await transaction(async (db) => {
    for (const positionId of ["ADMIN", "DRIVER"])
      if (
        !(
          await query(
            db,
            "SELECT position_id FROM BUS_POSITIONS WHERE position_id=:positionId",
            { positionId },
          )
        ).length
      ) {
        await db.execute(
          "INSERT INTO BUS_POSITIONS(position_id,position_name) VALUES(:positionId,:name)",
          { positionId, name: positionId },
        )
        owned.positions.push(positionId)
      }
    if (
      !(
        await query(
          db,
          "SELECT screen_id FROM BUS_SCREENS WHERE screen_id='driver'",
        )
      ).length
    ) {
      await db.execute(
        "INSERT INTO BUS_SCREENS(screen_id,screen_name) VALUES('driver','Driver')",
      )
      owned.screens.push("driver")
    }
    if (
      !(
        await query(
          db,
          "SELECT permission_id FROM BUS_POSITION_PERMISSIONS WHERE position_id='DRIVER' AND screen_id='driver'",
        )
      ).length
    )
      await db.execute(
        "INSERT INTO BUS_POSITION_PERMISSIONS(permission_id,position_id,screen_id,can_view,can_modify) VALUES(:permissionId,'DRIVER','driver',1,1)",
        { permissionId: key("permission") },
      )
    await db.execute(
      "INSERT INTO BUS_DEPARTMENTS VALUES(:departmentId,:name)",
      { departmentId: key("D"), name: "แผนกทดสอบชั่วคราว" },
    )
    const passwordHash = await hashPassword(pw)
    for (const [suffix, positionId] of [
      ["admin", "ADMIN"],
      ["driver", "DRIVER"],
      ["otherdriver", "DRIVER"],
    ]) {
      const employeeId = key(suffix)
      owned.employees.push(employeeId)
      await db.execute(
        "INSERT INTO BUS_EMPLOYEES(employee_id,full_name,username,password_hash,department_id,position_id) VALUES(:employeeId,:name,:username,:passwordHash,:departmentId,:positionId)",
        {
          employeeId,
          name: "ทดสอบ " + suffix,
          username: key(suffix),
          passwordHash,
          departmentId: key("D"),
          positionId,
        },
      )
    }
    for (const suffix of ["user", "otheruser"])
      await db.execute(
        "INSERT INTO BUS_USERS(user_id,full_name,username,password_hash,user_type) VALUES(:userId,:name,:username,:passwordHash,:userType)",
        {
          userId: key(suffix),
          name: "ทดสอบ " + suffix,
          username: key(suffix),
          passwordHash,
          userType: "นักศึกษา",
        },
      )
    owned.vehicles.push(key("V"))
    await db.execute(
      "INSERT INTO BUS_VEHICLES(vehicle_id,license_plate,vehicle_type,seat_count) VALUES(:vehicleId,:plate,:type,9)",
      { vehicleId: key("V"), plate: key("ทะเบียน"), type: "รถตู้" },
    )
    owned.routes.push(key("R"))
    await db.execute("INSERT INTO BUS_ROUTES VALUES(:routeId,:name,15)", {
      routeId: key("R"),
      name: "เส้นทางทดสอบชั่วคราว",
    })
    for (let i = 1; i <= 3; i++) {
      owned.stops.push(key("S" + i))
      await db.execute("INSERT INTO BUS_STOPS VALUES(:stopId,:name)", {
        stopId: key("S" + i),
        name: "จุดทดสอบ " + i,
      })
      await db.execute(
        "INSERT INTO BUS_ROUTE_STOPS VALUES(:rsId,:routeId,:stopId,:seq,:minutes)",
        {
          rsId: key("RS" + i),
          routeId: key("R"),
          stopId: key("S" + i),
          seq: i,
          minutes: i === 1 ? 0 : i === 2 ? 5 : 10,
        },
      )
    }
    for (let i = 0; i < 3; i++) {
      owned.trips.push(key("T" + i))
      await db.execute(
        `INSERT INTO BUS_TRIP_ROUNDS(trip_id,route_id,driver_employee_id,vehicle_id,departure_at) VALUES(:tripId,:routeId,:driverId,:vehicleId,TO_TIMESTAMP(:departureAt,'YYYY-MM-DD"T"HH24:MI:SS'))`,
        {
          tripId: key("T" + i),
          routeId: key("R"),
          driverId: key("driver"),
          vehicleId: key("V"),
          departureAt: nextDay + ["T09:30:00", "T11:00:00", "T13:00:00"][i],
        },
      )
    }
  })
  server = createApp().listen(0, "127.0.0.1")
  await new Promise((resolve) => server.once("listening", resolve))
  base = "http://127.0.0.1:" + server.address().port
  await check("anonymous requests are rejected", async () =>
    assert.equal(
      (await request("/bootstrap", "GET", null, "anonymous")).status,
      401,
    ),
  )
  for (const who of ["admin", "driver", "otherdriver", "user", "otheruser"]) {
    const r = await request(
      "/auth/login",
      "POST",
      {
        username: key(who),
        password: pw,
      },
      "anonymous",
    )
    assert.equal(r.status, 200, JSON.stringify(r.body))
    cookies[who] = r.cookie.split(";")[0]
    assert.equal(r.body.user.passwordHash, undefined)
    assert.equal(r.body.user.role, who.includes("user") ? "user" : who.includes("driver") ? "driver" : "admin")
  }
  await check("unified login prevents duplicate usernames across employee and user accounts", async () => {
    const r = await request("/auth/register", "POST", {username: key("admin"), password: pw, fullName: "Duplicate", userType: "นักศึกษา"}, "anonymous")
    assert.equal(r.status, 409)
  })
  await check("login and Oracle read preserve Thai text", async () => {
    const r = await request("/bootstrap")
    assert.equal(r.status, 200)
    assert.equal(
      r.body.routes.find((r) => r.routeId === key("R")).routeName,
      "เส้นทางทดสอบชั่วคราว",
    )
  })
  await check("user cannot access employee data or admin writes", async () => {
    assert.equal((await request("/employees", "GET", null, "user")).status, 403)
    assert.equal(
      (await request("/vehicles", "POST", { licensePlate: "test" }, "user"))
        .status,
      403,
    )
  })
  await check("user management rejects ordinary users and drivers", async () => {
    for (const actor of ["user", "driver"]) {
      assert.equal((await request("/users", "GET", null, actor)).status,403)
      assert.equal((await request("/users", "POST", {}, actor)).status,403)
      assert.equal((await request("/users/"+key("user"), "PUT", {}, actor)).status,403)
      assert.equal((await request("/users/"+key("user"), "DELETE", null, actor)).status,403)
    }
  })
  await check("admin user CRUD persists, hides password hashes, and validates shared usernames", async () => {
    const form = {fullName:"ผู้ใช้ทดสอบใหม่",username:key("managed-user"),phone:"0800000001",userType:"นักศึกษา",password:pw}
    const created=await request("/users","POST",form)
    assert.equal(created.status,200,JSON.stringify(created.body))
    const userId=created.body.userId
    owned.users.push(userId)
    let users=await request("/users")
    assert.equal(users.status,200)
    const saved=users.body.find(u=>u.userId===userId)
    assert.equal(saved.fullName,form.fullName)
    assert.equal(saved.bookingCount,0)
    assert.equal(saved.passwordHash,undefined)
    assert.equal(saved.password,undefined)
    for(const username of [key("admin"),key("user")]) assert.equal((await request("/users/"+userId,"PUT",{...form,username})).status,409)
    assert.equal((await request("/users/"+userId,"PUT",{...form,userType:"ADMIN"})).status,400)
    const changed={...form,fullName:"แก้ไขผู้ใช้ทดสอบ",phone:"0899999999",userType:"บุคคลทั่วไป",password:""}
    assert.equal((await request("/users/"+userId,"PUT",changed)).status,200)
    assert.equal((await request("/auth/login","POST",{username:form.username,password:pw},"anonymous")).status,200)
    const newPassword="Changed-"+randomUUID()
    assert.equal((await request("/users/"+userId,"PUT",{...changed,password:newPassword})).status,200)
    assert.equal((await request("/auth/login","POST",{username:form.username,password:pw},"anonymous")).status,401)
    const login=await request("/auth/login","POST",{username:form.username,password:newPassword},"anonymous")
    assert.equal(login.status,200)
    assert.equal(login.body.user.role,"user")
    cookies.managed=login.cookie.split(";")[0]
    assert.equal((await request("/users/"+userId,"DELETE")).status,200)
    assert.equal((await read(db=>query(db,"SELECT user_id FROM BUS_USERS WHERE user_id=:userId",{userId}))).length,0)
    assert.equal((await request("/auth/me","GET",null,"managed")).status,401)
  })
  await check("other administrators cannot delete or change E-ADMIN through the API", async () => {
    if (!(await read(db => query(db, "SELECT employee_id FROM BUS_EMPLOYEES WHERE employee_id='E-ADMIN'"))).length) return
    assert.equal((await request("/employees/E-ADMIN", "DELETE")).status, 403)
    assert.equal((await request("/employees/E-ADMIN", "PUT", {})).status, 403)
  })
  await check("origin check blocks cross-site mutations", async () => {
    const r = await fetch(base + "/api/vehicles", {
      method: "POST",
      headers: {
        Cookie: cookies.admin,
        "Content-Type": "application/json",
        "X-Shuttle-Client": "1",
        Origin: "https://untrusted.example",
      },
      body: "{}",
    })
    assert.equal(r.status, 403)
  })
  await check("vehicle CRUD and stored updates", async () => {
    let r = await request("/vehicles", "POST", {
      licensePlate: key("API"),
      vehicleType: "รถตู้",
      seatCount: 9,
      brand: "Toyota",
    })
    assert.equal(r.status, 200, JSON.stringify(r.body))
    const vehicleId = r.body.vehicleId
    owned.vehicles.push(vehicleId)
    r = await request("/vehicles/" + vehicleId, "PUT", {
      licensePlate: key("API2"),
      vehicleType: "รถบัส",
      seatCount: 20,
    })
    assert.equal(r.status, 200, JSON.stringify(r.body))
    assert.equal(
      (await request("/bootstrap")).body.vehicles.find(
        (v) => v.vehicleId === vehicleId,
      ).seatCount,
      20,
    )
    assert.equal(
      (await request("/vehicles/" + vehicleId, "DELETE")).status,
      200,
    )
  })
  await check("permission matrix saves atomically and validates input", async () => {
    const created = await request("/positions", "POST", {positionName: key("matrix")})
    assert.equal(created.status, 200)
    const positionId = created.body.positionId
    owned.positions.push(positionId)
    const positions = [{positionId, permissions: [{screenId: "driver", view: true, modify: true}]}]
    assert.equal((await request("/permissions", "PUT", {positions})).status, 200)
    const failed = await request("/permissions", "PUT", {positions: [{positionId, permissions: []}, {positionId: "ZZ-NONEXISTENT", permissions: []}]})
    assert.equal(failed.status, 404)
    const p = (await request("/permissions")).body.find(p => p.positionId === positionId && p.screenId === "driver")
    assert.equal(p.canModify, 1)
    assert.equal((await request("/permissions", "PUT", {positions: [{positionId: "ADMIN", permissions: "invalid"}]})).status, 400)
  })
  await check(
    "employee password updates are hashed and masked in reads",
    async () => {
      const r = await request("/employees", "POST", {
        fullName: "พนักงานทดสอบ",
        username: key("employee"),
        password: pw,
        phone: "0800000000",
        email: "test@example.com",
        departmentId: key("D"),
        positionId: "DRIVER",
      })
      assert.equal(r.status, 200, JSON.stringify(r.body))
      owned.employees.push(r.body.employeeId)
      const e = (await request("/employees")).body.find(
        (e) => e.employeeId === r.body.employeeId,
      )
      assert.equal(e.email, "test@example.com")
      assert.equal(e.passwordHash, undefined)
      const dup = await request("/employees", "POST", {
        ...e,
        username: key("employee").toUpperCase(),
        password: pw,
      })
      assert.equal(dup.status, 409)
      assert.equal(
        (await request("/employees/" + r.body.employeeId, "DELETE")).status,
        200,
      )
    },
  )
  await check("insert stop before anchor keeps exact order", async () => {
    const r = await request("/routes/" + key("R") + "/stops", "POST", {
      stopName: key("จุดเพิ่ม"),
      minutesFromPrev: 2,
      anchorId: key("RS2"),
      placement: "before",
    })
    assert.equal(r.status, 200, JSON.stringify(r.body))
    const route = (await request("/bootstrap")).body.routes.find(
      (r) => r.routeId === key("R"),
    )
    assert.equal(route.stops[1].stopName, key("จุดเพิ่ม"))
    owned.stops.push(route.stops[1].stopId)
    assert.equal(route.stops[2].routeStopId, key("RS2"))
    assert.equal(route.totalMinutes, 17)
    assert.equal(
      (
        await request(
          "/routes/" + key("R") + "/stops/" + route.stops[1].routeStopId,
          "DELETE",
        )
      ).status,
      200,
    )
    assert.equal((await read(db => query(db, "SELECT stop_id FROM BUS_STOPS WHERE stop_id=:stopId", {stopId: route.stops[1].stopId}))).length, 0)
  })
  await check("shared stops survive until the last reference is deleted; renaming and route deletion remove orphans", async () => {
    const routeIds = []
    for (const suffix of ["shared1", "shared2"]) {
      const result = await request("/routes", "POST", {routeName:key(suffix)})
      assert.equal(result.status,200)
      routeIds.push(result.body.routeId); owned.routes.push(result.body.routeId)
      assert.equal((await request(`/routes/${result.body.routeId}/stops`, "POST", {stopName:key("shared-stop"), minutesFromPrev:0})).status,200)
    }
    let routes = (await request("/bootstrap")).body.routes
    const first = routes.find(r => r.routeId === routeIds[0]).stops[0]
    const second = routes.find(r => r.routeId === routeIds[1]).stops[0]
    owned.stops.push(first.stopId)
    assert.equal(first.stopId,second.stopId)
    assert.equal((await request(`/routes/${routeIds[0]}/stops/${first.routeStopId}`, "DELETE")).status,200)
    assert.equal((await read(db=>query(db,"SELECT stop_id FROM BUS_STOPS WHERE stop_id=:stopId",{stopId:first.stopId}))).length,1)
    assert.equal((await request(`/routes/${routeIds[1]}/stops/${second.routeStopId}`, "PUT", {stopName:key("renamed-stop"), minutesFromPrev:0})).status,200)
    assert.equal((await read(db=>query(db,"SELECT stop_id FROM BUS_STOPS WHERE stop_id=:stopId",{stopId:first.stopId}))).length,0)
    routes = (await request("/bootstrap")).body.routes
    const renamed = routes.find(r=>r.routeId===routeIds[1]).stops[0]
    owned.stops.push(renamed.stopId)
    assert.equal((await request(`/routes/${routeIds[1]}`,"DELETE")).status,200)
    assert.equal((await read(db=>query(db,"SELECT stop_id FROM BUS_STOPS WHERE stop_id=:stopId",{stopId:renamed.stopId}))).length,0)
  })
  await check("driver/vehicle overlapping schedules are rejected", async () =>
    assert.equal(
      (
        await request("/trips", "POST", {
          routeId: key("R"),
          vehicleId: key("V"),
          driverEmployeeId: key("driver"),
          departureAt: nextDay + "T09:35",
        })
      ).status,
      409,
    ),
  )
  const item = (trip, seats) => ({
    tripId: key(trip),
    pickupId: key("RS1"),
    dropoffId: key("RS3"),
    seats,
  })
  let winner, bookingId
  await check("concurrent requests cannot double-book a seat", async () => {
    const results = await Promise.all(
      ["user", "otheruser"].map((who) =>
        request("/bookings", "POST", { items: [item("T0", [1])] }, who),
      ),
    )
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
    const index = results.findIndex((r) => r.status === 200)
    winner = ["user", "otheruser"][index]
    bookingId = results[index].body.bookingIds[0]
  })
  await check("users with bookings cannot be deleted and the booking remains linked", async () => {
    const userId=key(winner)
    const result=await request("/users/"+userId,"DELETE")
    assert.equal(result.status,409)
    assert.match(result.body.message,/ประวัติการจอง/)
    const user=(await request("/users")).body.find(u=>u.userId===userId)
    assert.ok(user.bookingCount>0)
    assert.equal((await read(db=>query(db,"SELECT user_id FROM BUS_BOOKINGS WHERE booking_id=:bookingId",{bookingId})))[0].userId,userId)
  })
  await check("mixed cart rolls back entirely on occupied seat", async () => {
    const r = await request(
      "/bookings",
      "POST",
      { items: [item("T1", [2]), item("T0", [1])] },
      "user",
    )
    assert.equal(r.status, 409)
    assert.deepEqual(
      (await request("/trips/" + key("T1") + "/seats", "GET", null, "user"))
        .body.occupied,
      [],
    )
  })
  await check(
    "booking ownership, cancellation history and releasing seats",
    async () => {
      const wrong = winner === "user" ? "otheruser" : "user"
      assert.equal(
        (await request("/bookings/" + bookingId + "/cancel", "POST", {}, wrong))
          .status,
        404,
      )
      assert.equal(
        (
          await request(
            "/bookings/" + bookingId + "/cancel",
            "POST",
            {},
            winner,
          )
        ).status,
        200,
      )
      const history = await request("/bookings", "GET", null, winner)
      assert.equal(
        history.body.find((b) => b.bookingId === bookingId).status,
        "CANCELLED",
      )
      assert.equal((await request("/users/"+key(winner),"DELETE")).status,409)
      assert.equal(
        (
          await request(
            "/bookings",
            "POST",
            { items: [item("T0", [1])] },
            wrong,
          )
        ).status,
        200,
      )
    },
  )
  await check(
    "invalid stop direction and too many seats are rejected",
    async () => {
      assert.equal(
        (
          await request(
            "/bookings",
            "POST",
            {
              items: [
                {
                  ...item("T1", [3]),
                  pickupId: key("RS3"),
                  dropoffId: key("RS1"),
                },
              ],
            },
            "user",
          )
        ).status,
        400,
      )
      assert.equal(
        (
          await request(
            "/bookings",
            "POST",
            { items: [item("T1", [1, 2, 3, 4, 5])] },
            "user",
          )
        ).status,
        400,
      )
    },
  )
  await check("driver only sees assigned passengers", async () => {
    assert.equal(
      (
        await request(
          "/driver/trips/" + key("T0") + "/passengers",
          "GET",
          null,
          "driver",
        )
      ).status,
      200,
    )
    assert.equal(
      (
        await request(
          "/driver/trips/" + key("T0") + "/passengers",
          "GET",
          null,
          "otherdriver",
        )
      ).status,
      404,
    )
  })
  await check("history-linked schedules cannot be silently edited", async () =>
    assert.equal(
      (
        await request("/trips/" + key("T0"), "PUT", {
          routeId: key("R"),
          vehicleId: key("V"),
          driverEmployeeId: key("driver"),
          departureAt: nextDay + "T10:00",
        })
      ).status,
      409,
    ),
  )
  await check(
    "admin cancelling a trip preserves tickets with cancellation status",
    async () => {
      assert.equal((await request("/trips/" + key("T0"), "DELETE")).status, 200)
      const result = await read((db) =>
        query(
          db,
          "SELECT status FROM BUS_BOOKING_DETAILS WHERE trip_id=:tripId",
          { tripId: key("T0") },
        ),
      )
      assert.ok(
        result.length > 0 && result.every((d) => d.status === "CANCELLED"),
      )
    },
  )
  await check("reports use actual database aggregates", async () => {
    const r = await request("/reports?year=" + nextDay.slice(0, 4))
    assert.equal(r.status, 200, JSON.stringify(r.body))
    assert.ok(r.body.summary.cancelled >= 2)
  })
  if (capabilities.tripEvents) {
    const departureAt = new Date(Date.now() + 7 * 3600000 + 40 * 60000)
      .toISOString()
      .slice(0, 19)
    if (departureAt.slice(0, 10) === bangkokNow().slice(0, 10)) {
      const tripId = key("TODAY")
      owned.trips.push(tripId)
      await transaction((db) =>
        db.execute(
          `INSERT INTO BUS_TRIP_ROUNDS(trip_id,route_id,driver_employee_id,vehicle_id,departure_at) VALUES(:tripId,:routeId,:driverId,:vehicleId,TO_TIMESTAMP(:departureAt,'YYYY-MM-DD"T"HH24:MI:SS'))`,
          {
            tripId,
            routeId: key("R"),
            driverId: key("driver"),
            vehicleId: key("V"),
            departureAt,
          },
        ),
      )
      const r = await request(
        "/bookings",
        "POST",
        { items: [item("TODAY", [1, 2])] },
        "user",
      )
      assert.equal(r.status, 200)
      const booking = (
        await request("/bookings", "GET", null, "user")
      ).body.find((b) => b.bookingId === r.body.bookingIds[0])
      await check(
        "driver work start, checkpoints, ticket QR check-in and finish persist",
        async () => {
          assert.equal(
            (
              await request(
                "/driver/trips/" + tripId + "/start",
                "POST",
                {},
                "driver",
              )
            ).status,
            200,
          )
          assert.equal(
            (
              await request(
                "/driver/trips/" + tripId + "/checkpoint",
                "POST",
                { routeStopId: key("RS2") },
                "driver",
              )
            ).status,
            409,
          )
          assert.equal(
            (
              await request(
                "/driver/trips/" + tripId + "/finish",
                "POST",
                {},
                "driver",
              )
            ).status,
            400,
          )
          assert.equal(
            (
              await request(
                "/driver/check-in",
                "POST",
                { qrToken: booking.tickets[0].qrToken, tripId },
                "driver",
              )
            ).status,
            200,
          )
          assert.equal(
            (
              await request(
                "/driver/check-in",
                "POST",
                { qrToken: booking.tickets[0].qrToken, tripId },
                "driver",
              )
            ).status,
            409,
          )
          for (let i = 1; i <= 3; i++)
            assert.equal(
              (
                await request(
                  "/driver/trips/" + tripId + "/checkpoint",
                  "POST",
                  { routeStopId: key("RS" + i) },
                  "driver",
                )
              ).status,
              200,
            )
          assert.equal(
            (
              await request(
                "/driver/trips/" + tripId + "/finish",
                "POST",
                {},
                "driver",
              )
            ).status,
            200,
          )
          const final = (
            await request("/bookings", "GET", null, "user")
          ).body.find((b) => b.bookingId === booking.bookingId)
          assert.equal(final.tickets[0].status, "COMPLETED")
          assert.ok(final.tickets[0].checkedInAt)
          assert.equal(final.tickets[1].status, "NO_SHOW")
        },
      )
    }
  } else console.log("Driver event tests pending reviewed migration.")
  await check("booking administration denies user and driver access", async () => {
    for(const actor of ["user","driver"]) {
      assert.equal((await request("/admin/bookings","GET",null,actor)).status,403)
      assert.equal((await request("/admin/bookings/none/cancel","POST",{reason:"test"},actor)).status,403)
      assert.equal((await request("/admin/bookings/none","DELETE",{confirmBookingId:"none"},actor)).status,403)
    }
  })
  if(capabilities.bookingCancellation) await check("admin cancellation reason reaches owner; permanent deletion allows deleting the user",async()=>{
    const created=await request("/users","POST",{fullName:"Cancellation workflow fixture",username:key("purge-user"),password:pw,userType:"นักศึกษา"})
    assert.equal(created.status,200)
    const userId=created.body.userId;owned.users.push(userId)
    const login=await request("/auth/login","POST",{username:key("purge-user"),password:pw},"anonymous")
    assert.equal(login.status,200);cookies.purge=login.cookie.split(";")[0]
    const newTrip=await request("/trips","POST",{routeId:key("R"),vehicleId:key("V"),driverEmployeeId:key("driver"),departureAt:nextDay+"T18:00"})
    assert.equal(newTrip.status,200,JSON.stringify(newTrip.body))
    const tripId=newTrip.body.tripId;owned.trips.push(tripId)
    const item={tripId,pickupId:key("RS1"),dropoffId:key("RS3"),seats:[1,2]}
    const createdBooking=await request("/bookings","POST",{items:[item]},"purge")
    assert.equal(createdBooking.status,200)
    const bookingId=createdBooking.body.bookingIds[0], path="/admin/bookings/"+bookingId
    assert.equal((await request(path,"DELETE",{confirmBookingId:bookingId})).status,409)
    assert.equal((await request(path+"/cancel","POST",{reason:"   "})).status,400)
    assert.equal((await request(path+"/cancel","POST",{reason:"x".repeat(501)})).status,400)
    await transaction(db=>db.execute("UPDATE BUS_TRIP_ROUNDS SET status='IN_PROGRESS' WHERE trip_id=:tripId",{tripId}))
    assert.equal((await request(path+"/cancel","POST",{reason:"ทดสอบ"})).status,409)
    await transaction(db=>db.execute("UPDATE BUS_TRIP_ROUNDS SET status='SCHEDULED' WHERE trip_id=:tripId",{tripId}))
    const reason="รถขัดข้อง กรุณาเลือกรอบเดินรถใหม่"
    assert.equal((await request(path+"/cancel","POST",{reason})).status,200)
    const owner=(await request("/bookings","GET",null,"purge")).body.find(b=>b.bookingId===bookingId)
    assert.equal(owner.status,"CANCELLED");assert.equal(owner.cancellationReason,reason);assert.ok(owner.cancelledAt);assert.equal(owner.cancelledBy,key("admin"))
    assert.ok(owner.tickets.every(t=>t.status==="CANCELLED"))
    assert.equal((await request(path+"/cancel","POST",{reason:"overwrite"})).status,409)
    assert.equal((await request("/users/"+userId,"DELETE")).status,409)
    assert.equal((await request(path,"DELETE",{confirmBookingId:"wrong"})).status,400)
    assert.equal((await request(path,"DELETE",{confirmBookingId:bookingId})).status,200)
    for(const table of ["BUS_BOOKINGS","BUS_BOOKING_DETAILS"]) assert.equal((await read(db=>query(db,`SELECT COUNT(*) n FROM ${table} WHERE booking_id=:bookingId`,{bookingId})))[0].n,0)
    assert.equal((await request("/bookings","GET",null,"purge")).body.length,0)
    // Completed history may also be removed without pretending it was cancelled.
    const completed=await request("/bookings","POST",{items:[item]},"purge")
    assert.equal(completed.status,200)
    const completedId=completed.body.bookingIds[0]
    await transaction(async db=>{
      await db.execute("UPDATE BUS_TRIP_ROUNDS SET status='COMPLETED' WHERE trip_id=:tripId",{tripId})
      await db.execute("UPDATE BUS_BOOKINGS SET status='COMPLETED' WHERE booking_id=:bookingId",{bookingId:completedId})
      await db.execute("UPDATE BUS_BOOKING_DETAILS SET status='COMPLETED' WHERE booking_id=:bookingId",{bookingId:completedId})
    })
    assert.equal((await request("/admin/bookings/"+completedId,"DELETE",{confirmBookingId:completedId})).status,200)
    assert.equal((await request("/users/"+userId,"DELETE")).status,200)
    assert.equal((await read(db=>query(db,"SELECT COUNT(*) n FROM BUS_USERS WHERE user_id=:userId",{userId})))[0].n,0)
  })
  console.log(`${tests} integration checks passed against Oracle.`)
  if (process.argv.includes("--ui")) {
    console.log(
      "Temporary UI test accounts:",
      JSON.stringify({
        admin: key("admin"),
        user: key("user"),
        driver: key("driver"),
        password: pw,
        date: nextDay,
      }),
    )
    console.log(
      "UI fixtures are ready. Press Enter after UI testing to clean up only this run.",
    )
    await new Promise((resolve) => process.stdin.once("data", resolve))
  }
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  try {
    await transaction(async (db) => {
      for (const tripId of owned.trips) {
        if (capabilities.tripEvents)
          await db.execute(
            "DELETE FROM BUS_TRIP_EVENTS WHERE trip_id=:tripId",
            { tripId },
          )
        await db.execute(
          "DELETE FROM BUS_BOOKING_DETAILS WHERE trip_id=:tripId",
          { tripId },
        )
        await db.execute("DELETE FROM BUS_BOOKINGS WHERE trip_id=:tripId", {
          tripId,
        })
        await db.execute("DELETE FROM BUS_TRIP_ROUNDS WHERE trip_id=:tripId", {
          tripId,
        })
      }
      for (const routeId of owned.routes) {
        await db.execute(
          "DELETE FROM BUS_ROUTE_STOPS WHERE route_id=:routeId",
          { routeId },
        )
        await db.execute("DELETE FROM BUS_ROUTES WHERE route_id=:routeId", {
          routeId,
        })
      }
      for (const stopId of owned.stops)
        await db.execute("DELETE FROM BUS_STOPS WHERE stop_id=:stopId", {
          stopId,
        })
      for (const vehicleId of owned.vehicles)
        await db.execute(
          "DELETE FROM BUS_VEHICLES WHERE vehicle_id=:vehicleId",
          { vehicleId },
        )
      for (const employeeId of owned.employees)
        await db.execute(
          "DELETE FROM BUS_EMPLOYEES WHERE employee_id=:employeeId",
          { employeeId },
        )
      for (const userId of owned.users) await db.execute("DELETE FROM BUS_USERS WHERE user_id=:userId",{userId})
      for (const suffix of ["user", "otheruser"])
        await db.execute("DELETE FROM BUS_USERS WHERE user_id=:userId", {
          userId: key(suffix),
        })
      await db.execute(
        "DELETE FROM BUS_DEPARTMENTS WHERE department_id=:departmentId",
        { departmentId: key("D") },
      )
      await db.execute(
        "DELETE FROM BUS_POSITION_PERMISSIONS WHERE permission_id=:permissionId",
        { permissionId: key("permission") },
      )
      for (const positionId of owned.positions) {
        await db.execute("DELETE FROM BUS_POSITION_PERMISSIONS WHERE position_id=:positionId", {positionId})
        await db.execute(
          "DELETE FROM BUS_POSITIONS WHERE position_id=:positionId",
          { positionId },
        )
      }
      for (const screenId of owned.screens)
        await db.execute("DELETE FROM BUS_SCREENS WHERE screen_id=:screenId", {
          screenId,
        })
    })
    console.log("Temporary fixtures cleaned up.")
  } catch (error) {
    console.error("Fixture cleanup requires attention:", prefix, error.message)
    process.exitCode = 1
  }
  await close()
}

