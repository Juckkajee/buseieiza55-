import { useCallback, useEffect, useState } from "react"
import { useApp } from "./App"
import { api, displayTime } from "./api"
import { useConfirm } from "./Confirmation"
import type { Booking } from "./types"
import {
  Title,
  Panel,
  Label,
  Notice,
  Table,
  Details,
  Chip,
  gold,
  outline,
  field,
  useAction,
} from "./ui"

export default function AdminBookingsPage({
  initialUserId = "",
}: {
  initialUserId?: string
}) {
  const { can, data } = useApp(),
    editable = can("admin-bookings"),
    ask = useConfirm(),
    action = useAction()
  const [bookings, setBookings] = useState<Booking[]>([]),
    [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(initialUserId),
    [status, setStatus] = useState(""),
    [date, setDate] = useState("")
  const [selectedId, setSelectedId] = useState(""),
    [cancelId, setCancelId] = useState(""),
    [reason, setReason] = useState("")
  const load = useCallback(async () => {
    setLoading(true)
    try {
      setBookings(await api<Booking[]>("/admin/bookings"))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load().catch((e) => action.setError(e.message))
  }, [load])
  const rows = bookings.filter(
    (b) =>
      (!status || b.status === status) &&
      (!date || b.departureAt.slice(0, 10) === date) &&
      [b.bookingId, b.userId, b.userName, b.username, b.routeName].some((v) =>
        v.toLowerCase().includes(search.trim().toLowerCase()),
      ),
  )
  const selected = bookings.find((b) => b.bookingId === selectedId),
    cancelling = bookings.find((b) => b.bookingId === cancelId)
  const cancellable = (b: Booking) =>
    ["CONFIRMED", "PARTIALLY_CANCELLED"].includes(b.status) &&
    b.tripStatus !== "IN_PROGRESS" &&
    b.tickets.every((t) => ["CONFIRMED", "CANCELLED"].includes(t.status))
  const deletable = (b: Booking) =>
    ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(b.status) &&
    b.tripStatus !== "IN_PROGRESS" &&
    !b.tickets.some((t) => ["CONFIRMED", "CHECKED_IN"].includes(t.status))
  return (
    <div className="p-5 xl:p-8">
      <Title
        action={
          <button
            className={outline}
            disabled={loading || action.busy}
            onClick={() => void load().catch((e) => action.setError(e.message))}
          >
            โหลดใหม่
          </button>
        }
      >
        จัดการการจอง
      </Title>
      <Notice {...action} />
      <p className="text-sm text-[#999] mb-5">
        ยกเลิกพร้อมเหตุผลเพื่อคืนที่นั่งและแจ้งในประวัติของ User ·
        ลบถาวรได้หลังยกเลิกหรือสิ้นสุดการเดินทางแล้ว
      </p>
      {!data.capabilities.bookingCancellation && (
        <Notice error="รออนุมัติและติดตั้ง SQL เก็บเหตุผลยกเลิก ก่อนเปิดปุ่มยกเลิกการจอง" />
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <Label title="ค้นหาการจอง">
          <input
            type="search"
            placeholder="รหัสจอง / รหัสผู้ใช้ / ชื่อ / Username / เส้นทาง"
            className={field}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Label>
        <Label title="สถานะการจอง">
          <select
            className={field}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">ทุกสถานะ</option>
            {[
              ["CONFIRMED", "ยืนยันแล้ว"],
              ["PARTIALLY_CANCELLED", "ยกเลิกบางส่วน"],
              ["CANCELLED", "ยกเลิกแล้ว"],
              ["CHECKED_IN", "เช็กอินแล้ว"],
              ["COMPLETED", "เสร็จสิ้น"],
              ["NO_SHOW", "ไม่มาขึ้นรถ"],
            ].map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Label>
        <Label title="วันที่เดินทาง (เว้นว่างเพื่อดูทั้งหมด)">
          <input
            type="date"
            className={field}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Label>
      </div>
      {(search || status || date) && (
        <button
          className="text-xs text-[#f5a623] mb-5 underline"
          onClick={() => {
            setSearch("")
            setStatus("")
            setDate("")
          }}
        >
          ล้างตัวกรอง
        </button>
      )}
      {cancelling && (
        <Panel className="mb-6">
          <h2 className="font-bold text-[#f5a623] mb-3">
            ยกเลิกการจอง {cancelling.bookingId}
          </h2>
          <p className="text-sm mb-4">
            {cancelling.userName} · {cancelling.routeName} ·{" "}
            {displayTime(cancelling.departureAt)}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void action.run(async () => {
                if (
                  !(await ask(
                    "ยืนยันการยกเลิกการจอง",
                    `ยกเลิก ${cancelling.bookingId} ทุกที่นั่ง ด้วยเหตุผล “${reason.trim()}” หรือไม่? ผู้ใช้จะเห็นเหตุผลในประวัติการยกเลิก`,
                  ))
                )
                  return false
                await api(
                  `/admin/bookings/${cancelling.bookingId}/cancel`,
                  "POST",
                  { reason },
                )
                setCancelId("")
                setReason("")
                await load()
              }, "ยกเลิกและบันทึกเหตุผลให้ผู้ใช้แล้ว")
            }}
          >
            <Label title="เหตุผลยกเลิก (ผู้ใช้มองเห็น)">
              <textarea
                autoFocus
                required
                maxLength={500}
                rows={3}
                className={field}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Label>
            <div className="flex gap-2 mt-4">
              <button
                className={gold}
                disabled={!editable || action.busy || !reason.trim()}
              >
                ยืนยันยกเลิกการจอง
              </button>
              <button
                type="button"
                className={outline}
                disabled={action.busy}
                onClick={() => setCancelId("")}
              >
                ปิด
              </button>
            </div>
          </form>
        </Panel>
      )}
      {selected && (
        <Panel className="mb-6">
          <div className="flex justify-between gap-4">
            <h2 className="font-bold text-[#f5a623] break-all">
              รายละเอียด {selected.bookingId}
            </h2>
            <button
              className="text-xs text-[#999]"
              onClick={() => setSelectedId("")}
            >
              ปิดรายละเอียด
            </button>
          </div>
          <Details
            rows={[
              ["ผู้จอง", `${selected.userName} (${selected.userId})`],
              ["Username", selected.username],
              ["วันเวลาที่จอง", displayTime(selected.bookedAt)],
              ["เส้นทาง", selected.routeName],
              ["วันเวลาเดินทาง", displayTime(selected.departureAt)],
              [
                "รถ",
                `${selected.vehicleId} · ${selected.licensePlate} · ${selected.vehicleType}`,
              ],
              ["คนขับ", selected.driverName],
              ["สถานะ", <Chip status={selected.status} />],
            ]}
          />
          {selected.cancellationReason && (
            <div className="border border-red-900 bg-red-950/20 p-3 my-4">
              <p className="text-red-200 font-bold text-sm">เหตุผลยกเลิก</p>
              <p className="text-sm whitespace-pre-wrap break-words mt-1">
                {selected.cancellationReason}
              </p>
              <p className="text-xs text-[#999] mt-2">
                โดย {selected.cancelledBy} · {displayTime(selected.cancelledAt)}
              </p>
            </div>
          )}
          <div className="mt-5">
            <Table
              headers={["รหัสตั๋ว", "ที่นั่ง", "จุดขึ้น → จุดลง", "เวลาเช็กอิน", "สถานะ"]}
              rows={selected.tickets.map((t) => [
                `${selected.bookingId}/${t.ticketNo}`,
                t.seatNumber,
                `${t.pickupName} → ${t.dropoffName}`,
                displayTime(t.checkedInAt),
                <Chip status={t.status} />,
              ])}
            />
          </div>
        </Panel>
      )}
      <p className="text-xs text-[#888] mb-3">
        แสดง {rows.length} จาก {bookings.length} รายการ
      </p>
      {loading ? (
        <p className="text-sm text-[#888]">กำลังโหลดการจอง…</p>
      ) : (
        <Table
          headers={[
            "รหัสจอง",
            "ผู้จอง",
            "เส้นทาง / เดินทาง",
            "ที่นั่ง",
            "สถานะ",
            "จัดการ",
          ]}
          rows={rows.map((b) => [
            <span className="mono text-xs text-[#f5a623] break-all">
              {b.bookingId}
            </span>,
            <div>
              {b.userName}
              <p className="text-[10px] text-[#999] break-all">
                {b.userId} · {b.username}
              </p>
            </div>,
            <div>
              {b.routeName}
              <p className="text-xs text-[#999] mt-1">
                {displayTime(b.departureAt)}
              </p>
            </div>,
            b.tickets.map((t) => t.seatNumber).join(", "),
            <Chip status={b.status} />,
            <div className="flex flex-col items-start gap-2 text-xs">
              <button
                className="text-[#f5a623]"
                onClick={() =>
                  setSelectedId(selectedId === b.bookingId ? "" : b.bookingId)
                }
              >
                ดูรายละเอียด
              </button>
              {cancellable(b) && (
                <button
                  disabled={
                    !editable ||
                    action.busy ||
                    !data.capabilities.bookingCancellation
                  }
                  className="text-orange-300 disabled:opacity-30"
                  onClick={() => {
                    setCancelId(b.bookingId)
                    setReason("")
                    setSelectedId(b.bookingId)
                  }}
                >
                  ยกเลิกการจอง
                </button>
              )}
              <button
                disabled={!editable || action.busy || !deletable(b)}
                title={
                  deletable(b)
                    ? "ลบการจองและตั๋วจากฐานข้อมูลถาวร"
                    : "ต้องยกเลิกหรือเดินทางจบแล้วก่อนลบ"
                }
                className="text-red-300 disabled:opacity-30 whitespace-nowrap"
                onClick={async () => {
                  if (
                    await ask(
                      "ยืนยันลบการจองถาวร",
                      `ลบ ${b.bookingId} ของ ${b.userName} พร้อมตั๋ว ${b.tickets.length} ใบและเหตุผลยกเลิกออกจากฐานข้อมูลหรือไม่? รายการจะหายจากประวัติ User และรายงาน ย้อนกลับจากเว็บไม่ได้ เมื่อลบการจองทั้งหมดของผู้ใช้แล้วจึงจะลบ User ได้`,
                    )
                  )
                    void action.run(async () => {
                      await api(`/admin/bookings/${b.bookingId}`, "DELETE", {
                        confirmBookingId: b.bookingId,
                      })
                      if (selectedId === b.bookingId) setSelectedId("")
                      await load()
                    }, "ลบการจองและตั๋วถาวรแล้ว หากผู้ใช้ไม่มีการจองเหลือ สามารถกลับไปลบ User ได้")
                }}
              >
                ลบถาวร
              </button>
            </div>,
          ])}
        />
      )}
    </div>
  )
}
