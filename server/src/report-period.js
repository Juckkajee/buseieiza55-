import { date, integer, requireThat } from "./domain.js"

const isoDay = (value) => value.toISOString().slice(0, 10)
const nextDay = (value) =>
  isoDay(new Date(Date.parse(value + "T00:00:00Z") + 86400000))
const monthName = (year, month) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleString("th-TH", {
    month: "short",
    timeZone: "UTC",
  })

// Oracle departure_at is a local Bangkok timestamp. Bind calendar dates as a
// half-open range so midnight belongs to exactly one reporting period.
export function reportPeriod(params) {
  const period = params.period ?? "year"
  requireThat(["day", "month", "year"].includes(period), "ช่วงเวลารายงานไม่ถูกต้อง")
  if (period === "day") {
    const fromDate = date(params.date)
    const year = integer(fromDate.slice(0, 4), "ปี ค.ศ.", 2000, 2200)
    return { period, year, fromDate, toDate: nextDay(fromDate) }
  }
  const year = integer(params.year, "ปี ค.ศ.", 2000, 2200)
  if (period === "month") {
    const month = integer(params.month, "เดือน", 1, 12)
    return {
      period,
      year,
      fromDate: `${year}-${String(month).padStart(2, "0")}-01`,
      toDate: isoDay(new Date(Date.UTC(year, month, 1))),
    }
  }
  return {
    period,
    year,
    fromDate: `${year}-01-01`,
    toDate: `${year + 1}-01-01`,
  }
}

export const summarizeTickets = (rows) => ({
  bookings: new Set(rows.map((d) => d.bookingId)).size,
  seats: rows.length,
  cancelled: rows.filter((d) => d.status === "CANCELLED").length,
  checkin: rows.filter((d) => d.checkedInAt).length,
  noshow: rows.filter((d) => d.status === "NO_SHOW").length,
})

export function reportTimeline(tickets, range) {
  const { period, year, fromDate, toDate } = range
  let buckets
  if (period === "year") {
    buckets = Array.from({ length: 12 }, (_, i) => ({
      key: `${year}-${String(i + 1).padStart(2, "0")}`,
      name: monthName(year, i + 1),
    }))
  } else if (period === "month") {
    buckets = []
    for (let day = fromDate; day < toDate; day = nextDay(day)) {
      buckets.push({
        key: day,
        name: `${Number(day.slice(8))} ${monthName(year, Number(day.slice(5, 7)))}`,
      })
    }
  } else {
    buckets = Array.from({ length: 24 }, (_, i) => ({
      key: `${fromDate}T${String(i).padStart(2, "0")}`,
      name: `${String(i).padStart(2, "0")}:00`,
    }))
  }
  const grouped = new Map(buckets.map((bucket) => [bucket.key, []]))
  const keyLength = period === "year" ? 7 : period === "month" ? 10 : 13
  for (const ticket of tickets) {
    grouped.get(ticket.departureAt.slice(0, keyLength))?.push(ticket)
  }
  return buckets.map(({ key, name }) => ({
    name,
    ...summarizeTickets(grouped.get(key)),
  }))
}
