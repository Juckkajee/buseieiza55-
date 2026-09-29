import { type ReactNode, useState } from "react"
export const gold =
  "bg-[#f5a623] text-[#111] hover:bg-[#ffb940] px-4 py-2.5 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
export const outline =
  "border border-[#454545] px-3 py-2 text-sm hover:border-[#f5a623] disabled:opacity-40 disabled:cursor-not-allowed"
export const field =
  "w-full bg-[#161818] border border-[#454545] p-2.5 text-sm text-[#eee] outline-none focus:border-[#f5a623] [color-scheme:dark]"
export const statusText: Record<string, string> = {
  SCHEDULED: "รอเริ่มงาน",
  IN_PROGRESS: "กำลังเดินรถ",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิกแล้ว",
  CONFIRMED: "ยืนยันแล้ว",
  CHECKED_IN: "เช็กอินแล้ว",
  NO_SHOW: "ไม่มาขึ้นรถ",
  PARTIALLY_CANCELLED: "ยกเลิกบางส่วน",
  AVAILABLE: "พร้อมใช้",
  MAINTENANCE: "ซ่อมบำรุง",
}
export function Chip({ status }: { status: string }) {
  const color = ["CANCELLED", "NO_SHOW", "MAINTENANCE"].includes(status)
    ? "text-red-300 border-red-900 bg-red-950/30"
    : ["CONFIRMED", "COMPLETED", "CHECKED_IN", "AVAILABLE"].includes(status)
      ? "text-green-400 border-green-900 bg-green-950/30"
      : "text-amber-400 border-amber-900 bg-amber-950/30"
  return (
    <span
      className={`mono text-[10px] border px-2 py-1 whitespace-nowrap ${color}`}
    >
      {statusText[status] || status}
    </span>
  )
}
export function Title({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex justify-between items-center gap-4 mb-6 flex-wrap">
      <h1 className="border-l-4 border-[#f5a623] pl-3 text-xl font-bold">
        {children}
      </h1>
      {action}
    </div>
  )
}
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`border border-[#3c3c3c] bg-[#202222] p-5 ${className}`}
    >
      {children}
    </section>
  )
}
export function Label({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <label className="block text-xs text-[#aaa] space-y-2">
      <span>{title}</span>
      {children}
    </label>
  )
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-[#444] p-8 text-center text-sm text-[#999]">
      {children}
    </div>
  )
}
export function Table({
  headers,
  rows,
}: {
  headers: string[]
  rows: ReactNode[][]
}) {
  return (
    <div className="overflow-x-auto border border-[#3c3c3c]">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-[#3c3c3c]">
            {headers.map((h) => (
              <th
                key={h}
                className="mono px-3 py-3 text-[10px] font-normal tracking-wider text-[#999] whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1a1a1a]"
            >
              {r.map((v, j) => (
                <td key={j} className="px-3 py-3 align-top text-[#d0ccc5]">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="p-8 text-[#888] text-center">ยังไม่มีข้อมูล</p>}
    </div>
  )
}
export function useAction() {
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false)
  async function run(
    fn: () => Promise<void | false>,
    success = "บันทึกเรียบร้อยแล้ว",
  ) {
    if (busy) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const result = await fn()
      if (result !== false && success) setMessage(success)
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด")
    } finally {
      setBusy(false)
    }
  }
  return { run, busy, error, message, setError, setMessage }
}
export function Notice({
  error,
  message,
}: {
  error?: string
  message?: string
}) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="mb-4 border border-red-900 bg-red-950/40 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="mb-4 border border-[#4b6246] bg-[#263226] p-3 text-sm text-[#b7deb0]"
        >
          {message}
        </p>
      )}
    </>
  )
}
export function Details({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="space-y-2 text-sm text-[#bdbdbd] mt-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-[#888] shrink-0">{label}</dt>
          <dd className="text-right break-words min-w-0">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  )
}
