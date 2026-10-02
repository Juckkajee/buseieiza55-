export function reportCsv(r, number) {
  const countKeys = ["bookings", "seats", "cancelled", "checkin", "noshow"]
  const countHeaders = ["การจอง (ใบจอง)", "ที่นั่งที่จอง", "ยกเลิก (ที่นั่ง)", "ขึ้นรถจริง (คน)", "No Show (ที่นั่ง)"]
  const sum = (rows, key) => rows.reduce((n,x) => n + Number(x[key] || 0),0)
  let headers, rows, total
  switch (number) {
    case 1:
      headers = ["จุดจอด", ...r.movements.flatMap(b => [`${b.name} ขึ้น`, `${b.name} ลง`]), "รวมขึ้น", "รวมลง"]
      rows = r.stationSeries.map(s => [s.name, ...r.movements.flatMap(b => [b[s.key+"Up"],b[s.key+"Down"]]),sum(r.movements,s.key+"Up"),sum(r.movements,s.key+"Down")])
      total = ["รวมทั้งหมด", ...r.movements.flatMap(b => ["Up","Down"].map(k => r.stationSeries.reduce((n,s) => n+Number(b[s.key+k]),0))),r.movementSummary.up,r.movementSummary.down]
      break
    case 2:
      headers = ["ช่วงเวลาเดินทาง", ...countHeaders]
      rows = r.timeline.map(x => [x.name,...countKeys.map(k => x[k])])
      total = ["รวมทั้งหมด", ...countKeys.map(k => r.summary[k])]
      break
    case 3:
      headers = ["รหัสผู้ใช้","ผู้ใช้",...countHeaders,"รอเดินทาง (ที่นั่ง)"]
      rows = r.behavior.map(x => [x.userId,x.name,...countKeys.map(k => x[k]),x.pending])
      total = ["รวมทั้งหมด", `${r.behavior.length} ผู้ใช้`,...countKeys.map(k => r.summary[k]),sum(r.behavior,"pending")]
      break
    case 4:
      headers = ["วันในสัปดาห์",...r.routeSeries.map(s => s.name),"รวมทุกเส้นทาง"]
      rows = r.routeWeekdays.map(x => [x.name,...r.routeSeries.map(s => x[s.key]),x.total])
      total = ["รวมช่วงที่เลือก",...r.routeSeries.map(s => sum(r.routeWeekdays,s.key)),sum(r.routeWeekdays,"total")]
      break
    case 5:
      headers = ["จุดจอด","เวลาตามตารางที่จุดจอด","จำนวนขึ้น (คน)","จำนวนลง (คน)"]
      rows = r.stopTimes.map(x => [x.name,x.time,x.up,x.down])
      total = ["รวมทั้งหมด","",r.movementSummary.up,r.movementSummary.down]
      break
    case 6:
      headers = ["รหัสคนขับ","คนขับ","รวมรอบทั้งหมด","ก่อน 17:00","ตั้งแต่ 17:00"]
      rows = r.driverAssignments.map(x => [x.id,x.name,x.total,x.before17,x.after17])
      total = ["รวมทั้งหมด","",...['total','before17','after17'].map(k => sum(r.driverAssignments,k))]
      break
    case 7:
      headers = ["ประเภท / จำนวนที่นั่ง","รถ (ทะเบียน)","จำนวนรอบ"]
      rows = r.vehicleAssignments.map(x => [`${x.type} ${x.seats} ที่นั่ง`,x.name,x.total])
      rows.push(...r.vehicleTypes.map(x => [x.name,"รวมประเภท",x.total]))
      total = ["รวมทั้งหมด","",sum(r.vehicleTypes,"total")]
      break
    default: throw new Error("Invalid report")
  }
  const escape = v => '"' + String(typeof v === 'string' && /^[=+@\-\t\r]/.test(v) ? "'"+v : v).replaceAll('"','""') + '"'
  return '\uFEFF' + [headers,...rows,total].map(row => row.map(escape).join(',')).join('\r\n')
}
