import { useState, useEffect, useCallback } from "react"
import { useApp } from "./App"
import { api, today, displayDate, displayTime } from "./api"
import { useConfirm } from "./Confirmation"
import type { Trip } from "./types"
import {
  Title,
  Panel,
  Label,
  Empty,
  Notice,
  useAction,
  Details,
  Chip,
  Table,
  gold,
  outline,
  field,
} from "./ui"
type Passenger = {
  bookingId: string
  ticketNo: string
  fullName: string
  seatNumber: string
  status: string
  checkedInAt: string | null
  pickupName: string
  dropoffName: string
}
export default function DriverPage() {
  const { data, can } = useApp(),
    action = useAction(),
    ask = useConfirm()
  const [day, setDay] = useState(today),
    [trips, setTrips] = useState<Trip[]>([]),
    [active, setActive] = useState(""),
    [filter, setFilter] = useState("ALL"),
    [passengers, setPassengers] = useState<Passenger[]>([]),
    [qr, setQr] = useState(""),
    [loading, setLoading] = useState(true)
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
  const visible = trips.filter((t) => filter === "ALL" || t.status === filter),
    trip = trips.find((t) => t.tripId === active) || visible[0],
    route = data.routes.find((r) => r.routeId === trip?.routeId),
    stops = route?.stops || [],
    visits = trip?.events.filter((e) => e.eventType === "STOP") || []
  const loadPassengers = useCallback(async () => {
    if (trip)
      setPassengers(
        await api<Passenger[]>("/driver/trips/" + trip.tripId + "/passengers"),
      )
  }, [trip?.tripId])
  useEffect(() => {
    setPassengers([])
    void loadPassengers().catch((e) => action.setError(e.message))
  }, [loadPassengers])
  const editable = can("driver")
  async function change(path: string, body?: unknown) {
    await action.run(
      async () => {
        await api("/driver/trips/" + trip!.tripId + "/" + path, "POST", body)
        await load()
        await loadPassengers()
      },
      path === "start"
        ? "เริ่มงานแล้ว"
        : path === "finish"
          ? "จบงานแล้ว"
          : "บันทึกการผ่านจุดจอดแล้ว",
    )
  }
  return (
    <div className="p-5 xl:p-8">
      <Title>ตารางงานของฉัน</Title>
      <Notice {...action} />
      <p className="text-sm text-[#999] -mt-3 mb-6">
        เลือกวันเพื่อดูงานที่ได้รับมอบหมาย เริ่มงาน แล้วเช็กอินตามจุดจอด
      </p>
      <div className="flex gap-3 items-end mb-6 flex-wrap">
        <button
          className={outline}
          aria-label="วันก่อนหน้า"
          onClick={() => {
            const d = new Date(day + "T12:00:00Z")
            d.setUTCDate(d.getUTCDate() - 1)
            setDay(d.toISOString().slice(0, 10))
            setActive("")
          }}
        >
          ←
        </button>
        <Label title="วันที่ทำงาน">
          <input
            type="date"
            className={field}
            value={day}
            onChange={(e) => {
              if (e.target.value) {
                setDay(e.target.value)
                setActive("")
              }
            }}
          />
        </Label>
        <button
          className={outline}
          aria-label="วันถัดไป"
          onClick={() => {
            const d = new Date(day + "T12:00:00Z")
            d.setUTCDate(d.getUTCDate() + 1)
            setDay(d.toISOString().slice(0, 10))
            setActive("")
          }}
        >
          →
        </button>
        <button
          className={outline}
          onClick={() => {
            setDay(today())
            setActive("")
          }}
        >
          วันนี้
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          ["ALL", "งานทั้งหมด"],
          ["SCHEDULED", "รอเริ่มงาน"],
          ["IN_PROGRESS", "กำลังทำงาน"],
          ["COMPLETED", "เสร็จสิ้น"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={`border p-4 text-left ${
              filter === value
                ? "border-[#f5a623] bg-[#332c20]"
                : "border-[#444] bg-[#202222]"
            }`}
            onClick={() => {
              setFilter(value)
              setActive("")
            }}
          >
            <p className="text-xs text-[#999]">{label}</p>
            <p className="text-3xl mono font-black text-[#f5a623] mt-2">
              {value === "ALL"
                ? trips.length
                : trips.filter((t) => t.status === value).length}
            </p>
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-[#888]">กำลังโหลดงาน…</p>
      ) : !visible.length ? (
        <Empty>ไม่มีงานในวันที่เลือก</Empty>
      ) : (
        <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-3">
            {visible.map((t) => (
              <button
                key={t.tripId}
                onClick={() => setActive(t.tripId)}
                className={`w-full text-left p-5 border ${
                  trip?.tripId === t.tripId
                    ? "border-[#f5a623] bg-[#332c20]"
                    : "border-[#444] bg-[#202222]"
                }`}
              >
                <div className="flex justify-between">
                  <b className="mono text-lg text-[#f5a623]">
                    {t.departureAt.slice(11, 16)} น.
                  </b>
                  <Chip status={t.status} />
                </div>
                <p className="font-bold mt-3">{t.routeName}</p>
                <p className="text-sm text-[#bbb] mt-2">
                  {t.licensePlate} · {t.vehicleType}
                </p>
                <p className="text-xs text-[#999] mt-2">
                  {t.occupiedCount} ผู้โดยสาร · {t.totalMinutes} นาที
                </p>
              </button>
            ))}
          </div>
          {trip && (
            <div className="space-y-5">
              <Panel>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-bold text-lg">{trip.routeName}</h2>
                    <p className="text-sm text-[#999] mt-1">
                      {displayDate(trip.departureAt)} ·{" "}
                      {trip.departureAt.slice(11, 16)} น.
                    </p>
                  </div>
                  <Chip status={trip.status} />
                </div>
                <Details
                  rows={[
                    ["รหัสงาน", trip.tripId],
                    ["รถที่ใช้", `${trip.vehicleId} · ${trip.licensePlate}`],
                    ["คนขับ", trip.driverName],
                    [
                      "เริ่มงาน",
                      trip.events.find((e) => e.eventType === "START")
                        ? displayTime(
                            trip.events.find((e) => e.eventType === "START")!
                              .eventAt,
                          )
                        : "ยังไม่เริ่ม",
                    ],
                    [
                      "จบงาน",
                      trip.events.find((e) => e.eventType === "FINISH")
                        ? displayTime(
                            trip.events.find((e) => e.eventType === "FINISH")!
                              .eventAt,
                          )
                        : "—",
                    ],
                  ]}
                />
                {trip.status === "SCHEDULED" && (
                  <button
                    className={`${gold} w-full mt-5`}
                    disabled={
                      !editable ||
                      action.busy ||
                      day !== today() ||
                      !data.capabilities.tripEvents
                    }
                    onClick={() => void change("start")}
                  >
                    เริ่มงาน
                  </button>
                )}
                {day !== today() && trip.status === "SCHEDULED" && (
                  <p className="text-xs text-[#999] mt-3">เริ่มงานได้ในวันที่เดินรถ</p>
                )}
                {!data.capabilities.tripEvents && (
                  <p className="text-xs text-amber-400 mt-3">
                    การบันทึกเริ่มงานและจุดจอดยังไม่เปิดใช้งาน
                  </p>
                )}
              </Panel>
              <Panel>
                <div className="flex justify-between mb-4">
                  <h2 className="font-bold">เช็กอินตามจุดจอด</h2>
                  <span className="text-sm text-[#f5a623]">
                    ผ่านแล้ว {visits.length}/{stops.length} จุด
                  </span>
                </div>
                <div className="h-1 bg-[#444] mb-6">
                  <div
                    className="h-full bg-[#f5a623]"
                    style={{
                      width: `${
                        stops.length ? (visits.length / stops.length) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="space-y-3">
                  {stops.map((s, i) => {
                    const visit = visits.find(
                      (e) => e.routeStopId === s.routeStopId,
                    )
                    return (
                      <div
                        key={s.routeStopId}
                        className={`border p-3 flex gap-3 items-center ${
                          visit
                            ? "border-green-900 bg-green-950/20"
                            : "border-[#444]"
                        }`}
                      >
                        <span
                          className={`mono w-8 h-8 flex items-center justify-center border shrink-0 ${
                            visit
                              ? "border-green-600 text-green-400"
                              : "border-[#555] text-[#999]"
                          }`}
                        >
                          {visit ? "✓" : i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm">{s.stopName}</p>
                          <p className="text-xs text-[#888] mt-1">
                            {visit
                              ? displayTime(visit.eventAt)
                              : i === 0
                                ? "จุดเริ่มต้น"
                                : `${s.minutesFromPrev} นาทีจากจุดก่อนหน้า`}
                          </p>
                        </div>
                        {!visit && (
                          <button
                            disabled={
                              !editable ||
                              action.busy ||
                              trip.status !== "IN_PROGRESS" ||
                              i !== visits.length
                            }
                            className={`${outline} text-xs`}
                            onClick={() =>
                              void change("checkpoint", {
                                routeStopId: s.routeStopId,
                              })
                            }
                          >
                            เช็กอิน
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                {trip.status === "IN_PROGRESS" && (
                  <button
                    disabled={
                      !editable || action.busy || visits.length !== stops.length
                    }
                    className={`${gold} w-full mt-5`}
                    onClick={async () => {
                      if (
                        await ask(
                          "ยืนยันการจบงาน",
                          "จบงานรอบนี้หรือไม่? ตั๋วที่ยังไม่เช็กอินจะถูกบันทึกเป็นไม่มาขึ้นรถ",
                        )
                      )
                        void change("finish")
                    }}
                  >
                    จบงาน
                  </button>
                )}
              </Panel>
              <Panel>
                <h2 className="font-bold mb-4">เช็กอินผู้โดยสาร</h2>
                <form
                  className="flex gap-2 mb-5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void action.run(async () => {
                      await api("/driver/check-in", "POST", {
                        qrToken: qr.trim(),
                      })
                      setQr("")
                      await loadPassengers()
                    }, "เช็กอินผู้โดยสารแล้ว")
                  }}
                >
                  <input
                    aria-label="รหัส QR ของผู้โดยสาร"
                    className={field}
                    placeholder="สแกนด้วยเครื่องอ่าน หรือใส่รหัส QR บนตั๋ว"
                    required
                    value={qr}
                    onChange={(e) => setQr(e.target.value)}
                  />
                  <button
                    disabled={
                      !editable || action.busy || trip.status !== "IN_PROGRESS"
                    }
                    className={`${gold} whitespace-nowrap`}
                  >
                    เช็กอินตั๋ว
                  </button>
                </form>
                <Table
                  headers={["ที่นั่ง", "ผู้โดยสาร", "จุดขึ้น → จุดลง", "สถานะ"]}
                  rows={passengers.map((p) => [
                    <span className="mono text-[#f5a623]">{p.seatNumber}</span>,
                    p.fullName,
                    `${p.pickupName} → ${p.dropoffName}`,
                    <Chip status={p.status} />,
                  ])}
                />
              </Panel>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
