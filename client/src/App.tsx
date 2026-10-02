import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  lazy,
  Suspense,
} from "react"
import ConfirmationProvider from "./Confirmation"
import Auth from "./Auth"
import BookingPage from "./BookingPage"
import AdminRoutes from "./AdminRoutes"
import { EmployeesPage, VehiclesPage, PermissionsPage } from "./AdminData"
import UsersPage from "./UsersPage"
import AdminBookingsPage from "./AdminBookingsPage"
import TripsPage from "./TripsPage"
import DriverPage from "./DriverPage"
const ReportsPage = lazy(() => import("./ReportsPage"))
import { api, ApiError } from "./api"
import { Notice, outline } from "./ui"
import type { User, Data } from "./types"
type Context = {
  user: User
  data: Data
  refresh: () => Promise<void>
  can: (page: string) => boolean
  openBookingsFor: (userId: string) => void
}
const AppContext = createContext<Context | null>(null)
export const useApp = () => useContext(AppContext)!
const nav = [
  ["admin-routes", "จัดการเส้นทาง", "🗺"],
  ["admin-schedule", "ตารางเดินรถ", "📅"],
  ["admin-employees", "จัดการพนักงาน", "👥"],
  ["admin-users", "จัดการผู้ใช้งาน", "👤"],
  ["admin-bookings", "จัดการการจอง", "🎫"],
  ["admin-vehicles", "ข้อมูลรถ", "🚐"],
  ["admin-permissions", "สิทธิ์การเข้าถึง", "🔐"],
  ["reports", "รายงาน", "📊"],
  ["driver", "ตารางงานของฉัน", "🚌"],
]
export default function App() {
  return (
    <ConfirmationProvider>
      <Content />
    </ConfirmationProvider>
  )
}
function Content() {
  const [bookingUserId, setBookingUserId] = useState("")
  const [user, setUser] = useState<User | null>(null),
    [data, setData] = useState<Data | null>(null),
    [loading, setLoading] = useState(true),
    [setup, setSetup] = useState(false),
    [page, setPage] = useState("booking"),
    [error, setError] = useState("")
  useEffect(() => {
    const expired = () => {
      setUser(null)
      setData(null)
      setError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง")
    }
    window.addEventListener("shuttle-session-expired", expired)
    return () => window.removeEventListener("shuttle-session-expired", expired)
  }, [])
  const changeUser = (u: User) => {
    setUser(u)
    setPage(
      u.role === "user"
        ? "booking"
        : u.role === "driver" && u.permissions.driver?.view
          ? "driver"
          : nav.find(
              ([id]) => u.permissions[id]?.view,
            )?.[0] || "none",
    )
  }
  const refresh = useCallback(async () => {
    const [newData, me] = await Promise.all([
      api<Data>("/bootstrap"),
      api<{ user: User }>("/auth/me"),
    ])
    setData(newData)
    setUser(me.user)
  }, [])
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const result = await api<{ required: boolean }>("/setup")
        if (active) setSetup(result.required)
        if (!result.required) {
          try {
            const me = await api<{ user: User }>("/auth/me")
            if (active) changeUser(me.user)
          } catch (e) {
            if (!(e instanceof ApiError && e.status === 401)) throw e
          }
        }
      } catch (e) {
        if (active) setError((e as Error).message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    if (user) void refresh().catch((e) => setError(e.message))
  }, [user?.id, refresh])
  if (loading) return <div className="p-12 text-[#f5a623]">กำลังเชื่อมต่อระบบ…</div>
  if (!user)
    return (
      <>
        <div className={error ? "p-4" : ""}>
          <Notice error={error} />
          {error && (
            <button className={outline} onClick={() => location.reload()}>
              ลองเชื่อมต่อใหม่
            </button>
          )}
        </div>
        <Auth
          setup={setup}
          onSetup={() => {
            setSetup(false)
            setError("")
          }}
          onLogin={changeUser}
        />
      </>
    )
  if (!data)
    return (
      <div className="p-10">
        <Notice error={error} />
        <p>กำลังโหลดข้อมูล…</p>
        <button
          className={outline}
          onClick={() => void refresh().catch((e) => setError(e.message))}
        >
          โหลดใหม่
        </button>
      </div>
    )
  const entries =
    user.role === "user"
      ? [
          ["booking", "จองรถ", "🎫"],
          ["cancellations", "ประวัติการยกเลิก", "↩"],
        ]
      : nav.filter(
          ([id]) =>
            user.permissions[id]?.view,
        )
  const can = (id: string) =>
    !!user.permissions[id]?.view && !!user.permissions[id]?.modify
  const render = () => {
    if (!entries.some(([id]) => id === page))
      return (
        <div className="p-8 text-[#888]">
          ยังไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบ
        </div>
      )
    switch (page) {
      case "booking":
      case "cancellations":
        return <BookingPage view={page} />
      case "admin-routes":
        return <AdminRoutes />
      case "admin-schedule":
        return <TripsPage />
      case "admin-employees":
        return <EmployeesPage />
      case "admin-users":
        return <UsersPage />
      case "admin-bookings":
        return <AdminBookingsPage key={bookingUserId} initialUserId={bookingUserId} />
      case "admin-vehicles":
        return <VehiclesPage />
      case "admin-permissions":
        return <PermissionsPage />
      case "driver":
        return <DriverPage />
      case "reports":
        return (
          <Suspense fallback={<div className="p-8">กำลังโหลดรายงาน…</div>}>
            <ReportsPage />
          </Suspense>
        )
      default:
        return null
    }
  }
  return (
    <AppContext.Provider value={{ user, data, refresh, can, openBookingsFor: (userId) => {setBookingUserId(userId);setPage("admin-bookings")} }}>
      <div className="min-h-screen flex flex-col md:flex-row bg-[#0a0a0a] text-[#f0ede6]">
        <aside className="md:w-52 md:min-h-screen bg-[#0d0d0d] border-r border-[#2a2a2a] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-[#f5a623]" />
              <span className="font-bold text-xs tracking-[.15em] uppercase text-[#f5a623]">
                MUT Shuttle
              </span>
            </div>
            <p className="text-[10px] text-[#777] mono tracking-wider">
              ระบบ Shuttle Bus
            </p>
          </div>
          <div className="p-3 border-b border-[#2a2a2a]">
            <p className="text-xs text-[#888]">ผู้ใช้งาน</p>
            <p className="text-sm font-semibold">{user.fullName}</p>
            <div className="mt-2 text-[10px] text-[#888] space-y-1 border-l border-[#2a2a2a] pl-2 break-words">
              {[
                ["รหัส", user.id],
                ["Username", user.username],
                ["Password", "********"],
                ["ประเภท", user.userType || user.positionName],
                ["โทร.", user.phone],
              ].map(([k, v]) => (
                <p key={k}>
                  {k}{" "}
                  <span
                    className={
                      k === "รหัส" ? "text-[#f5a623]" : "text-[#d0ccc5]"
                    }
                  >
                    {v || "—"}
                  </span>
                </p>
              ))}
            </div>
            <span
              className={`inline-block mt-3 mono text-[10px] border px-2 ${
                user.role === "user"
                  ? "text-green-400 border-green-600"
                  : "text-[#f5a623] border-[#f5a623]"
              }`}
            >
              {user.role.toUpperCase()}
            </span>
          </div>
          <nav className="flex-1 p-3 flex md:block overflow-x-auto md:space-y-1">
            {entries.map(([id, label, icon]) => (
              <button
                key={id}
                onClick={() => { if (id === "admin-bookings") setBookingUserId(""); setPage(id) }}
                className={`whitespace-nowrap md:w-full text-left px-3 py-2 text-sm flex gap-2 items-center transition-colors ${
                  page === id
                    ? "bg-[#f5a623] text-[#0a0a0a] font-semibold"
                    : "text-[#888] hover:bg-[#1a1a1a] hover:text-white"
                }`}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-[#2a2a2a]">
            <button
              className="text-xs text-[#888] px-3 py-2 hover:text-red-400"
              onClick={async () => {
                try {
                  await api("/auth/logout", "POST")
                  setUser(null)
                  setData(null)
                  setError("")
                } catch (e) {
                  setError((e as Error).message)
                }
              }}
            >
              ออกจากระบบ →
            </button>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          {error && (
            <div className="p-4">
              <Notice error={error} />
            </div>
          )}
          {render()}
        </main>
      </div>
    </AppContext.Provider>
  )
}
