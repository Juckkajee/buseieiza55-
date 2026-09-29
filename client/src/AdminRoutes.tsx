import { useState } from "react"
import { useApp } from "./App"
import { useConfirm } from "./Confirmation"
import { api } from "./api"
import { TripManager } from "./TripsPage"
import {
  Title,
  Panel,
  Label,
  Empty,
  Notice,
  useAction,
  gold,
  outline,
  field,
} from "./ui"
export default function AdminRoutes() {
  const { data, refresh, can } = useApp(),
    action = useAction(),
    ask = useConfirm(),
    editable = can("admin-routes")
  const [active, setActive] = useState(""),
    [routeForm, setRouteForm] = useState<{
      routeId?: string
      routeName: string
    } | null>(null),
    [stopForm, setStopForm] = useState<{
      routeStopId?: string
      stopName: string
      minutesFromPrev: number
      anchorId: string
      placement: string
    } | null>(null)
  const route = data.routes.find((r) => r.routeId === active) || data.routes[0]
  return (
    <div className="p-5 xl:p-8">
      <Title
        action={
          <button
            disabled={!editable}
            className={gold}
            onClick={() => setRouteForm({ routeName: "" })}
          >
            + เพิ่มเส้นทาง
          </button>
        }
      >
        จัดการเส้นทาง
      </Title>
      <Notice {...action} />
      {routeForm && (
        <Panel className="mb-5">
          <form
            className="flex items-end flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              void action.run(async () => {
                if (
                  routeForm.routeId &&
                  !(await ask("ยืนยันการแก้ไขเส้นทาง", "บันทึกชื่อเส้นทางที่แก้ไขหรือไม่?"))
                )
                  return false
                const r = await api<{ routeId?: string }>(
                  "/routes" +
                    (routeForm.routeId ? "/" + routeForm.routeId : ""),
                  routeForm.routeId ? "PUT" : "POST",
                  routeForm,
                )
                await refresh()
                if (r.routeId) setActive(r.routeId)
                setRouteForm(null)
              })
            }}
          >
            <Label title={routeForm.routeId ? "แก้ไขชื่อเส้นทาง" : "ชื่อเส้นทางใหม่"}>
              <input
                autoFocus
                required
                maxLength={150}
                className={field}
                value={routeForm.routeName}
                onChange={(e) =>
                  setRouteForm({ ...routeForm, routeName: e.target.value })
                }
              />
            </Label>
            <button className={gold} disabled={action.busy}>
              บันทึก
            </button>
            <button
              type="button"
              className={outline}
              onClick={() => setRouteForm(null)}
            >
              ยกเลิก
            </button>
          </form>
        </Panel>
      )}
      <div className="flex gap-2 flex-wrap mb-5">
        {data.routes.map((r) => (
          <button
            key={r.routeId}
            onClick={() => {
              setActive(r.routeId)
              setStopForm(null)
            }}
            className={`${outline} ${
              route?.routeId === r.routeId
                ? "border-[#f5a623] text-[#f5a623] bg-[#332c20]"
                : ""
            }`}
          >
            {r.routeName}
          </button>
        ))}
      </div>
      {!route ? (
        <Empty>ยังไม่มีเส้นทาง กดเพิ่มเส้นทางเพื่อเริ่มต้น</Empty>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          <Panel>
            <div className="flex justify-between gap-3 mb-5">
              <div>
                <h2 className="font-bold text-[#f5a623]">{route.routeName}</h2>
                <p className="text-xs text-[#999] mt-2">
                  {route.stops.length} จุดจอด · เวลาเดินทางรวม{" "}
                  {route.totalMinutes} นาที
                </p>
              </div>
              <div className="text-xs flex gap-3 items-start">
                <button
                  disabled={!editable}
                  className="text-[#f5a623] disabled:opacity-30"
                  onClick={() =>
                    setRouteForm({
                      routeId: route.routeId,
                      routeName: route.routeName,
                    })
                  }
                >
                  แก้ไข
                </button>
                <button
                  disabled={!editable || action.busy}
                  className="text-red-300 disabled:opacity-30"
                  onClick={async () => {
                    if (
                      await ask(
                        "ยืนยันการลบเส้นทาง",
                        `ลบ ${route.routeName} และจุดจอดในเส้นทางนี้หรือไม่?`,
                      )
                    )
                      void action.run(async () => {
                        await api("/routes/" + route.routeId, "DELETE")
                        await refresh()
                        setActive("")
                      })
                  }}
                >
                  ลบ
                </button>
              </div>
            </div>
            <div className="space-y-0">
              {route.stops.map((s, i) => (
                <div
                  key={s.routeStopId}
                  className="relative flex gap-4 pb-7 last:pb-2"
                >
                  {i < route.stops.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-px bg-[#555]" />
                  )}
                  <span className="w-8 h-8 shrink-0 flex items-center justify-center border border-[#f5a623] text-[#f5a623] mono text-xs">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{s.stopName}</p>
                    <p className="text-xs text-[#888] mt-1">
                      {i === 0
                        ? "จุดเริ่มต้น"
                        : `${s.minutesFromPrev} นาทีจากจุดก่อนหน้า`}
                    </p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <button
                      disabled={!editable}
                      className="text-[#f5a623] disabled:opacity-30"
                      onClick={() =>
                        setStopForm({
                          routeStopId: s.routeStopId,
                          stopName: s.stopName,
                          minutesFromPrev: s.minutesFromPrev,
                          anchorId: "",
                          placement: "after",
                        })
                      }
                    >
                      แก้ไข
                    </button>
                    <button
                      disabled={!editable || action.busy}
                      className="text-red-300 disabled:opacity-30"
                      onClick={async () => {
                        if (
                          await ask(
                            "ยืนยันการลบจุดจอด",
                            `ลบจุดที่ ${s.stopSequence} ${s.stopName} จากเส้นทางหรือไม่?`,
                          )
                        )
                          void action.run(async () => {
                            await api(
                              `/routes/${route.routeId}/stops/${s.routeStopId}`,
                              "DELETE",
                            )
                            await refresh()
                          })
                      }}
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {!route.stops.length && <Empty>ยังไม่มีจุดจอด</Empty>}
            <button
              disabled={!editable}
              className={`${outline} w-full mt-5`}
              onClick={() =>
                setStopForm({
                  stopName: "",
                  minutesFromPrev: route.stops.length ? 5 : 0,
                  anchorId: route.stops.at(-1)?.routeStopId || "",
                  placement: "after",
                })
              }
            >
              + เพิ่มจุดจอด
            </button>
            {stopForm && (
              <form
                className="border-t border-[#444] mt-5 pt-5 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  void action.run(async () => {
                    if (
                      stopForm.routeStopId &&
                      !(await ask(
                        "ยืนยันการแก้ไขจุดจอด",
                        "บันทึกชื่อและเวลาเดินทางที่แก้ไขหรือไม่?",
                      ))
                    )
                      return false
                    await api(
                      `/routes/${route.routeId}/stops` +
                        (stopForm.routeStopId
                          ? "/" + stopForm.routeStopId
                          : ""),
                      stopForm.routeStopId ? "PUT" : "POST",
                      stopForm,
                    )
                    await refresh()
                    setStopForm(null)
                  })
                }}
              >
                <h3 className="text-[#f5a623] font-bold">
                  {stopForm.routeStopId ? "แก้ไขจุดจอด" : "เพิ่มจุดจอดใหม่"}
                </h3>
                <Label title="ชื่อจุดจอด">
                  <input
                    autoFocus
                    required
                    maxLength={200}
                    className={field}
                    value={stopForm.stopName}
                    onChange={(e) =>
                      setStopForm({ ...stopForm, stopName: e.target.value })
                    }
                  />
                </Label>
                {!stopForm.routeStopId && !!route.stops.length && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Label title="ตำแหน่งที่ต้องการเพิ่ม">
                      <select
                        className={field}
                        value={stopForm.placement}
                        onChange={(e) =>
                          setStopForm({
                            ...stopForm,
                            placement: e.target.value,
                          })
                        }
                      >
                        <option value="after">หลังจุดจอดนี้</option>
                        <option value="before">ก่อนจุดจอดนี้</option>
                      </select>
                    </Label>
                    <Label title="จุดจอดอ้างอิง">
                      <select
                        className={field}
                        value={stopForm.anchorId}
                        onChange={(e) =>
                          setStopForm({ ...stopForm, anchorId: e.target.value })
                        }
                      >
                        {route.stops.map((s) => (
                          <option key={s.routeStopId} value={s.routeStopId}>
                            {s.stopSequence}. {s.stopName}
                          </option>
                        ))}
                      </select>
                    </Label>
                  </div>
                )}
                <Label title="เวลาเดินทางจากจุดก่อนหน้า (นาที)">
                  <input
                    required
                    type="number"
                    min={0}
                    max={1440}
                    className={field}
                    value={stopForm.minutesFromPrev}
                    onChange={(e) =>
                      setStopForm({
                        ...stopForm,
                        minutesFromPrev: Number(e.target.value),
                      })
                    }
                  />
                </Label>
                <p className="text-xs text-[#888]">
                  จุดแรกของเส้นทางจะเป็น 0 นาทีเสมอ
                </p>
                <div className="flex gap-2">
                  <button className={gold} disabled={action.busy}>
                    บันทึก
                  </button>
                  <button
                    type="button"
                    className={outline}
                    onClick={() => setStopForm(null)}
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            )}
          </Panel>
          <Panel>
            <h2 className="font-bold mb-4">รอบเดินรถ · {route.routeName}</h2>
            <TripManager routeId={route.routeId} />
          </Panel>
        </div>
      )}
    </div>
  )
}
