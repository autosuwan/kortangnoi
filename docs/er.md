# KORTANGNOI — ER Diagram

Database: Supabase Postgres · เงินเป็นสตางค์ (`int`) · เวลาเป็น `timestamptz`

```mermaid
erDiagram
  auth_users ||--|| profiles : "1:1"
  profiles ||--|| payment_settings : has
  profiles ||--|| alert_settings : has
  profiles ||--|| webhook_settings : has
  profiles ||--|| overlay_widgets : has
  profiles ||--o{ donations : receives

  profiles {
    uuid id PK "FK auth.users.id"
    citext username UK "3-20 ตัว"
    text display_name "ชื่อบนหน้าโดเนท, ค่าเริ่มต้น = username"
    text real_name "จาก auth, ส่วนตัว"
    text bio "nullable, ≤160"
    text avatar_url "nullable"
    text banner_url "nullable"
    text discord_id UK "nullable"
    text overlay_token UK "สุ่ม 32 bytes"
    timestamptz created_at
    timestamptz updated_at
  }

  payment_settings {
    uuid user_id PK "FK profiles.id"
    boolean enabled "default false"
    promptpay_type promptpay_type "phone | national_id"
    text promptpay_id "ตัวเลขล้วน"
    text account_name_th
    text account_name_en "nullable, ตัวพิมพ์ใหญ่"
    boolean show_account_name "default true"
    int min_amount_satang "default 2000"
    boolean allow_anonymous "default false"
    timestamptz updated_at
  }

  alert_settings {
    uuid user_id PK "FK profiles.id"
    alert_media_type media_type "default | gif | upload"
    text media_url "nullable"
    text media_storage_path "nullable, เฉพาะ upload"
    smallint duration_sec "3-20, default 8"
    boolean sound_enabled "default true"
    smallint volume "0-100, default 80"
    text support_text "1-40 ตัว, default โดเนท"
    text name_color "#RRGGBB, default #FACC15"
    boolean donor_can_pick_image "default false"
    boolean donor_can_pick_color "default false"
    boolean donor_can_pick_support_text "default false"
    timestamptz last_test_at "nullable, rate limit ปุ่มทดสอบ alert"
    boolean tts_enabled "default false"
    text tts_mode "message | full"
    int tts_min_amount_satang "default 2000"
    text tts_voice "allowlist, default translate"
    smallint tts_volume "0-100, default 100"
    timestamptz tts_preview_at "nullable, rate limit ฟังตัวอย่าง"
    timestamptz updated_at
  }

  webhook_settings {
    uuid user_id PK "FK profiles.id"
    boolean enabled "default false"
    text discord_webhook_url "nullable"
    timestamptz updated_at
  }

  overlay_widgets {
    uuid user_id PK "FK profiles.id"
    text goal_title "1-40 ตัว"
    int goal_target_satang "100-10,000,000, default 100000"
    timestamptz goal_started_at "เริ่มนับ goal"
    text qr_caption "1-40 ตัว"
    text top_period "today | month | all"
    smallint top_count "3-10, default 5"
    smallint recent_count "3-20, default 10"
    text timer_status "idle | running | paused"
    timestamptz timer_ends_at "nullable, ตอนกำลังนับ"
    int timer_remaining_sec "ตอนพัก"
    int timer_initial_sec "60-86400, default 3600"
    int timer_step_satang "default 1000"
    int timer_step_seconds "default 60"
    text timer_label "1-40 ตัว, default Subathon"
    text timer_mode "auto | manual"
    boolean timer_allow_subtract "default false"
    timestamptz timer_started_at "nullable, เริ่มรอบล่าสุด"
    text avatar_idle_url "nullable, รูป avatar ตอนเงียบ"
    text avatar_idle_path "nullable, path ใน alert-media"
    text avatar_speak_url "nullable, รูป avatar ตอนพูด"
    text avatar_speak_path "nullable"
    jsonb styles "หน้าตาต่อ widget, default {}"
    timestamptz updated_at
  }

  donations {
    uuid id PK
    uuid streamer_id FK "profiles.id"
    text donor_name "1-30 ตัว"
    text message "nullable, ≤150 ตัว"
    int amount_satang
    donation_status status
    text access_token_hash "sha256"
    jsonb receiver_snapshot "ข้อมูลผู้รับ ณ ตอนสร้าง"
    text donor_media_url "nullable, GIF KLIPY ที่ผู้บริจาคเลือก"
    text donor_name_color "nullable, #RRGGBB"
    text donor_support_text "nullable, 1-40 ตัว"
    text qr_payload
    timestamptz expires_at "created_at + 30 นาที"
    smallint slip_attempts "default 0, ≤3"
    text slip_storage_path "nullable"
    text slip_qr_hash "nullable"
    text trans_ref "nullable"
    timestamptz trans_at "nullable, เวลาโอนในสลิป"
    jsonb verify_result "nullable, มีชื่อจริงผู้โอน"
    text result_message "ข้อความที่แสดงผู้บริจาค"
    approval_method approved_via "nullable: auto | manual"
    text review_note "nullable"
    timestamptz reviewed_at "nullable"
    timestamptz alert_acked_at "nullable"
    text webhook_error "nullable"
    text timer_direction "add | subtract, default add"
    int timer_applied_sec "nullable, ± วินาทีที่ใช้กับ subathon"
    timestamptz timer_applied_at "nullable, กันใช้ซ้ำ"
    text ip_hash
    timestamptz created_at
    timestamptz updated_at
  }

  system_errors {
    bigint id PK
    text source "slipok | klipy | discord | ..."
    text code
    text message
    jsonb context
    timestamptz created_at
  }
```

## Enum

| Enum               | ค่า                                                                                |
| ------------------ | --------------------------------------------------------------------------------- |
| `donation_status`  | `awaiting_slip`, `verifying`, `approved`, `pending_review`, `rejected`, `expired` |
| `promptpay_type`   | `phone`, `national_id`                                                            |
| `alert_media_type` | `default`, `gif`, `upload`                                                        |
| `approval_method`  | `auto`, `manual`                                                                  |

## Constraint สำคัญ

- `profiles.username`: `citext` + unique + `CHECK (username ~ '^[a-z0-9_-]{3,20}$')` — unique index ตัดสินกรณีจองพร้อมกัน
- `donations.amount_satang`: `CHECK (amount_satang > 0 AND amount_satang <= 10000000)`
- `donations.slip_attempts`: `CHECK (slip_attempts BETWEEN 0 AND 3)`
- `payment_settings.min_amount_satang`: `CHECK (BETWEEN 100 AND 1000000)`
- `payment_settings`: `promptpay_id` ยาว 0 / 10 / 13 หลัก, ชื่อยาว ≤ 100, `enabled` ⇒ `promptpay_id` และ `account_name_th` ไม่ว่าง (สำรอง validation ใน API)
- `alert_settings`: `CHECK (duration_sec BETWEEN 3 AND 20)`, `CHECK (volume BETWEEN 0 AND 100)`, `support_text` ยาว 1–40, `name_color ~ '^#[0-9A-F]{6}$'`, `media_type = 'upload'` ⇒ มี `media_url` และ `media_storage_path`
- **กันสลิปซ้ำ** — partial unique index นับเฉพาะรายการที่ "ใช้สลิปไปแล้ว":
  ```sql
  CREATE UNIQUE INDEX donations_trans_ref_used
    ON donations (trans_ref) WHERE status IN ('approved', 'pending_review');
  CREATE UNIQUE INDEX donations_slip_qr_hash_used
    ON donations (slip_qr_hash) WHERE status IN ('approved', 'pending_review');
  ```
  เหตุผล: ถ้าคนร้ายเอาสลิปของคนอื่นมาส่งในหน้าสตรีมเมอร์ผิดคนแล้วถูก `rejected` สลิปนั้นต้องยังใช้กับเจ้าของจริงได้
- แถว `payment_settings`, `alert_settings`, `webhook_settings` สร้างพร้อม `profiles` (ค่าเริ่มต้น) ด้วย trigger ตอนสร้าง profile; `overlay_widgets` (F14) สร้างด้วย trigger `after insert` บน `profiles`

## Index

| Index                                                                                      | ใช้กับ                                        |
| ------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `donations (streamer_id, status, created_at DESC)`                                         | ประวัติ + ตัวกรองสถานะ (F5), นับรอตรวจ          |
| `donations (streamer_id, created_at) WHERE status = 'approved'`                            | ยอดรวมวันนี้/เดือนนี้                             |
| `donations (streamer_id, created_at) WHERE status = 'approved' AND alert_acked_at IS NULL` | overlay ดึงรายการที่พลาด (F4)                  |
| `donations (ip_hash, created_at)`                                                          | rate limit สร้างรายการ (F8) ต่อ IP + สตรีมเมอร์ |
| `system_errors (created_at DESC)`                                                          | หน้าแอดมิน (F12)                              |

## Row Level Security

เปิด RLS ทุกตาราง ค่าเริ่มต้นคือปฏิเสธทั้งหมด

| ตาราง              | anon | เจ้าของ (authenticated)                 | server (secret key) |
| ------------------ | ---- | -------------------------------------- | ------------------- |
| `profiles`         | –    | select แถวตัวเอง (แก้ผ่าน API เท่านั้น)      | ทั้งหมด               |
| `payment_settings` | –    | select แถวตัวเอง (แก้ผ่าน API เท่านั้น)      | ทั้งหมด               |
| `alert_settings`   | –    | select แถวตัวเอง (แก้ผ่าน API เท่านั้น)      | ทั้งหมด               |
| `webhook_settings` | –    | select / update แถวตัวเอง               | ทั้งหมด               |
| `overlay_widgets`  | –    | select แถวตัวเอง (แก้ผ่าน API เท่านั้น)      | ทั้งหมด               |
| `donations`        | –    | select แถวที่ `streamer_id = auth.uid()` | ทั้งหมด               |
| `system_errors`    | –    | –                                      | ทั้งหมด               |

- หน้าโดเนท, overlay และการตรวจสลิปไม่ให้ client อ่าน DB ตรง ทุกอย่างผ่าน API ของเราที่ใช้ service role
- `select` ของเจ้าของบน `donations` ทำให้ dashboard ใช้ Realtime `postgres_changes` แจ้งรายการรอตรวจใหม่ได้
- `realtime.messages`: `anon`, `authenticated` **select** (รับ) broadcast ของ topic `overlay:%` ได้อย่างเดียว ไม่มี policy insert → client ส่ง alert ปลอมเข้า overlay ไม่ได้

## Storage

| Bucket          | Public       | Path                                                                            | สิทธิ์                                                           |
| --------------- | ------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `profile-media` | อ่านได้สาธารณะ | `{user_id}/{avatar\|banner}-{uuid}.{ext}`                                       | server เท่านั้น (ผ่าน API), ≤ 4 MB                                |
| `alert-media`   | อ่านได้สาธารณะ | `{user_id}/{uuid}.{ext}`, avatar: `{user_id}/avatar-{idle\|speak}-{uuid}.{ext}` | server เท่านั้น (ผ่าน API), ≤ 4 MB                                |
| `tts-audio`     | private      | `{user_id}/{uuid}.mp3`                                                          | server เท่านั้น, overlay ได้ signed URL 10 นาที, ลบไฟล์เก่ากว่า 1 ชม. |
| `slips`         | private      | `{streamer_id}/{donation_id}/{attempt}.{ext}`                                   | server เท่านั้น, เจ้าของดูผ่าน signed URL 10 นาที                    |
