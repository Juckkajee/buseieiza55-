import { useState, useEffect, useCallback } from "react"

import { useApp } from "./App"

import { api } from "./api"

import { useConfirm } from "./Confirmation"

import type { Employee, Vehicle, Permission } from "./types"

import {
  Title,
  Panel,
  Label,
  Notice,
  useAction,
  Chip,
  Table,
  gold,
  outline,
  field,
} from "./ui"

export function EmployeesPage() {
  const { data, refresh, can, user } = useApp(),
    editable = can("admin-employees"),
    ask = useConfirm(),
    action = useAction()

  const [employees, setEmployees] = useState<Employee[]>([]),
    [form, setForm] = useState<{
      employeeId?: string

      fullName: string

      username: string

      password: string

      phone: string

      email: string

      departmentId: string

      positionId: string
    } | null>(null)

  const load = useCallback(
    async () => setEmployees(await api<Employee[]>("/employees")),

    [],
  )

  useEffect(() => {
    void load().catch((e) => action.setError(e.message))
  }, [load])

  const update = (key: string, value: string) =>
    form && setForm({ ...form, [key]: value })

  return (
    <div className="p-5 xl:p-8">
      <Title
        action={
          <button
            disabled={!editable}
            className={gold}
            onClick={() =>
              setForm({
                fullName: "",

                username: "",

                password: "",

                phone: "",

                email: "",

                departmentId: data.departments[0]?.departmentId || "",

                positionId: "DRIVER",
              })
            }
          >
            + เพิ่มพนักงาน
          </button>
        }
      >
        จัดการพนักงาน
      </Title>
      <Notice {...action} />
      {form && (
        <Panel className="mb-6">
          <h2 className="text-[#f5a623] font-bold mb-4">
            {form.employeeId ? "แก้ไขพนักงาน" : "เพิ่มพนักงาน"}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()

              void action.run(async () => {
                if (
                  form.employeeId &&
                  !(await ask(
                    "ยืนยันการแก้ไขพนักงาน",

                    `บันทึกข้อมูลของ ${form.fullName} ที่แก้ไขแล้วหรือไม่?`,
                  ))
                )
                  return false

                await api(
                  "/employees" + (form.employeeId ? "/" + form.employeeId : ""),

                  form.employeeId ? "PUT" : "POST",

                  form,
                )

                await Promise.all([load(), refresh()])

                setForm(null)
              })
            }}
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Label title="ชื่อ–นามสกุล">
                <input
                  autoFocus
                  required
                  maxLength={200}
                  className={field}
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                />
              </Label>
              <Label title="แผนก">
                <select
                  required
                  className={field}
                  value={form.departmentId}
                  onChange={(e) => update("departmentId", e.target.value)}
                >
                  {data.departments.map((d) => (
                    <option key={d.departmentId} value={d.departmentId}>
                      {d.departmentName} ({d.departmentId})
                    </option>
                  ))}
                </select>
              </Label>
              <Label title="ตำแหน่ง">
                <select
                  required
                  className={field}
                  value={form.positionId}
                  onChange={(e) => update("positionId", e.target.value)}
                >
                  {data.positions.map((p) => (
                    <option key={p.positionId} value={p.positionId}>
                      {p.positionName}
                    </option>
                  ))}
                </select>
              </Label>
              <Label title="เบอร์โทร">
                <input
                  type="tel"
                  maxLength={30}
                  className={field}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </Label>
              <Label title="Email">
                <input
                  type="email"
                  maxLength={254}
                  className={field}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Label>
              <Label title="Username">
                <input
                  autoComplete="off"
                  required
                  maxLength={100}
                  className={field}
                  value={form.username}
                  onChange={(e) => update("username", e.target.value)}
                />
              </Label>
              <Label
                title={
                  form.employeeId
                    ? "Password ใหม่ (เว้นว่างเพื่อใช้รหัสเดิม)"
                    : "Password"
                }
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  required={!form.employeeId}
                  minLength={8}
                  maxLength={128}
                  className={field}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                />
              </Label>
            </div>
            <div className="flex gap-2 mt-5">
              <button disabled={action.busy} className={gold}>
                บันทึก
              </button>
              <button
                type="button"
                className={outline}
                onClick={() => setForm(null)}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </Panel>
      )}
      <Table
        headers={[
          "รหัสพนักงาน",

          "ชื่อ–นามสกุล",

          "รหัสแผนก",

          "แผนก",

          "ตำแหน่ง",

          "เบอร์โทร",

          "Email",

          "Username",

          "Password",

          "จัดการ",
        ]}
        rows={employees.map((e) => [
          <span className="mono text-xs text-[#f5a623] break-all">
            {e.employeeId}
          </span>,

          <span className="whitespace-nowrap">{e.fullName}</span>,

          e.departmentId,

          e.departmentName,

          <Chip status={e.positionName} />,

          <span className="whitespace-nowrap">{e.phone || "—"}</span>,

          e.email || "—",

          e.username,

          <span aria-label="รหัสผ่านถูกปิดบัง">********</span>,

          <div className="flex gap-3 whitespace-nowrap">
            <button
              disabled={!editable || (e.employeeId === "E-ADMIN" && user.id !== "E-ADMIN")}
              title={e.employeeId === "E-ADMIN" && user.id !== "E-ADMIN" ? "เฉพาะ E-ADMIN แก้ไขบัญชีนี้ได้" : "แก้ไขข้อมูลพนักงาน"}
              className="text-xs text-[#f5a623] disabled:opacity-30"
              onClick={() =>
                setForm({
                  ...e,

                  phone: e.phone || "",

                  email: e.email || "",

                  password: "",
                })
              }
            >
              แก้ไข
            </button>
            <button
              disabled={!editable || action.busy || e.employeeId === "E-ADMIN" || e.employeeId === user.id || (e.positionId === "ADMIN" && user.id !== "E-ADMIN")}
              title={e.employeeId === "E-ADMIN" ? "บัญชีผู้ดูแลหลัก ไม่สามารถลบได้" : e.positionId === "ADMIN" && user.id !== "E-ADMIN" ? "เฉพาะ E-ADMIN ลบ Admin อื่นได้" : "ลบพนักงาน"}
              className="text-xs text-red-300 disabled:opacity-30"
              onClick={async () => {
                if (await ask("ยืนยันการลบพนักงาน", `ลบ ${e.fullName} หรือไม่?`))
                  void action.run(async () => {
                    await api("/employees/" + e.employeeId, "DELETE")

                    await Promise.all([load(), refresh()])
                  })
              }}
            >
              ลบ
            </button>
          </div>,
        ])}
      />
    </div>
  )
}

export function VehiclesPage() {
  const { data, refresh, can } = useApp(),
    editable = can("admin-vehicles"),
    ask = useConfirm(),
    action = useAction()

  const [form, setForm] = useState<Partial<Vehicle> | null>(null)

  const rows = data.vehicles

  return (
    <div className="p-5 xl:p-8">
      <Title
        action={
          <button
            disabled={!editable}
            className={gold}
            onClick={() =>
              setForm({
                licensePlate: "",

                vehicleType: "รถตู้",

                seatCount: 9,

                brand: "",

                modelYear: 2569,

                availability: "AVAILABLE",
              })
            }
          >
            + เพิ่มรถ
          </button>
        }
      >
        ข้อมูลรถ
      </Title>
      <Notice {...action} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          ["รถทั้งหมด", rows.length],

          ["รถตู้", rows.filter((v) => v.vehicleType === "รถตู้").length],

          ["รถบัส", rows.filter((v) => v.vehicleType === "รถบัส").length],

          ["พร้อมใช้", rows.filter((v) => v.availability === "AVAILABLE").length],
        ].map(([label, value], i) => (
          <Panel key={label}>
            <p className="text-xs text-[#888]">{label}</p>
            <p className="text-3xl font-black mono mt-2" style={{color: ["#f5a623", "#3498db", "#9b59b6", "#2ecc71"][i]}}>
              {value} <span className="text-sm">คัน</span>
            </p>
          </Panel>
        ))}
      </div>
      {form && (
        <Panel className="mb-6">
          <h2 className="font-bold text-[#f5a623] mb-4">
            {form.vehicleId ? "แก้ไขข้อมูลรถ" : "เพิ่มรถ"}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()

              void action.run(async () => {
                if (
                  form.vehicleId &&
                  !(await ask(
                    "ยืนยันการแก้ไขข้อมูลรถ",

                    `บันทึกข้อมูลรถ ${form.licensePlate} ที่แก้ไขแล้วหรือไม่?`,
                  ))
                )
                  return false

                await api(
                  "/vehicles" + (form.vehicleId ? "/" + form.vehicleId : ""),

                  form.vehicleId ? "PUT" : "POST",

                  form,
                )

                await refresh()

                setForm(null)
              })
            }}
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Label title="ทะเบียนรถ">
                <input
                  autoFocus
                  required
                  maxLength={30}
                  className={field}
                  value={form.licensePlate}
                  onChange={(e) =>
                    setForm({ ...form, licensePlate: e.target.value })
                  }
                />
              </Label>
              <Label title="ประเภทรถ">
                <select
                  className={field}
                  value={form.vehicleType}
                  onChange={(e) =>
                    setForm({
                      ...form,

                      vehicleType: e.target.value,

                      seatCount: e.target.value === "รถตู้" ? 9 : 20,
                    })
                  }
                >
                  <option>รถตู้</option>
                  <option>รถบัส</option>
                </select>
              </Label>
              <Label title="จำนวนที่นั่ง">
                <input
                  required
                  type="number"
                  min={1}
                  max={100}
                  className={field}
                  value={form.seatCount}
                  onChange={(e) =>
                    setForm({ ...form, seatCount: Number(e.target.value) })
                  }
                />
              </Label>
              {data.capabilities.vehicleExtras && (
                <>
                  <Label title="ยี่ห้อ / รุ่น">
                    <input
                      maxLength={150}
                      className={field}
                      value={form.brand || ""}
                      onChange={(e) =>
                        setForm({ ...form, brand: e.target.value })
                      }
                    />
                  </Label>
                  <Label title="ปีรถ (พ.ศ.)">
                    <input
                      type="number"
                      min={1900}
                      max={2700}
                      className={field}
                      value={form.modelYear || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,

                          modelYear: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                    />
                  </Label>
                  <Label title="สถานะ">
                    <select
                      className={field}
                      value={form.availability}
                      onChange={(e) =>
                        setForm({ ...form, availability: e.target.value })
                      }
                    >
                      <option value="AVAILABLE">พร้อมใช้</option>
                      <option value="MAINTENANCE">ซ่อมบำรุง</option>
                    </select>
                  </Label>
                </>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button className={gold} disabled={action.busy}>
                บันทึก
              </button>
              <button
                type="button"
                className={outline}
                onClick={() => setForm(null)}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </Panel>
      )}
      {["รถตู้", "รถบัส"].map((type) => (
        <section key={type} className="mb-8">
          <h2
            className="font-bold mb-4 border-l-4 pl-3"
            style={{ borderColor: type === "รถตู้" ? "#3498db" : "#9b59b6" }}
          >
            {type} ({rows.filter((v) => v.vehicleType === type).length} คัน)
          </h2>
          <Table
            headers={[
              "รหัสรถ",

              "ทะเบียน",

              "ยี่ห้อ / รุ่น",

              "ที่นั่ง",

              "ปี",

              "สถานะ",

              "จัดการ",
            ]}
            rows={rows
              .filter((v) => v.vehicleType === type)
              .map((v) => [
                <span className="text-[#f5a623] mono text-xs">
                  {v.vehicleId}
                </span>,

                <b>{v.licensePlate}</b>,

                v.brand || "—",

                v.seatCount,

                v.modelYear || "—",

                <Chip status={v.availability} />,

                <div className="flex gap-3">
                  <button
                    disabled={!editable}
                    className="text-xs text-[#f5a623] disabled:opacity-30"
                    onClick={() => setForm({ ...v })}
                  >
                    แก้ไข
                  </button>
                  <button
                    disabled={!editable || action.busy}
                    className="text-xs text-red-300 disabled:opacity-30"
                    onClick={async () => {
                      if (
                        await ask(
                          "ยืนยันการลบรถ",

                          `ลบรถทะเบียน ${v.licensePlate} หรือไม่?`,
                        )
                      )
                        void action.run(async () => {
                          await api("/vehicles/" + v.vehicleId, "DELETE")

                          await refresh()
                        })
                    }}
                  >
                    ลบ
                  </button>
                </div>,
              ])}
          />
        </section>
      ))}
    </div>
  )
}

export function PermissionsPage() {
  const { data, refresh, can } = useApp(),
    editable = can("admin-permissions"),
    ask = useConfirm(),
    action = useAction()

  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loaded, setLoaded] = useState(false)

  const [draft, setDraft] = useState<Record<string, Record<string, {
    view: boolean
    modify: boolean
  }>>>({})

  const [mode, setMode] = useState<"view" | "modify">("view")

  const [name, setName] = useState("")

  const load = useCallback(
    async () => {
      setLoaded(false)
      setPermissions(await api<Permission[]>("/permissions"))
      setLoaded(true)
    },
    [],
  )

  useEffect(() => {
    void load().catch((e) => action.setError(e.message))
  }, [load])

  useEffect(() => {
    setDraft(
      Object.fromEntries(
        data.positions.map((position) => [
          position.positionId,

          Object.fromEntries(
            data.screens.map((screen) => {
              const p = permissions.find(
                (p) =>
                  p.positionId === position.positionId &&
                  p.screenId === screen.screenId,
              )

              return [
                screen.screenId,
                {
                  view: position.positionId === "ADMIN" || !!p?.canView,
                  modify: position.positionId === "ADMIN" || !!p?.canModify,
                },
              ]
            }),
          ),
        ]),
      ),
    )
  }, [permissions, data.positions, data.screens])

  return (
    <div className="p-5 xl:p-8">
      <Title>กำหนดสิทธิ์การเข้าถึง</Title>
      <p className="text-sm text-[#888] mb-6">
        กำหนดว่าแต่ละตำแหน่งสามารถเข้าถึงหน้าใดได้บ้าง
      </p>
      <Notice {...action} />
      <form
        className="flex gap-3 mb-6 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault()

          void action.run(async () => {
            await api("/positions", "POST", { positionName: name })

            await refresh()
            await load()
            setName("")
          })
        }}
      >
        <input
          aria-label="ชื่อตำแหน่งใหม่"
          placeholder="ชื่อตำแหน่งใหม่"
          required
          maxLength={100}
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          disabled={!editable || action.busy}
          className={`${gold} whitespace-nowrap`}
        >
          + เพิ่มตำแหน่ง
        </button>
      </form>
      <div className="flex gap-2 mb-4">
        {(["view", "modify"] as const).map((m) => (
          <button
            key={m}
            className={`${outline} ${
              mode === m ? "border-[#f5a623] text-[#f5a623]" : ""
            }`}
            onClick={() => setMode(m)}
          >
            {m === "view" ? "สิทธิ์เข้าถึง / ดูข้อมูล" : "สิทธิ์เพิ่ม / แก้ไข / ลบ"}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto border border-[#2a2a2a]">
        <table className="w-full text-sm">
          <thead className="bg-[#111]">
            <tr>
              <th className="text-left p-4 min-w-48">หน้า / ฟีเจอร์</th>
              {data.positions.map((p) => (
                <th key={p.positionId} className="p-4 min-w-36 text-center">
                  <span className="text-[#f5a623]">{p.positionName}</span>
                  {!["ADMIN", "DRIVER"].includes(p.positionId) && (
                    <button
                      aria-label={`ลบตำแหน่ง ${p.positionName}`}
                      disabled={!editable || action.busy}
                      className="block mx-auto mt-2 text-xs text-red-300 disabled:opacity-30"
                      onClick={async () => {
                        if (
                          await ask(
                            "ยืนยันการลบตำแหน่ง",
                            `ลบตำแหน่ง ${p.positionName} หรือไม่? ตำแหน่งที่มีพนักงานอยู่จะลบไม่ได้`,
                          )
                        )
                          void action.run(async () => {
                            await api("/positions/" + p.positionId, "DELETE")
                            await refresh()
                            await load()
                          })
                      }}
                    >
                      × ลบ
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.screens.map((s) => (
              <tr key={s.screenId} className="border-t border-[#2a2a2a]">
                <td className="p-4">{s.screenName}</td>
                {data.positions.map((p) => {
                  const value = draft[p.positionId]?.[s.screenId] || {
                    view: false,
                    modify: false,
                  }

                  const checked = value[mode]

                  return (
                    <td key={p.positionId} className="p-4 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        aria-label={`${p.positionName} ${s.screenName} ${
                          mode === "view" ? "ดูข้อมูล" : "แก้ไขข้อมูล"
                        }`}
                        disabled={
                          !loaded || !editable || p.positionId === "ADMIN" || action.busy
                        }
                        className={`relative inline-block w-10 h-6 border transition-colors disabled:cursor-not-allowed ${
                          checked
                            ? "bg-[#f5a623] border-[#f5a623]"
                            : "bg-transparent border-[#555]"
                        }`}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            [p.positionId]: {
                              ...current[p.positionId],
                              [s.screenId]:
                                mode === "view"
                                  ? {
                                      view: !checked,
                                      modify: !checked && value.modify,
                                    }
                                  : {
                                      view: !checked || value.view,
                                      modify: !checked,
                                    },
                            },
                          }))
                        }
                      >
                        <span
                          className={`absolute top-0.5 h-[18px] w-4 transition-all ${
                            checked
                              ? "left-[20px] bg-[#0a0a0a]"
                              : "left-0.5 bg-[#666]"
                          }`}
                        />
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#888] mt-3">
        Admin มีสิทธิ์ทุกหน้าเสมอ · การเปิดสิทธิ์แก้ไขจะเปิดสิทธิ์ดูข้อมูลด้วย
      </p>
      <button
        disabled={!loaded || !editable || action.busy}
        className={`${gold} mt-5`}
        onClick={async () => {
          if (
            await ask("ยืนยันการแก้ไขสิทธิ์", "บันทึกสิทธิ์การเข้าถึงที่แก้ไขแล้วทุกตำแหน่งหรือไม่?")
          )
            void action.run(async () => {
              await api("/permissions", "PUT", {
                positions: Object.entries(draft)
                  .filter(([id]) => id !== "ADMIN")
                  .map(([positionId, value]) => ({
                    positionId,
                    permissions: Object.entries(value).map(([screenId, p]) => ({
                      screenId,
                      ...p,
                    })),
                  })),
              })

              await load()
              await refresh()
            })
        }}
      >
        บันทึกสิทธิ์
      </button>
    </div>
  )
}
