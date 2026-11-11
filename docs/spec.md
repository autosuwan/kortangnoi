# KORTANGNOI — Spec

อ้างอิง feature จาก `docs/requirements.md` (F1–F12) · stack ตาม `docs/design-brief.md`

## ข้อตกลงรวม

### API

- ทุก endpoint เป็น Next.js Route Handler ใต้ `/api` รับ-ส่ง JSON (ยกเว้นอัปโหลดไฟล์ใช้ `multipart/form-data`)
- Route handler ทำแค่ auth + validate + เรียก service ใน `src/server/services/` (เพื่อให้ Discord bot ใช้ซ้ำได้)
- Validate ทุก input ด้วย Zod ที่ boundary
- Endpoint ที่ต้องล็อกอิน: ใช้ session ของ Supabase Auth (cookie) ไม่มี session → `401`
- รูปแบบ error เดียวทั้งระบบ:
  ```json
  { "error": { "code": "AMOUNT_TOO_LOW", "message": "ยอดต้องไม่ต่ำกว่า 20 บาท" } }
  ```
  `message` เป็นภาษาไทยที่แสดงให้ผู้ใช้ได้เลย, `code` ใช้ในโค้ดและ test

| HTTP | ใช้เมื่อ                                    |
| ---- | ---------------------------------------- |
| 400  | input ไม่ผ่าน validation                   |
| 401  | ไม่ได้ล็อกอิน                                |
| 403  | ล็อกอินแล้วแต่ไม่มีสิทธิ์                         |
| 404  | ไม่พบ                                     |
| 409  | ชนกับข้อมูลที่มีอยู่ (username ซ้ำ, สถานะไม่ถูกต้อง) |
| 429  | เกิน rate limit                           |
| 500  | error ภายใน (log ไว้ ไม่ส่งรายละเอียดออกไป)  |

### เงิน

- เก็บเป็น **สตางค์ (integer)** ทุกที่ (`amount_satang`) แปลงเป็นบาทตอนแสดงผลเท่านั้น
- ผู้บริจาคกรอกได้ทศนิยมไม่เกิน 2 ตำแหน่ง
- ยอดสูงสุดต่อรายการ 100,000 บาท

### เวลา

- เก็บเป็น `timestamptz` (UTC) แสดงผลเป็นเวลาไทย (Asia/Bangkok)

### สถานะโดเนท

```mermaid
stateDiagram-v2
  [*] --> awaiting_slip: สร้างรายการ (F8)
  awaiting_slip --> verifying: แนบสลิป (F9)
  awaiting_slip --> expired: เกิน 30 นาที
  verifying --> approved: ตรวจผ่าน
  verifying --> pending_review: ตรวจอัตโนมัติไม่ได้
  verifying --> awaiting_slip: สลิปใช้ไม่ได้ ยังเหลือสิทธิ์แนบ
  verifying --> rejected: สลิปไม่ถูกต้อง / หมดสิทธิ์แนบ
  pending_review --> approved: สตรีมเมอร์อนุมัติ (F6)
  pending_review --> rejected: สตรีมเมอร์ปฏิเสธ (F6)
  approved --> [*]
  rejected --> [*]
  expired --> [*]
```

| สถานะ            | ความหมาย                  | ผู้บริจาคเห็น            |
| ---------------- | ------------------------- | -------------------- |
| `awaiting_slip`  | สร้าง QR แล้ว รอสลิป         | QR + ปุ่มแนบสลิป        |
| `verifying`      | กำลังตรวจ (ชั่วคราว ไม่กี่วินาที) | กำลังตรวจสอบ...       |
| `approved`       | ผ่าน ขึ้น alert แล้ว          | ✅ ขอบคุณ             |
| `pending_review` | รอสตรีมเมอร์ตรวจ            | ⏳ รอสตรีมเมอร์ตรวจสอบ |
| `rejected`       | ไม่ผ่าน                     | ❌ + เหตุผล           |
| `expired`        | ไม่แนบสลิปใน 30 นาที         | หมดเวลา สร้างใหม่      |

การเปลี่ยนสถานะทุกครั้งต้องเป็น **conditional update** (`UPDATE ... WHERE status = <สถานะเดิม>`) กันสองคำขอทำพร้อมกัน

---

## F1 ล็อกอิน + ตั้ง username

### หน้าจอ

- `/login` — ปุ่ม "เข้าสู่ระบบด้วย Google" และ "เข้าสู่ระบบด้วย Discord"
- `/onboarding` — ตั้ง username ครั้งแรก (แสดงตัวอย่างลิงก์ `kortangnoi.../{username}` แบบ live) แล้วไปหน้าตั้งค่าช่องทางรับเงิน
- ทุกหน้าใต้ `/dashboard` ต้องล็อกอิน; ยังไม่มี username → redirect ไป `/onboarding`

### Flow

1. กดปุ่ม → Supabase OAuth → callback `/auth/callback`
2. ครั้งแรก: สร้างแถว `profiles` (id = auth user id, เก็บ `discord_id` ถ้าล็อกอินด้วย Discord) → `/onboarding`
3. ครั้งถัดไป: → `/dashboard`

### API

| Method | Path                      | Request        | Response                                            |
| ------ | ------------------------- | -------------- | --------------------------------------------------- |
| GET    | `/api/me`                 | –              | `{ id, username, displayName, discordId, isAdmin }` |
| GET    | `/api/usernames/check?u=` | –              | `{ available: boolean }`                            |
| PUT    | `/api/me/username`        | `{ username }` | `{ username }`                                      |

### Validation

- username: 3–20 ตัว, `^[a-z0-9_-]+$`, แปลงเป็นตัวเล็กก่อนเช็ก
- ห้ามคำสงวน: `api, auth, login, logout, onboarding, dashboard, overlay, admin, settings, static, _next, d`
- เปลี่ยน username ได้ (ลิงก์เก่าใช้ไม่ได้ทันที — แจ้งเตือนก่อนบันทึก)

### Error case

| กรณี                  | ผล                                                    |
| -------------------- | ----------------------------------------------------- |
| username ซ้ำ          | 409 `USERNAME_TAKEN`                                  |
| ผิดรูปแบบ / คำสงวน     | 400 `USERNAME_INVALID`                                |
| OAuth ยกเลิกหรือล้มเหลว | กลับ `/login` พร้อมข้อความ "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง" |

### พังได้ยังไง

- สองคนจอง username เดียวกันพร้อมกัน → ใช้ unique index ใน DB เป็นตัวตัดสิน ไม่ใช่แค่ check ก่อน insert
- คนเดิมล็อกอินด้วย Google แล้วรอบหลังใช้ Discord → ได้คนละบัญชี (MVP ยอมรับ; แสดงข้อความแนะนำให้ใช้ช่องทางเดิม)
- redirect URL ของ OAuth ตั้งผิดบน Vercel preview → ล็อกอินไม่ได้บน preview (ตั้ง wildcard redirect ใน Supabase)

---

## F2 ตั้งค่าช่องทางรับเงิน

### หน้าจอ `/dashboard/payment`

การ์ดแบบเดียวกับ reference:

- **ยอดขั้นต่ำ** (บาท, ปุ่ม − / +)
- **พร้อมเพย์:** สวิตช์เปิด/ปิดรับโดเนท, ประเภท (เบอร์โทร / เลขบัตรประชาชน), เลข PromptPay, ชื่อบัญชีไทย, ชื่อบัญชีอังกฤษ (ไม่บังคับ + คำอธิบายว่าช่วยให้ตรวจสลิปบางธนาคารได้), สวิตช์ "แสดงชื่อบัญชีให้ผู้โดเนทเห็น"
- **แถบ "ยังไม่บันทึก"** ติดล่างจอเมื่อมีการแก้ + ปุ่มยกเลิก / บันทึก
- ปุ่ม "ดูตัวอย่าง QR" สร้าง QR 1 บาทให้สแกนเช็กกับแอปธนาคารว่าชื่อถูกต้อง (ไม่ต้องโอนจริง)

### API

| Method | Path                    | Request           | Response          |
| ------ | ----------------------- | ----------------- | ----------------- |
| GET    | `/api/settings/payment` | –                 | `PaymentSettings` |
| PUT    | `/api/settings/payment` | `PaymentSettings` | `PaymentSettings` |

```ts
type PaymentSettings = {
  enabled: boolean;
  promptpayType: "phone" | "national_id";
  promptpayId: string; // ตัวเลขล้วน
  accountNameTh: string;
  accountNameEn: string | null;
  showAccountName: boolean;
  minAmountSatang: number;
};
```

### Validation

- เบอร์โทร: 10 หลัก ขึ้นต้น `0` (รับ input มีขีด/เว้นวรรคได้ ตัดออกก่อนเก็บ)
- เลขบัตร: 13 หลัก + ผ่าน checksum
- ชื่อไทย: 2–100 ตัว, ไม่ใส่คำนำหน้า (ตัด `นาย/นาง/นางสาว/น.ส.` ออกให้อัตโนมัติ)
- ชื่ออังกฤษ: 2–100 ตัว, `A–Z`, เว้นวรรค, `.` (เก็บเป็นตัวพิมพ์ใหญ่)
- ยอดขั้นต่ำ: 1–10,000 บาท, ค่าเริ่มต้น 20 บาท
- `enabled = true` ได้ก็ต่อเมื่อกรอก promptpayId และ accountNameTh ครบ

### Error case

| กรณี                         | ผล                         |
| --------------------------- | -------------------------- |
| เลขผิดรูปแบบ / checksum ไม่ผ่าน | 400 `PROMPTPAY_ID_INVALID` |
| เปิดรับโดเนทแต่ข้อมูลไม่ครบ       | 400 `PAYMENT_INCOMPLETE`   |

### พังได้ยังไง

- กรอกเลข PromptPay ผิด 1 หลัก → เงินผู้บริจาคเข้าคนอื่น ป้องกันด้วยปุ่มดูตัวอย่าง QR ให้สแกนเช็กชื่อก่อน
- ชื่อในระบบไม่ตรงกับชื่อบนสลิป → ทุกสลิปตกไป `pending_review` แสดงคำแนะนำในหน้าตั้งค่าเมื่อมีรายการรอตรวจเพราะชื่อไม่ตรงบ่อย
- แก้เลข PromptPay ระหว่างมีรายการ `awaiting_slip` → รายการเก่าต้องเช็กผู้รับกับข้อมูล **ณ ตอนสร้างรายการ** (snapshot ไว้ในแถว donation)

---

## F3 ตั้งค่า alert

### หน้าจอ `/dashboard/alert`

- พรีวิว alert ขนาดจริงด้านขวา (อัปเดตทันทีเมื่อเปลี่ยนค่า)
- **รูป/GIF:** แท็บ "ค้นหา GIF" (ช่องค้นหา + grid ผลลัพธ์ + โลโก้ผู้ให้บริการ) และแท็บ "อัปโหลด"; ปุ่ม "ใช้ค่าเริ่มต้น"
- **ระยะเวลาแสดง:** slider 3–20 วินาที (ค่าเริ่มต้น 8)
- **เสียง:** เปิด/ปิด + ระดับเสียง 0–100 (ใช้เสียงเริ่มต้น 1 เสียง)
- ปุ่ม **"ทดสอบ alert"** ส่ง alert ตัวอย่างไป overlay จริง

### API

| Method | Path                        | Request                          | Response                                                        |
| ------ | --------------------------- | -------------------------------- | --------------------------------------------------------------- |
| GET    | `/api/settings/alert`       | –                                | `AlertSettings`                                                 |
| PUT    | `/api/settings/alert`       | `AlertSettings` (ยกเว้นการอัปโหลด) | `AlertSettings`                                                 |
| POST   | `/api/settings/alert/media` | multipart `file`                 | `{ mediaUrl }`                                                  |
| GET    | `/api/gifs/search?q=&page=` | –                                | `{ items: { id, previewUrl, url, width, height }[], nextPage }` |
| POST   | `/api/alerts/test`          | –                                | `{ ok: true }`                                                  |

```ts
type AlertSettings = {
  mediaType: "default" | "gif" | "upload";
  mediaUrl: string | null;
  durationSec: number;
  soundEnabled: boolean;
  volume: number;
};
```

### Validation

- อัปโหลด: png / jpg / gif / webp, ไม่เกิน 5 MB, เช็กชนิดจาก magic bytes ไม่ใช่แค่นามสกุล → เก็บใน Supabase Storage bucket `alert-media` (public) ที่ `{userId}/{uuid}.{ext}`
- GIF ที่เลือก: `mediaUrl` ต้องเป็นโดเมนของผู้ให้บริการ GIF ที่อนุญาต (allowlist) เท่านั้น
- ค้นหา GIF: `q` 1–50 ตัว, ต้องล็อกอิน, จำกัด 30 ครั้ง/นาที/ผู้ใช้, เรียก KLIPY จาก server เท่านั้น (key อยู่ใน env)
- ทดสอบ alert: จำกัด 1 ครั้ง/3 วินาที

### Error case

| กรณี                      | ผล                                                                         |
| ------------------------ | -------------------------------------------------------------------------- |
| ไฟล์ใหญ่/ชนิดไม่รองรับ        | 400 `MEDIA_INVALID`                                                        |
| KLIPY ล่ม/โควตาหมด        | 502 `GIF_SEARCH_UNAVAILABLE` → UI แสดง "ค้นหา GIF ไม่ได้ตอนนี้ ลองอัปโหลดเองแทน" |
| ส่ง URL ที่ไม่อยู่ใน allowlist | 400 `MEDIA_URL_NOT_ALLOWED`                                                |

### พังได้ยังไง

- GIF ภายนอกถูกลบทีหลัง → alert ไม่มีรูป; overlay ต้อง fallback เป็นรูปเริ่มต้นเมื่อโหลดรูปไม่สำเร็จ
- GIF ใหญ่มากโหลดช้าใน OBS → alert ขึ้นก่อนรูปมา; preload รูปตอนเปิด overlay และใช้ขนาดกลางของ KLIPY ไม่ใช่ขนาดต้นฉบับ
- อัปโหลดไฟล์ใหม่ทับ → ลบไฟล์เก่าใน storage ด้วย ไม่อย่างนั้นพื้นที่ฟรีเต็ม

---

## F4 Overlay OBS

### หน้าจอ

- **ใน dashboard:** การ์ด "ลิงก์ OBS" แสดงลิงก์แบบซ่อนบางส่วน + ปุ่มคัดลอก, ปุ่ม "สร้างลิงก์ใหม่" (ยืนยันก่อน), วิธีใส่ใน OBS 3 ขั้น (Browser Source, กว้าง 800 สูง 600)
- **`/overlay/{token}`:** พื้นโปร่งใส ไม่มี UI อื่น; alert ตามที่ออกแบบใน design brief

### Flow realtime

1. Overlay เปิด → `GET /api/overlay/{token}` ได้ `alertSettings` + `channel`
2. Subscribe Supabase Realtime **Broadcast** channel `overlay:{token}`
3. เมื่อโดเนทเปลี่ยนเป็น `approved` → service ส่ง broadcast event `donation` → overlay ใส่คิว → แสดงทีละอัน → เมื่อแสดงเสร็จ `POST /api/overlay/{token}/ack`
4. ตอนเปิด overlay และตอน reconnect → `GET /api/overlay/{token}/pending` ดึงโดเนท `approved` ที่ยังไม่ ack ภายใน 10 นาทีที่ผ่านมา (กันพลาดตอนเน็ตหลุด)
5. เปลี่ยนค่า alert ใน dashboard → broadcast event `settings` ให้ overlay โหลดค่าใหม่โดยไม่ต้อง refresh

### API

| Method | Path                               | Request          | Response                     |
| ------ | ---------------------------------- | ---------------- | ---------------------------- |
| GET    | `/api/overlay/{token}`             | –                | `{ channel, alertSettings }` |
| GET    | `/api/overlay/{token}/pending`     | –                | `{ items: OverlayAlert[] }`  |
| POST   | `/api/overlay/{token}/ack`         | `{ donationId }` | `{ ok: true }`               |
| POST   | `/api/settings/overlay/regenerate` | – (ล็อกอิน)        | `{ overlayUrl }`             |

```ts
type OverlayAlert = {
  donationId: string;
  donorName: string;
  amountSatang: number;
  message: string | null;
  isTest: boolean;
};
```

### Validation

- token: สุ่ม 32 bytes (base64url) ต่อผู้ใช้ เก็บใน DB
- ข้อมูลที่ส่งไป overlay มี **เฉพาะ** ชื่อที่ผู้บริจาคกรอก, ยอด, ข้อความ — ห้ามมีชื่อจริงจากสลิปหรือข้อมูลบัญชี
- แสดงข้อความเป็น text เท่านั้น (ไม่ render HTML)

### Error case

| กรณี                          | ผล                                                                       |
| ---------------------------- | ------------------------------------------------------------------------ |
| token ไม่ถูกต้อง / ถูกสร้างใหม่แล้ว | 404 → overlay แสดงข้อความเล็ก "ลิงก์ overlay ไม่ถูกต้อง" (มองเห็นใน OBS ตอนตั้งค่า) |
| Realtime หลุด                 | reconnect อัตโนมัติ + ดึง pending                                            |

### พังได้ยังไง

- ลิงก์ overlay หลุด (ขึ้นจอตอนไลฟ์) → คนอื่นดู alert ได้ แต่สร้าง alert ปลอมไม่ได้ เพราะ broadcast ส่งจาก server เท่านั้น (overlay ใช้ anon key แค่รับ); แก้ด้วยปุ่มสร้างลิงก์ใหม่
- เปิด overlay 2 ที่ (OBS + เบราว์เซอร์) → alert แสดงทั้งสองที่ ack ซ้ำไม่เป็นไร (idempotent)
- OBS cache หน้าเก่า → ปุ่มคัดลอกลิงก์ใส่ `?v=` ไม่ได้ช่วย; แนะนำ "Refresh cache of current page" ในคู่มือ
- Browser ใน OBS บล็อกเสียงอัตโนมัติ → OBS Browser Source เล่นเสียงได้ปกติ แต่ในเบราว์เซอร์ทั่วไปต้องคลิกก่อน (แสดงปุ่ม "เปิดเสียง" เฉพาะนอก OBS)

---

## F5 ประวัติโดเนท + F6 อนุมัติ/ปฏิเสธ

### หน้าจอ

- **`/dashboard`** (หน้าแรก): ยอดรวมวันนี้ / เดือนนี้ (ตัวเลขใหญ่, ทศนิยมสีเทา), การ์ด "รอตรวจ" (จำนวน + ลิงก์), โดเนทล่าสุด 5 รายการ, การ์ดลิงก์โดเนท + ลิงก์ OBS
- **`/dashboard/donations`:** ตาราง เวลา / ชื่อ / ยอด / ข้อความ / สถานะ (จุดสี) ; ตัวกรองสถานะ; แบ่งหน้า 20 รายการ; ไม่แสดง `awaiting_slip` และ `expired` เป็นค่าเริ่มต้น
- **รายละเอียดรายการ (drawer):** รูปสลิป (signed URL), ชื่อจริงผู้โอนจากสลิป, ธนาคาร, เวลาโอน, ยอดในสลิป, **เหตุผลที่ระบบตรวจไม่ผ่าน**; รายการ `pending_review` มีปุ่ม "อนุมัติ" / "ปฏิเสธ" (+ช่องเหตุผล)
- รายการ `pending_review` ใหม่ → แจ้งเตือนใน dashboard แบบ realtime (badge + toast)

### API

| Method | Path                           | Request       | Response                                     |
| ------ | ------------------------------ | ------------- | -------------------------------------------- |
| GET    | `/api/donations?status=&page=` | –             | `{ items: DonationRow[], total }`            |
| GET    | `/api/donations/summary`       | –             | `{ todaySatang, monthSatang, pendingCount }` |
| GET    | `/api/donations/{id}`          | –             | `DonationDetail` (รวม `slipUrl` อายุ 10 นาที)  |
| POST   | `/api/donations/{id}/approve`  | –             | `DonationDetail`                             |
| POST   | `/api/donations/{id}/reject`   | `{ reason? }` | `DonationDetail`                             |

### Validation

- ดู/แก้ได้เฉพาะโดเนทของตัวเอง (เช็ก `streamer_id = user.id` + Row Level Security)
- อนุมัติ/ปฏิเสธได้เฉพาะสถานะ `pending_review`
- เหตุผลปฏิเสธ ≤ 200 ตัว
- ยอดรวมนับเฉพาะ `approved`, วัน/เดือนตามเวลาไทย

### Error case

| กรณี                                   | ผล                   |
| ------------------------------------- | -------------------- |
| ไม่ใช่เจ้าของ                            | 404 (ไม่บอกว่ามีอยู่)     |
| สถานะไม่ใช่ `pending_review` (เช่น กดซ้ำ) | 409 `INVALID_STATUS` |

### พังได้ยังไง

- กดอนุมัติสองครั้งเร็วๆ → conditional update ทำให้สำเร็จครั้งเดียว alert ขึ้นครั้งเดียว
- อนุมัติสลิปที่ `trans_ref` ซ้ำกับรายการที่ approved แล้ว → unique index ปฏิเสธ แสดง "สลิปนี้ถูกใช้ไปแล้ว"
- สตรีมเมอร์อนุมัติสลิปปลอมเอง → เป็นการตัดสินใจของสตรีมเมอร์; drawer ต้องแสดงชัดว่าระบบตรวจไม่ผ่านเพราะอะไร

---

## F7 Discord webhook

### หน้าจอ

- การ์ดใน `/dashboard/payment` หรือ `/dashboard/integrations`: ช่อง URL webhook + ปุ่ม "ทดสอบ" + สวิตช์เปิด/ปิด

### Flow

1. โดเนทเปลี่ยนเป็น `approved` (อัตโนมัติหรือกดอนุมัติ)
2. หลังส่ง response แล้ว (Next.js `after()`) → POST ไป webhook เป็น embed: ชื่อ, ยอด, ข้อความ, เวลา, วิธีอนุมัติ (อัตโนมัติ/ด้วยมือ)
3. ล้มเหลว → ลองใหม่ 1 ครั้งหลัง 2 วินาที → ยังล้มเหลว เก็บ `webhook_error` ไว้ในแถว donation (ไม่กระทบสถานะโดเนท)

### API

| Method  | Path                         | Request                          | Response               |
| ------- | ---------------------------- | -------------------------------- | ---------------------- |
| GET/PUT | `/api/settings/webhook`      | `{ enabled, discordWebhookUrl }` | เหมือน request          |
| POST    | `/api/settings/webhook/test` | –                                | `{ ok: true }` หรือ 502 |

### Validation

- URL ต้องตรง `^https://(discord\.com|discordapp\.com)/api/webhooks/\d+/[\w-]+$` (กัน SSRF ยิงไปที่อื่น)
- ข้อความใน embed ปิด mention: `allowed_mentions: { parse: [] }` (กัน `@everyone` จากข้อความผู้บริจาค)

### Error case

| กรณี                                     | ผล                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------ |
| URL ผิดรูปแบบ                             | 400 `WEBHOOK_URL_INVALID`                                                |
| ทดสอบแล้ว Discord ตอบ 4xx (webhook ถูกลบ) | 502 `WEBHOOK_FAILED` + ข้อความ "Discord ไม่รับ webhook นี้ ตรวจสอบว่ายังไม่ถูกลบ" |

### พังได้ยังไง

- Discord rate limit (429) ตอนโดเนทถี่ → retry 1 ครั้งตาม `retry_after`; ถ้ายังไม่ได้ก็ข้าม (MVP)
- webhook URL หลุด → คนอื่นโพสต์เข้า channel ได้ (ความเสี่ยงฝั่ง Discord); ไม่แสดง URL เต็มใน UI หลังบันทึก

---

## F8 หน้าโดเนท

### หน้าจอ `/{username}` (มือถือเป็นหลัก)

การ์ดเดียวกลางจอ หัวการ์ดเป็นชื่อสตรีมเมอร์ + ตัวบอกขั้นตอน 1-2-3

**ขั้น 1 กรอกข้อมูล**

- ชื่อที่แสดง, ยอด (ปุ่มยอดด่วน เช่น 20 / 50 / 100 / 500 + ช่องกรอกเอง), ข้อความ (นับตัวอักษร)
- แสดงยอดขั้นต่ำ
- ปุ่ม "ไปหน้าจ่ายเงิน"

**ขั้น 2 สแกนจ่าย**

- QR PromptPay + ยอด + ชื่อบัญชี (ถ้าเปิดให้แสดง) + เวลานับถอยหลัง 30 นาที
- ปุ่ม "บันทึก QR" (ดาวน์โหลด PNG) สำหรับคนที่ใช้มือถือเครื่องเดียวกันโอน
- ข้อความ "โอนยอดให้ตรงทุกสตางค์" + ปุ่ม "โอนแล้ว แนบสลิป"

**ขั้น 3** → F9

กรณีพิเศษ: สตรีมเมอร์ปิดรับโดเนท → "ตอนนี้ปิดรับโดเนท"; ไม่พบ username → หน้า 404

### API

| Method | Path                               | Request                          | Response                                                                   |
| ------ | ---------------------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| GET    | `/api/public/{username}`           | –                                | `{ displayName, minAmountSatang, enabled, accountName: string \| null }`   |
| POST   | `/api/public/{username}/donations` | `{ donorName, amount, message }` | `{ donationId, accessToken, amountSatang, qrPayload, qrImage, expiresAt }` |
| GET    | `/api/public/donations/{id}?t=`    | –                                | `{ status, amountSatang, expiresAt, attemptsLeft, resultMessage }`         |

- `amount` รับเป็น string ทศนิยม เช่น `"50.00"` → แปลงเป็นสตางค์ฝั่ง server (ไม่ใช้ float)
- `accessToken` สุ่มตอนสร้าง ผู้บริจาคต้องใช้ในการดู/แนบสลิปรายการนี้ (เก็บใน URL ของหน้า `/{username}/d/{id}?t=...` เพื่อกลับมาหน้าเดิมได้หลังสลับไปแอปธนาคาร)
- QR สร้างจาก `promptpay-qr` ด้วย promptpayId + ยอด **ณ ตอนสร้าง** และ snapshot ข้อมูลผู้รับลงในแถว donation

### Validation

- `donorName`: 1–30 ตัว หลัง trim, ตัด control characters
- `message`: 0–150 ตัว, ตัด control characters, แสดงเป็น text เท่านั้น
- `amount`: ทศนิยม ≤ 2 ตำแหน่ง, ≥ ขั้นต่ำ, ≤ 100,000 บาท
- rate limit: สร้างได้ 10 รายการ / 10 นาที / IP (เก็บ hash ของ IP ไม่เก็บ IP ตรง)

### Error case

| กรณี              | ผล                                             |
| ---------------- | ---------------------------------------------- |
| ยอดต่ำกว่าขั้นต่ำ     | 400 `AMOUNT_TOO_LOW`                           |
| ยอดเกิน / ผิดรูปแบบ | 400 `AMOUNT_INVALID`                           |
| ชื่อว่าง / ยาวเกิน   | 400 `DONOR_NAME_INVALID`                       |
| ปิดรับโดเนท        | 409 `DONATIONS_DISABLED`                       |
| เกิน rate limit   | 429 `RATE_LIMITED` "สร้างรายการบ่อยเกินไป รอสักครู่" |

### พังได้ยังไง

- ผู้บริจาคโอนยอดไม่ตรง (ปัดเศษ / แก้ยอดในแอป) → สลิปยอดไม่ตรง → `pending_review` (ไม่ reject ทันที เพราะเงินเข้าจริง)
- ผู้บริจาคปิดหน้าเว็บตอนสลับไปแอปธนาคาร → กลับมาด้วยลิงก์ที่มี `accessToken` ได้ (บันทึกลง `localStorage` ด้วย)
- โอนหลังหมดเวลา 30 นาที → รายการ `expired` แนบสลิปไม่ได้; ให้แนบสลิปได้ถึง 24 ชม. หลังสร้าง แต่ถ้าแนบหลังหมดเวลา QR → ส่ง `pending_review` เสมอ
- มีคนสแปมสร้างรายการ → rate limit ต่อ IP; รายการที่ไม่มีสลิปไม่เสียโควตา SlipOK

---

## F9 แนบสลิป + F10 ตรวจสลิป

### หน้าจอ (ขั้น 3)

- ปุ่มใหญ่ "เลือกรูปสลิป" (เปิดแกลเลอรีบนมือถือ, `accept="image/*"`)
- พรีวิวรูป → ปุ่ม "ส่งตรวจ"
- ระหว่างตรวจ: spinner "กำลังตรวจสอบสลิป..."
- ผลลัพธ์:
  - ✅ **สำเร็จ** "ขอบคุณ! โดเนทของคุณขึ้นจอแล้ว"
  - ⏳ **รอตรวจ** "สลิปของคุณถูกส่งให้สตรีมเมอร์ตรวจสอบแล้ว" (+ เหตุผลแบบเป็นมิตร เช่น "สลิปธนาคารกรุงเทพต้องรอธนาคารยืนยันสักครู่")
  - ❌ **ไม่ผ่าน (แนบใหม่ได้)** เหตุผล + "เหลือ N ครั้ง" + ปุ่มเลือกรูปใหม่
  - ❌ **ไม่ผ่าน (จบ)** เหตุผล + ปุ่ม "สร้างรายการใหม่"

### API

| Method | Path                                 | Request          | Response                                  |
| ------ | ------------------------------------ | ---------------- | ----------------------------------------- |
| POST   | `/api/public/donations/{id}/slip?t=` | multipart `file` | `{ status, resultMessage, attemptsLeft }` |

ตรวจแบบ synchronous ใน request เดียว (SlipOK ตอบ ~1 วินาที) ตั้ง timeout เรียก SlipOK 8 วินาที

### ขั้นตอนตรวจ (service `verifySlip`)

| #   | ขั้น                                                                                   | ไม่ผ่าน →                                                                       |
| --- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 1   | รายการต้องเป็น `awaiting_slip` + `accessToken` ถูก + เหลือสิทธิ์แนบ (สูงสุด 3 ครั้ง)            | 404 / 409                                                                     |
| 2   | ไฟล์เป็นรูป jpg/png/webp ≤ 10 MB (เช็ก magic bytes)                                      | 400 `SLIP_FILE_INVALID` (ไม่นับสิทธิ์)                                             |
| 3   | เปลี่ยนสถานะ → `verifying` (conditional update) และอัปโหลดรูปไป bucket `slips` (private) | 409 ถ้ามีคำขออื่นกำลังตรวจ                                                         |
| 4   | อ่าน QR จากรูปด้วย `sharp` + `jsqr` (ลองย่อ/เพิ่ม contrast ถ้าอ่านไม่ได้รอบแรก)                | อ่านไม่ได้ → `awaiting_slip`, นับสิทธิ์, "ไม่พบ QR บนสลิป ลองครอปให้เห็น QR ชัดๆ"         |
| 5   | `sha256(qrPayload)` ซ้ำกับรายการอื่นไหม                                                  | ซ้ำ → `rejected` "สลิปนี้ถูกใช้ไปแล้ว" (ไม่เรียก SlipOK)                               |
| 6   | เรียก SlipOK ด้วย `data: qrPayload` (ไม่ส่ง `log`, ไม่ส่ง `amount`)                        | ดูตาราง error ของ SlipOK                                                       |
| 7   | `transRef` ซ้ำกับรายการอื่นไหม                                                           | ซ้ำ → `rejected` "สลิปนี้ถูกใช้ไปแล้ว"                                               |
| 8   | ผู้รับตรงไหม (ดูด้านล่าง)                                                                  | ไม่ตรงชัดเจน → `rejected` "สลิปนี้ไม่ได้โอนให้สตรีมเมอร์คนนี้"; ไม่แน่ใจ → `pending_review` |
| 9   | ยอดตรงไหม (`amount` ในสลิป × 100 = `amount_satang`)                                   | ไม่ตรง → `pending_review` "ยอดโอนไม่ตรงกับที่กรอก"                                 |
| 10  | เวลาโอน ≥ เวลาสร้างรายการ − 2 นาที และ ≤ ตอนนี้ + 2 นาที                                  | ไม่ผ่าน → `rejected` "สลิปนี้โอนก่อนสร้างรายการ"                                     |
| 11  | แนบหลังหมดเวลา QR (30 นาที)                                                            | → `pending_review`                                                            |
| 12  | ผ่านทั้งหมด → `approved` → broadcast ไป overlay + webhook                               |                                                                               |

ทุกขั้นบันทึก `verify_result` (jsonb: ขั้นที่ตก, error code ของ SlipOK, ผลเช็กผู้รับ) ไว้ให้สตรีมเมอร์ดูใน drawer

### เช็กผู้รับ (ขั้น 8)

ใช้ข้อมูลผู้รับที่ snapshot ไว้ในรายการ

1. **เลข:** ดู `receiver.proxy.value` (PromptPay) และ `receiver.account.value` — normalize โดยเก็บแค่ตัวเลขและ `x/X` แล้วเทียบเฉพาะตำแหน่งที่เป็นตัวเลขกับ promptpayId (จัดชิดขวา)
2. **ชื่อ:** ดู `receiver.displayName` และ `receiver.name` — ตัดคำนำหน้า/ช่องว่าง/จุด แล้วเช็กว่าชื่อในสลิป (ที่อาจถูกตัด) เป็น prefix ของ accountNameTh หรือ accountNameEn (ไม่สนตัวพิมพ์) และยาว ≥ 3 ตัว

| เลข     | ชื่อ            | ผล                                                  |
| ------- | ------------- | --------------------------------------------------- |
| ตรง     | ตรง / ไม่มีข้อมูล | ผ่าน                                                 |
| ไม่มีข้อมูล | ตรง           | ผ่าน                                                 |
| ไม่มีข้อมูล | ไม่มีข้อมูล       | `pending_review`                                    |
| ตรง     | ไม่ตรง         | `pending_review`                                    |
| ไม่ตรง   | ตรง           | `pending_review` (บางธนาคารแสดงเลขบัญชีแทนเลขพร้อมเพย์) |
| ไม่ตรง   | ไม่ตรง         | `rejected`                                          |
| ไม่มีข้อมูล | ไม่ตรง         | `rejected`                                          |

### Error ของ SlipOK → ผลลัพธ์

| Code                    | ความหมาย                 | สถานะ                                   | นับสิทธิ์แนบ |
| ----------------------- | ------------------------ | --------------------------------------- | -------- |
| 200                     | สำเร็จ                    | ไปขั้น 7                                  | –        |
| 1006, 1007              | รูปไม่ถูกต้อง / ไม่มี QR       | `awaiting_slip`                         | นับ       |
| 1008                    | ไม่ใช่ QR ชำระเงิน          | `awaiting_slip`                         | นับ       |
| 1011                    | QR หมดอายุ / ไม่มีรายการจริง | `rejected` "ไม่พบรายการโอนนี้ในระบบธนาคาร" | –        |
| 1010                    | ธนาคารต้องรอ (BBL/SCB)    | `pending_review`                        | –        |
| 1009                    | ธนาคารขัดข้องชั่วคราว        | `pending_review`                        | –        |
| 1002, 1003, 1004, 1015  | key / แพ็กเกจ / โควตา     | `pending_review` + log error ระดับแอดมิน  | –        |
| timeout / 5xx / network | SlipOK ล่ม                | `pending_review`                        | –        |

เมื่อหมดสิทธิ์แนบ (3 ครั้ง) และครั้งสุดท้ายยังไม่ผ่าน → `rejected`

### พังได้ยังไง

- **สลิปปลอมแบบแต่งรูป** → ยอด/ผู้รับมาจาก SlipOK ไม่ใช่จากรูป จึงไม่มีผล
- **เอาสลิปจริงที่โอนให้สตรีมเมอร์คนอื่นมาใช้** → เช็กผู้รับ (ขั้น 8)
- **เอาสลิปเก่าที่เคยโอนให้สตรีมเมอร์คนนี้มาใช้ใหม่** → hash QR + `transRef` ซ้ำ (ขั้น 5, 7) และเวลาโอน (ขั้น 10)
- **ส่งสลิปเดียวกันพร้อมกัน 2 รายการ** → unique index บน `slip_qr_hash` และ `trans_ref` ตัดสิน รายการที่สองได้ `rejected`
- **ส่งสลิปใน 2 แท็บของรายการเดียวกัน** → conditional update ไป `verifying` สำเร็จแค่คำขอแรก
- **request ตายกลางทาง (Vercel timeout) ค้างที่ `verifying`** → รายการ `verifying` ที่ค้างเกิน 2 นาที ถือเป็น `pending_review` (เช็กแบบ lazy ตอนอ่านรายการ)
- **QR อ่านไม่ออกเพราะรูปเล็ก/ถูกครอป** → ลองหลายขนาดก่อน; ถ้ายังไม่ได้ให้ผู้บริจาคลองใหม่
- **โควตา SlipOK หมดกลางไลฟ์** → ทุกรายการไป `pending_review` โดเนทไม่หาย แต่ alert ไม่ขึ้นเอง; แอดมินเห็นในหน้า F12
- **ข้อมูลส่วนตัว** → ชื่อจริงผู้โอนและเลขบัญชีที่ถูกปิดบางส่วนเก็บใน `verify_result` เห็นได้เฉพาะเจ้าของ; รูปสลิปอยู่ใน bucket private เข้าถึงด้วย signed URL เท่านั้น

---

## F11 Alert realtime

ส่วน overlay อยู่ใน F4 ส่วนนี้คือกติกาการแสดงผล

- ได้ event → ใส่คิว (กันซ้ำด้วย `donationId`) → แสดงทีละอัน ตาม `durationSec` + เวลา animation เข้า/ออก 0.5 วินาที
- Animation: scale 0.9 → 1 + fade in, จบแล้ว fade out
- เสียงเล่นพร้อมกับตอน alert เข้า ตามค่า volume
- ข้อความยาวเกิน 3 บรรทัด → ตัดด้วย `…`
- ยอดแสดงเป็น `฿1,234` (ถ้ามีสตางค์ `฿1,234.50`)
- alert ทดสอบ (`isTest`) แสดงเหมือนจริง ไม่ ack ไม่บันทึก

### พังได้ยังไง

- โดเนทเข้ามา 20 รายการพร้อมกัน → คิวยาว 20 × 8 วินาที; MVP ยอมรับ (v2 อาจเพิ่มโหมดเร่ง)
- event เดียวกันมาสองทาง (broadcast + pending ตอน reconnect) → กันซ้ำด้วย `donationId`

---

## F12 หน้าแอดมิน

### หน้าจอ `/dashboard/admin` (เฉพาะแอดมิน)

- โควตา SlipOK คงเหลือ / ใช้เกิน / วันหมดอายุ
- จำนวนสลิปที่ตรวจเดือนนี้ แยกตามผล (approved / pending_review / rejected)
- รายการ error ระดับระบบล่าสุด (เช่น 1004 โควตาหมด, SlipOK timeout)

### API

| Method | Path                      | Request | Response                                                                      |
| ------ | ------------------------- | ------- | ----------------------------------------------------------------------------- |
| GET    | `/api/admin/slipok-quota` | –       | `{ quota, overQuota, specialQuota, endDate, specialEndDate }`                 |
| GET    | `/api/admin/stats`        | –       | `{ monthChecks: { approved, pendingReview, rejected }, recentErrors: [...] }` |

### Validation

- แอดมินกำหนดด้วย env `ADMIN_USER_IDS` (คั่นด้วย comma) ไม่มีหน้าตั้งแอดมินใน MVP
- ไม่ใช่แอดมิน → 404 (ไม่บอกว่าหน้านี้มีอยู่)
- cache ผลโควตา 60 วินาที

### พังได้ยังไง

- SlipOK quota endpoint ล่ม → แสดง "ดึงข้อมูลโควตาไม่ได้" ไม่ทำให้หน้าพัง

---

## Environment variables

| ชื่อ                              | ใช้ที่             | หมายเหตุ                                           |
| ------------------------------- | --------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | client + server |                                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server |                                                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | server เท่านั้น    | ใช้ใน service ที่ต้องข้าม RLS (เช่น ตรวจสลิป, broadcast) |
| `SLIPOK_API_KEY`                | server เท่านั้น    |                                                   |
| `SLIPOK_BRANCH_ID`              | server เท่านั้น    |                                                   |
| `KLIPY_API_KEY`                 | server เท่านั้น    |                                                   |
| `ADMIN_USER_IDS`                | server เท่านั้น    |                                                   |
| `IP_HASH_SALT`                  | server เท่านั้น    | สำหรับ hash IP ใน rate limit                       |
| `NEXT_PUBLIC_SITE_URL`          | client + server | สร้างลิงก์โดเนท/overlay                              |
