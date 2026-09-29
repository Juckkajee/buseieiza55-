import { useCallback, useEffect, useState } from "react"
import { useApp } from "./App"
import { api } from "./api"
import { useConfirm } from "./Confirmation"
import { Title, Panel, Label, Notice, Table, gold, outline, field, useAction } from "./ui"

type Account = { userId: string; fullName: string; username: string; phone: string | null; userType: string; bookingCount: number }
type Form = { userId?: string; fullName: string; username: string; phone: string; userType: string; password: string }
export default function UsersPage() {
  const { can } = useApp(), editable = can("admin-users"), ask = useConfirm(), action = useAction()
  const [users, setUsers] = useState<Account[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try { setUsers(await api<Account[]>("/users")) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load().catch(e => action.setError(e.message)) }, [load])
  const update = (key: keyof Form, value: string) => form && setForm({...form, [key]:value})
  const rows = users.filter(u => [u.userId,u.fullName,u.username,u.phone,u.userType].some(v=>v?.toLowerCase().includes(search.trim().toLowerCase())))
  return <div className="p-5 xl:p-8">
    <Title action={<button disabled={!editable || action.busy} className={gold} onClick={()=>setForm({fullName:"",username:"",phone:"",userType:"นักศึกษา",password:""})}>+ เพิ่มผู้ใช้งาน</button>}>จัดการผู้ใช้งาน</Title>
    <Notice {...action}/>
    {form && <Panel className="mb-6">
      <h2 className="text-[#f5a623] font-bold mb-4">{form.userId ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งาน"}</h2>
      {form.userId && <p className="text-xs text-[#888] mb-4">รหัสผู้ใช้ <span className="mono text-[#f5a623]">{form.userId}</span></p>}
      <form onSubmit={e=>{
        e.preventDefault()
        void action.run(async()=>{
          if(form.userId && !(await ask("ยืนยันการแก้ไขผู้ใช้งาน",`บันทึกข้อมูลของ ${form.fullName} ที่แก้ไขแล้วหรือไม่?`))) return false
          await api("/users"+(form.userId?"/"+form.userId:""),form.userId?"PUT":"POST",form)
          setForm(null); await load()
        })
      }}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Label title="ชื่อ–นามสกุล"><input autoFocus required maxLength={200} className={field} value={form.fullName} onChange={e=>update("fullName",e.target.value)}/></Label>
          <Label title="Username"><input required autoComplete="off" maxLength={100} className={field} value={form.username} onChange={e=>update("username",e.target.value)}/></Label>
          <Label title="เบอร์โทร"><input type="tel" maxLength={30} className={field} value={form.phone} onChange={e=>update("phone",e.target.value)}/></Label>
          <Label title="ประเภทผู้ใช้"><select className={field} value={form.userType} onChange={e=>update("userType",e.target.value)}>{["นักศึกษา","เจ้าหน้าที่","บุคคลทั่วไป"].map(t=><option key={t}>{t}</option>)}</select></Label>
          <Label title={form.userId?"Password ใหม่ (เว้นว่างเพื่อใช้รหัสเดิม)":"Password"}><input type="password" autoComplete="new-password" required={!form.userId} minLength={8} maxLength={128} className={field} value={form.password} onChange={e=>update("password",e.target.value)}/></Label>
        </div>
        <div className="flex gap-2 mt-5"><button className={gold} disabled={!editable || action.busy}>บันทึก</button><button type="button" className={outline} disabled={action.busy} onClick={()=>setForm(null)}>ยกเลิก</button></div>
      </form>
    </Panel>}
    <div className="flex justify-between gap-4 items-end mb-5 flex-wrap">
      <div className="w-full sm:max-w-sm"><Label title="ค้นหาผู้ใช้งาน"><input type="search" placeholder="รหัส / ชื่อ / Username / เบอร์โทร" className={field} value={search} onChange={e=>setSearch(e.target.value)}/></Label></div>
      <p className="text-sm text-[#888]">ผู้ใช้งานทั้งหมด <span className="mono text-[#f5a623]">{users.length}</span> คน</p>
    </div>
    <p className="text-xs text-[#999] mb-4">ลบได้เฉพาะบัญชีที่ยังไม่มีประวัติการจอง บัญชีที่มีการจองรวมถึงรายการยกเลิกจะเก็บไว้เพื่ออ้างอิงประวัติ</p>
    {loading ? <p className="text-sm text-[#888]">กำลังโหลดผู้ใช้งาน…</p> : <Table headers={["รหัสผู้ใช้","ชื่อ–นามสกุล","Username","Password","เบอร์โทร","ประเภทผู้ใช้","การจอง","จัดการ"]} rows={rows.map(u=>[
      <span className="mono text-xs text-[#f5a623] break-all">{u.userId}</span>,u.fullName,u.username,<span aria-label="รหัสผ่านถูกปิดบัง">********</span>,u.phone||"—",u.userType,
      <span className="whitespace-nowrap">{u.bookingCount} รายการ</span>,
      <div><div className="flex gap-3 whitespace-nowrap">
        <button disabled={!editable || action.busy} className="text-xs text-[#f5a623] disabled:opacity-30" onClick={()=>setForm({userId:u.userId,fullName:u.fullName,username:u.username,phone:u.phone||"",userType:u.userType,password:""})}>แก้ไข</button>
        <button disabled={!editable || action.busy || u.bookingCount>0} title={u.bookingCount>0?"ลบไม่ได้ เพราะมีประวัติการจอง":"ลบผู้ใช้งาน"} className="text-xs text-red-300 disabled:opacity-30" onClick={async()=>{
          if(await ask("ยืนยันการลบผู้ใช้งาน",`ลบบัญชี ${u.fullName} (${u.username}) หรือไม่?`)) void action.run(async()=>{await api("/users/"+u.userId,"DELETE"); await load()},"ลบผู้ใช้งานเรียบร้อยแล้ว")
        }}>ลบ</button>
      </div>{u.bookingCount>0 && <p className="text-[10px] text-[#999] mt-2 whitespace-nowrap">มีประวัติการจอง จึงลบไม่ได้</p>}</div>
    ])}/>}
  </div>
}
