import { MonitorPlay, ScanLine, Wallet } from "lucide-react";

import { StreamerAvatar, StreamerBanner } from "@/components/streamer-avatar";
import { cn } from "@/lib/utils";

export type StreamerProfile = {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
};

const FEATURES = [
  { icon: Wallet, text: "โอนตรงเข้าพร้อมเพย์ ไม่มีค่าธรรมเนียม" },
  { icon: ScanLine, text: "แนบสลิป ระบบตรวจให้อัตโนมัติ" },
  { icon: MonitorPlay, text: "ขึ้นจอไลฟ์ทันทีที่ตรวจผ่าน" },
];

/** การ์ดโปรไฟล์สตรีมเมอร์ (หน้าโดเนท + พรีวิวในหน้าตั้งค่า) */
export function ProfileCard({
  profile,
  showFeatures = true,
  className,
}: {
  profile: StreamerProfile;
  showFeatures?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn("overflow-hidden rounded-2xl border bg-card", className)}
    >
      <StreamerBanner url={profile.bannerUrl} />
      <div className="px-5 pb-5">
        <StreamerAvatar
          name={profile.displayName}
          url={profile.avatarUrl}
          className="-mt-10 size-20 text-3xl sm:-mt-12 sm:size-24"
        />
        <h1
          data-testid="streamer-name"
          className="mt-3 truncate text-2xl font-medium"
        >
          {profile.displayName}
        </h1>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>
        {profile.bio && (
          <p
            data-testid="streamer-bio"
            className="mt-3 text-sm break-words whitespace-pre-line"
          >
            {profile.bio}
          </p>
        )}
        {showFeatures && (
          <ul className="mt-5 hidden gap-2.5 border-t border-dashed pt-4 text-sm text-muted-foreground lg:grid">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
