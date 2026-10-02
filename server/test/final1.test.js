import test from "node:test"
import assert from "node:assert/strict"
import {allowed} from "../src/auth.js"
import {assertBookingWindow, assertSeatAllowance, assertBookingUser, epoch} from "../src/domain.js"
import {requirementReports} from "../src/report-requirements.js"
import {reportPeriod} from "../src/report-period.js"
import {reportCsv} from "../src/report-csv.js"

test("Admin and new positions obey dynamic view and modify permissions", () => {
  for(const positionId of ['ADMIN','POS123']) {
    const u={kind:'employee',positionId,permissions:{}}
    assert.equal(allowed(u,'reports'),false)
    u.permissions.reports={view:true,modify:false}
    assert.equal(allowed(u,'reports'),true)
    assert.equal(allowed(u,'reports',true),false)
    u.permissions.reports={view:false,modify:true}
    assert.equal(allowed(u,'reports',true),false)
  }
})
test("booking cutoff is relative to pickup, includes exact 20 minutes, and crosses midnight", () => {
  const d='2026-09-30T23:50:00'
  assert.doesNotThrow(()=>assertBookingWindow(d,40,epoch('2026-10-01T00:10:00')))
  assert.throws(()=>assertBookingWindow(d,40,epoch('2026-10-01T00:10:01')),{status:409})
  assert.throws(()=>assertBookingWindow(d,0,epoch(d)),{status:409})
})
test("four-seat allowance covers previous bookings; general public cannot book", () => {
  assert.doesNotThrow(()=>assertSeatAllowance(3,1))
  assert.throws(()=>assertSeatAllowance(3,2),{status:409})
  assert.throws(()=>assertSeatAllowance(4,1),{status:409})
  assertBookingUser('นักศึกษา'); assertBookingUser('เจ้าหน้าที่')
  assert.throws(()=>assertBookingUser('บุคคลทั่วไป'),{status:403})
})
test("assignment reports include empty jobs, 17:00 boundary, zero drivers and vehicle type subtotals", () => {
  const range=reportPeriod({year:'2026'})
  const trips=['16:59','17:00','23:59','12:00'].map((time,i)=>({tripId:'T'+i,driverEmployeeId:'D1',driverName:'คนขับ',vehicleId:'V1',licensePlate:'กข 1',vehicleType:'รถตู้',seatCount:9,departureAt:`2026-09-01T${time}:00`,status:i===3?'CANCELLED':'SCHEDULED'}))
  const r=requirementReports([],trips,[],[],[],range,[{employeeId:'D0',fullName:'ไม่มีงาน'}],[{vehicleId:'V2',licensePlate:'ขค 2',vehicleType:'รถบัส',seatCount:20}])
  assert.deepEqual(r.driverAssignments.find(x=>x.id==='D1'),{id:'D1',name:'คนขับ',total:3,before17:1,after17:2})
  assert.equal(r.driverAssignments.find(x=>x.id==='D0').total,0)
  assert.equal(r.vehicleTypes.reduce((n,x)=>n+x.total,0),3)
  const csv=reportCsv(r,6)
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.endsWith('"รวมทั้งหมด","","3","1","2"'))
  r.driverAssignments[0].name='=HYPERLINK("test")'
  assert.ok(reportCsv(r,6).includes('"\'=HYPERLINK(""test"")"'))
})
