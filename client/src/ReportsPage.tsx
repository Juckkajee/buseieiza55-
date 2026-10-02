import { useState, useEffect, type ReactNode } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { api, today } from "./api"
import { Title, Panel, Label, Notice, Table, field, outline, gold } from "./ui"

type Period = "year" | "month" | "day" | "months" | "range"
type Filter = {
  period: Period
  year: string
  month: string
  date: string
  fromDate: string
  endDate: string
  fromMonth: string
  toMonth: string
}
type Counts = {
  bookings: number
  seats: number
  cancelled: number
  checkin: number
  noshow: number
}
type Series = {
  id: string
  name: string
  key: string
}
type ChartRow = {
  name: string
  [key: string]: string | number
}
type Report = {
  period: Period
  year: number
  fromDate: string
  toDate: string
  timeline: Array<Counts & { name: string; key: string }>
  summary: Counts
  stationSeries: Series[]
  movements: ChartRow[]
  behavior: Array<Counts & { userId: string; name: string; pending: number }>
  routeSeries: Series[]
  routeWeekdays: ChartRow[]
  stopTimes: {
    stopId: string
    name: string
    time: string
    up: number
    down: number
  }[]
  movementSummary: { up: number; down: number }
  driverAssignments: Array<{id:string; name:string; total:number; before17:number; after17:number}>
  vehicleAssignments: Array<{id:string; name:string; type:string; seats:number; total:number}>
  vehicleTypes: Array<{name:string; total:number}>
}
const months = Array.from({ length: 12 }, (_, i) =>
  new Date(2026, i, 1).toLocaleString("th-TH", { month: "long" }),
)
const colors = [
  "#f5a623",
  "#38bdf8",
  "#4ade80",
  "#c084fc",
  "#fb7185",
  "#2dd4bf",
  "#facc15",
  "#a3a3ff",
  "#fdba74",
  "#94a3b8",
]
const thaiDate = (value: string) =>
  new Date(value + "T00:00:00+07:00").toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  })
const lastDay = (exclusive: string) =>
  new Date(Date.parse(exclusive + "T00:00:00Z") - 86400000)
    .toISOString()
    .slice(0, 10)
const tabs = [
  "1. คนขึ้น–ลงแต่ละจุดจอด",
  "2. สถิติการจอง",
  "3. พฤติกรรมผู้ใช้",
  "4. ผู้โดยสารตามวันและเส้นทาง",
  "5. จุดจอดตามรอบเวลา",
  "6. การมอบหมายงานคนขับ",
  "7. การมอบหมายงานรถ",
]
const countKeys: Array<keyof Counts> = [
  "bookings",
  "seats",
  "cancelled",
  "checkin",
  "noshow",
]
const countHeaders = [
  "การจอง (ใบจอง)",
  "ที่นั่งที่จอง",
  "ยกเลิก (ที่นั่ง)",
  "ขึ้นรถจริง (คน)",
  "No Show (ที่นั่ง)",
]
const countSeries = [
  { key: "seats", name: "ที่นั่งที่จอง", color: "#f5a623" },
  { key: "checkin", name: "ขึ้นรถจริง", color: "#4ade80" },
  { key: "cancelled", name: "ยกเลิก", color: "#fb7185" },
  { key: "noshow", name: "No Show", color: "#94a3b8" },
]
function Bars({
  title,
  rows,
  series,
}: {
  title: string
  rows: ChartRow[]
  series: Array<{ key: string; name: string; color: string }>
}) {
  return (
    <Panel className="mb-5 min-w-0">
      <h3 className="font-bold mb-4">{title}</h3>
      <div
        className="overflow-x-auto"
        role="region"
        aria-label={title}
        tabIndex={0}
      >
        <div
          style={{
            minWidth: Math.max(
              600,
              rows.length * Math.max(44, Math.min(series.length, 8) * 13),
            ),
            height: 340,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#3c3c3c" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#aaa", fontSize: 11 }}
                angle={-20}
                textAnchor="end"
                height={65}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#aaa", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#202222",
                  border: "1px solid #666",
                  color: "#eee",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  fill={s.color}
                  maxBarSize={30}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  )
}
function MonthChoice({ title, value, onChange }: { title: string; value: string; onChange: (value: string) => void }) {
  return <fieldset className="flex flex-wrap gap-2 border border-[#454545] p-3">
    <legend className="text-xs text-[#aaa] px-1">{title}</legend>
    <Label title={`${title}: เดือน`}><select className={field} value={value.slice(5, 7)} onChange={e => onChange(value.slice(0, 4) + "-" + e.target.value)}>{months.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>)}</select></Label>
    <Label title={`${title}: ปี พ.ศ.`}><select className={field} value={value.slice(0, 4)} onChange={e => onChange(e.target.value + value.slice(4))}>{Array.from({length:201}, (_, i) => 2000 + i).map(y => <option key={y} value={y}>{y + 543}</option>)}</select></Label>
  </fieldset>
}
function validation(f: Filter) {
  const validDate = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v + "T00:00:00Z")) &&
    new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v &&
    v >= "2000-01-01" &&
    v <= "2200-12-31"
  if (
    ["year", "month"].includes(f.period) &&
    (!/^\d{4}$/.test(f.year) || +f.year < 2000 || +f.year > 2200)
  )
    return "กรุณาระบุปี พ.ศ. ระหว่าง 2543–2743"
  if (f.period === "day" && !validDate(f.date)) return "กรุณาเลือกวันที่ให้ถูกต้อง"
  if (f.period === "range") {
    if (!validDate(f.fromDate) || !validDate(f.endDate))
      return "กรุณาเลือกวันที่เริ่มต้นและสิ้นสุดให้ครบ"
    if (f.fromDate > f.endDate) return "วันเริ่มต้นต้องไม่อยู่หลังวันสิ้นสุด"
    if (Date.parse(f.endDate) - Date.parse(f.fromDate) >= 366 * 5 * 86400000)
      return "กรุณาเลือกช่วงเวลาไม่เกิน 5 ปีต่อครั้ง"
  }
  if (f.period === "months") {
    if (!validDate(f.fromMonth + "-01") || !validDate(f.toMonth + "-01"))
      return "กรุณาเลือกเดือนเริ่มต้นและสิ้นสุดให้ครบ"
    if (f.fromMonth > f.toMonth) return "เดือนเริ่มต้นต้องไม่อยู่หลังเดือนสิ้นสุด"
    const span =
      (+f.toMonth.slice(0, 4) - +f.fromMonth.slice(0, 4)) * 12 +
      +f.toMonth.slice(5) -
      +f.fromMonth.slice(5)
    if (span >= 60) return "กรุณาเลือกช่วงเวลาไม่เกิน 5 ปีต่อครั้ง"
  }
  return ""
}
export default function ReportsPage() {
  const now = today()
  const initial: Filter = {
    period: "year",
    year: now.slice(0, 4),
    month: String(Number(now.slice(5, 7))),
    date: now,
    fromDate: now.slice(0, 7) + "-01",
    endDate: now,
    fromMonth: now.slice(0, 4) + "-01",
    toMonth: now.slice(0, 7),
  }
  const [draft, setDraft] = useState<Filter>(initial),
    [applied, setApplied] = useState<Filter>(initial)
  const [tab, setTab] = useState(0),
    [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0)
  const [userLimit, setUserLimit] = useState("20")
  const set = (key: keyof Filter, value: string) =>
    setDraft((f) => ({ ...f, [key]: value }))
  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    setReport(null)
    void api<Report>("/reports?" + new URLSearchParams(applied))
      .then((r) => {
        if (active) setReport(r)
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
  }, [applied, revision])
  function apply(f = draft) {
    const problem = validation(f)
    if (problem) {
      setError(problem)
      return
    }
    setError("")
    setDraft(f)
    setApplied({ ...f })
    setRevision((n) => n + 1)
  }
  function quick(period: Period) {
    apply({ ...initial, period })
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied)
  const periodTitle = !report
    ? ""
    : report.period === "year"
      ? `ปี ${report.year + 543}`
      : report.period === "month"
        ? `เดือน${months[Number(report.fromDate.slice(5, 7)) - 1]} ปี ${report.year + 543}`
        : report.period === "day"
          ? `วันที่ ${thaiDate(report.fromDate)}`
          : `${thaiDate(report.fromDate)} – ${thaiDate(lastDay(report.toDate))}`
  let headers: string[] = [],
    rows: (string | number)[][] = [],
    total: (string | number)[] = [],
    charts: ReactNode = null
  const sum = (items: ChartRow[], key: string) =>
    items.reduce((n, r) => n + Number(r[key] || 0), 0)
  if (report) {
    if (tab === 0) {
      headers = [
        "จุดจอด",
        ...report.movements.flatMap((b) => [`${b.name} ขึ้น`, `${b.name} ลง`]),
        "รวมขึ้น",
        "รวมลง",
      ]
      rows = report.stationSeries.map((s) => [
        s.name,
        ...report.movements.flatMap((b) => [
          Number(b[s.key + "Up"]),
          Number(b[s.key + "Down"]),
        ]),
        sum(report.movements, s.key + "Up"),
        sum(report.movements, s.key + "Down"),
      ])
      total = [
        "รวมทั้งหมด",
        ...report.movements.flatMap((b) => [
          report.stationSeries.reduce((n, s) => n + Number(b[s.key + "Up"]), 0),
          report.stationSeries.reduce(
            (n, s) => n + Number(b[s.key + "Down"]),
            0,
          ),
        ]),
        report.movementSummary.up,
        report.movementSummary.down,
      ]
      charts = (
        <>
          {["Up", "Down"].map((direction, i) => (
            <Bars
              key={direction}
              title={`${
                i ? "จำนวนลงรถตามจุดลงที่จอง (รอบจบแล้ว)" : "จำนวนขึ้นรถจริง"
              } · ${periodTitle}`}
              rows={report.movements}
              series={report.stationSeries.map((s, j) => ({
                key: s.key + direction,
                name: s.name,
                color: colors[j % colors.length],
              }))}
            />
          ))}
        </>
      )
    } else if (tab === 1) {
      headers = ["ช่วงเวลาเดินทาง", ...countHeaders]
      rows = report.timeline.map((r) => [r.name, ...countKeys.map((k) => r[k])])
      total = ["รวมทั้งหมด", ...countKeys.map((k) => report.summary[k])]
      charts = (
        <Bars
          title={`สถิติการจอง · ${periodTitle}`}
          rows={report.timeline}
          series={[
            { key: "bookings", name: "จำนวนใบจอง", color: "#38bdf8" },
            ...countSeries,
          ]}
        />
      )
    } else if (tab === 2) {
      headers = ["รหัสผู้ใช้", "ผู้ใช้", ...countHeaders, "รอเดินทาง (ที่นั่ง)"]
      rows = report.behavior.map((r) => [
        r.userId,
        r.name,
        ...countKeys.map((k) => r[k]),
        r.pending,
      ])
      total = [
        "รวมทั้งหมด",
        `${report.behavior.length} ผู้ใช้`,
        ...countKeys.map((k) => report.summary[k]),
        report.behavior.reduce((n, r) => n + r.pending, 0),
      ]
      const visible =
        userLimit === "all"
          ? report.behavior
          : report.behavior.slice(0, Number(userLimit))
      const pie = [
        { name: "ขึ้นรถจริง", value: report.summary.checkin, color: "#4ade80" },
        { name: "ยกเลิก", value: report.summary.cancelled, color: "#fb7185" },
        { name: "No Show", value: report.summary.noshow, color: "#94a3b8" },
        {
          name: "รอเดินทาง",
          value: report.behavior.reduce((n, r) => n + r.pending, 0),
          color: "#f5a623",
        },
      ].filter((r) => r.value > 0)
      charts = (
        <>
          <div className="flex items-end gap-4 mb-4 flex-wrap">
            <Label title="จำนวนผู้ใช้ในกราฟ">
              <select
                className={field}
                value={userLimit}
                onChange={(e) => setUserLimit(e.target.value)}
              >
                <option value="20">20 อันดับแรกตามที่นั่งที่จอง</option>
                <option value="all">ผู้ใช้ทั้งหมด</option>
              </select>
            </Label>
            <p className="text-xs text-[#aaa]">
              กราฟแสดง {visible.length} จาก {report.behavior.length} ผู้ใช้ ·
              ตารางและ CSV แสดงครบทุกคน
            </p>
          </div>
          <Bars
            title={`พฤติกรรมผู้ใช้ · ${periodTitle}`}
            rows={visible.map((r) => ({
              ...r,
              name: `${r.name} (${r.userId})`,
            }))}
            series={[
              { key: "bookings", name: "จำนวนใบจอง", color: "#38bdf8" },
              ...countSeries,
              { key: "pending", name: "รอเดินทาง", color: "#c084fc" },
            ]}
          />
          <Panel className="mb-5">
            <h3 className="font-bold">
              สัดส่วนสถานะที่นั่งของผู้ใช้ทั้งหมด · {periodTitle}
            </h3>
            {pie.length ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={95}
                      label={({ percent }) =>
                        `${((percent || 0) * 100).toFixed(1)}%`
                      }
                    >
                      {pie.map((p) => (
                        <Cell key={p.name} fill={p.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#202222",
                        border: "1px solid #666",
                        color: "#eee",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-[#aaa] py-8">ไม่มีข้อมูลสำหรับกราฟสัดส่วน</p>
            )}
          </Panel>
        </>
      )
    } else if (tab === 3) {
      headers = [
        "วันในสัปดาห์",
        ...report.routeSeries.map((r) => r.name),
        "รวมทุกเส้นทาง",
      ]
      rows = report.routeWeekdays.map((r) => [
        r.name,
        ...report.routeSeries.map((s) => Number(r[s.key])),
        Number(r.total),
      ])
      total = [
        "รวมช่วงที่เลือก",
        ...report.routeSeries.map((s) => sum(report.routeWeekdays, s.key)),
        sum(report.routeWeekdays, "total"),
      ]
      charts = (
        <Bars
          title={`ผู้ขึ้นรถจริงแยกตามวันและเส้นทาง · ${periodTitle}`}
          rows={report.routeWeekdays}
          series={report.routeSeries.map((s, i) => ({
            ...s,
            color: colors[i % colors.length],
          }))}
        />
      )
    } else if (tab === 4) {
      headers = ["จุดจอด", "เวลาตามตารางที่จุดจอด", "จำนวนขึ้น (คน)", "จำนวนลง (คน)"]
      rows = report.stopTimes.map((r) => [r.name, r.time, r.up, r.down])
      total = [
        "รวมทั้งหมด",
        "",
        report.movementSummary.up,
        report.movementSummary.down,
      ]
    } else if (tab === 5) {
      headers = ["รหัสคนขับ", "คนขับ", "รวมรอบทั้งหมด", "ก่อน 17:00", "ตั้งแต่ 17:00"]
      rows = report.driverAssignments.map(r => [r.id, r.name, r.total, r.before17, r.after17])
      total = ["รวมทั้งหมด", "", ...["total", "before17", "after17"].map(k => sum(report.driverAssignments,k))]
      charts = <Bars title={`การมอบหมายงานคนขับ · ${periodTitle}`} rows={report.driverAssignments.map(r => ({...r,name:`${r.name} (${r.id})`}))} series={[{key:"before17",name:"ก่อน 17:00",color:colors[0]},{key:"after17",name:"ตั้งแต่ 17:00",color:colors[1]}]} />
    } else {
      headers = ["ประเภท / จำนวนที่นั่ง", "รถ (ทะเบียน)", "จำนวนรอบ"]
      rows = report.vehicleAssignments.map(r => [`${r.type} ${r.seats} ที่นั่ง`, r.name, r.total])
      rows.push(...report.vehicleTypes.map(r => [r.name, "รวมประเภท", r.total]))
      total = ["รวมทั้งหมด", "", sum(report.vehicleTypes,"total")]
      charts = <Bars title={`การมอบหมายงานตามประเภทรถ · ${periodTitle}`} rows={report.vehicleTypes} series={[{key:"total",name:"จำนวนรอบ",color:colors[0]}]} />
    }
  }
  const csvUrl = "/api/reports/export?" + new URLSearchParams({...applied, report:String(tab+1)})
  return (
    <div className="p-5 xl:p-8 min-w-0">
      <Title>รายงานการให้บริการ</Title>
      <p className="text-sm text-[#aaa] mb-5">
        รายงานข้อ 1–7 · เลือกช่วงเวลาเดียวกันแล้วสลับดูรายงานได้ทันที
      </p>
      <Panel className="mb-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            apply()
          }}
        >
          <div className="flex items-end flex-wrap gap-3">
            <Label title="ช่วงเวลารายงาน">
              <select
                className={field}
                value={draft.period}
                onChange={(e) => set("period", e.target.value)}
              >
                <option value="year">รายปี</option>
                <option value="month">รายเดือน</option>
                <option value="day">รายวัน</option>
                <option value="months">ระหว่างเดือน</option>
                <option value="range">ช่วงวันที่</option>
              </select>
            </Label>
            {["year", "month"].includes(draft.period) && (
              <Label title="ปี พ.ศ.">
                <input
                  className={`${field} max-w-36`}
                  type="number"
                  min={2543}
                  max={2743}
                  value={draft.year === "" ? "" : Number(draft.year) + 543}
                  onChange={(e) =>
                    set(
                      "year",
                      e.target.value === ""
                        ? ""
                        : String(Number(e.target.value) - 543),
                    )
                  }
                  required
                />
              </Label>
            )}
            {draft.period === "month" && (
              <Label title="เดือน">
                <select
                  className={field}
                  value={draft.month}
                  onChange={(e) => set("month", e.target.value)}
                >
                  {months.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </Label>
            )}
            {draft.period === "day" && (
              <Label title="วันที่เดินทาง">
                <input
                  className={field}
                  type="date"
                  min="2000-01-01"
                  max="2200-12-31"
                  value={draft.date}
                  onInput={(e) => set("date", e.currentTarget.value)}
                    onChange={(e) => set("date", e.target.value)}
                  required
                />
              </Label>
            )}
            {draft.period === "range" && (
              <>
                <Label title="วันที่เริ่มต้น">
                  <input
                    className={field}
                    type="date"
                    min="2000-01-01"
                    max="2200-12-31"
                    value={draft.fromDate}
                    onInput={(e) => set("fromDate", e.currentTarget.value)}
                    onChange={(e) => set("fromDate", e.target.value)}
                    required
                  />
                </Label>
                <Label title="วันที่สิ้นสุด (รวมวันนี้)">
                  <input
                    className={field}
                    type="date"
                    min="2000-01-01"
                    max="2200-12-31"
                    value={draft.endDate}
                    onInput={(e) => set("endDate", e.currentTarget.value)}
                    onChange={(e) => set("endDate", e.target.value)}
                    required
                  />
                </Label>
              </>
            )}
            {draft.period === "months" && (
              <>
                <MonthChoice title="เดือนเริ่มต้น" value={draft.fromMonth} onChange={value => set("fromMonth", value)} />
                <MonthChoice title="เดือนสิ้นสุด (รวมทั้งเดือน)" value={draft.toMonth} onChange={value => set("toMonth", value)} />
              </>
            )}
            <button className={gold} type="submit" disabled={loading}>
              {loading ? "กำลังโหลด…" : "แสดงรายงาน"}
            </button>
          </div>
        </form>
        <div className="flex flex-wrap gap-2 mt-4">
          {([
            ["day", "วันนี้"],
            ["month", "เดือนนี้"],
            ["year", "ปีนี้"],
          ] as const).map(([p, label]) => (
            <button
              key={p}
              className={outline}
              onClick={() => quick(p)}
              disabled={loading}
            >
              {label}
            </button>
          ))}
          <button
            className={outline}
            disabled={loading}
            onClick={() => {
              const d = new Date(now.slice(0, 7) + "-01T00:00:00Z")
              d.setUTCMonth(d.getUTCMonth() - 1)
              const s = d.toISOString()
              apply({
                ...initial,
                period: "month",
                year: s.slice(0, 4),
                month: String(Number(s.slice(5, 7))),
              })
            }}
          >
            เดือนก่อน
          </button>
        </div>
        <p className="text-xs text-[#aaa] mt-3">
          ปฏิทินแสดงปีตามภาษาของเบราว์เซอร์ · หัวรายงานใช้ พ.ศ. · ช่วงเดือนเลือกข้ามปีได้ ·
          เลือกช่วงเวลาได้ไม่เกิน 5 ปีต่อครั้ง
        </p>
        {dirty && (
          <p className="text-sm text-amber-300 mt-3" role="status">
            เปลี่ยนตัวกรองแล้ว กด “แสดงรายงาน” เพื่ออัปเดตผลลัพธ์
          </p>
        )}
      </Panel>
      <Notice error={error} />
      <div
        className="flex gap-2 flex-wrap mb-5"
        role="tablist"
        aria-label="รายงานตามโจทย์"
      >
        {tabs.map((label, i) => (
          <button
            key={label}
            role="tab"
            aria-selected={tab === i}
            className={`${outline} ${
              tab === i ? "text-[#f5a623] border-[#f5a623] bg-[#f5a623]/10" : ""
            }`}
            onClick={() => setTab(i)}
          >
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <p role="status" className="text-[#aaa]">
          กำลังโหลดรายงาน…
        </p>
      ) : (
        report && (
          <div role="tabpanel" aria-label={tabs[tab]}>
            <div className="flex justify-between gap-3 flex-wrap items-center mb-4">
              <h2 className="font-bold">
                {tabs[tab]} · {periodTitle}
              </h2>
              {dirty || !!error || !csvUrl ? <button className={outline} disabled>ดาวน์โหลดตาราง CSV</button> :
                <a className={outline} href={csvUrl} download={`report-${tab + 1}_${report.fromDate}_${lastDay(report.toDate)}.csv`}>ดาวน์โหลดตาราง CSV</a>}
            </div>
            <p className="text-xs text-[#aaa] mb-4" aria-live="polite">
              ข้อมูลวันที่ {thaiDate(report.fromDate)} ถึง{" "}
              {thaiDate(lastDay(report.toDate))} (รวมวันสิ้นสุด) ·
              อ้างอิงวันที่รอบรถออกต้นทาง เวลาไทย
            </p>
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
              {[
                ["ใบจองทั้งหมด", report.summary.bookings],
                ["ที่นั่งที่จอง", report.summary.seats],
                ["ขึ้นรถจริง", report.summary.checkin],
                ["ยกเลิก (ที่นั่ง)", report.summary.cancelled],
                ["No Show (ที่นั่ง)", report.summary.noshow],
              ].map(([label, value]) => (
                <Panel key={label}>
                  <p className="text-xs text-[#aaa]">{label}</p>
                  <p className="text-2xl font-bold text-[#f5a623] mt-2">
                    {Number(value).toLocaleString("th-TH")}
                  </p>
                </Panel>
              ))}
            </div>
            {tab < 5 && report.summary.seats === 0 && (
              <p
                role="status"
                className="border border-dashed border-[#555] p-5 mb-5 text-[#aaa]"
              >
                ไม่มีการจองในช่วงเวลาที่เลือก ลองเลือกปีหรือช่วงวันที่อื่น
              </p>
            )}
            {tab === 3 && (
              <p className="text-sm text-[#aaa] mb-4">
                รวมผู้ขึ้นรถจริงตามวันจันทร์–อาทิตย์ หากช่วงที่เลือกมีวันชื่อเดียวกันหลายครั้ง
                ระบบรวมยอดของวันนั้นทุกครั้ง
              </p>
            )}
            {tab === 4 && (
              <p className="text-sm text-[#aaa] mb-4">
                เรียงตามจุดจอดและเวลาตามตาราง ณ จุดจอด (เวลาออกต้นทาง +
                เวลาเดินทางสะสม) · รวมรอบที่ผ่านจุดจอดเดียวกันในเวลาเดียวกันตลอดช่วงที่เลือก
                รวมแถวที่ไม่มีผู้โดยสารด้วย
              </p>
            )}
            {charts}
            {tab >= 5 && <p className="text-sm text-[#aaa] mb-4">นับรอบที่ได้รับมอบหมายตามเวลาออกต้นทาง ไม่รวมรอบยกเลิก รวมรอบที่ยังไม่มีการจอง · เวลา 17:00 น. นับในกลุ่มตั้งแต่ 17:00</p>}
            <h3 className="font-bold mb-3">ตารางรายละเอียด · {periodTitle}</h3>
            <Table
              headers={headers}
              rows={[
                ...rows,
                total.map((v, i) => <strong key={i}>{v}</strong>),
              ]}
            />
            <div className="text-xs text-[#aaa] mt-4 space-y-2">
              <p>
                หนึ่งใบจองมีได้หลายที่นั่ง · จำนวนการจองนับใบจองไม่ซ้ำ ส่วนขึ้นรถ ยกเลิก และ No
                Show นับรายที่นั่ง · No Show สรุปเมื่อคนขับจบงาน
              </p>
              {(tab === 0 || tab === 4) && (
                <p>
                  จำนวนขึ้นนับผู้เช็กอินจริง ไม่รวมยกเลิกหรือ No Show ·
                  จำนวนลงอ้างอิงจุดลงที่จองของผู้เช็กอินในรอบที่จบแล้ว ระบบยังไม่มีการสแกนลงรถ
                  จึงไม่ใช่ยอดสแกนลงจริง
                </p>
              )}
              {(tab === 0 || tab === 1) && (
                <p>
                  รายปีและช่วงเดือนแสดงแยกเดือน · รายเดือนและช่วงวันที่ไม่เกิน 62
                  วันแสดงแยกวัน · รายวันแสดงแยกชั่วโมง · ช่วงวันที่ยาวกว่า 62
                  วันรวมเป็นรายเดือน โดยนับเฉพาะวันที่เลือก
                </p>
              )}
              {tab === 2 && (
                <p>
                  จัดอันดับตามที่นั่งที่จอง แยกผู้ใช้ด้วยรหัสแม้ชื่อซ้ำ · สัดส่วนแสดงสถานะรายที่นั่ง
                  รวมที่นั่งรอเดินทางเพื่อให้ยอดครบ
                </p>
              )}
              <p>
                ข้อมูลในตาราง กราฟ และ CSV ใช้ช่วงเวลาเดียวกัน ·
                ตารางกว้างสามารถเลื่อนซ้าย–ขวาได้
              </p>
            </div>
          </div>
        )
      )}
    </div>
  )
}
