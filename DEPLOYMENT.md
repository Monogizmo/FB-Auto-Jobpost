# คู่มือ Deploy Danu-Jobpost (สำหรับมือใหม่)

ภาพรวม: **GitHub** เก็บโค้ด → **Vercel** รันเว็บ → **Supabase** เก็บข้อมูล → **cron-job.org** สั่งตรวจโพสต์ที่ตั้งเวลาไว้ทุก 1 นาที

> ⚠️ **ห้ามส่งรหัสผ่านฐานข้อมูล / secret key ให้ใคร (รวมถึงในแชท)** ใส่ใน Vercel เท่านั้น

---

## ขั้นที่ 1 — อัปโหลดโค้ดขึ้น GitHub (repo: Monogizmo/Danu-Jobpost)

1. แตกไฟล์ zip นี้ในเครื่อง จะได้โฟลเดอร์ที่มี `package.json`, `src`, `prisma`, `supabase` ฯลฯ
2. เปิด https://github.com/Monogizmo/Danu-Jobpost → กด **Add file → Upload files**
3. GitHub รับได้ครั้งละไม่เกิน **100 ไฟล์** โปรเจกต์นี้มี 104 ไฟล์ จึงอัปโหลด **2 รอบ**:
   - **รอบที่ 1:** ลากทุกอย่าง **ยกเว้นโฟลเดอร์ `src/components/ui`** (ลากไฟล์/โฟลเดอร์ที่อยู่ระดับบนสุด เข้าไปในหน้าอัปโหลด แล้วเอา `ui` ออก หรือจะเลือกเฉพาะส่วนที่ต้องการ) → กด **Commit changes**
   - **รอบที่ 2:** กด Add file → Upload files อีกครั้ง ลากโฟลเดอร์ `src/components/ui` (ทั้งโฟลเดอร์) → Commit
   - (ทางเลือก: ติดตั้ง **GitHub Desktop** แล้วเพิ่มโฟลเดอร์โปรเจกต์ → Commit → Push ครั้งเดียวจบ ไม่มีลิมิต 100 ไฟล์)
4. ไฟล์ที่ขึ้นต้นด้วยจุด (`.gitignore`, `.env.example`) เป็นไฟล์ซ่อน บน Mac กด `Cmd+Shift+.` เพื่อแสดง และต้องอัปโหลดด้วย
5. **ตรวจ:** เปิดหน้า repo ต้องเห็น `package.json` อยู่ **ชั้นนอกสุด** (ไม่ใช่อยู่ในโฟลเดอร์ย่อย) และเห็นโฟลเดอร์ `src`, `prisma`, `supabase`

---

## ขั้นที่ 2 — ตั้งค่า Supabase

เปิดโปรเจกต์: https://supabase.com/dashboard/project/wymzvcvwfcwyaezobbiz

### 2.1 สร้างตาราง (SQL)
1. เมนูซ้าย → **SQL Editor** → **New query**
2. เปิดไฟล์ `supabase/schema.sql` ในโปรเจกต์ → คัดลอก **ทั้งไฟล์** มาวาง
3. กด **Run** → ควรขึ้น `Success. No rows returned`
4. เมนูซ้าย → **Table Editor** ต้องเห็น 5 ตาราง: `User`, `FacebookPage`, `Post`, `ActivityLog`, `Setting`

### 2.2 เอา DATABASE_URL
1. กดปุ่ม **Connect** (แถบด้านบนของหน้าโปรเจกต์)
2. เลือกวิธีเชื่อมต่อแบบ **Transaction pooler** (พอร์ต **6543**) แล้วคัดลอก connection string หน้าตาประมาณนี้:
   ```
   postgresql://postgres.wymzvcvwfcwyaezobbiz:[YOUR-PASSWORD]@aws-X-XXXX.pooler.supabase.com:6543/postgres
   ```
3. แทนที่ `[YOUR-PASSWORD]` ด้วยรหัสผ่านฐานข้อมูลของคุณ (เอาวงเล็บ `[ ]` ออกด้วย)
4. **ต่อท้ายสุด** ด้วย `?pgbouncer=true&connection_limit=1` ผลลัพธ์:
   ```
   postgresql://postgres.wymzvcvwfcwyaezobbiz:รหัสผ่าน@aws-X-XXXX.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```
5. จดเก็บไว้ในที่ปลอดภัย (ใช้ในขั้นที่ 4)

ลืมรหัสผ่าน? **Project Settings → Database → Reset database password**
💡 ตั้งรหัสใหม่ให้เป็น **ตัวอักษรและตัวเลขล้วน** (ไม่มี `@ : / # ?`) จะไม่ติดปัญหาตัวอักษรพิเศษใน URL

### 2.3 เรื่อง Authentication และ API key
- โปรเจกต์นี้มีระบบ login ของตัวเอง (NextAuth) **ไม่ต้องตั้งค่า Supabase Authentication**
- **Project URL / publishable key ไม่ต้องใช้** ในโปรเจกต์นี้ (เราเชื่อมต่อฐานข้อมูลตรง ๆ ผ่าน DATABASE_URL)
- ใน SQL ผมเปิด **Row Level Security** ให้ทุกตารางแล้ว เพื่อไม่ให้ใครใช้ publishable key เปิดอ่านข้อมูลผ่าน API สาธารณะของ Supabase ได้

---

## ขั้นที่ 3 — สร้างรหัสลับ 3 ตัว (ไม่ต้องติดตั้งอะไร)

1. เปิดเบราว์เซอร์ Chrome → กด **F12** → แท็บ **Console**
2. (ถ้า Chrome เตือนเรื่องการวาง ให้พิมพ์ `allow pasting` แล้วกด Enter ก่อน)
3. วางโค้ดนี้แล้วกด Enter:
   ```js
   Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('')
   ```
4. จะได้ตัวอักษร 64 ตัว คัดลอกเก็บไว้ **ทำซ้ำ 3 ครั้ง** ให้ได้ 3 ค่าที่ไม่ซ้ำกัน:

| ใช้เป็น | หน้าที่ |
|---|---|
| `NEXTAUTH_SECRET` | เซ็นข้อมูล login (เปลี่ยนภายหลัง = ทุกคนต้อง login ใหม่) |
| `TOKEN_ENCRYPTION_KEY` | เข้ารหัส Facebook token ⚠️ **ห้ามหาย** ถ้าหายต้องเพิ่มเพจใหม่ทุกเพจ |
| `CRON_SECRET` | รหัสให้ cron-job.org เรียก worker |

เก็บทั้ง 3 ค่าไว้ใน password manager หรือที่ปลอดภัย

---

## ขั้นที่ 4 — Deploy บน Vercel

1. ไป https://vercel.com/signup → สมัครด้วย **Continue with GitHub** (บัญชีเดียวกับ Monogizmo)
2. กด **Add New… → Project** → ในรายการ repo เลือก **Danu-Jobpost** → **Import**
   (ถ้าไม่เห็น repo ให้กด *Adjust GitHub App Permissions* แล้วอนุญาต repo นี้)
3. หน้า Configure Project: Framework ควรขึ้น **Next.js** อัตโนมัติ ไม่ต้องแก้อะไร
4. เปิดหัวข้อ **Environment Variables** แล้วเพิ่มทีละตัว (Name → Value → Add):

| Name | Value |
|---|---|
| `DATABASE_URL` | ค่าจากขั้น 2.2 (ที่ต่อท้าย `?pgbouncer=true&connection_limit=1` แล้ว) |
| `NEXTAUTH_SECRET` | ค่าจากขั้นที่ 3 |
| `TOKEN_ENCRYPTION_KEY` | ค่าจากขั้นที่ 3 |
| `CRON_SECRET` | ค่าจากขั้นที่ 3 |

5. กด **Deploy** รอประมาณ 2–4 นาที → เมื่อขึ้นหน้าแสดงความยินดี คัดลอก URL เว็บ เช่น `https://danu-jobpost.vercel.app`
6. เพิ่มตัวแปรที่ 5: ไปที่ **Settings → Environment Variables** เพิ่ม

| Name | Value |
|---|---|
| `NEXTAUTH_URL` | URL เว็บของคุณ เช่น `https://danu-jobpost.vercel.app` (ไม่มี `/` ท้าย) |

7. แล้ว **Redeploy**: แท็บ **Deployments** → เมนู **⋯** ของรายการบนสุด → **Redeploy**

**ถ้า Build ล้มเหลว (Error):** เปิดรายการ deploy ที่ขึ้นสีแดง คัดลอกข้อความ log ส่วนที่เป็น error มาให้ผมดูได้เลย

---

## ขั้นที่ 5 — เริ่มใช้งานครั้งแรก

1. เปิดเว็บ → แท็บ **"ตั้งค่าครั้งแรก"** → สร้างบัญชี **Admin คนแรก**
   ⚠️ ทำทันทีหลัง deploy และอย่าเพิ่งส่งลิงก์ให้ใคร เพราะผู้ที่สมัครเป็นคนแรกจะได้สิทธิ์ admin
2. เมนู **เพจ Facebook** → เพิ่มเพจ (ใส่ Page ID + Page Access Token ตามคำอธิบายในหน้านั้น)
3. เมนู **จัดการผู้ใช้** → สร้างบัญชี Recruiter ให้ทีม

---

## ขั้นที่ 6 — ตั้งเวลาให้โพสต์ตามกำหนด (cron-job.org ฟรี)

Vercel แพ็กเกจฟรีตั้ง cron ได้แค่วันละครั้ง (ถ้าตั้งถี่กว่านั้น deploy จะล้ม) จึงใช้ตัวตั้งเวลาภายนอกแทน

1. สมัคร https://cron-job.org → **Create cronjob**
2. **Title:** Danu-Jobpost worker
3. **URL:** `https://YOUR-APP.vercel.app/api/worker`
4. **Execution schedule:** Every **1 minute**
5. เปิดแท็บ/ส่วน **Advanced**:
   - **Request method:** `POST`
   - **Headers** → Add: Key = `Authorization`  Value = `Bearer ` ตามด้วย CRON_SECRET (มีช่องว่างหลัง Bearer 1 ช่อง)
     เช่น `Bearer 3f9a...`
6. กด **Create** แล้วกด **Test run** → ต้องได้ HTTP **200** และข้อความ `{"ok":true,...}`
   (ได้ 401 = CRON_SECRET ไม่ตรงกับที่ใส่ใน Vercel — แก้แล้ว Redeploy)
7. กลับไปที่หน้า Dashboard ของเว็บ ควรเห็น "ตรวจล่าสุด … ที่ผ่านมา"

**ทดสอบ:** สร้างโพสต์ตั้งเวลาอีก 2–3 นาทีข้างหน้าลงเพจทดสอบ แล้วดูว่าสถานะเปลี่ยนเป็น "โพสต์แล้ว"

---

## หมายเหตุสำคัญ

- Vercel **Hobby (ฟรี)** ออกแบบมาสำหรับการใช้งานส่วนตัว/ไม่ใช่เชิงพาณิชย์ ถ้าใช้ในบริษัทจริงควรพิจารณา Pro
- Facebook Page Token มีอายุจำกัด ถ้าโพสต์ error ว่า token หมดอายุ ให้ลบแล้วเพิ่มเพจใหม่
- Supabase ฟรีจะ **หยุดโปรเจกต์ชั่วคราวถ้าไม่มีการใช้งาน 1 สัปดาห์** (cron ทุกนาทีช่วยให้ไม่หยุด)
- ถ้าแก้โครงสร้างตาราง (`prisma/schema.prisma`) ภายหลัง ต้องแก้ SQL ใน Supabase ให้ตรงกันด้วย
- `.env` ห้ามอัปโหลดขึ้น GitHub (ถูกกันไว้ใน `.gitignore` แล้ว)
