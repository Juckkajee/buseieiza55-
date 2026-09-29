import BookingCart from "../BookingCart";
import DriverDashboard from "../DriverDashboard";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── DATA ───────────────────────────────────────────────────────────────────

const ROUTES_DATA = [
  {
    id: 1, name: "เส้นทางที่ 1", totalMin: 30,
    stops: [
      { name: "มหาวิทยาลัยเทคโนโลยีมหานคร", min: null },
      { name: "โลตัสหนองจอก", min: 5 },
      { name: "โรงพยาบาลหนองจอก", min: 3 },
      { name: "Big C หนองจอก", min: 6 },
      { name: "โรงพยาบาลหนองจอก", min: 3 },
      { name: "โลตัสหนองจอก", min: 3 },
      { name: "มหาวิทยาลัยเทคโนโลยีมหานคร", min: 10 },
    ],
    schedule: [
      { round: 1, time: "09:30", driver: "สมชาย ใจดี", vehicle: "สาย 2591", type: "รถตู้", seats: 9 },
      { round: 2, time: "11:00", driver: "สมหมาย ใจรัก", vehicle: "สาย 2591", type: "รถตู้", seats: 9 },
      { round: 3, time: "13:00", driver: "สมชาย ใจดี", vehicle: "บก 1130", type: "รถบัส", seats: 20 },
      { round: 4, time: "15:00", driver: "สมชาย ใจดี", vehicle: "บก 1130", type: "รถบัส", seats: 20 },
    ],
  },
  {
    id: 2, name: "เส้นทางที่ 2", totalMin: 13,
    stops: [
      { name: "มหาวิทยาลัยเทคโนโลยีมหานคร", min: null },
      { name: "โลตัสหนองจอก", min: 5 },
      { name: "สวนสาธารณะหนองจอก", min: 3 },
      { name: "ร้านส้มตำป้านาง", min: 5 },
    ],
    schedule: [
      { round: 1, time: "09:30", driver: "สมควร ใจงาม", vehicle: "สาย 2599", type: "รถตู้", seats: 9 },
      { round: 2, time: "11:00", driver: "สมควร ใจงาม", vehicle: "สาย 2599", type: "รถตู้", seats: 9 },
      { round: 3, time: "13:00", driver: "สมหมาย ใจรัก", vehicle: "สาย 2599", type: "รถตู้", seats: 9 },
      { round: 4, time: "15:00", driver: "สมหมาย ใจรัก", vehicle: "สาย 2599", type: "รถตู้", seats: 9 },
    ],
  },
  {
    id: 3, name: "เส้นทางที่ 3", totalMin: 12,
    stops: [
      { name: "Big C หนองจอก", min: null },
      { name: "โลตัสหนองจอก", min: 5 },
      { name: "สวนสาธารณะหนองจอก", min: 3 },
      { name: "ร้านส้มตำป้านาง", min: 5 },
      { name: "มหาวิทยาลัยเทคโนโลยีมหานคร", min: 2 },
    ],
    schedule: [
      { round: 1, time: "09:30", driver: "สมควร ใจงาม", vehicle: "สาย 2588", type: "รถตู้", seats: 9 },
      { round: 2, time: "11:00", driver: "สมควร ใจงาม", vehicle: "สาย 2588", type: "รถตู้", seats: 9 },
      { round: 3, time: "13:00", driver: "สมชาย ใจดี", vehicle: "สาย 2588", type: "รถตู้", seats: 9 },
      { round: 4, time: "15:00", driver: "สมชาย ใจดี", vehicle: "สาย 2588", type: "รถตู้", seats: 9 },
    ],
  },
];

const EMPLOYEES = [
  { id: "E001", name: "สมชาย ใจดี", deptCode: "TRN-01", dept: "ฝ่ายขนส่ง", role: "คนขับรถ", phone: "081-111-2233", email: "somchai@example.com", username: "somchai", hasPassword: true },
  { id: "E002", name: "สมหมาย ใจรัก", deptCode: "TRN-01", dept: "ฝ่ายขนส่ง", role: "คนขับรถ", phone: "082-222-3344", email: "sommai@example.com", username: "sommai", hasPassword: true },
  { id: "E003", name: "สมควร ใจงาม", deptCode: "TRN-01", dept: "ฝ่ายขนส่ง", role: "คนขับรถ", phone: "083-333-4455", email: "somkuan@example.com", username: "somkuan", hasPassword: true },
  { id: "E004", name: "วิภา รักงาน", deptCode: "SRV-02", dept: "ฝ่ายบริการ", role: "เจ้าหน้าที่", phone: "084-444-5566", email: "wipa@example.com", username: "wipa", hasPassword: true },
  { id: "E005", name: "ประยุทธ์ ดีมาก", deptCode: "SRV-02", dept: "ฝ่ายบริการ", role: "ผู้จัดการ", phone: "085-555-6677", email: "prayut@example.com", username: "prayut", hasPassword: true },
];

const USER_DETAILS = { code: "U001", phone: "089-123-4567" };

const DEPT_MAP: Record<string, string> = {
  "ฝ่ายขนส่ง": "TRN-01",
  "ฝ่ายบริการ": "SRV-02",
  "ฝ่ายบริหาร": "ADM-03",
  "ฝ่ายเทคโนโลยี": "ICT-04",
};

const POSITION_LIST = ["คนขับรถ", "เจ้าหน้าที่", "ผู้จัดการ", "ผู้ช่วยผู้จัดการ"];

type Vehicle = { id: string; plate: string; type: "รถตู้" | "รถบัส"; seats: number; brand: string; year: number; status: "พร้อมใช้" | "ซ่อมบำรุง" };

const INITIAL_VEHICLES: Vehicle[] = [
  { id: "V001", plate: "สาย 2591", type: "รถตู้", seats: 9, brand: "Toyota Commuter", year: 2563, status: "พร้อมใช้" },
  { id: "V002", plate: "สาย 2599", type: "รถตู้", seats: 9, brand: "Toyota Commuter", year: 2564, status: "พร้อมใช้" },
  { id: "V003", plate: "สาย 2588", type: "รถตู้", seats: 9, brand: "Toyota Commuter", year: 2562, status: "พร้อมใช้" },
  { id: "V004", plate: "บก 1130", type: "รถบัส", seats: 20, brand: "Hino Bus", year: 2561, status: "พร้อมใช้" },
  { id: "V005", plate: "บก 2244", type: "รถบัส", seats: 20, brand: "Hino Bus", year: 2565, status: "ซ่อมบำรุง" },
];

const BOOKINGS_MOCK = [
  { id: "BK001", user: "นายกิตติ สุขใจ", route: 1, round: 2, from: "มหาวิทยาลัยเทคโนโลยีมหานคร", to: "โลตัสหนองจอก", seats: 2, seatNumbers: [2, 3], status: "confirmed" as const, qr: "QR-BK001", bookedAt: "14 ก.ย. 08:45" },
  { id: "BK002", user: "นางสาวมาลี ดีงาม", route: 1, round: 1, from: "มหาวิทยาลัยเทคโนโลยีมหานคร", to: "Big C หนองจอก", seats: 1, seatNumbers: [5], status: "confirmed" as const, qr: "QR-BK002", bookedAt: "13 ก.ย. 16:20" },
  { id: "BK003", user: "นายวีระ ใจกล้า", route: 2, round: 3, from: "มหาวิทยาลัยเทคโนโลยีมหานคร", to: "ร้านส้มตำป้านาง", seats: 3, seatNumbers: [1, 2, 3], status: "cancelled" as const, qr: "QR-BK003", bookedAt: "12 ก.ย. 10:05" },
];

const INITIAL_OCCUPIED_SEATS: Record<string, number[]> = {
  "1-1": [1, 4, 7], "1-2": [1, 5, 7], "1-3": [2, 4, 7, 9, 12, 16], "1-4": [1, 3, 8, 11, 15],
  "2-1": [2, 6], "2-2": [1, 3, 8], "2-3": [4, 7], "2-4": [2, 5, 9],
  "3-1": [1, 5], "3-2": [3, 7], "3-3": [2, 6], "3-4": [4, 8],
};

const MONTHS_TH = ["ก.ค.", "ก.พ.", "ก.ย.", "ต.ค.", "ธ.ค.", "พ.ค.", "พ.ย.", "ม.ค.", "มิ.ย.", "มี.ค.", "ส.ค.", "เม.ย."];

const CHART_DATA = MONTHS_TH.map((m, i) => ({
  month: m,
  "Big C หนองจอก": 120 + Math.floor(Math.sin(i) * 30 + Math.random() * 20),
  "มหาวิทยาลัยฯ": 150 + Math.floor(Math.cos(i) * 25 + Math.random() * 20),
  "ร้านส้มตำป้านาง": 80 + Math.floor(Math.sin(i + 1) * 20 + Math.random() * 15),
  "สวนสาธารณะ": 60 + Math.floor(Math.cos(i + 1) * 15 + Math.random() * 10),
  "โรงพยาบาล": 45 + Math.floor(Math.sin(i + 2) * 12 + Math.random() * 10),
  "โลตัส หนองจอก": 100 + Math.floor(Math.cos(i + 2) * 20 + Math.random() * 15),
}));

const REPORT2_DATA = [
  { station: "มหาวิทยาลัยฯ", bookings: 1898, seats: 1453, cancelled: 120, checkin: 1265, noshow: 68 },
  { station: "โลตัส หนองจอก", bookings: 1455, seats: 1321, cancelled: 95, checkin: 1055, noshow: 79 },
  { station: "โรงพยาบาลหนองจอก", bookings: 1244, seats: 1100, cancelled: 80, checkin: 997, noshow: 67 },
  { station: "Big C หนองจอก", bookings: 697, seats: 620, cancelled: 40, checkin: 530, noshow: 50 },
  { station: "สวนสาธารณะ", bookings: 1049, seats: 930, cancelled: 68, checkin: 855, noshow: 45 },
  { station: "ร้านส้มตำป้านาง", bookings: 504, seats: 450, cancelled: 30, checkin: 400, noshow: 20 },
];

type Role = "admin" | "user" | "driver";
type Page = "login" | "booking" | "admin-routes" | "admin-schedule" | "admin-employees" | "admin-permissions" | "admin-vehicles" | "driver" | "reports";

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────

function Chip({ label, color }: { label: string; color: string }) {
  const map: Record<string, string> = {
    green: "bg-green-900/40 text-green-400 border-green-800",
    red: "bg-red-900/40 text-red-400 border-red-800",
    amber: "bg-amber-900/40 text-amber-400 border-amber-800",
    blue: "bg-blue-900/40 text-blue-400 border-blue-800",
    gray: "bg-[#222] text-[#888] border-[#333]",
  };
  return <span className={`mono text-[10px] border px-2 py-0.5 tracking-wider ${map[color]}`}>{label}</span>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-5 bg-[#f5a623]" />
      <h2 className="font-bold text-lg tracking-wide">{children}</h2>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2a2a2a]">
            {headers.map(h => (
              <th key={h} className="mono text-[10px] text-[#555] tracking-widest text-left px-3 py-2 font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#1a1a1a] hover:bg-[#111] transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 text-[#d0ccc5]">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── SIDEBAR ────────────────────────────────────────────────────────────────

function Sidebar({ role, page, setPage, setRole, user }: {
  role: Role; page: Page; setPage: (p: Page) => void; setRole: (r: Role | null) => void; user: string;
}) {
  const adminNav = [
    { label: "จัดการเส้นทาง", page: "admin-routes" as Page, icon: "🗺" },
    { label: "ตารางเดินรถ", page: "admin-schedule" as Page, icon: "📅" },
    { label: "จัดการพนักงาน", page: "admin-employees" as Page, icon: "👥" },
    { label: "ข้อมูลรถ", page: "admin-vehicles" as Page, icon: "🚐" },
    { label: "สิทธิ์การเข้าถึง", page: "admin-permissions" as Page, icon: "🔐" },
    { label: "รายงาน", page: "reports" as Page, icon: "📊" },
  ];
  const userNav = [
    { label: "จองรถ", page: "booking" as Page, icon: "🎫" },
  ];
  const driverNav = [
    { label: "ตารางงานของฉัน", page: "driver" as Page, icon: "🚌" },
  ];
  const nav = role === "admin" ? adminNav : role === "driver" ? driverNav : userNav;

  return (
    <aside className="w-52 bg-[#0d0d0d] border-r border-[#2a2a2a] flex flex-col shrink-0">
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 bg-[#f5a623]" />
          <span className="font-bold text-xs tracking-[0.15em] uppercase text-[#f5a623]">MUT Shuttle</span>
        </div>
        <p className="text-[10px] text-[#555] mono tracking-wider">ระบบ Shuttle Bus</p>
      </div>
      <div className="p-3 border-b border-[#2a2a2a]">
        <p className="text-xs text-[#888] mb-0.5">ผู้ใช้งาน</p>
        <p className="text-sm font-semibold truncate">{user}</p>
        {role === "user" && (
          <div className="mt-2 space-y-1 border-l border-[#2a2a2a] pl-2">
            <p className="mono text-[10px] text-[#888] tracking-wide">รหัสผู้ใช้ <span className="text-[#f5a623]">{USER_DETAILS.code}</span></p>
            <p className="mono text-[10px] text-[#888] tracking-wide">โทร. <span className="text-[#d0ccc5]">{USER_DETAILS.phone}</span></p>
          </div>
        )}
        <div className={role === "user" ? "mt-2" : "mt-1"}>
          <Chip label={role === "admin" ? "ADMIN" : role === "driver" ? "DRIVER" : "USER"} color={role === "admin" ? "amber" : role === "driver" ? "blue" : "green"} />
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(item => (
          <button
            key={item.page}
            onClick={() => setPage(item.page)}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${page === item.page ? "bg-[#f5a623] text-[#0a0a0a] font-semibold" : "text-[#888] hover:text-[#f0ede6] hover:bg-[#1a1a1a]"}`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-[#2a2a2a]">
        <button
          onClick={() => setRole(null)}
          className="w-full text-left px-3 py-2 text-xs text-[#555] hover:text-[#e74c3c] transition-colors"
        >
          ออกจากระบบ →
        </button>
      </div>
    </aside>
  );
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: (role: Role, user: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handle = () => {
    if (username === "admin" && password === "1234") onLogin("admin", "ผู้ดูแลระบบ (Admin)");
    else if (username === "driver" && password === "1234") onLogin("driver", "สมชาย ใจดี (คนขับ)");
    else if (username === "user" && password === "1234") onLogin("user", "นายกิตติ สุขใจ");
    else setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-[#0d0d0d] border-r border-[#2a2a2a] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute border border-[#f5a623]"
              style={{ width: `${60 + i * 40}px`, height: `${60 + i * 40}px`, top: `${10 + i * 7}%`, left: `${5 + i * 6}%`, transform: `rotate(${i * 15}deg)` }} />
          ))}
        </div>
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-3 h-3 bg-[#f5a623]" />
            <span className="font-bold tracking-[0.2em] uppercase text-[#f5a623]">MUT Shuttle Bus</span>
          </div>
          <h1 className="font-black text-4xl leading-tight text-[#f0ede6] mb-4">
            ระบบบริการ<br />รถรับส่ง MUT
          </h1>
          <p className="text-[#888] leading-relaxed">
            มหาวิทยาลัยเทคโนโลยีมหานคร<br />
            ให้บริการรถรับส่งนักศึกษาและเจ้าหน้าที่<br />
            ในแวกหนองจอก
          </p>
        </div>
        <div className="space-y-3">
          {[
            { label: "เส้นทางให้บริการ", value: "3 เส้นทาง" },
            { label: "รอบเดินรถต่อวัน", value: "4 รอบ/เส้นทาง" },
            { label: "จุดจอดรับส่ง", value: "7 จุด" },
          ].map(s => (
            <div key={s.label} className="flex justify-between border-b border-[#1a1a1a] pb-2">
              <span className="text-[#555] text-sm">{s.label}</span>
              <span className="mono text-[#f5a623] text-sm font-medium">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="font-black text-2xl mb-1">เข้าสู่ระบบ</h2>
            <p className="text-[#555] text-sm">กรุณาล็อกอินเพื่อใช้งานระบบ</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1.5">ชื่อผู้ใช้</label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handle()}
                placeholder="admin / driver / user"
                className="w-full bg-[#111] border border-[#2a2a2a] text-[#f0ede6] px-4 py-3 text-sm outline-none focus:border-[#f5a623] transition-colors placeholder:text-[#444]"
              />
            </div>
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1.5">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handle()}
                placeholder="1234"
                className="w-full bg-[#111] border border-[#2a2a2a] text-[#f0ede6] px-4 py-3 text-sm outline-none focus:border-[#f5a623] transition-colors placeholder:text-[#444]"
              />
            </div>
            {error && <p className="text-[#e74c3c] text-sm">{error}</p>}
            <button
              onClick={handle}
              className="w-full bg-[#f5a623] text-[#0a0a0a] font-bold py-3 text-sm tracking-wider hover:bg-[#e09520] transition-colors"
            >
              เข้าสู่ระบบ
            </button>
          </div>

          <div className="mt-6 p-4 border border-[#2a2a2a] bg-[#111]">
            <p className="mono text-[10px] text-[#555] tracking-widest mb-2">ข้อมูลทดสอบ</p>
            <div className="space-y-1 text-xs text-[#666]">
              <p><span className="text-[#888]">admin</span> / 1234 — ผู้ดูแลระบบ</p>
              <p><span className="text-[#888]">driver</span> / 1234 — คนขับรถ</p>
              <p><span className="text-[#888]">user</span> / 1234 — นักศึกษา/เจ้าหน้าที่</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BOOKING ─────────────────────────────────────────────────────────────────

type BookingEntry = {
  id: string; user: string; route: number; round: number;
  from: string; to: string; seats: number; seatNumbers: number[]; status: "confirmed" | "cancelled";
  qr: string; bookedAt: string;
};

const QR_PATTERN = [1,0,1,1,0,0,1,0,1,1,1,0,0,1,1,0,1,0,0,1,1,1,0,1,0];

function QRBlock() {
  return (
    <div className="w-20 h-20 border-2 border-[#f5a623] bg-[#111] grid grid-cols-5 gap-0.5 p-1.5 shrink-0">
      {QR_PATTERN.map((v, i) => (
        <div key={i} className={`${v ? "bg-[#f5a623]" : "bg-transparent"}`} />
      ))}
    </div>
  );
}

function BookingPage() {
  return <BookingCart routes={ROUTES_DATA} initialOccupied={INITIAL_OCCUPIED_SEATS} initialBookings={BOOKINGS_MOCK} userName="นายกิตติ สุขใจ" QrCode={QRBlock} />;
}

// ─── ADMIN: ROUTES ────────────────────────────────────────────────────────────

type Stop = { name: string; min: number | null };
type RouteEntry = typeof ROUTES_DATA[number] & { stops: Stop[] };

function AdminRoutes() {
  const [routes, setRoutes] = useState<RouteEntry[]>(ROUTES_DATA.map(r => ({ ...r, stops: r.stops.map(s => ({ ...s })) })));
  const [activeRoute, setActiveRoute] = useState(1);
  const route = routes.find(r => r.id === activeRoute)!;

  const [editStopIdx, setEditStopIdx] = useState<number | null>(null);
  const [editStopName, setEditStopName] = useState("");
  const [editStopMin, setEditStopMin] = useState("");
  const [newStopName, setNewStopName] = useState("");
  const [newStopMin, setNewStopMin] = useState("");
  const [showAddStop, setShowAddStop] = useState(false);
  const [stopAnchor, setStopAnchor] = useState(0);
  const [stopSide, setStopSide] = useState<"before" | "after">("after");
  const [nextStopMin, setNextStopMin] = useState("5");
  const [stopError, setStopError] = useState("");
  const insertIndex = route.stops.length ? stopAnchor + (stopSide === "after" ? 1 : 0) : 0;
  const [editRoundId, setEditRoundId] = useState<number | null>(null);
  const [roundError, setRoundError] = useState("");
  const [deleteRoundId, setDeleteRoundId] = useState<number | null>(null);
  const [deletedRound, setDeletedRound] = useState<{ routeId: number; value: RouteEntry["schedule"][number] } | null>(null);

  const [showAddRound, setShowAddRound] = useState(false);
  const [roundTime, setRoundTime] = useState("");
  const [roundDriver, setRoundDriver] = useState("");
  const [roundVehicle, setRoundVehicle] = useState("");

  const updateRoute = (id: number, fn: (r: RouteEntry) => RouteEntry) => {
    setRoutes(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = fn(r);
      const stops = updated.stops.map((stop, index) => ({ ...stop, min: index === 0 ? null : stop.min }));
      return { ...updated, stops, totalMin: stops.reduce((sum, stop) => sum + (stop.min ?? 0), 0) };
    }));
  };

  const deleteStop = (idx: number) => {
    updateRoute(activeRoute, r => ({ ...r, stops: r.stops.filter((_, i) => i !== idx) }));
    setEditStopIdx(null); setShowAddStop(false); setStopError("");
  };

  const startEditStop = (idx: number) => {
    setStopError(""); setShowAddStop(false); setEditStopIdx(idx);
    setEditStopName(route.stops[idx].name);
    setEditStopMin(route.stops[idx].min?.toString() ?? "");
  };

  const saveEditStop = () => {
    if (editStopIdx === null) return;
    if (!editStopName.trim() || (editStopIdx > 0 && (!Number.isInteger(Number(editStopMin)) || Number(editStopMin) < 1))) {
      setStopError("กรอกชื่อจุดจอดและเวลาเดินทางเป็นจำนวนนาทีมากกว่า 0"); return;
    }
    updateRoute(activeRoute, r => ({
      ...r, stops: r.stops.map((stop, i) => i === editStopIdx ? { name: editStopName.trim(), min: i === 0 ? null : Number(editStopMin) } : stop),
    }));
    setStopError("");
    setEditStopIdx(null);
  };

  const openAddStop = () => {
    setEditStopIdx(null); setStopError(""); setNewStopName(""); setNewStopMin("5");
    setStopAnchor(Math.max(0, route.stops.length - 1)); setStopSide("after"); setNextStopMin("5"); setShowAddStop(true);
  };
  const choosePlacement = (anchor: number, side: "before" | "after") => {
    setStopAnchor(anchor); setStopSide(side); setStopError("");
    const index = anchor + (side === "after" ? 1 : 0);
    setNextStopMin(String(route.stops[index]?.min || 5));
  };
  const addStop = () => {
    const validMinutes = (value: string) => Number.isInteger(Number(value)) && Number(value) > 0;
    if (!newStopName.trim() || (insertIndex > 0 && !validMinutes(newStopMin)) || (insertIndex < route.stops.length && !validMinutes(nextStopMin))) {
      setStopError("กรอกชื่อจุดจอดและเวลาเดินทางแต่ละช่วงเป็นจำนวนนาทีมากกว่า 0"); return;
    }
    updateRoute(activeRoute, r => {
      const stops = r.stops.map(stop => ({ ...stop }));
      stops.splice(insertIndex, 0, { name: newStopName.trim(), min: insertIndex === 0 ? null : Number(newStopMin) });
      if (stops[insertIndex + 1]) stops[insertIndex + 1].min = Number(nextStopMin);
      return { ...r, stops };
    });
    setNewStopName(""); setNewStopMin(""); setShowAddStop(false); setStopError("");
  };
  const openRound = (round?: RouteEntry["schedule"][number]) => {
    setEditRoundId(round?.round ?? null); setRoundTime(round?.time ?? "");
    setRoundDriver(round?.driver ?? ""); setRoundVehicle(round?.vehicle ?? "");
    setRoundError(""); setDeleteRoundId(null); setShowAddRound(true);
  };
  const addRound = () => {
    const vehicle = INITIAL_VEHICLES.find(v => v.plate === roundVehicle);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(roundTime) || !roundDriver || !vehicle) {
      setRoundError("กรุณาระบุเวลา คนขับ และรถให้ครบ"); return;
    }
    if (vehicle.status !== "พร้อมใช้") { setRoundError("รถที่เลือกอยู่ระหว่างซ่อมบำรุง กรุณาเลือกรถพร้อมใช้งาน"); return; }
    const minutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
    const start = minutes(roundTime);
    const duration = route.stops.reduce((sum, stop) => sum + (stop.min ?? 0), 0);
    const conflict = routes.flatMap(r => r.schedule.map(round => ({ ...round, route: r }))).find(round => {
      if (round.route.id === activeRoute && round.round === editRoundId) return false;
      if (round.vehicle !== roundVehicle && round.driver !== roundDriver) return false;
      const otherDuration = round.route.stops.reduce((sum, stop) => sum + (stop.min ?? 0), 0);
      return [-1440, 0, 1440].some(offset => {
        const otherStart = minutes(round.time) + offset;
        return start < otherStart + Math.max(1, otherDuration) && otherStart < start + Math.max(1, duration);
      });
    });
    if (conflict) { setRoundError(`เวลาใช้งานคนขับหรือรถซ้อนกับ ${conflict.route.name} รอบ ${conflict.round} (${conflict.time} น.)`); return; }
    updateRoute(activeRoute, r => {
      const nextRound = { round: editRoundId ?? Math.max(0, ...r.schedule.map(s => s.round)) + 1,
        time: roundTime, driver: roundDriver, vehicle: vehicle.plate, type: vehicle.type, seats: vehicle.seats };
      return { ...r, schedule: (editRoundId === null ? [...r.schedule, nextRound] : r.schedule.map(s => s.round === editRoundId ? nextRound : s)).sort((a, b) => a.time.localeCompare(b.time)) };
    });
    setShowAddRound(false); setEditRoundId(null); setRoundError("");
  };
  const deleteRound = (id: number) => {
    const value = route.schedule.find(round => round.round === id);
    if (!value) return;
    setDeletedRound({ routeId: activeRoute, value });
    updateRoute(activeRoute, r => ({ ...r, schedule: r.schedule.filter(round => round.round !== id) }));
    setDeleteRoundId(null); if (editRoundId === id) setShowAddRound(false);
  };
  const undoDeleteRound = () => {
    if (!deletedRound) return;
    updateRoute(deletedRound.routeId, r => ({ ...r, schedule: [...r.schedule, { ...deletedRound.value,
      round: r.schedule.some(s => s.round === deletedRound.value.round) ? Math.max(0, ...r.schedule.map(s => s.round)) + 1 : deletedRound.value.round,
    }].sort((a, b) => a.time.localeCompare(b.time)) }));
    setDeletedRound(null);
  };

  return (
    <div className="p-8">
      <SectionTitle>จัดการเส้นทาง (Route Management)</SectionTitle>
      <div className="flex gap-2 mb-6 flex-wrap">
        {routes.map(r => (
          <button key={r.id} onClick={() => { setActiveRoute(r.id); setEditStopIdx(null); setShowAddStop(false); setShowAddRound(false); setStopError(""); setRoundError(""); setEditRoundId(null); setDeleteRoundId(null); }}
            className={`px-4 py-2 text-sm border transition-colors ${activeRoute === r.id ? "bg-[#f5a623] border-[#f5a623] text-[#0a0a0a] font-bold" : "border-[#2a2a2a] text-[#888] hover:border-[#555]"}`}>
            {r.name}
          </button>
        ))}
        <button className="px-4 py-2 text-sm border border-dashed border-[#333] text-[#555] hover:border-[#555] transition-colors">+ เพิ่มเส้นทาง</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: stops */}
        <div className="border border-[#2a2a2a] p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="font-bold">{route.name}</p>
            <Chip label={`รวม ${route.stops.reduce((sum, stop) => sum + (stop.min ?? 0), 0)} นาที`} color="amber" />
          </div>
          <div className="relative pl-4 mb-4">
            {route.stops.map((s, i) => (
              <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 border-2 shrink-0 ${i === 0 || i === route.stops.length - 1 ? "border-[#f5a623] bg-[#f5a623]" : "border-[#888] bg-transparent"}`} />
                  {i < route.stops.length - 1 && <div className="w-0.5 h-6 bg-[#2a2a2a] mt-1" />}
                </div>
                {editStopIdx === i ? (
                  <div className="flex-1 flex gap-2 items-center pb-4">
                    <input aria-label="แก้ไขชื่อจุดจอด" value={editStopName} onChange={e => setEditStopName(e.target.value)}
                      className="flex-1 bg-[#0a0a0a] border border-[#f5a623] px-2 py-1 text-sm outline-none" />
                    <input aria-label="แก้ไขเวลาเดินทาง" type="number" min="1" disabled={i === 0} value={editStopMin} onChange={e => setEditStopMin(e.target.value)} placeholder="นาที"
                      className="w-16 bg-[#0a0a0a] border border-[#2a2a2a] px-2 py-1 text-sm outline-none" />
                    <button onClick={saveEditStop} className="mono text-[10px] text-[#f5a623] hover:text-white">บันทึก</button>
                    <button onClick={() => setEditStopIdx(null)} className="mono text-[10px] text-[#555]">ยกเลิก</button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-start justify-between pb-4">
                    <div>
                      <p className="text-sm font-medium"><span className="mono text-[#888] mr-2">{i + 1}.</span>{s.name}</p>
                      {s.min && <p className="mono text-[10px] text-[#f5a623]">+{s.min} นาที</p>}
                    </div>
                    <div className="flex gap-2 shrink-0 ml-2">
                      <button aria-label={`แก้ไขจุดจอด ${i + 1} ${s.name}`} onClick={() => startEditStop(i)} className="mono text-[10px] text-[#888] hover:text-[#f5a623]">แก้ไข</button>
                      <button aria-label={`ลบจุดจอด ${i + 1} ${s.name}`} onClick={() => deleteStop(i)} className="mono text-[10px] text-[#888] hover:text-[#e74c3c]">ลบ</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {stopError && <p role="alert" className="mb-3 text-sm text-[#ff8e84]">{stopError}</p>}
          {showAddStop ? (
            <div className="border border-[#f5a623]/30 bg-[#f5a623]/5 p-3 space-y-2">
              <p className="mono text-[10px] text-[#f5a623] tracking-widest">เพิ่มจุดจอด</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-[#aaa]">ตำแหน่งแทรก
                  <select aria-label="ตำแหน่งแทรก" value={stopSide} onChange={e => choosePlacement(stopAnchor, e.target.value as "before" | "after")} className="mt-1 w-full bg-[#111] border border-[#333] p-2 text-sm text-[#eee]">
                    <option value="before">ก่อนจุดจอดที่เลือก</option><option value="after">หลังจุดจอดที่เลือก</option>
                  </select>
                </label>
                <label className="text-xs text-[#aaa]">อ้างอิงจุดจอด
                  <select aria-label="อ้างอิงจุดจอด" value={stopAnchor} disabled={!route.stops.length} onChange={e => choosePlacement(Number(e.target.value), stopSide)} className="mt-1 w-full bg-[#111] border border-[#333] p-2 text-sm text-[#eee]">
                    {route.stops.map((stop, index) => <option key={index} value={index}>{index + 1}. {stop.name}</option>)}
                    {!route.stops.length && <option value={0}>ยังไม่มีจุดจอด</option>}
                  </select>
                </label>
              </div>
              <p className="text-xs text-[#f5a623]">จุดใหม่จะอยู่ลำดับที่ {insertIndex + 1} {route.stops.length ? `(${stopSide === "before" ? "ก่อน" : "หลัง"}จุดที่ ${stopAnchor + 1} ${route.stops[stopAnchor]?.name})` : "(จุดเริ่มต้น)"}</p>
              <input aria-label="ชื่อจุดจอดใหม่" value={newStopName} onChange={e => setNewStopName(e.target.value)} placeholder="ชื่อจุดจอด"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623]" />
              {insertIndex > 0 && <label className="block text-xs text-[#aaa]">จาก {route.stops[insertIndex - 1]?.name} ถึงจุดใหม่ (นาที)
                <input aria-label="เวลาเดินทางถึงจุดใหม่" type="number" min="1" value={newStopMin} onChange={e => setNewStopMin(e.target.value)} className="mt-1 w-full bg-[#111] border border-[#333] px-3 py-2 text-sm" />
              </label>}
              {insertIndex < route.stops.length && <label className="block text-xs text-[#aaa]">จากจุดใหม่ถึง {route.stops[insertIndex]?.name} (นาที)
                <input aria-label="เวลาเดินทางถึงจุดถัดไป" type="number" min="1" value={nextStopMin} onChange={e => setNextStopMin(e.target.value)} className="mt-1 w-full bg-[#111] border border-[#333] px-3 py-2 text-sm" />
              </label>}
              <div className="flex gap-2">
                <button onClick={addStop} className="bg-[#f5a623] text-[#0a0a0a] font-bold px-4 py-1.5 text-sm">เพิ่ม</button>
                <button onClick={() => setShowAddStop(false)} className="border border-[#2a2a2a] px-4 py-1.5 text-sm text-[#888]">ยกเลิก</button>
              </div>
            </div>
          ) : (
            <button onClick={openAddStop}
              className="w-full border border-dashed border-[#333] py-2 text-sm text-[#555] hover:border-[#f5a623] hover:text-[#f5a623] transition-colors">
              + เพิ่มจุดจอด
            </button>
          )}
        </div>

        {/* Right: add round */}
        <div className="border border-[#2a2a2a] p-5">
          <p className="mono text-[10px] text-[#555] tracking-widest mb-4">รอบเดินรถ — {route.name} ({route.schedule.length} รอบ)</p>
          <div className="space-y-2 mb-4">
            {route.schedule.map(s => (
              <div key={s.round} className="flex flex-wrap items-center justify-between gap-3 border border-[#2a2a2a] px-4 py-3">
                <div>
                  <span className="mono text-[#f5a623] font-bold mr-3">{s.time} น.</span>
                  <span className="text-sm text-[#d0ccc5]">{s.driver}</span>
                  <span className="text-xs text-[#888] ml-2">· {s.vehicle} ({s.type} {s.seats} ที่)</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Chip label={`รอบ ${s.round}`} color="gray" />
                  <button aria-label={`แก้ไขรอบ ${s.round} เวลา ${s.time}`} onClick={() => openRound(s)} className="text-xs text-[#f5a623] hover:underline">แก้ไข</button>
                  <button aria-label={`ลบรอบ ${s.round} เวลา ${s.time}`} onClick={() => { setDeleteRoundId(s.round); setDeletedRound(null); }} className="text-xs text-[#ed827a] hover:underline">ลบ</button>
                </div>
                {deleteRoundId === s.round && <div className="w-full flex flex-wrap items-center gap-3 border-t border-[#333] pt-3 text-xs"><span>ลบรอบ {s.round} เวลา {s.time} น.?</span><button onClick={() => deleteRound(s.round)} className="px-3 py-1.5 bg-[#b63c35] text-white">ยืนยันลบรอบ</button><button onClick={() => setDeleteRoundId(null)} className="text-[#aaa]">ยกเลิกการลบ</button></div>}
              </div>
            ))}
          </div>

          {deletedRound && <div role="status" className="mb-4 flex flex-wrap gap-3 text-sm text-[#aaa]">ลบรอบ {deletedRound.value.round} แล้ว <button onClick={undoDeleteRound} className="text-[#f5a623] underline">เลิกทำการลบ</button></div>}
          {showAddRound ? (
            <div className="border border-[#f5a623]/30 bg-[#f5a623]/5 p-4 space-y-3">
              <p className="mono text-[10px] text-[#f5a623] tracking-widest">{editRoundId === null ? "เพิ่มรอบเดินรถ" : `แก้ไขรอบเดินรถ ${editRoundId}`}</p>
              <div>
                <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">เวลา (เช่น 08:00)</label>
                <input aria-label="เวลาออกเดินรถ" type="time" value={roundTime} onChange={e => setRoundTime(e.target.value)} placeholder="08:00"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623]" />
              </div>
              <div>
                <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">คนขับ</label>
                <select aria-label="คนขับรอบเดินรถ" value={roundDriver} onChange={e => setRoundDriver(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623] text-[#f0ede6]">
                  <option value="">-- เลือกคนขับ --</option>
                  {EMPLOYEES.filter(e => e.role === "คนขับรถ").map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">รถ (ทะเบียน)</label>
                <select aria-label="รถของรอบเดินรถ" value={roundVehicle} onChange={e => setRoundVehicle(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623] text-[#f0ede6]">
                  <option value="">-- เลือกรถ --</option>
                  {INITIAL_VEHICLES.map(v => <option key={v.id} value={v.plate}>{v.plate} ({v.type})</option>)}
                </select>
              </div>
              {roundError && <p role="alert" className="text-sm text-[#ff8e84]">{roundError}</p>}
              <div className="flex gap-2">
                <button onClick={addRound} className="bg-[#f5a623] text-[#0a0a0a] font-bold px-4 py-2 text-sm hover:bg-[#e09520]">{editRoundId === null ? "+ เพิ่มรอบ" : "บันทึกรอบเดินรถ"}</button>
                <button onClick={() => setShowAddRound(false)} className="border border-[#2a2a2a] px-4 py-2 text-sm text-[#888]">ยกเลิก</button>
              </div>
            </div>
          ) : (
            <button onClick={() => openRound()}
              className="w-full border border-dashed border-[#333] py-2 text-sm text-[#555] hover:border-[#f5a623] hover:text-[#f5a623] transition-colors">
              + เพิ่มรอบเดินรถ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: SCHEDULE ─────────────────────────────────────────────────────────

const DAYS_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const TODAY = new Date();
const todayDate = TODAY.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
const todayDay = DAYS_TH[TODAY.getDay()];

function AdminSchedule() {
  const [selectedDate, setSelectedDate] = useState(TODAY.toISOString().split("T")[0]);

  const displayDate = new Date(selectedDate).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
  const displayDay = DAYS_TH[new Date(selectedDate).getDay()];

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <SectionTitle>ตารางเดินรถรายวัน</SectionTitle>
        <div className="flex items-center gap-3">
          <div>
            <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">เลือกวันที่</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="bg-[#111] border border-[#2a2a2a] px-3 py-2 text-sm mono text-[#f5a623] outline-none focus:border-[#f5a623]" />
          </div>
          <div className="border border-[#2a2a2a] bg-[#111] px-4 py-2 mt-4">
            <p className="mono text-[#f5a623] font-bold text-sm">{displayDate}</p>
            <p className="mono text-[10px] text-[#888]">วัน{displayDay}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {ROUTES_DATA.map(route => (
          <div key={route.id} className="border border-[#2a2a2a]">
            <div className="flex justify-between items-center px-5 py-3 border-b border-[#2a2a2a] bg-[#111]">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-5 bg-[#f5a623]" />
                <span className="font-bold">{route.name}</span>
                <Chip label={`${route.totalMin} นาที`} color="amber" />
              </div>
              <button className="mono text-[10px] text-[#555] hover:text-[#f5a623] tracking-widest">แก้ไข</button>
            </div>
            <Table
              headers={["รอบที่", "วันที่", "วัน", "เวลา", "เส้นทาง", "คนขับ", "ป้ายทะเบียน", "ประเภทรถ", "ที่นั่ง", "สถานะ"]}
              rows={route.schedule.map(s => {
                const vehicle = INITIAL_VEHICLES.find(v => v.plate === s.vehicle);
                return [
                  <span className="mono text-[#f5a623] font-medium">{s.round}</span>,
                  <span className="mono text-xs text-[#d0ccc5]">{displayDate}</span>,
                  <span className="text-xs text-[#888]">วัน{displayDay}</span>,
                  <span className="mono font-bold text-sm">{s.time} น.</span>,
                  <span className="text-xs">{route.name}</span>,
                  s.driver,
                  <span className="mono text-[#aaa]">{s.vehicle}</span>,
                  <span className="text-xs">{vehicle?.type ?? s.type}</span>,
                  <span className="mono">{s.seats} ที่</span>,
                  <Chip label="กำหนดแล้ว" color="green" />,
                ];
              })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN: EMPLOYEES ────────────────────────────────────────────────────────

function AdminEmployees() {
  const [showForm, setShowForm] = useState(false);
  const [empName, setEmpName] = useState("");
  const [empDept, setEmpDept] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empUsername, setEmpUsername] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [employees, setEmployees] = useState<(typeof EMPLOYEES[number] & { email?: string; username?: string; hasPassword?: boolean })[]>([...EMPLOYEES]);
  const [employeeError, setEmployeeError] = useState("");

  const deptCode = DEPT_MAP[empDept] ?? "";

  const handleSave = () => {
    if (!empName.trim() || !empDept || !empRole) { setEmployeeError("กรุณากรอกชื่อ แผนก และตำแหน่ง"); return; }
    if (empEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empEmail.trim())) { setEmployeeError("รูปแบบอีเมลไม่ถูกต้อง"); return; }
    if (empUsername.trim() && employees.some(e => e.username?.toLowerCase() === empUsername.trim().toLowerCase())) { setEmployeeError("Username นี้มีอยู่แล้ว"); return; }
    const newEmp = {
      id: `E${String(Math.max(0, ...employees.map(e => Number(e.id.slice(1)) || 0)) + 1).padStart(3, "0")}`,
      name: empName.trim(), deptCode, dept: empDept, role: empRole, phone: empPhone.trim(),
      email: empEmail.trim(), username: empUsername.trim(), hasPassword: empPassword.length > 0,
    };
    setEmployeeError("");
    setEmployees(prev => [...prev, newEmp]);
    setShowForm(false);
    setEmpName(""); setEmpDept(""); setEmpRole(""); setEmpPhone("");
    setEmpEmail(""); setEmpUsername(""); setEmpPassword("");
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <SectionTitle>จัดการพนักงาน</SectionTitle>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-[#f5a623] text-[#0a0a0a] font-bold px-4 py-2 text-sm hover:bg-[#e09520] transition-colors">
          + เพิ่มพนักงาน
        </button>
      </div>

      {showForm && (
        <div className="border border-[#f5a623]/40 bg-[#f5a623]/5 p-5 mb-6">
          <p className="mono text-[10px] text-[#f5a623] tracking-widest mb-4">ฟอร์มเพิ่มพนักงาน</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">ชื่อ-นามสกุล</label>
              <input aria-label="ชื่อ-นามสกุลพนักงาน" value={empName} onChange={e => setEmpName(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623] transition-colors" />
            </div>
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">แผนก</label>
              <select aria-label="แผนกพนักงาน" value={empDept} onChange={e => setEmpDept(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623] transition-colors text-[#f0ede6]">
                <option value="">-- เลือกแผนก --</option>
                {Object.keys(DEPT_MAP).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">รหัสแผนก (อัตโนมัติ)</label>
              <input readOnly value={deptCode}
                className="w-full bg-[#111] border border-[#2a2a2a] px-3 py-2 text-sm mono text-[#f5a623] outline-none cursor-not-allowed opacity-70" />
            </div>
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">ตำแหน่ง</label>
              <select aria-label="ตำแหน่งพนักงาน" value={empRole} onChange={e => setEmpRole(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623] transition-colors text-[#f0ede6]">
                <option value="">-- เลือกตำแหน่ง --</option>
                {POSITION_LIST.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">เบอร์โทร</label>
              <input aria-label="เบอร์โทรพนักงาน" value={empPhone} onChange={e => setEmpPhone(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623] transition-colors" />
            </div>
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">อีเมล</label>
              <input type="email" aria-label="อีเมลพนักงาน" value={empEmail} onChange={e => setEmpEmail(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623] transition-colors" />
            </div>
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">Username</label>
              <input aria-label="Username พนักงาน" value={empUsername} onChange={e => setEmpUsername(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623] transition-colors" />
            </div>
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">Password</label>
              <input type="password" aria-label="Password พนักงาน" value={empPassword} onChange={e => setEmpPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623] transition-colors placeholder:text-[#444]" />
            </div>
          </div>
          {employeeError && <p role="alert" className="mt-3 text-sm text-[#ff8e84]">{employeeError}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="bg-[#f5a623] text-[#0a0a0a] font-bold px-6 py-2 text-sm hover:bg-[#e09520]">บันทึก</button>
            <button onClick={() => setShowForm(false)} className="border border-[#2a2a2a] px-6 py-2 text-sm text-[#888] hover:border-[#555]">ยกเลิก</button>
          </div>
        </div>
      )}

      <div className="border border-[#2a2a2a]">
        <Table
          headers={["รหัสพนักงาน", "ชื่อ-นามสกุล", "รหัสแผนก", "แผนก", "ตำแหน่ง", "เบอร์โทร", "Email", "Username", "Password", "จัดการ"]}
          rows={employees.map(e => [
            <span className="mono text-[#f5a623]">{e.id}</span>,
            <span className="font-semibold">{e.name}</span>,
            <span className="mono text-xs text-[#aaa]">{e.deptCode}</span>,
            e.dept,
            <Chip label={e.role} color={e.role === "คนขับรถ" ? "blue" : e.role === "ผู้จัดการ" ? "amber" : "gray"} />,
            <span className="mono text-sm">{e.phone || "—"}</span>,
            <span className="text-xs">{e.email || "—"}</span>,
            <span className="mono text-xs">{e.username || "—"}</span>,
            <span aria-label={e.hasPassword ? "ตั้งรหัสผ่านแล้ว" : "ยังไม่มีข้อมูลรหัสผ่าน"} className="mono tracking-widest">{e.hasPassword ? "********" : "—"}</span>,
            <div className="flex gap-2">
              <button className="mono text-[10px] text-[#888] hover:text-[#f5a623] tracking-widest">แก้ไข</button>
              <button onClick={() => setEmployees(prev => prev.filter(x => x.id !== e.id))}
                className="mono text-[10px] text-[#888] hover:text-[#e74c3c] tracking-widest">ลบ</button>
            </div>,
          ])}
        />
      </div>
    </div>
  );
}

// ─── ADMIN: PERMISSIONS ───────────────────────────────────────────────────────

const FEATURE_PAGES = ["จัดการเส้นทาง", "ตารางเดินรถ", "จัดการพนักงาน", "ข้อมูลรถ", "สิทธิ์การเข้าถึง", "รายงาน", "ตารางงานคนขับ"];

function AdminPermissions() {
  const [roles, setRoles] = useState(["Admin", "เจ้าหน้าที่", "นักศึกษา", "คนขับรถ"]);
  const [newRole, setNewRole] = useState("");
  const defaultsFor = (r: string): Record<string, boolean> => {
    if (r === "Admin") return Object.fromEntries(FEATURE_PAGES.map(p => [p, true]));
    if (r === "เจ้าหน้าที่") return Object.fromEntries(FEATURE_PAGES.map(p => [p, ["ตารางเดินรถ", "รายงาน"].includes(p)]));
    if (r === "คนขับรถ") return Object.fromEntries(FEATURE_PAGES.map(p => [p, ["ตารางเดินรถ", "ตารางงานคนขับ"].includes(p)]));
    return Object.fromEntries(FEATURE_PAGES.map(p => [p, false]));
  };
  const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>({
    "Admin": defaultsFor("Admin"),
    "เจ้าหน้าที่": defaultsFor("เจ้าหน้าที่"),
    "นักศึกษา": defaultsFor("นักศึกษา"),
    "คนขับรถ": defaultsFor("คนขับรถ"),
  });

  const addRole = () => {
    const r = newRole.trim();
    if (!r || roles.includes(r)) return;
    setRoles(prev => [...prev, r]);
    setPerms(p => ({ ...p, [r]: defaultsFor(r) }));
    setNewRole("");
  };

  const removeRole = (r: string) => {
    if (r === "Admin") return;
    setRoles(prev => prev.filter(x => x !== r));
    setPerms(p => { const copy = { ...p }; delete copy[r]; return copy; });
  };

  const chipColor = (r: string) => r === "Admin" ? "amber" : r === "คนขับรถ" ? "blue" : r === "นักศึกษา" ? "green" : "gray";

  return (
    <div className="p-8">
      <SectionTitle>กำหนดสิทธิ์การเข้าถึง</SectionTitle>
      <p className="text-sm text-[#888] mb-4">กำหนดว่าแต่ละบทบาทสามารถเข้าถึงหน้าใดได้บ้าง (Dynamic Permission)</p>

      {/* Add/remove role */}
      <div className="flex items-center gap-2 mb-5">
        <input value={newRole} onChange={e => setNewRole(e.target.value)} onKeyDown={e => e.key === "Enter" && addRole()}
          placeholder="ชื่อตำแหน่งใหม่"
          className="bg-[#111] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623] transition-colors w-48" />
        <button onClick={addRole} className="bg-[#f5a623] text-[#0a0a0a] font-bold px-4 py-2 text-sm hover:bg-[#e09520]">+ เพิ่มตำแหน่ง</button>
        <span className="text-xs text-[#555]">กดลบ (✕) ที่หัวคอลัมน์เพื่อลบตำแหน่ง</span>
      </div>

      <div className="border border-[#2a2a2a] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] bg-[#111]">
              <th className="text-left px-4 py-3 mono text-[10px] text-[#555] tracking-widest font-normal">หน้า / ฟีเจอร์</th>
              {roles.map(r => (
                <th key={r} className="px-4 py-3 mono text-[10px] tracking-widest font-normal">
                  <div className="flex flex-col items-center gap-1.5">
                    <Chip label={r} color={chipColor(r)} />
                    {r !== "Admin" && (
                      <button onClick={() => removeRole(r)} className="text-[#e74c3c] text-[10px] hover:text-red-400">✕ ลบ</button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURE_PAGES.map(page => (
              <tr key={page} className="border-b border-[#1a1a1a] hover:bg-[#111] transition-colors">
                <td className="px-4 py-3 font-medium">{page}</td>
                {roles.map(role => (
                  <td key={role} className="px-4 py-3 text-center">
                    <button
                      onClick={() => setPerms(p => ({ ...p, [role]: { ...p[role], [page]: !p[role]?.[page] } }))}
                      className={`w-10 h-6 border transition-colors relative ${perms[role]?.[page] ? "bg-[#f5a623] border-[#f5a623]" : "bg-transparent border-[#2a2a2a]"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-4 transition-all ${perms[role]?.[page] ? "left-[calc(100%-1.25rem)]" : "left-0.5"} bg-[#0a0a0a]`} />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3 mt-4">
        <button className="bg-[#f5a623] text-[#0a0a0a] font-bold px-6 py-2.5 text-sm hover:bg-[#e09520] transition-colors">บันทึกสิทธิ์</button>
      </div>
    </div>
  );
}

// ─── ADMIN: VEHICLES ─────────────────────────────────────────────────────────

function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([...INITIAL_VEHICLES]);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [vehicleError, setVehicleError] = useState("");
  const [vehicleNotice, setVehicleNotice] = useState("");
  const [vPlate, setVPlate] = useState("");
  const [vType, setVType] = useState<"รถตู้" | "รถบัส">("รถตู้");
  const [vSeats, setVSeats] = useState("");
  const [vBrand, setVBrand] = useState("");
  const [vYear, setVYear] = useState("");
  const [vStatus, setVStatus] = useState<"พร้อมใช้" | "ซ่อมบำรุง">("พร้อมใช้");

  const openVehicle = (vehicle?: Vehicle) => {
    setEditingVehicle(vehicle?.id ?? null); setVPlate(vehicle?.plate ?? ""); setVType(vehicle?.type ?? "รถตู้");
    setVSeats(vehicle ? String(vehicle.seats) : ""); setVBrand(vehicle?.brand ?? ""); setVYear(vehicle ? String(vehicle.year) : "");
    setVStatus(vehicle?.status ?? "พร้อมใช้"); setVehicleError(""); setVehicleNotice(""); setShowForm(true);
  };
  const handleAdd = () => {
    if (!vPlate.trim() || !vBrand.trim()) { setVehicleError("กรุณากรอกป้ายทะเบียนและยี่ห้อ/รุ่น"); return; }
    if (vehicles.some(v => v.id !== editingVehicle && v.plate.replace(/\s/g, "").toLowerCase() === vPlate.replace(/\s/g, "").toLowerCase())) { setVehicleError("ป้ายทะเบียนนี้มีอยู่แล้ว"); return; }
    if ((vSeats && (!Number.isInteger(Number(vSeats)) || Number(vSeats) < 1)) || (vYear && (!Number.isInteger(Number(vYear)) || Number(vYear) < 1))) { setVehicleError("จำนวนที่นั่งและปีต้องเป็นจำนวนเต็มมากกว่า 0"); return; }
    const newV: Vehicle = {
      id: editingVehicle ?? `V${String(Math.max(0, ...vehicles.map(v => Number(v.id.slice(1)) || 0)) + 1).padStart(3, "0")}`,
      plate: vPlate.trim(), type: vType,
      seats: vSeats ? Number(vSeats) : vType === "รถตู้" ? 9 : 20,
      brand: vBrand.trim(), year: vYear ? Number(vYear) : new Date().getFullYear() + 543,
      status: vStatus,
    };
    setVehicles(prev => editingVehicle ? prev.map(v => v.id === editingVehicle ? newV : v) : [...prev, newV]);
    setVehicleNotice(editingVehicle ? "บันทึกการแก้ไขข้อมูลรถแล้ว" : "เพิ่มรถเรียบร้อยแล้ว");
    setEditingVehicle(null); setVehicleError("");
    setVPlate(""); setVBrand(""); setVSeats(""); setVYear(""); setVType("รถตู้"); setVStatus("พร้อมใช้");
    setShowForm(false);
  };

  const minivans = vehicles.filter(v => v.type === "รถตู้");
  const buses = vehicles.filter(v => v.type === "รถบัส");

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <SectionTitle>ข้อมูลรถ</SectionTitle>
        <button onClick={() => openVehicle()}
          className="bg-[#f5a623] text-[#0a0a0a] font-bold px-4 py-2 text-sm hover:bg-[#e09520] transition-colors">
          + เพิ่มรถ
        </button>
      </div>

      {showForm && (
        <div className="border border-[#f5a623]/40 bg-[#f5a623]/5 p-5 mb-6">
          <p className="mono text-[10px] text-[#f5a623] tracking-widest mb-4">{editingVehicle ? `แก้ไขข้อมูลรถ ${editingVehicle}` : "ฟอร์มเพิ่มรถ"}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">ป้ายทะเบียน</label>
              <input aria-label="ป้ายทะเบียนรถ" value={vPlate} onChange={e => setVPlate(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623]" />
            </div>
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">ประเภทรถ</label>
              <select aria-label="ประเภทรถ" value={vType} onChange={e => setVType(e.target.value as "รถตู้" | "รถบัส")}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623] text-[#f0ede6]">
                <option value="รถตู้">รถตู้</option>
                <option value="รถบัส">รถบัส</option>
              </select>
            </div>
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">จำนวนที่นั่ง</label>
              <input aria-label="จำนวนที่นั่งรถ" value={vSeats} onChange={e => setVSeats(e.target.value)} placeholder={vType === "รถตู้" ? "9" : "20"}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623]" />
            </div>
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">ยี่ห้อ/รุ่น</label>
              <input aria-label="ยี่ห้อและรุ่นรถ" value={vBrand} onChange={e => setVBrand(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623]" />
            </div>
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">ปี (พ.ศ.)</label>
              <input aria-label="ปีรถ พ.ศ." value={vYear} onChange={e => setVYear(e.target.value)} placeholder="2567"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623]" />
            </div>
            <div>
              <label className="mono text-[10px] text-[#888] tracking-widest block mb-1">สถานะ</label>
              <select aria-label="สถานะรถ" value={vStatus} onChange={e => setVStatus(e.target.value as "พร้อมใช้" | "ซ่อมบำรุง")}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[#f5a623] text-[#f0ede6]">
                <option value="พร้อมใช้">พร้อมใช้</option>
                <option value="ซ่อมบำรุง">ซ่อมบำรุง</option>
              </select>
            </div>
          </div>
          {vehicleError && <p role="alert" className="mt-3 text-sm text-[#ff8e84]">{vehicleError}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={handleAdd} className="bg-[#f5a623] text-[#0a0a0a] font-bold px-6 py-2 text-sm hover:bg-[#e09520]">{editingVehicle ? "บันทึกการแก้ไขรถ" : "บันทึก"}</button>
            <button onClick={() => setShowForm(false)} className="border border-[#2a2a2a] px-6 py-2 text-sm text-[#888] hover:border-[#555]">ยกเลิก</button>
          </div>
        </div>
      )}

      {vehicleNotice && <p role="status" className="mb-4 text-sm text-[#2ecc71]">{vehicleNotice}</p>}
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="border border-[#2a2a2a] p-4">
          <p className="text-[#555] text-xs mb-1">รถทั้งหมด</p>
          <p className="font-black text-2xl mono text-[#f5a623]">{vehicles.length} คัน</p>
        </div>
        <div className="border border-[#2a2a2a] p-4">
          <p className="text-[#555] text-xs mb-1">รถตู้</p>
          <p className="font-black text-2xl mono text-[#3498db]">{minivans.length} คัน</p>
        </div>
        <div className="border border-[#2a2a2a] p-4">
          <p className="text-[#555] text-xs mb-1">รถบัส</p>
          <p className="font-black text-2xl mono text-[#9b59b6]">{buses.length} คัน</p>
        </div>
        <div className="border border-[#2a2a2a] p-4">
          <p className="text-[#555] text-xs mb-1">พร้อมใช้งาน</p>
          <p className="font-black text-2xl mono text-[#2ecc71]">{vehicles.filter(v => v.status === "พร้อมใช้").length} คัน</p>
        </div>
      </div>

      {/* Minivan section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-4 bg-[#3498db]" />
          <p className="font-bold text-sm">รถตู้ ({minivans.length} คัน)</p>
        </div>
        <div className="border border-[#2a2a2a]">
          <Table
            headers={["รหัสรถ", "ป้ายทะเบียน", "ยี่ห้อ/รุ่น", "ที่นั่ง", "ปี พ.ศ.", "สถานะ", "จัดการ"]}
            rows={minivans.map(v => [
              <span className="mono text-[#f5a623]">{v.id}</span>,
              <span className="mono font-bold">{v.plate}</span>,
              v.brand,
              <span className="mono">{v.seats} ที่นั่ง</span>,
              <span className="mono text-[#888]">{v.year}</span>,
              <Chip label={v.status} color={v.status === "พร้อมใช้" ? "green" : "amber"} />,
              <div className="flex items-center gap-3">
                <button aria-label={`แก้ไขรถ ${v.plate}`} onClick={() => openVehicle(v)} className="text-xs text-[#f5a623] hover:underline">แก้ไข</button>
                <button aria-label={`ลบรถ ${v.plate}`} onClick={() => { setVehicles(prev => prev.filter(x => x.id !== v.id)); if (editingVehicle === v.id) setShowForm(false); }} className="text-xs text-[#ed827a] hover:underline">ลบ</button>
              </div>,
            ])}
          />
        </div>
      </div>

      {/* Bus section */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-4 bg-[#9b59b6]" />
          <p className="font-bold text-sm">รถบัส ({buses.length} คัน)</p>
        </div>
        <div className="border border-[#2a2a2a]">
          <Table
            headers={["รหัสรถ", "ป้ายทะเบียน", "ยี่ห้อ/รุ่น", "ที่นั่ง", "ปี พ.ศ.", "สถานะ", "จัดการ"]}
            rows={buses.map(v => [
              <span className="mono text-[#f5a623]">{v.id}</span>,
              <span className="mono font-bold">{v.plate}</span>,
              v.brand,
              <span className="mono">{v.seats} ที่นั่ง</span>,
              <span className="mono text-[#888]">{v.year}</span>,
              <Chip label={v.status} color={v.status === "พร้อมใช้" ? "green" : "amber"} />,
              <div className="flex items-center gap-3">
                <button aria-label={`แก้ไขรถ ${v.plate}`} onClick={() => openVehicle(v)} className="text-xs text-[#f5a623] hover:underline">แก้ไข</button>
                <button aria-label={`ลบรถ ${v.plate}`} onClick={() => { setVehicles(prev => prev.filter(x => x.id !== v.id)); if (editingVehicle === v.id) setShowForm(false); }} className="text-xs text-[#ed827a] hover:underline">ลบ</button>
              </div>,
            ])}
          />
        </div>
      </div>
    </div>
  );
}

// ─── DRIVER VIEW ─────────────────────────────────────────────────────────────

function DriverView() {
  return <DriverDashboard routes={ROUTES_DATA} driverName="สมชาย ใจดี" />;
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────

import {
  LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";

const CHART_COLORS = ["#f5a623", "#e74c3c", "#3498db", "#2ecc71", "#9b59b6", "#1abc9c"];
const STATIONS = ["Big C หนองจอก", "มหาวิทยาลัยฯ", "ร้านส้มตำป้านาง", "สวนสาธารณะ", "โรงพยาบาล", "โลตัส หนองจอก"];

// รายงาน 3 — อัตราการใช้งานรถรายเส้นทาง
const ROUTE_UTIL_DATA = MONTHS_TH.map((m, i) => ({
  month: m,
  "เส้นทาง 1": 65 + Math.round(Math.sin(i) * 18 + Math.random() * 10),
  "เส้นทาง 2": 48 + Math.round(Math.cos(i) * 15 + Math.random() * 10),
  "เส้นทาง 3": 72 + Math.round(Math.sin(i + 1) * 12 + Math.random() * 8),
}));

// รายงาน 4 — ผลการทำงานคนขับ
const DRIVER_DATA = [
  { name: "สมชาย ใจดี", rounds: 48, ontime: 45, late: 3, passengers: 312, rating: 4.8 },
  { name: "สมหมาย ใจรัก", rounds: 48, ontime: 44, late: 4, passengers: 298, rating: 4.6 },
  { name: "สมควร ใจงาม", rounds: 48, ontime: 46, late: 2, passengers: 325, rating: 4.9 },
];

// รายงาน 5 — สรุปภาพรวมระบบรายวัน
const DAILY_DATA = [
  { day: "จ.", bookings: 42, checkin: 38, noshow: 4, cancel: 3 },
  { day: "อ.", bookings: 55, checkin: 51, noshow: 4, cancel: 5 },
  { day: "พ.", bookings: 48, checkin: 45, noshow: 3, cancel: 2 },
  { day: "พฤ.", bookings: 60, checkin: 54, noshow: 6, cancel: 4 },
  { day: "ศ.", bookings: 71, checkin: 65, noshow: 6, cancel: 7 },
  { day: "ส.", bookings: 30, checkin: 28, noshow: 2, cancel: 1 },
  { day: "อา.", bookings: 18, checkin: 17, noshow: 1, cancel: 0 },
];

const TOOLTIP_STYLE = { background: "#111", border: "1px solid #2a2a2a", color: "#f0ede6", fontSize: 12, fontFamily: "Sarabun" };
const X_TICK = { fill: "#888", fontSize: 10, fontFamily: "DM Mono" };
const Y_TICK = { fill: "#888", fontSize: 10, fontFamily: "DM Mono" };

const REPORT_TABS = [
  { n: 1 as const, label: "เปรียบเทียบผู้โดยสารขึ้น/ลง รายเดือน" },
  { n: 2 as const, label: "สถิติการจองประจำปี" },
  { n: 3 as const, label: "สรุปการเดินรถรายเส้นทาง" },
  { n: 4 as const, label: "สรุปการทำงานคนขับ" },
  { n: 5 as const, label: "No Show และยกเลิกการจอง" },
];

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-[#2a2a2a] p-4">
      <p className="text-[#555] text-xs mb-1">{label}</p>
      <p className={`font-black text-2xl mono ${color}`}>{value}</p>
    </div>
  );
}

function ReportsPage() {
  const [report, setReport] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [year, setYear] = useState("2568");
  const [chartType, setChartType] = useState<"board" | "alight">("board");

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <SectionTitle>รายงาน</SectionTitle>
        <select value={year} onChange={e => setYear(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] px-3 py-2 text-sm outline-none mono text-[#f5a623]">
          <option>2568</option><option>2567</option><option>2566</option>
        </select>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[#2a2a2a] mb-8 overflow-x-auto">
        {REPORT_TABS.map(tab => (
          <button
            key={tab.n}
            onClick={() => setReport(tab.n)}
            className={`px-5 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${report === tab.n ? "border-[#f5a623] text-[#f5a623] font-bold" : "border-transparent text-[#888] hover:text-[#f0ede6]"}`}
          >
            <span className="mono text-[10px] mr-1.5 opacity-60">{tab.n}.</span>{tab.label}
          </button>
        ))}
      </div>

      {/* รายงานที่ 1 */}
      {report === 1 && (
        <div>
          <p className="text-sm text-[#888] mb-4">รายงานการเปรียบเทียบจำนวนคนขึ้นรถและลงรถในแต่ละสถานี รายเดือน ปี {year} (ทุกสถานี)</p>
          <div className="flex gap-2 mb-6">
            {(["board", "alight"] as const).map(t => (
              <button key={t} onClick={() => setChartType(t)}
                className={`px-4 py-2 text-sm border transition-colors ${chartType === t ? "border-[#f5a623] text-[#f5a623] bg-[#f5a623]/10" : "border-[#2a2a2a] text-[#888]"}`}>
                {t === "board" ? "ขึ้นรถ (Boarding)" : "ลงรถ (Alighting)"}
              </button>
            ))}
          </div>
          <div className="border border-[#2a2a2a] p-5">
            <p className="font-bold text-center mb-4 text-sm">จำนวนผู้โดยสาร{chartType === "board" ? "ขึ้น" : "ลง"} รายเดือน ปี {year} (ทุกสถานี)</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={CHART_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="month" tick={X_TICK} />
                <YAxis tick={Y_TICK} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Sarabun" }} />
                {STATIONS.map((s, i) => <Bar key={s} dataKey={s} fill={CHART_COLORS[i]} opacity={0.85} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* รายงานที่ 2 */}
      {report === 2 && (
        <div>
          <p className="text-sm text-[#888] mb-4">รายงานรายปี {year} — จำนวนการจอง, จำนวนที่นั่งที่ถูกจอง, การยกเลิก, Check-in สำเร็จ และ No Show แยกตามสถานี</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard label="จำนวนการจองทั้งหมด" value={REPORT2_DATA.reduce((s, r) => s + r.bookings, 0).toLocaleString()} color="text-[#f5a623]" />
            <StatCard label="Check-in สำเร็จ" value={REPORT2_DATA.reduce((s, r) => s + r.checkin, 0).toLocaleString()} color="text-[#2ecc71]" />
            <StatCard label="No Show" value={REPORT2_DATA.reduce((s, r) => s + r.noshow, 0).toLocaleString()} color="text-[#e74c3c]" />
          </div>
          <div className="border border-[#2a2a2a] mb-6">
            <Table
              headers={["สถานี", "จอง", "ที่นั่งถูกจอง", "ยกเลิก", "Check-in", "No Show"]}
              rows={REPORT2_DATA.map(r => [
                <span className="font-semibold">{r.station}</span>,
                <span className="mono text-[#f5a623]">{r.bookings.toLocaleString()}</span>,
                <span className="mono">{r.seats.toLocaleString()}</span>,
                <span className="mono text-[#e74c3c]">{r.cancelled}</span>,
                <span className="mono text-[#2ecc71]">{r.checkin.toLocaleString()}</span>,
                <span className="mono text-[#888]">{r.noshow}</span>,
              ])}
            />
          </div>
          <div className="border border-[#2a2a2a] p-5">
            <p className="font-bold text-center mb-4 text-sm">สัดส่วนสถิติการจองรายสถานี ปี {year}</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={REPORT2_DATA.map(r => ({ name: r.station.replace("หนองจอก", "").replace("มหาวิทยาลัยเทคโนโลยีมหานคร", "มหาวิทยาลัยฯ"), จอง: r.bookings, checkin: r.checkin, ยกเลิก: r.cancelled, noshow: r.noshow }))} margin={{ top: 5, right: 20, left: 0, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 9, fontFamily: "Sarabun" }} angle={-25} textAnchor="end" />
                <YAxis tick={Y_TICK} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Sarabun" }} />
                <Bar dataKey="จอง" fill="#f5a623" opacity={0.8} />
                <Bar dataKey="checkin" name="Check-in" fill="#2ecc71" opacity={0.8} />
                <Bar dataKey="ยกเลิก" fill="#e74c3c" opacity={0.8} />
                <Bar dataKey="noshow" name="No Show" fill="#888" opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* รายงานที่ 3 — สรุปการเดินรถรายเส้นทาง */}
      {report === 3 && (
        <div>
          <p className="text-sm text-[#888] mb-4">สรุปจำนวนรอบเดินรถ, อัตราการบรรทุกผู้โดยสาร และเวลารวมของแต่ละเส้นทาง ปี {year} — อ้างอิงข้อมูลเส้นทางตามที่มหาวิทยาลัยกำหนด</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {ROUTES_DATA.map((r, i) => {
              const avg = Math.round(ROUTE_UTIL_DATA.reduce((s, d) => s + (d[`เส้นทาง ${r.id}` as keyof typeof d] as number), 0) / ROUTE_UTIL_DATA.length);
              return (
                <div key={r.id} className="border border-[#2a2a2a] p-4">
                  <p className="text-[#555] text-xs mb-1">{r.name}</p>
                  <p className="font-black text-2xl mono" style={{ color: CHART_COLORS[i] }}>{avg}%</p>
                  <p className="text-[10px] text-[#555] mt-1">เฉลี่ยตลอดปี</p>
                  <div className="mt-2 h-1 bg-[#1a1a1a]">
                    <div className="h-full" style={{ width: `${avg}%`, backgroundColor: CHART_COLORS[i] }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border border-[#2a2a2a] p-5">
            <p className="font-bold text-center mb-4 text-sm">อัตราการใช้งานที่นั่ง (%) รายเดือน ปี {year}</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ROUTE_UTIL_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="month" tick={X_TICK} />
                <YAxis tick={Y_TICK} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Sarabun" }} />
                {ROUTES_DATA.map((r, i) => (
                  <Line key={r.id} type="monotone" dataKey={`เส้นทาง ${r.id}`} stroke={CHART_COLORS[i]} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS[i] }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="border border-[#2a2a2a] mt-6">
            <Table
              headers={["เส้นทาง", "ประเภทรถ", "จำนวนที่นั่ง", "รอบ/วัน", "อัตราเฉลี่ย", "สถานะ"]}
              rows={ROUTES_DATA.map((r, i) => {
                const avg = Math.round(ROUTE_UTIL_DATA.reduce((s, d) => s + (d[`เส้นทาง ${r.id}` as keyof typeof d] as number), 0) / ROUTE_UTIL_DATA.length);
                return [
                  <span className="font-semibold">{r.name}</span>,
                  "รถตู้ / รถบัส",
                  <span className="mono">9–20 ที่</span>,
                  <span className="mono">{r.schedule.length} รอบ</span>,
                  <span className="mono font-bold" style={{ color: CHART_COLORS[i] }}>{avg}%</span>,
                  <Chip label={avg >= 70 ? "ใช้งานสูง" : avg >= 50 ? "ปกติ" : "ใช้งานต่ำ"} color={avg >= 70 ? "amber" : avg >= 50 ? "green" : "gray"} />,
                ];
              })}
            />
          </div>
        </div>
      )}

      {/* รายงานที่ 4 — สรุปการทำงานคนขับ */}
      {report === 4 && (
        <div>
          <p className="text-sm text-[#888] mb-4">สรุปการทำงานของคนขับแต่ละคน — จำนวนรอบที่ทำงาน, ตรงเวลา/สาย และจำนวนผู้โดยสารที่รับส่ง ปี {year}</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard label="คนขับทั้งหมด" value={`${DRIVER_DATA.length} คน`} color="text-[#f5a623]" />
            <StatCard label="รอบเดินรถรวม" value={DRIVER_DATA.reduce((s, d) => s + d.rounds, 0).toString()} color="text-[#3498db]" />
            <StatCard label="ผู้โดยสารรวม" value={DRIVER_DATA.reduce((s, d) => s + d.passengers, 0).toLocaleString()} color="text-[#2ecc71]" />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Driver cards */}
            <div className="space-y-4">
              {DRIVER_DATA.map((d, i) => {
                const onTimePct = Math.round((d.ontime / d.rounds) * 100);
                return (
                  <div key={d.name} className="border border-[#2a2a2a] p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold">{d.name}</p>
                        <p className="mono text-[10px] text-[#555] tracking-wider">คนขับรถ</p>
                      </div>
                      <div className="text-right">
                        <p className="mono text-[#f5a623] font-bold text-lg">{d.rating}</p>
                        <p className="text-[10px] text-[#555]">คะแนน</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center mb-3">
                      <div>
                        <p className="mono font-black text-xl text-[#2ecc71]">{d.ontime}</p>
                        <p className="text-[10px] text-[#555]">ตรงเวลา</p>
                      </div>
                      <div>
                        <p className="mono font-black text-xl text-[#e74c3c]">{d.late}</p>
                        <p className="text-[10px] text-[#555]">สาย</p>
                      </div>
                      <div>
                        <p className="mono font-black text-xl text-[#3498db]">{d.passengers}</p>
                        <p className="text-[10px] text-[#555]">ผู้โดยสาร</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-[#555] mb-1">
                        <span>ตรงเวลา</span><span className="mono" style={{ color: CHART_COLORS[i] }}>{onTimePct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#1a1a1a]">
                        <div className="h-full" style={{ width: `${onTimePct}%`, backgroundColor: CHART_COLORS[i] }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pie chart - ผู้โดยสารต่อคนขับ */}
            <div className="border border-[#2a2a2a] p-5">
              <p className="font-bold text-center mb-4 text-sm">สัดส่วนผู้โดยสารต่อคนขับ ปี {year}</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={DRIVER_DATA.map(d => ({ name: d.name, value: d.passengers }))} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => name && percent != null ? `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%` : ""} labelLine={false}>
                    {DRIVER_DATA.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} opacity={0.85} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 border border-[#2a2a2a]">
                <Table
                  headers={["คนขับ", "รอบทั้งหมด", "ตรงเวลา", "สาย", "คะแนน"]}
                  rows={DRIVER_DATA.map((d, i) => [
                    <span className="font-semibold" style={{ color: CHART_COLORS[i] }}>{d.name}</span>,
                    <span className="mono">{d.rounds}</span>,
                    <span className="mono text-[#2ecc71]">{d.ontime}</span>,
                    <span className="mono text-[#e74c3c]">{d.late}</span>,
                    <span className="mono text-[#f5a623] font-bold">★ {d.rating}</span>,
                  ])}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* รายงานที่ 5 — No Show และยกเลิกการจอง */}
      {report === 5 && (
        <div>
          <p className="text-sm text-[#888] mb-4">รายงานจำนวนผู้ที่จองแล้วไม่มาขึ้นรถ (No Show) และการยกเลิกการจอง รายวัน/รายสัปดาห์ ปี {year} — เพื่อวิเคราะห์และปรับปรุงการให้บริการ</p>
          {/* KPI */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="จองรวมทั้งสัปดาห์" value={DAILY_DATA.reduce((s, d) => s + d.bookings, 0).toString()} color="text-[#f5a623]" />
            <StatCard label="No Show ทั้งสัปดาห์" value={DAILY_DATA.reduce((s, d) => s + d.noshow, 0).toString()} color="text-[#e74c3c]" />
            <StatCard label="ยกเลิกทั้งสัปดาห์" value={DAILY_DATA.reduce((s, d) => s + d.cancel, 0).toString()} color="text-[#9b59b6]" />
            <StatCard
              label="อัตรา No Show เฉลี่ย"
              value={`${Math.round((DAILY_DATA.reduce((s, d) => s + d.noshow, 0) / DAILY_DATA.reduce((s, d) => s + d.bookings, 0)) * 100)}%`}
              color="text-[#e74c3c]"
            />
          </div>

          {/* No Show bar chart รายวัน */}
          <div className="border border-[#2a2a2a] p-5 mb-6">
            <p className="font-bold text-center mb-4 text-sm">จำนวน No Show และยกเลิกการจอง รายวัน (8–14 ก.ย. {year})</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={DAILY_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="day" tick={X_TICK} />
                <YAxis tick={Y_TICK} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Sarabun" }} />
                <Bar dataKey="bookings" name="จองทั้งหมด" fill="#f5a623" opacity={0.4} />
                <Bar dataKey="noshow" name="No Show" fill="#e74c3c" opacity={0.9} />
                <Bar dataKey="cancel" name="ยกเลิก" fill="#9b59b6" opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* ตารางรายวัน */}
            <div className="border border-[#2a2a2a]">
              <div className="px-4 py-3 border-b border-[#2a2a2a] bg-[#111]">
                <p className="mono text-[10px] text-[#555] tracking-widest">รายละเอียด No Show / ยกเลิก รายวัน</p>
              </div>
              <Table
                headers={["วัน", "จอง", "No Show", "ยกเลิก", "% No Show", "% ยกเลิก"]}
                rows={DAILY_DATA.map(d => {
                  const noPct = Math.round((d.noshow / d.bookings) * 100);
                  const canPct = Math.round((d.cancel / d.bookings) * 100);
                  return [
                    <span className="font-bold mono">{d.day}</span>,
                    <span className="mono text-[#f5a623]">{d.bookings}</span>,
                    <span className="mono text-[#e74c3c] font-bold">{d.noshow}</span>,
                    <span className="mono text-[#9b59b6] font-bold">{d.cancel}</span>,
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1 bg-[#1a1a1a]"><div className="h-full bg-[#e74c3c]" style={{ width: `${noPct * 5}%` }} /></div>
                      <span className="mono text-[10px] text-[#888]">{noPct}%</span>
                    </div>,
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1 bg-[#1a1a1a]"><div className="h-full bg-[#9b59b6]" style={{ width: `${canPct * 5}%` }} /></div>
                      <span className="mono text-[10px] text-[#888]">{canPct}%</span>
                    </div>,
                  ];
                })}
              />
            </div>

            {/* เส้นแนวโน้ม */}
            <div className="border border-[#2a2a2a] p-5">
              <p className="font-bold text-center mb-4 text-sm">แนวโน้ม No Show และยกเลิก รายวัน</p>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={DAILY_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis dataKey="day" tick={X_TICK} />
                  <YAxis tick={Y_TICK} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Sarabun" }} />
                  <Line type="monotone" dataKey="noshow" name="No Show" stroke="#e74c3c" strokeWidth={2} dot={{ r: 4, fill: "#e74c3c" }} />
                  <Line type="monotone" dataKey="cancel" name="ยกเลิก" stroke="#9b59b6" strokeWidth={2} dot={{ r: 4, fill: "#9b59b6" }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 border border-[#e74c3c]/20 bg-[#e74c3c]/5">
                <p className="text-xs text-[#e74c3c] font-semibold mb-1">⚠ ข้อสังเกต</p>
                <p className="text-xs text-[#888]">
                  วันศุกร์มีการจองสูงสุดแต่ No Show ก็สูงตาม ({DAILY_DATA[4].noshow} คน)
                  ควรพิจารณาส่ง reminder ล่วงหน้าหรือเปิดให้ยกเลิกก่อนกำหนด
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT ────────────────────────────────────────────────────────────────────

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState("");
  const [page, setPage] = useState<Page>("booking");

  if (!role) {
    return <LoginPage onLogin={(r, u) => { setRole(r); setUser(u); setPage(r === "admin" ? "admin-routes" : r === "driver" ? "driver" : "booking"); }} />;
  }

  const renderPage = () => {
    switch (page) {
      case "booking": return <BookingPage />;
      case "admin-routes": return <AdminRoutes />;
      case "admin-schedule": return <AdminSchedule />;
      case "admin-employees": return <AdminEmployees />;
      case "admin-vehicles": return <AdminVehicles />;
      case "admin-permissions": return <AdminPermissions />;
      case "driver": return <DriverView />;
      case "reports": return role === "admin" ? <ReportsPage /> : null;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0ede6] flex">
      <Sidebar role={role} page={page} setPage={setPage} setRole={setRole} user={user} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
}
