import test from "node:test"
import assert from "node:assert/strict"
import { assertEmployeeDelete, assertEmployeeEdit } from "../src/employee-policy.js"
const root = {id: "E-ADMIN", kind: "employee", positionId: "ADMIN"}
const other = {id: "E-OTHER", kind: "employee", positionId: "ADMIN"}
test("E-ADMIN can delete other administrators but nobody can delete E-ADMIN", () => {
  assert.doesNotThrow(() => assertEmployeeDelete(root, "E-OTHER", "ADMIN"))
  for (const actor of [root, other]) assert.throws(() => assertEmployeeDelete(actor, "E-ADMIN", "ADMIN"), {status:403})
  assert.throws(() => assertEmployeeDelete(other, "E-THIRD", "ADMIN"), {status:403})
  assert.throws(() => assertEmployeeDelete(other, other.id, "ADMIN"), {status:403})
  assert.doesNotThrow(() => assertEmployeeDelete(other, "E-DRIVER", "DRIVER"))
})
test("only the protected administrator can edit their own protected account", () => {
  assert.doesNotThrow(() => assertEmployeeEdit(root, "E-ADMIN"))
  assert.throws(() => assertEmployeeEdit(other, "E-ADMIN"), {status:403})
})
