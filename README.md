# Sports Science Fitness Club — ระบบสมาชิก (ต้นแบบ)

เว็บต้นแบบระบบสมาชิกของ Sports Science Fitness Club ประกอบด้วยหน้าเว็บ static (HTML/CSS/JS) และ Backend REST API (Node.js + Express + PostgreSQL)

## โครงสร้าง

| ส่วน | รายละเอียด |
| --- | --- |
| หน้าเว็บ | `index.html`, `fitness.html`, `packages.html`, `trainers.html`, `trainer-detail.html`, `health-profile.html`, `login.html`, `register.html` |
| พื้นที่สมาชิก | `dashboard.html`, `membership.html`, `appointments.html`, `access.html`, `assessment.html`, `profile.html` |
| เจ้าหน้าที่ | `admin-dashboard.html`, `coach-dashboard.html` |
| Frontend logic | `js/api.js` (เชื่อม API + จัดการ session), `js/features.js`, `js/member.js`, `js/staff.js`, `js/profile.js`, `js/auth-roles.js`, `js/ui.js` |
| Backend | `server/` — Express, JWT, bcrypt, PostgreSQL |

## เริ่มใช้งาน

```powershell
cd server
npm install
npm run db:setup   # สร้างฐานข้อมูล + schema + seed (รันซ้ำได้)
npm start          # http://localhost:3000
```

ต้องมี Node.js 20+ และ PostgreSQL 13+ และตั้งค่า `server/.env` (คัดลอกจาก `server/.env.example`)

## บัญชีทดลอง

| บทบาท | อีเมล | รหัสผ่าน |
| --- | --- | --- |
| ผู้ดูแลระบบ | `admin@sportscience.local` | `admin1234` |
| โค้ช | `coach.narin@sportscience.local` … `coach.fah@sportscience.local` | `coach1234` |
| สมาชิก | สมัครเองที่ `register.html` | — |

หน้า `login.html` มีตัวเลือกบัญชีเจ้าหน้าที่ทดลองให้เติมอีเมล/รหัสผ่านอัตโนมัติ

## การทำงานของ session

- ล็อกอินสำเร็จ → Backend ออก JWT → `js/api.js` เก็บที่ `localStorage` (`ssf_token`) และแคชผู้ใช้
- ทุกคำขอ API แนบ `Authorization: Bearer <JWT>`
- `js/ui.js` ตรวจ token และบทบาทก่อนเปิดหน้าสมาชิก/เจ้าหน้าที่
- ออกจากระบบจะล้าง token และแคชผู้ใช้

## ทดสอบ

```powershell
cd server
npm start          # เปิดเซิร์ฟเวอร์ไว้ก่อน
npm test           # อีกหน้าต่างหนึ่ง
```

ผลที่คาดหวัง: `33/33 checks passed`

## ข้อจำกัดที่ยังคงอยู่

- กติกาการหัก/คืนจำนวนครั้ง เงื่อนไขหมดอายุ และสิทธิ์เข้าใช้ตามนัด ยังรอข้อสรุปจากทางฟิตเนส
- RFID ยังเป็นข้อมูลในฐานข้อมูล ไม่ได้เชื่อมเครื่องอ่านจริง
- การชำระเงินจริงยังไม่มี
- ยังไม่มีระบบรีเซ็ตรหัสผ่าน/ยืนยันอีเมล และยังไม่ควรใช้กับข้อมูลสมาชิกจริงก่อนเปลี่ยน secret ทั้งหมด

ดูรายละเอียดเชิงเทคนิคที่ `server/README.md` และสถานะงานที่ `HANDOFF.md`
