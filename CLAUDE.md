# KORTANGNOI

เว็บรับโดเนทสำหรับสตรีมเมอร์ เงินโอนตรงเข้า PromptPay ตรวจสลิปด้วย SlipOK แล้วขึ้น alert บน OBS
Next.js (App Router) + TypeScript + Supabase + Tailwind/shadcn/ui + lucide-react, deploy บน Vercel

## คำสั่ง

- `npm run dev` · `npm run lint` · `npm run typecheck` · `npm run test` · `npm run test:e2e` · `npm run build`
- `npm run verify` = lint + format:check + typecheck + test + build ต้องผ่านก่อน commit ทุกครั้ง
- Supabase ในเครื่อง (Docker): `npm run db:start` · `npm run db:reset` (ลง migration ใหม่) · `npm run db:types` (สร้าง `src/lib/supabase/database.types.ts` หลังแก้ schema) · migration ขึ้น cloud อัตโนมัติจาก CI job `migrate` หลัง test ผ่านบน main (`npm run db:push` ไว้รันเองกรณีฉุกเฉิน)
- `npm run dev:local` รัน dev กับ Supabase ในเครื่อง (ดึง key จาก `supabase status` ไม่ต้องมี `.env`) · ล็อกอิน Discord ในเครื่อง: ใส่ `SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID`/`_SECRET` ใน `supabase/.env` แล้ว `npx supabase stop && npm run db:start` · `npm run test:int` integration test กับ DB จริง (`*.int.test.ts`) · `test:e2e` ต้องเปิด Supabase ในเครื่องก่อน
- `npm run format` จัดรูปแบบทั้งโปรเจกต์ (hook ใน `.claude/settings.json` รัน Prettier + ESLint ให้หลังแก้ไฟล์)
- Next.js รุ่นนี้ (16.x) ต่างจากที่คุ้นเคย — อ่าน @AGENTS.md ก่อนเขียนโค้ด

## โครงสร้าง

- `src/app/` — หน้าเว็บ + route handler ใต้ `src/app/api/`
- `src/server/services/` — business logic ทั้งหมด (route handler และ Discord bot ในอนาคตเรียกจากที่นี่)
- `src/server/integrations/` — SlipOK, Discord webhook (KLIPY เรียกจากเบราว์เซอร์ใน `src/lib/klipy.ts` ตามข้อกำหนด KLIPY)
- `src/lib/` — โค้ดที่ใช้ร่วมกัน client/server (format เงิน, schema Zod)
- `supabase/migrations/` — SQL migration

## Convention

- เงินเป็นสตางค์ (`int`) ทุกที่ ห้ามใช้ float แปลงเป็นบาทตอนแสดงผลเท่านั้น
- route handler ทำแค่ auth + validate (Zod) + เรียก service ห้ามใส่ logic
- error ใช้รูปแบบ `{ error: { code, message } }` message เป็นภาษาไทย
- เปลี่ยนสถานะ donation ด้วย conditional update (`WHERE status = ...`) เสมอ
- อ่าน session ด้วย `getCurrentUser()`/`requireUser()` ใน `src/server/auth.ts` และห่อด้วย `<Suspense>` (Cache Components)
- schema เปลี่ยน → `npx supabase migration new <ชื่อ>` ห้ามแก้ migration ที่ push ขึ้น cloud แล้ว
- Vercel deploy โค้ดก่อน migration ลงเสร็จได้ → migration ต้องไม่ทำให้โค้ดเวอร์ชันก่อนหน้าพัง (เพิ่มก่อน ลบทีหลังใน commit ถัดไป)
- ไอคอนใช้ lucide-react เท่านั้น, ฟอนต์ Noto Sans Thai + Noto Sans, สีจาก token ใน design brief

## ข้อห้าม

- ห้ามส่งชื่อจริงผู้โอน/ข้อมูลบัญชีจากสลิปไป overlay หรือ webhook
- ห้ามใช้ secret key (`SUPABASE_SECRET_KEY`) หรือ API key ฝั่ง client — `src/lib/supabase/admin.ts` ใช้ใน `src/server/` เท่านั้น
- ห้ามแก้ `.env*`

## อ้างอิง

- @docs/spec.md — พฤติกรรมของทุก feature (F1–F12)
- @docs/er.md — schema, constraint, RLS
- `docs/requirements.md`, `docs/design-brief.md`

## กฎการทำงาน

- ใช้ plan mode ก่อนทำ feature ใหม่ ทำทีละ feature
- feature เปลี่ยน → อัปเดต `docs/spec.md` (และ `docs/er.md` ถ้า schema เปลี่ยน) ก่อนแก้โค้ด
