import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overlay · KORTANGNOI",
  robots: { index: false, follow: false },
};

/** OBS Browser Source: พื้นหลังต้องโปร่งใส ไม่มี UI อื่น (ไม่ใช้ app-bg) */
export default function OverlayLayout({
  children,
}: LayoutProps<"/overlay/[token]">) {
  return (
    <>
      <style>{`html, body { background: transparent !important; overflow: hidden; }`}</style>
      {children}
    </>
  );
}
