import test from "node:test"
import assert from "node:assert/strict"
import { formatRecordId } from "../src/record-ids.js"
test("readable record IDs retain padding and grow beyond 999 without truncation", () => {
  assert.equal(formatRecordId("E",6),"E006")
  assert.equal(formatRecordId("U",2),"U002")
  assert.equal(formatRecordId("BK",1),"BK001")
  assert.equal(formatRecordId("BK",1000),"BK1000")
  assert.throws(()=>formatRecordId("QR",1))
  assert.throws(()=>formatRecordId("E",0))
})
