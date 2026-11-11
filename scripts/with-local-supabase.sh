#!/usr/bin/env bash
# รันคำสั่งโดยใช้ค่า Supabase ในเครื่อง (จาก `supabase status`) แทน .env
# ใช้: scripts/with-local-supabase.sh <command...>   เช่น  scripts/with-local-supabase.sh next dev
set -euo pipefail

status_env="$(npx supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  --override-name auth.secret_key=SUPABASE_SECRET_KEY \
  2>/dev/null)" || {
  echo "Supabase ในเครื่องยังไม่ได้รัน — รัน: npx supabase start" >&2
  exit 1
}

while IFS='=' read -r key value; do
  case "$key" in
    NEXT_PUBLIC_SUPABASE_URL | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | SUPABASE_SECRET_KEY)
      value="${value%\"}"
      value="${value#\"}"
      export "$key=$value"
      ;;
  esac
done <<<"$status_env"

export NEXT_PUBLIC_ENABLE_PASSWORD_LOGIN="${NEXT_PUBLIC_ENABLE_PASSWORD_LOGIN:-true}"
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}"

exec "$@"
