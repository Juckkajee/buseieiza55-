import { useState } from "react"
import { api } from "./api"
import type { User } from "./types"
import { Label, field, gold, Notice, useAction } from "./ui"
export default function Auth({
  setup,
  onLogin,
  onSetup,
}: {
  setup: boolean
  onLogin: (u: User) => void
  onSetup: () => void
}) {
  const [register, setRegister] = useState(false),
    [form, setForm] = useState({
      fullName: "",
      username: "",
      password: "",
      phone: "",
      userType: "นักศึกษา",
    }),
    action = useAction()
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <div className="hidden lg:flex w-1/2 bg-[#0d0d0d] border-r border-[#2a2a2a] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="absolute border border-[#f5a623]"
              style={{
                width: 60 + i * 40,
                height: 60 + i * 40,
                top: `${10 + i * 7}%`,
                left: `${5 + i * 6}%`,
                transform: `rotate(${i * 15}deg)`,
              }}
            />
          ))}
        </div>
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-3 h-3 bg-[#f5a623]" />
            <span className="font-bold tracking-[0.2em] uppercase text-[#f5a623]">
              MUT Shuttle Bus
            </span>
          </div>
          <h1 className="font-black text-4xl leading-tight mb-4">
            ระบบบริการ
            <br />
            รถรับส่ง MUT
          </h1>
          <p className="text-[#888] leading-relaxed">
            มหาวิทยาลัยเทคโนโลยีมหานคร
            <br />
            ให้บริการรถรับส่งนักศึกษาและเจ้าหน้าที่
            <br />
            ในแวกหนองจอก
          </p>
        </div>
        <div className="text-sm text-[#888] space-y-3">
          {[
            "เลือกเส้นทางและวันเดินทาง",
            "เลือกที่นั่ง แล้วเพิ่มในรายการรอยืนยัน",
            "ยืนยันการจองและรับตั๋ว QR Code",
          ].map((s, i) => (
            <p key={s} className="border-b border-[#2a2a2a] pb-3">
              <span className="mono text-[#f5a623] mr-4">0{i + 1}</span>
              {s}
            </p>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <h2 className="font-black text-2xl mb-2">
            {setup ? "ตั้งค่าบัญชีผู้ดูแลระบบ" : register ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </h2>
          <p className="text-[#888] text-sm mb-7">
            {setup
              ? "สร้างบัญชี Admin สำหรับใช้งานครั้งแรก"
              : register
                ? "สำหรับนักศึกษา เจ้าหน้าที่ และผู้ใช้บริการ"
                : "กรุณาล็อกอินเพื่อใช้งานระบบ"}
          </p>
          <Notice {...action} />
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void action.run(async () => {
                if (setup) {
                  await api("/setup", "POST", form)
                  onSetup()
                  return
                }
                const result = await api<{ user: User }>(
                  register ? "/auth/register" : "/auth/login",
                  "POST",
                  form,
                )
                onLogin(result.user)
              }, "")
            }}
          >
            {(register || setup) && (
              <Label title="ชื่อ–นามสกุล">
                <input
                  autoComplete="name"
                  required
                  className={field}
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                />
              </Label>
            )}
            <Label title="ชื่อผู้ใช้">
              <input
                autoComplete="username"
                required
                maxLength={100}
                className={field}
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
              />
            </Label>
            <Label title="รหัสผ่าน">
              <input
                type="password"
                autoComplete={
                  register || setup ? "new-password" : "current-password"
                }
                minLength={register || setup ? 8 : undefined}
                maxLength={128}
                required
                className={field}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
            </Label>
            {(register || setup) && (
              <Label title="เบอร์โทร">
                <input
                  autoComplete="tel"
                  type="tel"
                  maxLength={30}
                  className={field}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </Label>
            )}
            {register && (
              <Label title="ประเภทผู้ใช้">
                <select
                  className={field}
                  value={form.userType}
                  onChange={(e) => set("userType", e.target.value)}
                >
                  {["นักศึกษา", "เจ้าหน้าที่", "บุคคลทั่วไป"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Label>
            )}
            {(register || setup) && (
              <p className="text-xs text-[#888]">รหัสผ่านอย่างน้อย 8 ตัวอักษร</p>
            )}
            <button className={`${gold} w-full py-3`} disabled={action.busy}>
              {action.busy
                ? "กำลังดำเนินการ…"
                : setup
                  ? "สร้างบัญชี Admin"
                  : register
                    ? "สมัครสมาชิก"
                    : "เข้าสู่ระบบ"}
            </button>
          </form>
          {!setup && (
            <button
              className="text-sm text-[#f5a623] mt-5"
              onClick={() => {
                setRegister(!register)
                action.setError("")
              }}
            >
              {register ? "← กลับเข้าสู่ระบบ" : "ยังไม่มีบัญชี? สมัครสมาชิก"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
