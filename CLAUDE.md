# KORTANGNOI

เว็บรับโดเนทสำหรับสตรีมเมอร์ เงินโอนตรงเข้า PromptPay ตรวจสลิปด้วย SlipOK แล้วขึ้น alert บน OBS
Next.js (App Router) + TypeScript + Supabase + Tailwind/shadcn/ui + lucide-react, deploy บน Vercel

## คำสั่ง
- `npm run dev` · `npm run lint` · `npm run typecheck` · `npm run test` · `npm run test:e2e` · `npm run build`
- `npm run verify` = lint + typecheck + test + build ต้องผ่านก่อน commit ทุกครั้ง

## โครงสร้าง
- `src/app/` — หน้าเว็บ + route handler ใต้ `src/app/api/`
- `src/server/services/` — business logic ทั้งหมด (route handler และ Discord bot ในอนาคตเรียกจากที่นี่)
- `src/server/integrations/` — SlipOK, KLIPY, Discord webhook
- `src/lib/` — โค้ดที่ใช้ร่วมกัน client/server (format เงิน, schema Zod)
- `supabase/migrations/` — SQL migration

## Convention
- เงินเป็นสตางค์ (`int`) ทุกที่ ห้ามใช้ float แปลงเป็นบาทตอนแสดงผลเท่านั้น
- route handler ทำแค่ auth + validate (Zod) + เรียก service ห้ามใส่ logic
- error ใช้รูปแบบ `{ error: { code, message } }` message เป็นภาษาไทย
- เปลี่ยนสถานะ donation ด้วย conditional update (`WHERE status = ...`) เสมอ
- ไอคอนใช้ lucide-react เท่านั้น, ฟอนต์ Noto Sans Thai + Noto Sans, สีจาก token ใน design brief

## ข้อห้าม
- ห้ามส่งชื่อจริงผู้โอน/ข้อมูลบัญชีจากสลิปไป overlay หรือ webhook
- ห้ามใช้ service role key หรือ API key ฝั่ง client
- ห้ามแก้ `.env*`

## อ้างอิง
- @docs/spec.md — พฤติกรรมของทุก feature (F1–F12)
- @docs/er.md — schema, constraint, RLS
- `docs/requirements.md`, `docs/design-brief.md`

## กฎการทำงาน
- ใช้ plan mode ก่อนทำ feature ใหม่ ทำทีละ feature
- feature เปลี่ยน → อัปเดต `docs/spec.md` (และ `docs/er.md` ถ้า schema เปลี่ยน) ก่อนแก้โค้ด
