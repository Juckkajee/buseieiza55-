# final1 — เปิดใช้งานกับ Oracle ที่มีอยู่แล้ว

ใช้ Node.js 22.12 ขึ้นไป และ Oracle ของเครื่องผู้ใช้ ไม่มี Docker

## ZIP ฉบับส่งให้เพื่อน

1. แตก `final1-full-private.zip` ให้เรียบร้อย
2. ตรวจ `server/.env`: ZIP มีค่าของเครื่องต้นฉบับและรหัสผ่านครบ หาก Oracle ของเพื่อนใช้บัญชี/รหัสผ่าน/service ต่างกัน ให้แก้ `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING` ให้ตรงเครื่องเพื่อน
3. ถ้า Oracle มีข้อมูล BUS_ ชุดนี้อยู่แล้ว ข้ามขั้นตอนนำเข้าได้เลย ถ้าบัญชี Oracle ยังว่าง ให้รัน `install-database.cmd` หนึ่งครั้ง จะสร้างตารางทั้ง 14 ตาราง นำสำเนาข้อมูลจาก `server/private/final1-database.json` เข้า และตั้ง Sequence ทั้ง 9 ตัว ไม่เขียนทับฐานข้อมูลที่มีอยู่
4. ดับเบิลคลิก `start-server.cmd` และ `start-client.cmd` แล้วเปิด http://localhost:5173
5. บัญชีเว็บและรหัสผ่านอยู่ใน `PRIVATE-ACCOUNTS.txt` ภายใน ZIP; รหัสเว็บกับรหัส Oracle เป็นคนละชุด

ZIP รวม source, SQL, สำเนาข้อมูล, dependencies ของ server/client สำหรับ Windows x64, production build และไฟล์ตั้งค่าแล้ว ไม่ต้อง npm install ซ้ำบน Windows x64 ที่รองรับ หากย้ายระบบปฏิบัติการ/สถาปัตยกรรมหรือ dependencies ใช้ไม่ได้ ให้รัน `npm.cmd --prefix server ci` และ `npm.cmd --prefix client ci` ใหม่

ถ้าบัญชี Oracle ตาม `.env` ยังไม่มี ให้ DBA สร้างบัญชีใน PDB ที่จะใช้และให้สิทธิ์ CREATE SESSION, CREATE TABLE, CREATE SEQUENCE และ quota ก่อน; ZIP มี `PRIVATE-CREATE-ORACLE-USER.sql` ตามค่าต้นฉบับสำหรับ DBA ตรวจและรันเฉพาะเครื่องใหม่ ไฟล์นี้ไม่ได้ถูกรันอัตโนมัติ

การติดตั้งตรวจว่าฐานข้อมูลว่างก่อน หากพบตารางติดตั้งค้างจะหยุดให้ตรวจสอบ ไม่ DROP ตารางเดิม ส่วนเครื่องเดิมได้เพิ่มสิทธิ์ที่เคยได้รับผ่าน Admin bypass จำนวนสองแถวด้วย SQL 005 แล้ว สิทธิ์ที่มีอยู่ไม่ถูกเขียนทับ

## ชุด GitHub

GitHub เก็บโค้ดและ SQL พร้อม `.env.example` แต่ไม่เก็บรหัสจริงหรือข้อมูลส่วนตัว ติดตั้ง dependencies และคัดลอก `server/.env.example` เป็น `server/.env` ใส่บัญชี Oracle ของตน จากนั้นรัน `install-database.cmd` ใน schema ว่าง จะสร้างข้อมูลเริ่มต้นพร้อมบัญชี `admin`, `driver`, `user` รหัสสุ่มอยู่ใน `server/private/starter-accounts.json`

ถ้าต้องการข้อมูลจำลองปริมาณมากสำหรับรายงาน ให้ใช้ ZIP ฉบับเต็มที่ให้แยกต่างหาก หรืออ่านคำสั่ง seed ข้อมูลรายงานใน README โดยนำเข้าก่อนติดตั้ง Sequence

## การรันด้วย Terminal

```powershell
# ช่องที่ 1 (โฟลเดอร์โปรเจกต์)
npm.cmd run server

# ช่องที่ 2
npm.cmd run client
```

ถ้าต้องการพอร์ต 8080 ใช้ `npm.cmd --prefix client run dev -- --port 8080` แล้วตั้ง `CLIENT_ORIGIN=http://localhost:8080` ใน `server/.env` และเริ่ม server ใหม่

เก็บหน้าต่างทั้งสองไว้ขณะใช้เว็บ กด Ctrl+C เพื่อหยุด รายงานตัวอย่างอยู่ปี พ.ศ. 2569 และมีข้อมูลการจองจำนวนมาก

ZIP ฉบับเต็มมีรหัสผ่านและสำเนาฐานข้อมูลตามที่เจ้าของงานขอ จึงส่งให้เพื่อนโดยตรง ไม่อัปโหลด ZIP นี้หรือไฟล์ PRIVATE ขึ้น repository สาธารณะ
