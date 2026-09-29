import { useConfirm } from "./Confirmation";
import { useState, useMemo } from "react";
import qrcode from "./QRGenerator";

type Round = { round: number; time: string; driver: string; vehicle: string; type: string; seats: number };
type Route = { id: number; name: string; stops: { name: string; min: number | null }[]; schedule: Round[] };
type Booking = { travelDate: string; travelTime: string; vehicleId: string; checkedInAt: string | null; id: string; user: string; route: number; round: number; from: string; to: string; seats: number; seatNumbers: number[]; status: "confirmed" | "cancelled"; qr: string; bookedAt: string };
type Draft = Omit<Booking, "status" | "qr" | "bookedAt">;
const gold = "bg-[#f5a623] text-[#111] hover:bg-[#ffb940] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 text-sm font-bold";
const outline = "border border-[#454545] px-3 py-2 text-sm hover:border-[#f5a623] disabled:opacity-40";
const field = "w-full bg-[#161818] border border-[#454545] p-3 text-sm text-[#eee]";

export default function BookingCart({ routes, initialOccupied, initialBookings, userName, vehicles, view }: {
  view: "booking" | "cancellations";
  routes: Route[]; initialOccupied: Record<string, number[]>; initialBookings: Booking[]; userName: string; vehicles: { id: string; plate: string }[];
}) {
  const ask = useConfirm();
  const [travelDate, setTravelDate] = useState(() => localDate());
  const [routeId, setRouteId] = useState<number | null>(null);
  const [from, setFrom] = useState(-1);
  const [to, setTo] = useState(-1);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [seats, setSeats] = useState<number[]>([]);
  const [cart, setCart] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bookings, setBookings] = useState(initialBookings);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const route = routes.find(r => r.id === routeId);
  const round = route?.schedule.find(r => r.round === roundId);
  const occupied = (r: number, n: number, date = travelDate) => new Set([
    ...(initialOccupied[`${r}-${n}`] ?? []),
    ...bookings.filter(b => b.route === r && b.round === n && b.travelDate === date && b.status === "confirmed").flatMap(b => b.seatNumbers),
  ]);
  const pendingSeats = (r: number, n: number) => new Set(cart.filter(b => b.route === r && b.round === n && b.travelDate === travelDate).flatMap(b => b.seatNumbers));
  function addToCart() {
    if (!travelDate) { setError("กรุณาเลือกวันที่เดินทาง"); return; }
    if (!route || !round || from < 0 || to <= from || !seats.length) return;
    if (seats.some(s => occupied(route.id, round.round).has(s) || pendingSeats(route.id, round.round).has(s))) {
      setError("มีที่นั่งซ้ำกับรายการเดิม กรุณาเลือกที่นั่งใหม่"); return;
    }
    const item: Draft = { id: `D-${crypto.randomUUID()}`, user: userName, route: route.id, round: round.round, travelDate, travelTime: round.time, vehicleId: vehicles.find(v => v.plate === round.vehicle)?.id ?? "ไม่ระบุ", checkedInAt: null,
      from: `${from + 1}. ${route.stops[from].name}`, to: `${to + 1}. ${route.stops[to].name}`, seats: seats.length, seatNumbers: [...seats].sort((a,b) => a-b) };
    setCart(prev => [...prev, item]); setSelected(prev => [...prev, item.id]); setExpanded(item.id);
    setSeats([]); setRoundId(null); setRouteId(null); setFrom(-1); setTo(-1); setError("");
    setMessage("เพิ่มในรายการรอยืนยันแล้ว เลือกเพิ่มได้อีก หรือยืนยันรายการทางขวา");
  }
  function confirm(ids: string[]) {
    const items = cart.filter(b => ids.includes(b.id));
    if (!items.length) return;
    const used = new Set<string>();
    for (const b of items) for (const s of b.seatNumbers) {
      const key = `${b.travelDate}-${b.route}-${b.round}-${s}`;
      if (occupied(b.route,b.round,b.travelDate).has(s) || used.has(key)) {
        setError("บางที่นั่งไม่ว่างแล้ว กรุณาลบรายการนั้นและเลือกที่นั่งใหม่"); return;
      }
      used.add(key);
    }
    const confirmed: Booking[] = items.map(b => {
      const id = `BK-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
      return { ...b, id, status: "confirmed", qr: `QR-${id}`, bookedAt: new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) };
    });
    setBookings(prev => [...confirmed, ...prev]); setCart(prev => prev.filter(b => !ids.includes(b.id)));
    setSelected(prev => prev.filter(id => !ids.includes(id))); setExpanded(confirmed[0].id);
    setError(""); setMessage(`ยืนยันการจองสำเร็จ ${confirmed.length} รายการ`);
  }
  function details(b: Draft) {
    const r = routes.find(r => r.id === b.route);
    const n = r?.schedule.find(n => n.round === b.round);
    return <dl className="space-y-2 text-sm text-[#bdbdbd] border-t border-[#3c3c3c] pt-3 mt-3">
      {[ ["วันที่เดินทาง",formatDate(b.travelDate)], ["เวลาเดินทาง",`${b.travelTime} น.`], ["รหัสรถ",b.vehicleId], ["จุดขึ้น",b.from], ["จุดลง",b.to], ["รอบเดินรถ",`${n?.time} น. · รอบ ${b.round}`], ["รถ",`${n?.vehicle} · ${n?.type}`], ["คนขับ",n?.driver], ["ที่นั่ง",`${b.seatNumbers.join(", ")} (${b.seats} ที่นั่ง)`] ].map(([k,v]) => <div key={k} className="flex gap-4 justify-between"><dt className="shrink-0 text-[#888]">{k}</dt><dd className="text-right break-words">{v}</dd></div>)}
    </dl>;
  }
  function ticketDetails(b: Booking) {
    return <div>
      <dl className="mt-3 text-sm space-y-2 text-[#bbb]">
        <div className="flex justify-between gap-3"><dt>รหัสตั๋ว</dt><dd className="text-[#f5a623]">{b.id}</dd></div>
        <div className="flex justify-between gap-3"><dt>สถานะ</dt><dd>{b.status === "cancelled" ? "ยกเลิกแล้ว" : b.checkedInAt ? "เช็กอินแล้ว" : "ยืนยันแล้ว"}</dd></div>
        <div className="flex justify-between gap-3"><dt>เวลาเช็กอิน</dt><dd>{b.checkedInAt ? new Date(b.checkedInAt).toLocaleString("th-TH") : "ยังไม่ได้เช็กอิน"}</dd></div>
      </dl>{details(b)}
    </div>;
  }
  const history = bookings.filter(b => b.user === userName && b.status === "confirmed");
  const cancelled = bookings.filter(b => b.user === userName && b.status === "cancelled");
  if (view === "cancellations") return <div className="p-5 xl:p-8 text-[#eee]">
    <h1 className="text-2xl font-bold border-l-4 border-[#f5a623] pl-3">ประวัติการยกเลิก</h1>
    <p className="text-sm text-[#999] mt-3 mb-6">รายการจองที่ยกเลิกแล้วทั้งหมด {cancelled.length} รายการ</p>
    {!cancelled.length ? <div className="border border-dashed border-[#444] p-10 text-center text-[#999]">ยังไม่มีประวัติการยกเลิก</div> :
      <div className="grid gap-4 lg:grid-cols-2">{cancelled.map(b => <article key={b.id} className="p-5 border border-[#444] bg-[#202222]">
        <button className="w-full text-left" aria-expanded={expanded===b.id} onClick={()=>setExpanded(expanded===b.id?null:b.id)}>
          <span className="flex justify-between gap-3 text-sm"><b className="text-[#f5a623]">{b.id}</b><span className="text-red-300">ยกเลิกแล้ว</span></span>
          <span className="block mt-3">เส้นทางที่ {b.route} · ที่นั่ง {b.seatNumbers.join(", ")}</span>
          <span className="block text-xs text-[#999] mt-2">จองเมื่อ {b.bookedAt} · {expanded===b.id?"ซ่อนรายละเอียด ▴":"ดูรายละเอียด ▾"}</span>
        </button>{expanded===b.id && ticketDetails(b)}
      </article>)}</div>}
  </div>;
  return <div className="p-5 xl:p-8 text-[#eee]">
    <h1 className="text-2xl font-bold border-l-4 border-[#f5a623] pl-3">จองรถรับ–ส่ง</h1>
    <p className="text-sm text-[#999] mt-2 mb-6">เลือกเส้นทางและที่นั่ง → เพิ่มรายการ → ยืนยันการจอง</p>
    {message && <p role="status" className="mb-4 border border-[#4b6246] bg-[#263226] p-3 text-sm text-[#b7deb0]">{message}</p>}
    {error && <p role="alert" className="mb-4 p-3 bg-red-950 text-red-200">{error}</p>}
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
      <section className="min-w-0 space-y-5">
        <div className="border border-[#3c3c3c] p-5 bg-[#202222]">
          <h2 className="font-bold mb-4"><span className="text-[#f5a623] mr-2">01</span>เลือกเส้นทางและจุดขึ้น–ลง</h2>
          <label className="block text-xs text-[#aaa] mb-4">วันที่เดินทาง
            <input type="date" aria-label="วันที่เดินทาง" min={localDate()} value={travelDate} onChange={e => {setTravelDate(e.target.value);setSeats([]);}} className={`${field} mt-2 [color-scheme:dark]`} />
          </label>
          <div className="grid gap-2">{routes.map(r => <button key={r.id} onClick={() => {setRouteId(r.id);setFrom(-1);setTo(-1);setRoundId(null);setSeats([]);setError("");}} aria-pressed={r.id === routeId} className={`p-3 border text-left ${r.id === routeId ? "border-[#f5a623] bg-[#332c20]" : "border-[#444] hover:border-[#888]"}`}>
            <span className="text-sm font-bold text-[#f5a623]">{r.name}</span><span className="block text-xs text-[#aaa] mt-1">{r.stops.map(s => s.name).join(" → ")}</span>
          </button>)}</div>
          {route && <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <label className="text-xs text-[#aaa]">จุดขึ้นรถ<select aria-label="จุดขึ้นรถ" className={`${field} mt-2`} value={from} onChange={e => {setFrom(Number(e.target.value));setTo(-1);setRoundId(null);setSeats([]);}}><option value={-1}>เลือกจุดขึ้นรถ</option>{route.stops.slice(0,-1).map((s,i) => <option value={i} key={i}>{i+1}. {s.name}</option>)}</select></label>
            <label className="text-xs text-[#aaa]">จุดลงรถ<select aria-label="จุดลงรถ" className={`${field} mt-2`} value={to} disabled={from < 0} onChange={e => {setTo(Number(e.target.value));setSeats([]);}}><option value={-1}>เลือกจุดลงรถ</option>{route.stops.map((s,i) => i > from && <option value={i} key={i}>{i+1}. {s.name}</option>)}</select></label>
          </div>}
        </div>
        <div className="border border-[#3c3c3c] p-5 bg-[#202222]">
          <h2 className="font-bold mb-4"><span className="text-[#f5a623] mr-2">02</span>เลือกรอบเดินรถและที่นั่ง</h2>
          {!route || to <= from || from < 0 ? <p className="text-sm text-[#888] py-5">เลือกเส้นทางและจุดขึ้น–ลงก่อน</p> : <>
            <div className="grid grid-cols-2 gap-2">{route.schedule.map(n => {const remaining=n.seats-new Set([...occupied(route.id,n.round),...pendingSeats(route.id,n.round)]).size; return <button key={n.round} disabled={remaining <= 0} aria-pressed={roundId===n.round} onClick={() => {setRoundId(n.round);setSeats([]);setError("");}} className={`text-left p-3 border disabled:opacity-40 ${roundId===n.round ? "border-[#f5a623] bg-[#332c20]" : "border-[#444]"}`}><strong className="text-[#f5a623]">{n.time} น.</strong><span className="block text-xs text-[#aaa] mt-1">{n.vehicle} · {n.type}</span><span className="block text-xs mt-1">เลือกได้ {remaining} ที่นั่ง</span></button>;})}</div>
            {round && <div className="mt-5">
              <p className="text-xs text-[#aaa] mb-3">เลือกได้สูงสุด 4 ที่นั่งต่อรายการ · สีทอง = เลือกอยู่ · ขอบสีทอง = อยู่ในรายการรอยืนยัน</p>
              <div className="border border-[#555] rounded-t-3xl p-5 max-w-xs mx-auto bg-[#181a1a]">
                <div className="text-right text-xs text-[#888] border-b border-[#444] pb-3 mb-4">ด้านหน้า · คนขับ ◉</div>
                <div className={`grid gap-2 ${round.seats <= 9 ? "grid-cols-4" : "grid-cols-5"}`}>
                  {Array.from({length: Math.ceil(round.seats/(round.seats<=9?3:4))*(round.seats<=9?4:5)},(_,i) => {
                    const cols=round.seats<=9?4:5; const col=i%cols; if(col===2)return <span key={i}/>;
                    const n=Math.floor(i/cols)*(cols-1)+col+1-(col>2?1:0); if(n>round.seats)return <span key={i}/>;
                    const taken=occupied(route.id,round.round).has(n), pending=pendingSeats(route.id,round.round).has(n), active=seats.includes(n);
                    return <button key={i} aria-label={`ที่นั่ง ${n} ${taken?"จองแล้ว":pending?"อยู่ในรายการรอยืนยัน":active?"เลือกอยู่":"ว่าง"}`} aria-pressed={active} disabled={taken||pending||(!active&&seats.length>=4)} onClick={() => setSeats(prev=>prev.includes(n)?prev.filter(s=>s!==n):[...prev,n])} className={`h-10 rounded-t-lg border text-sm ${taken?"bg-[#333] text-[#555] border-[#333]":pending?"border-[#b48026] text-[#b48026]":active?"bg-[#f5a623] text-[#111] border-[#f5a623]":"border-[#666] hover:border-[#f5a623]"}`}>{n}</button>;
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-5"><p className="text-sm">เลือกแล้ว <b className="text-[#f5a623]">{seats.length}/4</b> ที่นั่ง</p><button className={gold} disabled={!seats.length} onClick={addToCart}>+ เพิ่มในรายการรอยืนยัน</button></div>
            </div>}
          </>}
        </div>
      </section>
      <aside className="space-y-5 min-w-0">
        <section className="border border-[#9c752e] bg-[#24231f] p-4">
          <div className="flex justify-between items-center"><h2 className="font-bold">รายการรอยืนยัน</h2><span className="text-[#f5a623] text-sm">{cart.length} รายการ</span></div>
          <p className="text-xs text-[#aaa] mt-2 mb-4">รายการในนี้ยังไม่ใช่การจองที่ยืนยันแล้ว</p>
          {!cart.length ? <div className="border border-dashed border-[#514b3d] py-8 text-center text-sm text-[#999]">ยังไม่มีรายการรอยืนยัน<br/><span className="text-xs">เลือกที่นั่งแล้วเพิ่มรายการจากด้านซ้าย</span></div> : <>
            <label className="flex gap-2 text-sm mb-3"><input type="checkbox" className="accent-[#f5a623]" checked={selected.length===cart.length} onChange={e=>setSelected(e.target.checked?cart.map(b=>b.id):[])}/>เลือกทั้งหมด ({cart.length})</label>
            <div className="space-y-3">{cart.map((b,i) => <article key={b.id} className="border border-[#494438] p-3 bg-[#1b1d1d]">
              <div className="flex items-start gap-2"><input aria-label={`เลือกรายการ ${i+1}`} type="checkbox" className="accent-[#f5a623] mt-1" checked={selected.includes(b.id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,b.id]:prev.filter(id=>id!==b.id))}/><button className="flex-1 text-left text-sm" aria-expanded={expanded===b.id} onClick={()=>setExpanded(expanded===b.id?null:b.id)}><strong>เส้นทางที่ {b.route} · {routes.find(r=>r.id===b.route)?.schedule.find(n=>n.round===b.round)?.time} น.</strong><span className="block text-xs text-[#aaa] mt-1">{formatDate(b.travelDate)} · ที่นั่ง {b.seatNumbers.join(", ")} · {expanded===b.id?"ซ่อนรายละเอียด ▴":"ดูรายละเอียด ▾"}</span></button></div>
              {expanded===b.id && details(b)}
              <div className="flex justify-between mt-3 gap-2"><button className="text-xs text-[#aaa] hover:text-red-300" onClick={async ()=>{if (!await ask("ยืนยันการลบ", `ลบรายการรอยืนยัน เส้นทางที่ ${b.route} ที่นั่ง ${b.seatNumbers.join(", ")} ใช่หรือไม่?`)) return; setCart(prev=>prev.filter(x=>x.id!==b.id));setSelected(prev=>prev.filter(id=>id!==b.id));}}>ลบรายการ</button><button className="text-xs text-[#f5a623]" onClick={()=>confirm([b.id])}>ยืนยันรายการนี้</button></div>
            </article>)}</div>
            <p className="text-xs text-[#bbb] mt-4 mb-3">เลือก {selected.length} รายการ · {cart.filter(b=>selected.includes(b.id)).reduce((sum,b)=>sum+b.seats,0)} ที่นั่ง</p>
            <button className={`${gold} w-full`} disabled={!selected.length} onClick={()=>confirm(selected)}>ยืนยันที่เลือก ({selected.length})</button>
            <button className={`${outline} w-full mt-2 text-[#f5a623]`} onClick={()=>confirm(cart.map(b=>b.id))}>ยืนยันทั้งหมด ({cart.length})</button>
          </>}
        </section>
        <section className="border border-[#3c3c3c] p-4">
          <h2 className="font-bold mb-4">การจองที่ยืนยันแล้ว <span className="text-[#999] text-sm">({history.length})</span></h2>
          {!history.length && <p className="text-sm text-[#999] py-4">ยังไม่มีการจองที่ยืนยันแล้ว</p>}
          <div className="space-y-3">{history.map(b=><article key={b.id} className="border border-[#3c3c3c] p-3">
            <button className="w-full text-left" aria-expanded={expanded===b.id} onClick={()=>setExpanded(expanded===b.id?null:b.id)}><span className="flex justify-between gap-2 text-xs"><b className="text-[#f5a623]">{b.id}</b><span className={b.status==="confirmed"?"text-green-400":"text-[#888]"}>{b.status==="confirmed"?"ยืนยันแล้ว":"ยกเลิกแล้ว"}</span></span><span className="block mt-2 text-sm">เส้นทางที่ {b.route} · ที่นั่ง {b.seatNumbers.join(", ")}</span><span className="block text-xs text-[#888] mt-1">{b.bookedAt} · ดูรายละเอียด {expanded===b.id?"▴":"▾"}</span></button>
            {expanded===b.id && <>{ticketDetails(b)}{b.status==="confirmed" && <div className="mt-4 flex justify-between gap-3 items-center"><TicketQRCode value={b.qr} /><button className="text-xs text-red-300" onClick={async ()=>{if (!await ask("ยืนยันการยกเลิกการจอง", `ยกเลิกการจอง ${b.id} และคืนที่นั่งใช่หรือไม่?`)) return; setBookings(prev=>prev.map(x=>x.id===b.id?{...x,status:"cancelled"}:x));setMessage("ยกเลิกการจองแล้ว คืนที่นั่งให้เลือกได้อีกครั้ง");}}>ยกเลิกการจอง</button></div>}</>}
          </article>)}</div>
        </section>
      </aside>
    </div>
  </div>;
}

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}
function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("th-TH", {day:"numeric",month:"short",year:"numeric"});
}
function TicketQRCode({ value }: { value: string }) {
  const src = useMemo(() => { const code = qrcode(0, "M") as { addData: (value: string) => void; make: () => void; createDataURL: (size: number, margin: number) => string }; code.addData(value); code.make(); return code.createDataURL(4, 16); }, [value]);
  return <figure className="shrink-0"><img src={src} width={116} height={116} alt={`QR Code ตั๋ว ${value}`} className="bg-white"/><figcaption className="text-[10px] text-[#aaa] mt-1 text-center">QR Code ตั๋ว</figcaption></figure>;
}
