# เวอร์ชัน Shuttle Bus

ประวัติ busv1–busv14 นำเข้าจากไฟล์สำรองที่มีอยู่บนเครื่อง ไม่ใช่ประวัติ Git ดั้งเดิม วันที่ในตารางเป็นวันที่บันทึกไฟล์ ส่วน commit ถูกสร้างในวันที่นำขึ้น GitHub เวอร์ชันหลังจากนั้นบันทึกจากการพัฒนาต่อใน Git

**เวอร์ชันล่าสุด: [30/9/2569](https://github.com/Juckkajee/buseieiza55-/tree/30%2F9%2F2569)** — รายงาน Admin ทั้ง 5 ประเภท เลือกดูรายวัน รายเดือน และรายปี

| เวอร์ชัน | วันที่ไฟล์ | เนื้อหา | ลักษณะไฟล์ |
|---|---|---|---|
| [30/9/2569](https://github.com/Juckkajee/buseieiza55-/tree/30%2F9%2F2569) | 2026-09-30 | รายงานรายวัน / รายเดือน / รายปี | เว็บ Client/Server ครบชุด พัฒนาต่อจาก busv14 |
| [busv1](https://github.com/Juckkajee/buseieiza55-/tree/busv1) | 2026-09-21 | Figma Version 12 — App.tsx | สำเนาบางไฟล์ — ไม่ใช่โปรเจกต์ครบชุด |
| [busv2](https://github.com/Juckkajee/buseieiza55-/tree/busv2) | 2026-09-22 | Figma Version 13 — App.tsx | สำเนาบางไฟล์ — ไม่ใช่โปรเจกต์ครบชุด |
| [busv3](https://github.com/Juckkajee/buseieiza55-/tree/busv3) | 2026-09-23 | Admin ก่อนเพิ่มตะกร้าการจอง | สำเนาบางไฟล์ — ไม่ใช่โปรเจกต์ครบชุด |
| [busv4](https://github.com/Juckkajee/buseieiza55-/tree/busv4) | 2026-09-23 | Figma พร้อมหน้าคนขับและตะกร้าการจอง | โค้ดเป็นชุดจาก ZIP |
| [busv5](https://github.com/Juckkajee/buseieiza55-/tree/busv5) | 2026-09-23 | ก่อนแยกหน้าประวัติการยกเลิก | สำเนาบางไฟล์ — ไม่ใช่โปรเจกต์ครบชุด |
| [busv6](https://github.com/Juckkajee/buseieiza55-/tree/busv6) | 2026-09-23 | ก่อนเพิ่มรายละเอียดผู้ใช้และตั๋ว | สำเนาบางไฟล์ — ไม่ใช่โปรเจกต์ครบชุด |
| [busv7](https://github.com/Juckkajee/buseieiza55-/tree/busv7) | 2026-09-23 | Figma พร้อมตั๋ว QR และประวัติยกเลิก | โค้ดเป็นชุดจาก ZIP |
| [busv8](https://github.com/Juckkajee/buseieiza55-/tree/busv8) | 2026-09-28 | เว็บ React + Server + Oracle และ Driver | โค้ดเป็นชุดจาก ZIP |
| [busv9](https://github.com/Juckkajee/buseieiza55-/tree/busv9) | 2026-09-28 | แก้การลบจุดจอดและป้องกัน Admin หลัก | โค้ดเป็นชุดจาก ZIP |
| [busv10](https://github.com/Juckkajee/buseieiza55-/tree/busv10) | 2026-09-28 | เตรียมระบบรหัสเรียงและ SQL สำหรับตรวจ | โค้ดเป็นชุดจาก ZIP |
| [busv11](https://github.com/Juckkajee/buseieiza55-/tree/busv11) | 2026-09-28 | หน้าจัดการผู้ใช้งาน | โค้ดเป็นชุดจาก ZIP |
| [busv12](https://github.com/Juckkajee/buseieiza55-/tree/busv12) | 2026-09-28 | หน้าจัดการการจองและเหตุผลยกเลิก | โค้ดเป็นชุดจาก ZIP |
| [busv13](https://github.com/Juckkajee/buseieiza55-/tree/busv13) | 2026-09-29 | ข้อมูลจำลองรายงานปี 2569 และแบ่งหน้าการจอง | โค้ดเป็นชุดจาก ZIP |
| [busv14](https://github.com/Juckkajee/buseieiza55-/tree/busv14) | 2026-09-29 | เปิดรหัสเรียงอัตโนมัติครบ 9 ประเภท | โค้ดเป็นชุดจาก ZIP |

## การเปิดเวอร์ชัน

บน GitHub กดตัวเลือก branch → Tags → เลือก `busv1` ถึง `busv14` แล้วใช้ Code → Download ZIP หรือเลือกเวอร์ชันจากตารางข้างบน

```powershell
git clone https://github.com/Juckkajee/buseieiza55-.git
cd buseieiza55-
git switch --detach 30/9/2569
```

แท็กเป็นจุดบันทึกโค้ด หากต้องการแก้เวอร์ชันเก่าให้สร้าง branch ใหม่จากแท็ก เช่น `git switch -c my-bus-changes busv14`

`busv1`, `busv2`, `busv3`, `busv5`, `busv6` เก็บเฉพาะไฟล์ที่เคยสำรองไว้ จึงไม่มี dependencies และโครงโปรเจกต์ครบ ไม่ควรนำไปอ้างว่าเป็นเวอร์ชันเว็บที่พร้อมรัน ส่วน `busv4` และ `busv7` เป็นโค้ด Figma และ `busv8`–`busv14` เป็นเว็บ Client/Server ที่เชื่อม Oracle

ไม่มี `.env`, รหัสผ่าน Oracle, บัญชีเริ่มต้นส่วนตัว หรือข้อมูลฐานข้อมูลจริงใน repository ให้ตั้งค่าเชื่อมต่อบนเครื่องเองตาม README การย้อนแท็กย้อนเฉพาะโค้ด ไม่ย้อนข้อมูลหรือโครงสร้าง Oracle
