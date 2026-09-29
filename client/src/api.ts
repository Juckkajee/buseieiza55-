export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Shuttle-Client": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response
    .json()
    .catch(() => ({ message: "Server ไม่ตอบกลับ กรุณาตรวจว่าเปิด Server อยู่" }))
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/"))
      window.dispatchEvent(new Event("shuttle-session-expired"))
    throw new ApiError(response.status, data.message || "เกิดข้อผิดพลาด")
  }
  return data as T
}
export const today = () =>
  new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)
export const displayDate = (value: string) =>
  new Date(value.slice(0, 10) + "T12:00:00+07:00").toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  })
export const displayTime = (value: string | null | undefined) =>
  value ? `${displayDate(value)} ${value.slice(11, 16)} น.` : "ยังไม่ได้เช็กอิน"
