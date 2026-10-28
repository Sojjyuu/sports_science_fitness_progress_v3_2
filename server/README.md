# SSF Backend — Node.js + Express + PostgreSQL

Backend สำหรับ Sports Science Fitness Club ใช้เสิร์ฟ REST API และหน้าเว็บ static จาก origin เดียวกันที่ `http://localhost:3000`

> ข้อมูลบัญชีทดลองและกติกาธุรกิจในชุดนี้เป็นของต้นแบบ ยังไม่ควรใช้กับข้อมูลจริงก่อนเปลี่ยนรหัสผ่าน/secret และสรุปเงื่อนไขกับทางฟิตเนส

## สิ่งที่ต้องมี

- Node.js 20 ขึ้นไป
- PostgreSQL 13 ขึ้นไป (ทดสอบกับ PostgreSQL 18)
- ฐานข้อมูลจะถูกสร้างอัตโนมัติโดย `npm run db:migrate` ถ้ายังไม่มี

## ตั้งค่า

1. คัดลอกไฟล์ตั้งค่า (ถ้าต้องการเริ่มใหม่)

   ```powershell
   Copy-Item .env.example .env
   ```

2. แก้ค่าใน `.env` โดยเฉพาะ `PGPASSWORD` และ `JWT_SECRET`

   ```dotenv
   PORT=3000
   PGHOST=localhost
   PGPORT=5432
   PGUSER=postgres
   PGPASSWORD=1234
   PGDATABASE=sports_science_fitness
   JWT_SECRET=change-me-to-a-long-random-string
   JWT_EXPIRES_IN=7d
   ```

## ติดตั้งและเริ่มใช้งาน

```powershell
cd server
npm install
npm run db:setup   # สร้างฐานข้อมูล + schema + seed
npm start          # เปิด http://localhost:3000
```

โหมดพัฒนา (รีสตาร์ตเมื่อไฟล์เปลี่ยน):

```powershell
npm run dev
```

ตรวจสอบระบบ:

```powershell
Invoke-WebRequest http://localhost:3000/api/health -UseBasicParsing
# {"ok":true,"database":"up", ...}
```

## บัญชีทดลอง

| บทบาท | อีเมล | รหัสผ่าน |
| --- | --- | --- |
| ผู้ดูแลระบบ | `admin@sportscience.local` | `admin1234` |
| โค้ช 6 คน | `coach.narin@sportscience.local` … `coach.fah@sportscience.local` | `coach1234` |

สมาชิกสมัครเองได้จากหน้า `register.html`

## คำสั่งที่มี

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm start` | เปิดเซิร์ฟเวอร์ |
| `npm run dev` | เปิดเซิร์ฟเวอร์พร้อม watch |
| `npm run db:migrate` | สร้างฐานข้อมูล (ถ้ายังไม่มี) และรัน `db/schema.sql` |
| `npm run db:seed` | เพิ่ม/อัปเดตบัญชีเจ้าหน้าที่ เทรนเนอร์ และแพ็กเกจ (รันซ้ำได้) |
| `npm run db:setup` | migrate + seed |
| `npm test` | ทดสอบ API แบบ end-to-end (ต้องเปิดเซิร์ฟเวอร์อยู่) |

## API โดยย่อ

### Auth

| Method | Path | สิทธิ์ |
| --- | --- | --- |
| POST | `/api/auth/register` | สาธารณะ |
| POST | `/api/auth/login` | สาธารณะ |
| GET | `/api/auth/me` | ล็อกอินแล้ว |

### Catalog

| Method | Path | สิทธิ์ |
| --- | --- | --- |
| GET | `/api/trainers` | สาธารณะ |
| GET | `/api/trainers/:id` | สาธารณะ |
| GET | `/api/trainers/:id/availability?date=YYYY-MM-DD` | สาธารณะ |
| GET | `/api/packages` | สาธารณะ |

### Member (`member`)

| Method | Path |
| --- | --- |
| GET | `/api/me` |
| PATCH | `/api/me/profile` |
| PATCH | `/api/me/preferences` |
| GET / POST | `/api/me/appointments` |
| PATCH / DELETE | `/api/me/appointments/:id` |
| GET / PUT | `/api/me/health` |
| GET | `/api/me/access` |

### Coach (`coach`)

| Method | Path |
| --- | --- |
| GET | `/api/coach/dashboard` |
| GET | `/api/coach/appointments` |
| PATCH | `/api/coach/appointments/:id` |
| GET / PUT | `/api/coach/clients/:memberId/note` |

### Admin (`admin`)

| Method | Path |
| --- | --- |
| GET | `/api/admin/dashboard` |
| GET | `/api/admin/members` |
| PATCH | `/api/admin/members/:id` |
| GET | `/api/admin/appointments` |
| PATCH | `/api/admin/appointments/:id` |
| GET | `/api/admin/coaches` |
| GET | `/api/admin/entitlements` |
| PATCH | `/api/admin/entitlements/:id` |
| GET / POST | `/api/admin/rfid-cards` |
| PATCH | `/api/admin/rfid-cards/:id` |
| GET | `/api/admin/staff` |

ทุก endpoint ที่ต้องล็อกอินใช้ header:

```http
Authorization: Bearer <JWT>
```

## โครงสร้างฐานข้อมูล

- `accounts` — บัญชี member / coach / admin (รหัสผ่าน bcrypt)
- `trainers` — โปรไฟล์เทรนเนอร์ ผูกกับบัญชี coach
- `fitness_packages`, `trainer_packages` — แค็ตตาล็อกแพ็กเกจ
- `entitlements` — สิทธิ์ฟิตเนส/ฝึกส่วนตัว สถานะ pending / confirmed / cancelled / expired
- `appointments` — นัดหมาย requested / confirmed / cancelled / completed / no_show
- `coach_notes` — โน้ตของโค้ชต่อสมาชิก
- `health_profiles` — ข้อมูลสุขภาพและผลคำนวณ
- `rfid_cards`, `access_logs` — บัตรและประวัติเข้าใช้ (ยังไม่เชื่อมอุปกรณ์จริง)

ข้อกำหนดสำคัญ:

- อีเมลไม่ซ้ำแบบ case-insensitive
- หนึ่งสมาชิกมีสิทธิ์ชนิดเดียวกันที่ยังเปิดได้ครั้งละหนึ่งรายการ
- กันนัดซ้อนทั้งฝั่งโค้ชและสมาชิกด้วย partial unique index
- นัดที่ยกเลิกแล้วจองช่วงเวลาเดิมซ้ำได้

## ทดสอบ

```powershell
# เปิดเซิร์ฟเวอร์อีกหน้าต่างก่อน
npm start

# หน้าต่างใหม่
cd server
npm test
```

ผลที่คาดหวัง: `33/33 checks passed`

## ความปลอดภัยและข้อจำกัด

- `server/.env` ถูก ignore โดย git แล้ว ห้าม commit secret จริง และต้องเปลี่ยน `JWT_SECRET`/รหัสฐานข้อมูลก่อนใช้งานจริง
- ระบบจะไม่ยอมเริ่มทำงานบน production ถ้า `JWT_SECRET` ยังเป็นค่าตัวอย่างหรือสั้นกว่า 32 ตัวอักษร
- CORS อนุญาตเฉพาะ origin บน `localhost`/`127.0.0.1` สำหรับการพัฒนา
- Static server บล็อกการเข้าถึง `/server`, `/node_modules` และ `/.git`
- ไม่มี rate limit ระดับ production (มีเฉพาะการจำกัดลองล็อกอินในหน่วยความจำ)
- ยังไม่มีระบบรีเซ็ตรหัสผ่าน ยืนยันอีเมล HTTPS หรือ backup
- กติกาการหัก/คืนสิทธิ์และเงื่อนไขหมดอายุยังรอข้อสรุปจากทางฟิตเนส
- RFID ยังเป็นข้อมูลในฐานข้อมูล ไม่มีอุปกรณ์ส่ง event เข้าใช้จริง — สมาชิกหนึ่งคนเก็บประวัติบัตรได้หลายใบ แต่เปิดใช้งานได้ครั้งละใบ
