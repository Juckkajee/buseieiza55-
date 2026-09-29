import { useState, useEffect, useCallback, useMemo } from "react"
import { useApp } from "./App"
import { useConfirm } from "./Confirmation"
import { api, today, displayDate, displayTime } from "./api"
import {
  Title,
  Panel,
  Label,
  Empty,
  Notice,
  useAction,
  Details,
  Chip,
  gold,
  outline,
  field,
} from "./ui"
import type { Trip, Booking, Draft } from "./types"
import qrcode from "./QRGenerator"
function QR({ value }: { value: string }) {
  const image = useMemo(() => {
    const qr = qrcode(0, "M") as {
      addData: (v: string) => void
      make: () => void
      createDataURL: (scale: number, margin: number) => string
    }
    qr.addData(value)
    qr.make()
    return qr.createDataURL(4, 16)
  }, [value])
  return (
    <img
      src={image}
      alt="QR Code สำหรับเช็กอินตั๋ว"
      width={132}
      height={132}
      className="border-2 border-[#f5a623] bg-white"
    />
  )
}
export default function BookingPage({
  view,
}: {
  view: "booking" | "cancellations"
}) {
  const { data } = useApp(),
    ask = useConfirm(),
    action = useAction()
  const [day, setDay] = useState(today),
    [routeId, setRouteId] = useState(""),
    [pickupId, setPickupId] = useState(""),
    [dropoffId, setDropoffId] = useState(""),
    [tripId, setTripId] = useState(""),
    [seats, setSeats] = useState<string[]>([])
  const [trips, setTrips] = useState<Trip[]>([]),
    [occupied, setOccupied] = useState<string[]>([]),
    [loadedTrip, setLoadedTrip] = useState(""),
    [bookings, setBookings] = useState<Booking[]>([]),
    [cart, setCart] = useState<Draft[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [expanded, setExpanded] = useState(""),
    [loading, setLoading] = useState(true),
    [clock, setClock] = useState(Date.now())
  const route = data.routes.find((r) => r.routeId === routeId),
    trip = trips.find((t) => t.tripId === tripId),
    pickup = route?.stops.find((s) => s.routeStopId === pickupId),
    dropoff = route?.stops.find((s) => s.routeStopId === dropoffId)
  const reloadBookings = useCallback(
    async () => setBookings(await api<Booking[]>("/bookings")),
    [],
  )
  useEffect(() => {
    let active = true
    setLoading(true)
    setTripId("")
    setSeats([])
    void api<Trip[]>("/trips?date=" + day)
      .then((rows) => {
        if (active) setTrips(rows)
      })
      .catch((e) => action.setError(e.message))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [day])
  useEffect(() => {
    void reloadBookings().catch((e) => action.setError(e.message))
    const refresh = () =>
      void reloadBookings().catch((e) => action.setError(e.message))
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [reloadBookings, view])
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    setLoadedTrip("")
    setOccupied([])
    if (!tripId) return
    let active = true
    const refresh = () =>
      void api<{ occupied: string[] }>("/trips/" + tripId + "/seats")
        .then((r) => {
          if (active) {
            setOccupied(r.occupied)
            setLoadedTrip(tripId)
            setSeats((prev) => prev.filter((s) => !r.occupied.includes(s)))
          }
        })
        .catch((e) => {
          if (active) {
            setLoadedTrip("")
            action.setError(e.message)
          }
        })
    refresh()
    const timer = setInterval(refresh, 15000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [tripId])
  const pending = new Set(
    cart.filter((c) => c.trip.tripId === tripId).flatMap((c) => c.seats),
  )
  const canBook = (t: Trip) =>
    t.status === "SCHEDULED" &&
    new Date(t.departureAt + "+07:00").getTime() - clock >= 20 * 60000
  async function confirm(ids: string[]) {
    const items = cart.filter((c) => ids.includes(c.id))
    if (!items.length) return
    await action.run(async () => {
      const result = await api<{ bookingIds: string[] }>("/bookings", "POST", {
        items: items.map((c) => ({
          tripId: c.trip.tripId,
          pickupId: c.pickup.routeStopId,
          dropoffId: c.dropoff.routeStopId,
          seats: c.seats,
        })),
      })
      setCart((prev) => prev.filter((c) => !ids.includes(c.id)))
      setSelected((prev) => prev.filter((v) => !ids.includes(v)))
      setExpanded(result.bookingIds[0])
      await reloadBookings()
      setTrips(await api<Trip[]>("/trips?date=" + day))
      if (tripId) {
        const fresh = await api<{ occupied: string[] }>(
          "/trips/" + tripId + "/seats",
        )
        setOccupied(fresh.occupied)
        setSeats([])
      }
    }, `ยืนยันการจองสำเร็จ ${items.length} รายการ`)
  }
  function draftDetails(c: Draft) {
    return (
      <Details
        rows={[
          ["วันที่เดินทาง", displayDate(c.trip.departureAt)],
          ["เวลาออกรถ", c.trip.departureAt.slice(11, 16) + " น."],
          ["จุดขึ้น", `${c.pickup.stopSequence}. ${c.pickup.stopName}`],
          ["จุดลง", `${c.dropoff.stopSequence}. ${c.dropoff.stopName}`],
          ["รหัสรถ", c.trip.vehicleId],
          ["รถ", c.trip.licensePlate + " · " + c.trip.vehicleType],
          ["คนขับ", c.trip.driverName],
          ["ที่นั่ง", c.seats.join(", ")],
        ]}
      />
    )
  }
  function bookingCard(b: Booking) {
    return (
      <article
        key={b.bookingId}
        className="border border-[#444] bg-[#202222] p-4"
      >
        <button
          className="w-full text-left"
          aria-expanded={expanded === b.bookingId}
          onClick={() =>
            setExpanded(expanded === b.bookingId ? "" : b.bookingId)
          }
        >
          <span className="flex gap-3 justify-between items-start">
            <b className="mono text-xs text-[#f5a623] break-all">
              {b.bookingId}
            </b>
            <Chip status={b.status} />
          </span>
          <span className="block mt-3 text-sm">
            {b.routeName} · ที่นั่ง {b.tickets.map((t) => t.seatNumber).join(", ")}
          </span>
          <span className="block text-xs text-[#999] mt-2">
            {displayTime(b.bookedAt)} ·{" "}
            {expanded === b.bookingId ? "ซ่อนรายละเอียด ▴" : "ดูรายละเอียด ▾"}
          </span>
        </button>
        {expanded === b.bookingId && (
          <div>
            <Details
              rows={[
                ["วันที่เดินทาง", displayDate(b.departureAt)],
                ["เวลาออกรถ", b.departureAt.slice(11, 16) + " น."],
                ["รหัสรถ", b.vehicleId],
                ["รถ", b.licensePlate + " · " + b.vehicleType],
                ["คนขับ", b.driverName],
              ]}
            />
            {b.tickets.map((t) => (
              <div
                key={t.ticketNo}
                className="mt-4 pt-3 border-t border-[#444]"
              >
                <Details
                  rows={[
                    [
                      "รหัสตั๋ว",
                      <span className="text-[#f5a623] break-all">
                        {b.bookingId}/{t.ticketNo}
                      </span>,
                    ],
                    ["เลขที่นั่ง", t.seatNumber],
                    ["จุดขึ้น", `${t.pickupSequence}. ${t.pickupName}`],
                    ["จุดลง", `${t.dropoffSequence}. ${t.dropoffName}`],
                    ["เวลารับที่จุดขึ้น", displayTime(t.travelAt)],
                    ["เวลาเช็กอิน", displayTime(t.checkedInAt)],
                    ["สถานะ", <Chip status={t.status} />],
                  ]}
                />
                {t.status !== "CANCELLED" && (
                  <div className="mt-4 flex gap-3 items-start">
                    <QR value={t.qrToken} />
                    <div className="min-w-0 text-xs text-[#999]">
                      <p>แสดง QR นี้ให้คนขับเช็กอิน</p>
                      <p
                        className="mono text-[10px] mt-2 break-all"
                        title="รหัสสำหรับเครื่องอ่าน QR"
                      >
                        {t.qrToken}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {b.status === "CONFIRMED" && b.tripStatus === "SCHEDULED" && (
              <button
                disabled={action.busy}
                className="mt-5 text-sm text-red-300 hover:text-red-200"
                onClick={async () => {
                  if (
                    await ask(
                      "ยืนยันการยกเลิกการจอง",
                      `ยกเลิก ${b.bookingId} ทุกที่นั่ง และย้ายไปประวัติการยกเลิกหรือไม่?`,
                    )
                  )
                    void action.run(async () => {
                      await api("/bookings/" + b.bookingId + "/cancel", "POST")
                      await reloadBookings()
                      setTrips(await api<Trip[]>("/trips?date=" + day))
                      if (tripId) {
                        const r = await api<{ occupied: string[] }>(
                          "/trips/" + tripId + "/seats",
                        )
                        setOccupied(r.occupied)
                      }
                    }, "ยกเลิกการจองแล้ว")
                }}
              >
                ยกเลิกการจอง
              </button>
            )}
          </div>
        )}
      </article>
    )
  }
  const confirmed = bookings.filter((b) => b.status !== "CANCELLED"),
    cancelled = bookings.filter((b) => b.status === "CANCELLED")
  if (view === "cancellations")
    return (
      <div className="p-5 xl:p-8">
        <Title>ประวัติการยกเลิก</Title>
        <Notice {...action} />
        <p className="text-sm text-[#999] mb-6">
          รายการจองที่ยกเลิกแล้วทั้งหมด {cancelled.length} รายการ
        </p>
        {cancelled.length ? (
          <div className="grid lg:grid-cols-2 gap-4">
            {cancelled.map(bookingCard)}
          </div>
        ) : (
          <Empty>ยังไม่มีประวัติการยกเลิก</Empty>
        )}
      </div>
    )
  return (
    <div className="p-5 xl:p-8">
      <Title>จองรถรับ–ส่ง</Title>
      <p className="text-sm text-[#999] -mt-3 mb-6">
        เลือกเส้นทางและที่นั่ง → เพิ่มรายการ → ยืนยันการจอง
      </p>
      <Notice {...action} />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          <Panel>
            <h2 className="font-bold mb-4">
              <span className="text-[#f5a623] mr-2">01</span>
              เลือกเส้นทางและจุดขึ้น–ลง
            </h2>
            <Label title="วันที่เดินทาง">
              <input
                type="date"
                className={`${field} mb-4`}
                min={today()}
                value={day}
                onChange={(e) => {
                  if (e.target.value) setDay(e.target.value)
                }}
              />
            </Label>
            <div className="space-y-2">
              {data.routes.map((r) => (
                <button
                  key={r.routeId}
                  className={`w-full text-left border p-3 ${
                    routeId === r.routeId
                      ? "border-[#f5a623] bg-[#332c20]"
                      : "border-[#444] hover:border-[#888]"
                  }`}
                  aria-pressed={routeId === r.routeId}
                  onClick={() => {
                    setRouteId(r.routeId)
                    setPickupId("")
                    setDropoffId("")
                    setTripId("")
                    setSeats([])
                  }}
                >
                  <b className="text-sm text-[#f5a623]">{r.routeName}</b>
                  <span className="block text-xs text-[#bbb] mt-1">
                    {r.stops.map((s) => s.stopName).join(" → ") || "ยังไม่มีจุดจอด"}
                  </span>
                </button>
              ))}
            </div>
            {!data.routes.length && <Empty>ยังไม่มีเส้นทางเปิดให้บริการ</Empty>}
            {route && (
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <Label title="จุดขึ้น">
                  <select
                    className={field}
                    value={pickupId}
                    onChange={(e) => {
                      setPickupId(e.target.value)
                      setDropoffId("")
                      setSeats([])
                    }}
                  >
                    <option value="">เลือกจุดขึ้น</option>
                    {route.stops.slice(0, -1).map((s) => (
                      <option key={s.routeStopId} value={s.routeStopId}>
                        {s.stopSequence}. {s.stopName}
                      </option>
                    ))}
                  </select>
                </Label>
                <Label title="จุดลง">
                  <select
                    className={field}
                    value={dropoffId}
                    disabled={!pickup}
                    onChange={(e) => setDropoffId(e.target.value)}
                  >
                    <option value="">เลือกจุดลง</option>
                    {route.stops
                      .filter(
                        (s) => s.stopSequence > (pickup?.stopSequence || 99999),
                      )
                      .map((s) => (
                        <option key={s.routeStopId} value={s.routeStopId}>
                          {s.stopSequence}. {s.stopName}
                        </option>
                      ))}
                  </select>
                </Label>
              </div>
            )}
          </Panel>
          <Panel>
            <h2 className="font-bold mb-4">
              <span className="text-[#f5a623] mr-2">02</span>เลือกรอบเดินรถและที่นั่ง
            </h2>
            {!pickup || !dropoff ? (
              <p className="text-sm text-[#888] py-5">
                เลือกเส้นทางและจุดขึ้น–ลงก่อน
              </p>
            ) : loading ? (
              <p>กำลังโหลดรอบรถ…</p>
            ) : (
              <>
                <p className="text-xs text-[#999] mb-4">
                  จองล่วงหน้าอย่างน้อย 20 นาที · ครั้งละไม่เกิน 4 ที่นั่ง
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {trips
                    .filter(
                      (t) => t.routeId === routeId && t.status !== "CANCELLED",
                    )
                    .map((t) => (
                      <button
                        key={t.tripId}
                        disabled={!canBook(t)}
                        aria-pressed={t.tripId === tripId}
                        className={`border p-4 text-left disabled:opacity-40 ${
                          tripId === t.tripId
                            ? "border-[#f5a623]"
                            : "border-[#444]"
                        }`}
                        onClick={() => {
                          setTripId(t.tripId)
                          setSeats([])
                        }}
                      >
                        <b className="mono text-[#f5a623]">
                          {t.departureAt.slice(11, 16)} น.
                        </b>
                        <span className="block text-sm mt-2">
                          {t.licensePlate} · {t.vehicleType}
                        </span>
                        <span className="block text-xs text-[#999] mt-1">
                          {t.driverName} · ว่าง {t.seatCount - t.occupiedCount} ที่
                        </span>
                        {!canBook(t) && (
                          <span className="text-xs">ปิดรับจองแล้ว</span>
                        )}
                      </button>
                    ))}
                </div>
                {!trips.some(
                  (t) => t.routeId === routeId && t.status !== "CANCELLED",
                ) && <Empty>ไม่มีรอบเดินรถในวันที่เลือก</Empty>}
                {trip && (
                  <div className="mt-6">
                    <div className="flex gap-4 justify-center text-[10px] text-[#999] mb-4">
                      <span>□ ว่าง</span>
                      <span className="text-[#f5a623]">■ เลือกแล้ว</span>
                      <span className="text-[#666]">■ จองแล้ว</span>
                    </div>
                    <div className="max-w-xs mx-auto border-2 border-[#555] rounded-t-[40px] p-6">
                      <p className="text-right text-xs text-[#888] border-b border-[#444] pb-5 mb-4">
                        พวงมาลัย ◉
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: trip.seatCount }, (_, i) =>
                          String(i + 1),
                        ).map((s) => {
                          const unavailable =
                              occupied.includes(s) || pending.has(s),
                            chosen = seats.includes(s)
                          return (
                            <button
                              key={s}
                              aria-label={`ที่นั่ง ${s}${
                                unavailable ? " ไม่ว่าง" : ""
                              }`}
                              aria-pressed={chosen}
                              disabled={
                                loadedTrip !== tripId ||
                                unavailable ||
                                !canBook(trip)
                              }
                              className={`aspect-square border text-sm mono disabled:cursor-not-allowed ${
                                chosen
                                  ? "bg-[#f5a623] text-[#111] border-[#f5a623]"
                                  : unavailable
                                    ? "bg-[#333] border-[#333] text-[#666]"
                                    : "border-[#888] hover:border-[#f5a623]"
                              }`}
                              onClick={() => {
                                if (chosen)
                                  setSeats(seats.filter((v) => v !== s))
                                else if (seats.length < 4)
                                  setSeats([...seats, s])
                                else
                                  action.setError("เลือกได้ไม่เกิน 4 ที่นั่งต่อรายการ")
                              }}
                            >
                              {s}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <p className="text-sm text-center text-[#f5a623] mt-4">
                      ที่นั่งที่เลือก: {seats.join(", ") || "—"}
                    </p>
                    <button
                      disabled={
                        !seats.length || loadedTrip !== tripId || !canBook(trip)
                      }
                      className={`${gold} w-full mt-4`}
                      onClick={() => {
                        if (!pickup || !dropoff) return
                        const item: Draft = {
                          id: crypto.randomUUID(),
                          trip,
                          pickup,
                          dropoff,
                          seats: [...seats].sort(
                            (a, b) => Number(a) - Number(b),
                          ),
                        }
                        setCart([...cart, item])
                        setSelected([...selected, item.id])
                        setExpanded(item.id)
                        setTripId("")
                        setSeats([])
                        action.setError("")
                        action.setMessage(
                          "เพิ่มในรายการรอยืนยันแล้ว สามารถเลือกเพิ่มได้อีก",
                        )
                      }}
                    >
                      เพิ่มรายการรอยืนยัน →
                    </button>
                  </div>
                )}
              </>
            )}
          </Panel>
        </div>
        <aside className="space-y-5 min-w-0">
          <Panel className="border-[#836329]">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-sm">รายการรอยืนยัน</h2>
              <span className="text-xs text-[#f5a623]">
                {cart.length} รายการ
              </span>
            </div>
            <p className="text-xs text-[#999] mt-2 mb-4">
              รายการในนี้ยังไม่ใช่การจองที่ยืนยันแล้ว
            </p>
            {!cart.length ? (
              <Empty>
                ยังไม่มีรายการรอยืนยัน
                <br />
                เลือกที่นั่งแล้วเพิ่มรายการจากด้านซ้าย
              </Empty>
            ) : (
              <>
                <label className="flex gap-2 text-sm mb-3">
                  <input
                    type="checkbox"
                    checked={selected.length === cart.length}
                    onChange={(e) =>
                      setSelected(e.target.checked ? cart.map((c) => c.id) : [])
                    }
                  />
                  เลือกทั้งหมด
                </label>
                <div className="space-y-3">
                  {cart.map((c) => (
                    <article key={c.id} className="border border-[#444] p-3">
                      <div className="flex gap-2">
                        <input
                          aria-label={`เลือกรายการ ${c.trip.routeName} ${c.trip.departureAt.slice(11, 16)} ที่นั่ง ${c.seats.join(",")}`}
                          type="checkbox"
                          checked={selected.includes(c.id)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, c.id]
                                : selected.filter((v) => v !== c.id),
                            )
                          }
                        />
                        <button
                          className="text-left flex-1 text-sm"
                          onClick={() =>
                            setExpanded(expanded === c.id ? "" : c.id)
                          }
                        >
                          <b className="text-[#f5a623]">{c.trip.routeName}</b>
                          <span className="block mt-1">
                            {displayDate(c.trip.departureAt)}{" "}
                            {c.trip.departureAt.slice(11, 16)}
                          </span>
                          <span className="text-xs text-[#999]">
                            ที่นั่ง {c.seats.join(", ")} · ดูรายละเอียด{" "}
                            {expanded === c.id ? "▴" : "▾"}
                          </span>
                        </button>
                      </div>
                      {expanded === c.id && draftDetails(c)}
                      <div className="flex justify-between mt-4">
                        <button
                          disabled={action.busy}
                          className="text-xs text-red-300"
                          onClick={async () => {
                            if (
                              await ask(
                                "ยืนยันการลบรายการ",
                                "นำรายการนี้ออกจากรายการรอยืนยันหรือไม่?",
                              )
                            ) {
                              setCart(cart.filter((v) => v.id !== c.id))
                              setSelected(selected.filter((v) => v !== c.id))
                            }
                          }}
                        >
                          ลบรายการ
                        </button>
                        <button
                          disabled={action.busy}
                          className="text-xs text-[#f5a623]"
                          onClick={() => void confirm([c.id])}
                        >
                          ยืนยันรายการนี้
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <button
                  disabled={action.busy || !selected.length}
                  className={`${gold} w-full mt-4`}
                  onClick={() => void confirm(selected)}
                >
                  {action.busy ? "กำลังยืนยัน…" : `ยืนยันที่เลือก (${selected.length})`}
                </button>
                <button
                  disabled={action.busy}
                  className={`${outline} w-full mt-2`}
                  onClick={() => void confirm(cart.map((c) => c.id))}
                >
                  ยืนยันทั้งหมด ({cart.length})
                </button>
              </>
            )}
          </Panel>
          <Panel>
            <h2 className="font-bold text-sm mb-4">
              การจองที่ยืนยันแล้ว ({confirmed.length})
            </h2>
            <div className="space-y-3">{confirmed.map(bookingCard)}</div>
            {!confirmed.length && <Empty>ยังไม่มีการจองที่ยืนยันแล้ว</Empty>}
          </Panel>
        </aside>
      </div>
    </div>
  )
}
