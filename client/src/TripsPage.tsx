import { useState, useEffect, useCallback } from "react"

import { useApp } from "./App"

import { api, today, displayDate } from "./api"

import { useConfirm } from "./Confirmation"

import type { Trip } from "./types"

import {
  Title,
  Panel,
  Label,
  Empty,
  Notice,
  useAction,
  Chip,
  Table,
  gold,
  outline,
  field,
} from "./ui"

export default function TripsPage() {
  return (
    <div className="p-5 xl:p-8">
      <Title>ตารางเดินรถรายวัน</Title>
      <TripManager />
    </div>
  )
}

export function TripManager({ routeId }: { routeId?: string }) {
  const { data, can } = useApp(),
    ask = useConfirm(),
    action = useAction(),
    editable = can("admin-schedule")

  const [day, setDay] = useState(today),
    [trips, setTrips] = useState<Trip[]>([]),
    [loading, setLoading] = useState(true),
    [form, setForm] = useState<{
      tripId?: string

      routeId: string

      driverEmployeeId: string

      vehicleId: string

      departureAt: string
    } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      setTrips(await api<Trip[]>("/trips?date=" + day))
    } finally {
      setLoading(false)
    }
  }, [day])

  useEffect(() => {
    void load().catch((e) => action.setError(e.message))
  }, [load])

  useEffect(() => setForm(null), [routeId])

  const rows = trips.filter((t) => !routeId || t.routeId === routeId)

  const controls = (t: Trip) => (
    <div className="flex gap-3 whitespace-nowrap">
      <button
        disabled={!editable || action.busy || t.status !== "SCHEDULED"}
        className="text-xs text-[#f5a623] disabled:opacity-30"
        onClick={() =>
          setForm({
            tripId: t.tripId,

            routeId: t.routeId,

            driverEmployeeId: t.driverEmployeeId,

            vehicleId: t.vehicleId,

            departureAt: t.departureAt.slice(0, 16),
          })
        }
      >
        แก้ไข
      </button>
      <button
        disabled={
          !editable ||
          action.busy ||
          !["SCHEDULED", "CANCELLED"].includes(t.status)
        }
        className="text-xs text-red-300 disabled:opacity-30"
        onClick={async () => {
          if (
            await ask(
              "ยืนยันการลบรอบเดินรถ",

              `${t.routeName} วันที่ ${displayDate(t.departureAt)} ${t.departureAt.slice(11, 16)} น. หากมีการจอง ระบบจะยกเลิกรอบและตั๋วพร้อมเก็บประวัติไว้`,
            )
          )
            void action.run(async () => {
              const r = await api<{ message: string }>(
                "/trips/" + t.tripId,

                "DELETE",
              )

              await load()

              action.setMessage(r.message)
            }, "จัดการรอบเดินรถแล้ว")
        }}
      >
        ลบ
      </button>
    </div>
  )

  return (
    <div>
      <Notice {...action} />
      <div className="flex justify-between gap-3 items-end mb-4 flex-wrap">
        <Label title="วันที่เดินรถ">
          <input
            type="date"
            className={field}
            value={day}
            onChange={(e) => {
              if (e.target.value) setDay(e.target.value)
            }}
          />
        </Label>
        <button
          disabled={!editable || action.busy}
          className={gold}
          onClick={() =>
            setForm({
              routeId: routeId || data.routes[0]?.routeId || "",

              driverEmployeeId: "",

              vehicleId: "",

              departureAt: day + "T09:30",
            })
          }
        >
          + เพิ่มรอบเดินรถ
        </button>
      </div>
      {form && (
        <Panel className="mb-5">
          <h3 className="font-bold text-[#f5a623] mb-4">
            {form.tripId ? "แก้ไขรอบเดินรถ" : "เพิ่มรอบเดินรถ"}
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault()

              void action.run(async () => {
                if (
                  form.tripId &&
                  !(await ask(
                    "ยืนยันการแก้ไขรอบเดินรถ",

                    "บันทึกข้อมูลรอบเดินรถที่แก้ไขแล้วหรือไม่?",
                  ))
                )
                  return false

                await api(
                  "/trips" + (form.tripId ? "/" + form.tripId : ""),

                  form.tripId ? "PUT" : "POST",

                  form,
                )

                setForm(null)

                await load()
              })
            }}
            className="space-y-4"
          >
            <Label title="เส้นทาง">
              <select
                required
                className={field}
                value={form.routeId}
                onChange={(e) => setForm({ ...form, routeId: e.target.value })}
              >
                <option value="">เลือกเส้นทาง</option>
                {data.routes.map((r) => (
                  <option key={r.routeId} value={r.routeId}>
                    {r.routeName}
                  </option>
                ))}
              </select>
            </Label>
            <Label title="วันที่และเวลาออกเดินทาง">
              <input
                required
                type="datetime-local"
                min={today() + "T00:00"}
                className={field}
                value={form.departureAt}
                onChange={(e) =>
                  setForm({ ...form, departureAt: e.target.value })
                }
              />
            </Label>
            <Label title="คนขับรถ">
              <select
                required
                className={field}
                value={form.driverEmployeeId}
                onChange={(e) =>
                  setForm({ ...form, driverEmployeeId: e.target.value })
                }
              >
                <option value="">เลือกคนขับ</option>
                {data.drivers.map((d) => (
                  <option key={d.employeeId} value={d.employeeId}>
                    {d.fullName}
                  </option>
                ))}
              </select>
            </Label>
            <Label title="รถ">
              <select
                required
                className={field}
                value={form.vehicleId}
                onChange={(e) =>
                  setForm({ ...form, vehicleId: e.target.value })
                }
              >
                <option value="">เลือกรถ</option>
                {data.vehicles

                  .filter(
                    (v) =>
                      v.availability !== "MAINTENANCE" ||
                      v.vehicleId === form.vehicleId,
                  )

                  .map((v) => (
                    <option key={v.vehicleId} value={v.vehicleId}>
                      {v.licensePlate} · {v.vehicleType} · {v.seatCount} ที่นั่ง
                    </option>
                  ))}
              </select>
            </Label>
            <div className="flex gap-2">
              <button disabled={action.busy} className={gold}>
                บันทึก
              </button>
              <button
                type="button"
                className={outline}
                onClick={() => setForm(null)}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </Panel>
      )}
      {loading ? (
        <p className="text-sm text-[#888]">กำลังโหลดรอบรถ…</p>
      ) : routeId ? (
        <div className="space-y-3">
          {rows.map((t, i) => (
            <article key={t.tripId} className="border border-[#444] p-4">
              <div className="flex justify-between gap-2">
                <b className="mono text-[#f5a623]">
                  {t.departureAt.slice(11, 16)} น. · รอบ {i + 1}
                </b>
                <Chip status={t.status} />
              </div>
              <p className="text-sm mt-3">
                {t.licensePlate} · {t.vehicleType}
              </p>
              <p className="text-xs text-[#999] my-2">
                {t.driverName} · จองแล้ว {t.occupiedCount}/{t.seatCount} ที่นั่ง
              </p>
              {controls(t)}
            </article>
          ))}
          {!rows.length && <Empty>ไม่มีรอบเดินรถในวันที่เลือก</Empty>}
        </div>
      ) : (
        <div className="space-y-6">
          {data.routes.map((route) => (
            <section key={route.routeId} className="border border-[#2a2a2a]">
              <div className="bg-[#111] px-5 py-3 flex gap-4 items-center">
                <h2 className="font-bold text-[#f5a623] border-l-4 border-[#f5a623] pl-3">
                  {route.routeName}
                </h2>
                <span className="text-xs text-[#888]">
                  {route.totalMinutes} นาที
                </span>
              </div>
              <Table
                headers={[
                  "รอบที่",
                  "วันที่",
                  "วัน",
                  "เวลา",
                  "เส้นทาง",
                  "คนขับ",
                  "ป้ายทะเบียน",
                  "ประเภทรถ",
                  "ที่นั่ง",
                  "สถานะ",
                  "จัดการ",
                ]}
                rows={rows
                  .filter((t) => t.routeId === route.routeId)
                  .map((t, i) => [
                    i + 1,
                    displayDate(t.departureAt),
                    new Date(t.departureAt).toLocaleDateString("th-TH", {
                      weekday: "long",
                    }),

                    <span className="mono text-[#f5a623]">
                      {t.departureAt.slice(11, 16)}
                    </span>,
                    t.routeName,
                    t.driverName,

                    t.licensePlate,
                    t.vehicleType,
                    `${t.occupiedCount}/${t.seatCount}`,
                    <Chip status={t.status} />,
                    controls(t),
                  ])}
              />
            </section>
          ))}
          {!data.routes.length && <Empty>ยังไม่มีเส้นทาง</Empty>}
        </div>
      )}
    </div>
  )
}
