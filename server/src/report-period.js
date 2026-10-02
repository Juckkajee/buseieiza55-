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
  requireThat(
    ["day", "month", "year", "range", "months"].includes(period),
    "ช่วงเวลารายงานไม่ถูกต้อง",
  )
  if (period === "range" || period === "months") {
    let fromDate, endDate
    if (period === "months") {
      requireThat(
        typeof params.fromMonth === "string" &&
          /^\d{4}-\d{2}$/.test(params.fromMonth) &&
          typeof params.toMonth === "string" &&
          /^\d{4}-\d{2}$/.test(params.toMonth),
        "กรุณาเลือกเดือนเริ่มต้นและเดือนสิ้นสุด",
      )
      fromDate = date(params.fromMonth + "-01")
      const lastMonth = date(params.toMonth + "-01")
      endDate = isoDay(
        new Date(
          Date.UTC(
            Number(lastMonth.slice(0, 4)),
            Number(lastMonth.slice(5, 7)),
            0,
          ),
        ),
      )
    } else {
      fromDate = date(params.fromDate)
      endDate = date(params.endDate)
    }
    const year = integer(fromDate.slice(0, 4), "ปี ค.ศ.", 2000, 2200)
    integer(endDate.slice(0, 4), "ปี ค.ศ.", 2000, 2200)
    requireThat(fromDate <= endDate, "วันเริ่มต้นต้องไม่อยู่หลังวันสิ้นสุด")
    requireThat(
      Date.parse(endDate) - Date.parse(fromDate) < 366 * 5 * 86400000,
      "กรุณาเลือกช่วงเวลาไม่เกิน 5 ปีต่อครั้ง",
    )
    return { period, year, fromDate, toDate: nextDay(endDate) }
  }
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
  checkin: rows.filter(
    (d) => d.checkedInAt && !["CANCELLED", "NO_SHOW"].includes(d.status),
  ).length,
  noshow: rows.filter((d) => d.status === "NO_SHOW").length,
})

export function reportTimeline(tickets, range) {
  const { period, year, fromDate, toDate } = range
  let buckets
  const granularity =
    period === "year" ||
    period === "months" ||
    (period === "range" &&
      Date.parse(toDate) - Date.parse(fromDate) > 62 * 86400000)
      ? "month"
      : period === "day"
        ? "hour"
        : "day"
  if (period === "year") {
    buckets = Array.from({ length: 12 }, (_, i) => ({
      key: `${year}-${String(i + 1).padStart(2, "0")}`,
      name: monthName(year, i + 1),
    }))
  } else if (granularity === "month") {
    buckets = []
    for (
      let cursor = fromDate.slice(0, 7) + "-01";
      cursor < toDate;
      cursor = isoDay(
        new Date(
          Date.UTC(Number(cursor.slice(0, 4)), Number(cursor.slice(5, 7)), 1),
        ),
      )
    ) {
      const y = Number(cursor.slice(0, 4)),
        m = Number(cursor.slice(5, 7))
      buckets.push({
        key: cursor.slice(0, 7),
        name: `${monthName(y, m)} ${y + 543}`,
      })
    }
  } else if (granularity === "day") {
    buckets = []
    for (let day = fromDate; day < toDate; day = nextDay(day)) {
      buckets.push({
        key: day,
        name: `${Number(day.slice(8))} ${monthName(Number(day.slice(0, 4)), Number(day.slice(5, 7)))}${
          period === "range" ? ` ${Number(day.slice(0, 4)) + 543}` : ""
        }`,
      })
    }
  } else {
    buckets = Array.from({ length: 24 }, (_, i) => ({
      key: `${fromDate}T${String(i).padStart(2, "0")}`,
      name: `${String(i).padStart(2, "0")}:00`,
    }))
  }
  const grouped = new Map(buckets.map((bucket) => [bucket.key, []]))
  const keyLength =
    granularity === "month" ? 7 : granularity === "day" ? 10 : 13
  for (const ticket of tickets) {
    if (
      ticket.departureAt.slice(0, 10) < fromDate ||
      ticket.departureAt.slice(0, 10) >= toDate
    )
      continue
    grouped.get(ticket.departureAt.slice(0, keyLength))?.push(ticket)
  }
  return buckets.map(({ key, name }) => ({
    key,
    name,
    ...summarizeTickets(grouped.get(key)),
  }))
}
