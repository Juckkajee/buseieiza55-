import { useEffect, useState } from "react";

type Route = {
  id: number; name: string; stops: { name: string; min: number | null }[];
  schedule: { round: number; time: string; driver: string; vehicle: string; type: string; seats: number; date?: string }[];
};
type Run = { date: string; jobId: string; startedAt: string; visits: string[]; finishedAt?: string };
type Runs = Record<string, Run>;
type Status = "pending" | "active" | "done";
const STATUS: Record<Status, { label: string; color: string }> = {
  pending: { label: "รอเริ่มงาน", color: "#a5a5a5" },
  active: { label: "กำลังเดินทาง", color: "#f5a623" },
  done: { label: "เสร็จสิ้น", color: "#2ecc71" },
};
const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" }).format(new Date());
const dateLabel = (date: string) => new Date(date + "T12:00:00+07:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
const clockLabel = (time: string) => new Date(time).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
const runKey = (date: string, id: string) => date + ":" + id;
const statusOf = (run?: Run): Status => run?.finishedAt ? "done" : run ? "active" : "pending";
function readRuns(key: string): Runs {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, run]) =>
      run && typeof run === "object" && /^\d{4}-\d{2}-\d{2}$/.test(run.date) && typeof run.jobId === "string"
      && key === runKey(run.date, run.jobId) && typeof run.startedAt === "string" && Number.isFinite(Date.parse(run.startedAt))
      && Array.isArray(run.visits) && run.visits.every((v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v)))
      && (run.finishedAt === undefined || (typeof run.finishedAt === "string" && Number.isFinite(Date.parse(run.finishedAt))))
    ));
  } catch { return {}; }
}

function Badge({ status }: { status: Status }) {
  const item = STATUS[status];
  return <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: item.color, background: item.color + "18" }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />{item.label}</span>;
}

export default function DriverDashboard({ routes, driverName }: { routes: Route[]; driverName: string }) {
  const storageKey = "mut-driver-runs-v1:" + driverName;
  const [date, setDate] = useState(today);
  const [runs, setRuns] = useState<Runs>(() => readRuns(storageKey));
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(runs)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [runs, storageKey]);

  // Undated entries are the existing daily timetable; explicit dates override recurrence per entry.
  const jobs = routes.flatMap(route => route.schedule
    .filter(round => round.driver === driverName && (!round.date || round.date === date))
    .map(round => ({ ...round, route, id: route.id + "-" + round.round }))
  ).sort((a, b) => a.time.localeCompare(b.time) || a.route.id - b.route.id);
  const counts = { all: jobs.length, pending: 0, active: 0, done: 0 };
  jobs.forEach(job => counts[statusOf(runs[runKey(date, job.id)])]++);
  const shown = jobs.filter(job => filter === "all" || statusOf(runs[runKey(date, job.id)]) === filter);
  const selected = jobs.find(job => job.id === selectedId) ?? shown[0] ?? null;
  const key = selected ? runKey(date, selected.id) : "";
  const run = runs[key];
  const status = statusOf(run);
  const activeEntry = Object.entries(runs).find(([, value]) => !value.finishedAt);
  const otherActive = !!activeEntry && activeEntry[0] !== key;
  const visited = run?.visits.length ?? 0;
  const stops = selected?.route.stops ?? [];
  const progress = stops.length ? Math.round(visited / stops.length * 100) : 0;
  const duration = stops.reduce((sum, stop) => sum + (stop.min ?? 0), 0);
  const changeDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value))) return;
    setDate(value); setSelectedId(""); setFilter("all"); setMessage("");
  };
  const moveDay = (offset: number) => {
    const next = new Date(date + "T12:00:00Z"); next.setUTCDate(next.getUTCDate() + offset);
    changeDate(next.toISOString().slice(0, 10));
  };
  const start = () => {
    if (!selected || !stops.length) return;
    setRuns(previous => {
      if (previous[key] || Object.values(previous).some(value => !value.finishedAt)) return previous;
      return { ...previous, [key]: { date, jobId: selected.id, startedAt: new Date().toISOString(), visits: [] } };
    });
    setMessage("เริ่มงานแล้ว กดเช็กอินเมื่อถึงจุดจอดตามลำดับ");
  };
  const checkStop = (index: number) => {
    setRuns(previous => {
      const current = previous[key];
      if (!current || current.finishedAt || current.visits.length !== index || index >= stops.length) return previous;
      return { ...previous, [key]: { ...current, visits: [...current.visits, new Date().toISOString()] } };
    });
    setMessage("เช็กอินจุดที่ " + (index + 1) + " แล้ว · " + stops[index].name);
  };
  const finish = () => {
    setRuns(previous => {
      const current = previous[key];
      if (!current || current.finishedAt || !stops.length || current.visits.length !== stops.length) return previous;
      return { ...previous, [key]: { ...current, finishedAt: new Date().toISOString() } };
    });
    setMessage("ปิดงานเรียบร้อยแล้ว เช็กอินครบทุกจุดจอด");
  };
  const stopTime = (index: number) => {
    if (!selected) return "";
    const [hour, minute] = selected.time.split(":").map(Number);
    const total = hour * 60 + minute + stops.slice(0, index + 1).reduce((sum, stop) => sum + (stop.min ?? 0), 0);
    return String(Math.floor(total / 60) % 24).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0") + (total >= 1440 ? " (+1 วัน)" : "");
  };

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-5">
        <div><p className="mono mb-2 text-[10px] tracking-[0.22em] text-[#f5a623]">DRIVER WORKSPACE</p><h1 className="text-2xl font-black">ตารางงานของฉัน</h1><p className="mt-1 text-sm text-[#999]">{driverName} <span className="mx-2 text-[#444]">/</span> ดูงานและติดตามการเดินทาง</p></div>
        <div className="flex items-end gap-2"><div><label htmlFor="driver-work-date" className="mb-1.5 block text-xs text-[#aaa]">วันที่ปฏิบัติงาน</label><div className="flex rounded-lg border border-[#333] bg-[#111]"><button aria-label="วันก่อนหน้า" onClick={() => moveDay(-1)} className="px-3 text-xl text-[#aaa] hover:text-white">‹</button><input id="driver-work-date" type="date" value={date} onChange={event => changeDate(event.target.value)} className="mono min-w-0 bg-transparent px-1 py-2.5 text-sm text-[#f5a623] outline-none [color-scheme:dark]" /><button aria-label="วันถัดไป" onClick={() => moveDay(1)} className="px-3 text-xl text-[#aaa] hover:text-white">›</button></div></div><button onClick={() => changeDate(today())} className="rounded-lg border border-[#333] px-3 py-2.5 text-sm hover:border-[#f5a623]">วันนี้</button></div>
      </header>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([{ id: "all", label: "งานทั้งหมด", color: "#f0ede6" }, { id: "pending", label: "รอเริ่มงาน", color: "#aaa" }, { id: "active", label: "กำลังเดินทาง", color: "#f5a623" }, { id: "done", label: "เสร็จสิ้น", color: "#2ecc71" }] as const).map(item => <button key={item.id} aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setSelectedId(""); setMessage(""); }} className={"rounded-xl border bg-[#111] p-4 text-left transition-colors " + (filter === item.id ? "border-[#f5a623]" : "border-[#262626] hover:border-[#555]")}><p className="mb-2 text-xs text-[#aaa]">{item.label}</p><p className="mono text-2xl font-bold" style={{ color: item.color }}>{counts[item.id]} <span className="font-normal text-xs text-[#777]">งาน</span></p></button>)}
      </div>
      {storageError && <p role="alert" className="mb-4 rounded-lg border border-[#e74c3c]/40 p-3 text-sm text-[#ff9c92]">เบราว์เซอร์ไม่สามารถบันทึกความคืบหน้าได้ กรุณาอย่ารีเฟรชหน้านี้ระหว่างทำงาน</p>}
      {otherActive && activeEntry && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#f5a623]/30 bg-[#f5a623]/5 p-3 text-sm"><span className="text-[#d8bd92]">มีงานที่ยังไม่ปิดรอบ ต้องทำงานนั้นให้เสร็จก่อนเริ่มงานใหม่</span><button className="font-bold text-[#f5a623]" onClick={() => { setDate(activeEntry[1].date); setSelectedId(activeEntry[1].jobId); setFilter("all"); setMessage(""); }}>กลับไปงานที่กำลังทำ →</button></div>}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.4fr)]">
        <section aria-label="รายการงานตามวันที่" className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-bold">{dateLabel(date)}</h2><span className="text-xs text-[#888]">{shown.length} งาน</span></div>
          <div className="space-y-3">
            {shown.map(job => { const state = statusOf(runs[runKey(date, job.id)]); const isSelected = selected?.id === job.id; return <button key={job.id} aria-pressed={isSelected} aria-label={job.time + " " + job.route.name + " รอบที่ " + job.round} onClick={() => { setSelectedId(job.id); setMessage(""); }} className={"w-full rounded-xl border p-4 text-left transition-colors " + (isSelected ? "border-[#f5a623] bg-[#f5a623]/5" : "border-[#292929] bg-[#111] hover:border-[#555]")}><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="mono text-xl font-bold text-[#f5a623]">{job.time} <span className="text-xs font-normal">น.</span></span><Badge status={state} /></div><div className="mb-2 flex items-center justify-between gap-2"><span className="font-bold">{job.route.name}</span><span className="text-xs text-[#999]">รอบที่ {job.round}</span></div><p className="text-xs leading-5 text-[#999]">{job.route.stops[0]?.name} → {job.route.stops[job.route.stops.length - 1]?.name}</p><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#292929] pt-3 text-xs"><span className="mono text-[#ddd]">{job.vehicle}</span><span className="text-[#999]">{job.type} · {job.seats} ที่นั่ง</span><span className="ml-auto text-[#f5a623]">ดูงาน →</span></div></button>; })}
            {!shown.length && <div className="rounded-xl border border-dashed border-[#333] px-5 py-12 text-center"><p className="font-bold text-[#bbb]">{jobs.length ? "ไม่มีงานในสถานะนี้" : "ไม่มีงานที่ได้รับมอบหมาย"}</p><p className="mt-2 text-xs text-[#888]">{jobs.length ? "เลือกงานทั้งหมดเพื่อดูรอบอื่น" : "ลองเลือกวันที่อื่นเพื่อดูตารางงาน"}</p></div>}
          </div>
        </section>
        <section aria-label="รายละเอียดงานและจุดจอด" className="min-w-0 overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#111]">
          {!selected ? <div className="px-6 py-20 text-center text-sm text-[#888]">เลือกงานเพื่อดูรายละเอียดเส้นทางและจุดจอด</div> : <>
            <div className="border-b border-[#292929] p-5 sm:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="mono text-[10px] tracking-widest text-[#999]">รายละเอียดงาน · รอบที่ {selected.round}</p><Badge status={status} /></div><h2 className="text-xl font-black">{selected.route.name} <span className="ml-2 text-base font-normal text-[#f5a623]">{selected.time} น.</span></h2><p className="mt-1 text-xs text-[#999]">{dateLabel(date)}</p><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">{[{ label: "ทะเบียนรถ", value: selected.vehicle }, { label: "ประเภทรถ", value: selected.type + " · " + selected.seats + " ที่นั่ง" }, { label: "เวลาเดินทาง", value: duration + " นาที" }, { label: "จุดจอดทั้งหมด", value: stops.length + " จุด" }].map(item => <div key={item.label}><p className="mb-1 text-[11px] text-[#888]">{item.label}</p><p className="text-sm font-semibold">{item.value}</p></div>)}</div>
              {status === "pending" && <div className="mt-5"><button onClick={start} disabled={otherActive || !stops.length} className="w-full rounded-lg bg-[#f5a623] py-3 text-sm font-bold text-[#0a0a0a] transition-colors hover:bg-[#ffb83f] disabled:cursor-not-allowed disabled:bg-[#292929] disabled:text-[#777]">▶ เริ่มงาน</button><p className="mt-2 text-center text-[11px] text-[#999]">เริ่มงานก่อน แล้วเช็กอินเมื่อถึงแต่ละจุดจอด</p></div>}
              {status !== "pending" && <div className="mt-5 rounded-lg border border-[#2c3a2f] bg-[#2ecc71]/5 p-3"><div className="flex flex-wrap justify-between gap-2 text-xs"><span className="text-[#b7c9bc]">เริ่มงาน {clockLabel(run.startedAt)} น.</span>{run.finishedAt && <span className="text-[#2ecc71]">ปิดงาน {clockLabel(run.finishedAt)} น.</span>}</div></div>}
            </div>
            <div className="p-5 sm:p-6"><div className="mb-2 flex items-center justify-between gap-3"><h3 className="font-bold">ความคืบหน้าการเดินทาง</h3><span className="mono text-xs text-[#f5a623]">{visited} / {stops.length} จุด</span></div><div role="progressbar" aria-label="จุดจอดที่เช็กอินแล้ว" aria-valuemin={0} aria-valuemax={stops.length} aria-valuenow={visited} className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#292929]"><div className="h-full rounded-full transition-all" style={{ width: progress + "%", background: status === "done" ? "#2ecc71" : "#f5a623" }} /></div><p className="mb-5 text-xs text-[#999]">{status === "done" ? "เดินทางครบทุกจุดและปิดงานเรียบร้อยแล้ว" : status === "pending" ? "จุดจอดเรียงตามลำดับการเดินทาง · เวลาตามตาราง" : visited === stops.length ? "ถึงปลายทางแล้ว กดปิดงานเพื่อจบรอบนี้" : "จุดถัดไป: " + stops[visited]?.name}</p>
              <ol>{stops.map((stop, index) => { const passed = index < visited; const next = status === "active" && index === visited; return <li key={index} className="relative flex gap-3 pb-5 last:pb-0">{index < stops.length - 1 && <div className={"absolute left-[15px] top-8 h-[calc(100%-20px)] w-px " + (passed ? "bg-[#2ecc71]/40" : "bg-[#303030]")} />}<span className={"relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold " + (passed ? "border-[#2ecc71]/50 bg-[#13271b] text-[#2ecc71]" : next ? "border-[#f5a623] bg-[#302516] text-[#f5a623]" : "border-[#383838] bg-[#191919] text-[#888]")}>{passed ? "✓" : index + 1}</span><div className={"min-w-0 flex-1 rounded-lg border p-3 " + (next ? "border-[#f5a623]/40 bg-[#f5a623]/5" : "border-[#242424]")}><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className={"break-words text-sm font-semibold " + (passed ? "text-[#b4d1be]" : "text-[#e2dfd9]")}>{stop.name}</p><p className="mt-1 text-[11px] text-[#999]">ตามตาราง {stopTime(index)} น. · {index === 0 ? "จุดเริ่มต้น" : index === stops.length - 1 ? "จุดปลายทาง" : "จุดจอดที่ " + (index + 1)}</p></div>{passed ? <span className="text-[11px] text-[#2ecc71]">เช็กอินแล้ว {clockLabel(run.visits[index])} น.</span> : <span className={"text-[11px] " + (next ? "text-[#f5a623]" : "text-[#777]")}>{next ? "จุดถัดไป" : "รอผ่านจุด"}</span>}</div>{next && <button onClick={() => checkStop(index)} className="mt-3 rounded-md bg-[#f5a623] px-4 py-2 text-xs font-bold text-[#111] hover:bg-[#ffb83f]">เช็กอินจุดนี้ · ถึงจุดจอดแล้ว</button>}</div></li>; })}</ol>
              {status === "active" && <div className="mt-6 border-t border-[#292929] pt-4"><button onClick={finish} disabled={visited !== stops.length || !stops.length} className="w-full rounded-lg bg-[#2ecc71] py-3 text-sm font-bold text-[#07180e] hover:bg-[#43db83] disabled:cursor-not-allowed disabled:bg-[#252525] disabled:text-[#777]">ปิดงาน / จบการเดินทาง</button>{visited !== stops.length && <p className="mt-2 text-center text-[11px] text-[#888]">เช็กอินให้ครบทุกจุดก่อนปิดงาน</p>}</div>}
              {status === "done" && <div className="mt-5 rounded-lg border border-[#2ecc71]/30 bg-[#2ecc71]/5 p-4 text-center text-sm font-semibold text-[#2ecc71]">✓ งานเสร็จสิ้น · ผ่านครบ {stops.length} จุดจอด</div>}
            </div>
          </>}
        </section>
      </div>
      <p role="status" aria-live="polite" className="mt-4 min-h-5 text-sm text-[#d8b77f]">{message}</p>
    </div>
  );
}
