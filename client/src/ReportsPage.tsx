import { useState, useEffect } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { api, today } from "./api"
import { Title, Panel, Label, Notice, Table, field, outline } from "./ui"
type Row = {
  name: string
  bookings: number
  seats: number
  cancelled: number
  checkin: number
  noshow: number
  trips?: number
  completed?: number
  capacity?: number
  utilization?: number
  ontime?: number
  late?: number
}
type Report = {
  year: number
  period: "day" | "month" | "year"
  fromDate: string
  toDate: string
  timeline: Row[]
  summary: Omit<Row, "name">
  monthly: Row[]
  stations: Row[]
  routes: Row[]
  drivers: Row[]
  daily: Row[]
}
const months = Array.from({ length: 12 }, (_, i) =>
  new Date(2026, i, 1).toLocaleString("th-TH", { month: "long" }),
)
const thaiDate = (value: string) =>
  new Date(value + "T00:00:00+07:00").toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  })
export default function ReportsPage() {
  const [year, setYear] = useState(Number(today().slice(0, 4))),
    [period, setPeriod] = useState<Report["period"]>("year"),
    [month, setMonth] = useState(Number(today().slice(5, 7))),
    [day, setDay] = useState(today()),
    [tab, setTab] = useState("monthly"),
    [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    setReport(null)
    const params = new URLSearchParams({
      period,
      year: String(year),
      month: String(month),
      date: day,
    })
    if (period === "day" && !day) {
      setError("กรุณาเลือกวันที่ต้องการดูรายงาน")
      setLoading(false)
      return
    }
    void api<Report>("/reports?" + params)
      .then((r) => {
        if (active) {
          setReport(r)
          setError("")
        }
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [year, period, month, day])
  const tabs = [
    ["monthly", "สถิติการจอง"],
    ["stations", "สถิติรายจุดจอด"],
    ["routes", "สรุปการเดินรถ"],
    ["drivers", "การทำงานคนขับ"],
    ["daily", "No Show / ยกเลิก"],
  ]
  const rows =
    (tab === "monthly" || tab === "daily"
      ? report?.timeline
      : report?.[(tab as "stations" | "routes" | "drivers")]) || []
  const periodTitle = !report
    ? ""
    : report.period === "day"
      ? `วันที่ ${thaiDate(report.fromDate)}`
      : report.period === "month"
        ? `เดือน${months[Number(report.fromDate.slice(5, 7)) - 1]} ปี ${report.year + 543}`
        : `ปี ${report.year + 543}`
  const timeColumn =
    period === "day"
      ? "เวลาเดินทาง"
      : period === "month"
        ? "วันเดินทาง"
        : "เดือนเดินทาง"
  return (
    <div className="p-5 xl:p-8">
      <Title
        action={
          <div className="flex items-end gap-3 flex-wrap">
            <Label title="ช่วงเวลารายงาน">
              <select
                className={field}
                value={period}
                onChange={(e) => setPeriod(e.target.value as Report["period"])}
              >
                <option value="day">รายวัน</option>
                <option value="month">รายเดือน</option>
                <option value="year">รายปี</option>
              </select>
            </Label>
            {period === "day" ? (
              <Label title="วันที่เดินทาง">
                <input
                  type="date"
                  className={field}
                  value={day}
                  min="2000-01-01"
                  max="2200-12-31"
                  onChange={(e) => setDay(e.target.value)}
                />
              </Label>
            ) : (
              <>
                {period === "month" && (
                  <Label title="เดือน">
                    <select
                      className={field}
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                    >
                      {months.map((name, i) => (
                        <option key={name} value={i + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </Label>
                )}
                <Label title="ปี พ.ศ.">
                  <select
                    className={field}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  >
                    {Array.from(
                      { length: 8 },
                      (_, i) => Number(today().slice(0, 4)) - 5 + i,
                    ).map((y) => (
                      <option key={y} value={y}>
                        {y + 543}
                      </option>
                    ))}
                  </select>
                </Label>
              </>
            )}
          </div>
        }
      >
        รายงาน
      </Title>
      <Notice error={error} />
      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            className={`${outline} ${
              tab === value ? "text-[#f5a623] border-[#f5a623]" : ""
            }`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-[#888]">กำลังโหลดรายงาน…</p>
      ) : (
        report && (
          <>
            <p className="text-sm text-[#aaa] mb-4" aria-live="polite">
              {periodTitle} · ใช้ช่วงเวลาเดียวกันกับยอดสรุป กราฟ และตารางของทุกรายงาน
            </p>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {[
                ["จำนวนการจอง", report.summary.bookings],
                ["จำนวนตั๋ว", report.summary.seats],
                ["เช็กอินแล้ว", report.summary.checkin],
                ["ไม่มาขึ้นรถ", report.summary.noshow],
              ].map(([label, value]) => (
                <Panel key={label}>
                  <p className="text-xs text-[#888]">{label}</p>
                  <p className="text-3xl font-black mono text-[#f5a623] mt-2">
                    {value}
                  </p>
                </Panel>
              ))}
            </div>
            <Panel className="mb-6">
              <h2 className="font-bold mb-5 text-center">
                {tabs.find(([value]) => value === tab)?.[1]} · {periodTitle}
              </h2>
              {report.summary.seats === 0 && (
                <p className="text-center text-sm text-[#aaa] mb-3">
                  ไม่มีการจองในช่วงเวลานี้
                </p>
              )}
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rows}
                    margin={{ bottom: 35, left: 0, right: 15 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#999", fontSize: 10 }}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#999", fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#202222",
                        border: "1px solid #555",
                        color: "#eee",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="seats" name="ตั๋วทั้งหมด" fill="#f5a623" />
                    <Bar dataKey="checkin" name="เช็กอินแล้ว" fill="#2ecc71" />
                    <Bar dataKey="cancelled" name="ยกเลิก" fill="#e74c3c" />
                    <Bar dataKey="noshow" name="No Show" fill="#888" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            {tab === "routes" ? (
              <Table
                headers={[
                  "เส้นทาง",
                  "รอบทั้งหมด",
                  "เสร็จสิ้น",
                  "ที่นั่งเปิดให้บริการ",
                  "ตั๋วทั้งหมด",
                  "อัตราจองที่นั่ง",
                ]}
                rows={rows.map((r) => [
                  r.name,
                  r.trips,
                  r.completed,
                  r.capacity,
                  r.seats,
                  `${r.utilization}%`,
                ])}
              />
            ) : tab === "drivers" ? (
              <Table
                headers={[
                  "คนขับ",
                  "งานทั้งหมด",
                  "เสร็จสิ้น",
                  "เริ่มตรงเวลา",
                  "เริ่มสาย",
                  "ผู้โดยสารเช็กอิน",
                ]}
                rows={rows.map((r) => [
                  r.name,
                  r.trips,
                  r.completed,
                  r.ontime,
                  r.late,
                  r.checkin,
                ])}
              />
            ) : (
              <Table
                headers={[
                  tab === "stations" ? "จุดจอด" : timeColumn,
                  "การจอง",
                  "ตั๋วทั้งหมด",
                  "ยกเลิก",
                  "เช็กอินแล้ว",
                  "No Show",
                ]}
                rows={rows.map((r) => [
                  r.name,
                  r.bookings,
                  r.seats,
                  r.cancelled,
                  r.checkin,
                  r.noshow,
                ])}
              />
            )}
            <p className="text-xs text-[#888] mt-4">
              ข้อมูลตามวันเดินทางในช่วงที่เลือก (เวลาไทย) ·
              จำนวนการจองนับใบจองไม่ซ้ำในแต่ละกลุ่ม · ตั๋วหนึ่งใบเท่ากับหนึ่งที่นั่ง · No Show
              จะสรุปเมื่อคนขับจบงาน
            </p>
          </>
        )
      )}
    </div>
  )
}
