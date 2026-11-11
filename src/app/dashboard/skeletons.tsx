import { Skeleton } from "@/components/ui/skeleton";

/** โครงตอนโหลดของการ์ด "ยินดีต้อนรับ" หน้าหลัก dashboard */
export function WelcomeSkeleton() {
  return (
    <section
      role="status"
      aria-label="กำลังโหลด"
      className="rounded-2xl border bg-card p-6"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-4 h-16 w-full rounded-lg" />
      <Skeleton className="mt-6 h-4 w-32" />
      <Skeleton className="mt-3 h-10 w-full rounded-lg" />
    </section>
  );
}

/** โครงตอนโหลดของฟอร์มช่องทางรับเงิน — ขนาดเท่าของจริงเพื่อไม่ให้หน้ากระโดด */
export function PaymentFormSkeleton() {
  return (
    <div
      role="status"
      aria-label="กำลังโหลด"
      className="mt-6 flex flex-col gap-4"
    >
      <section className="rounded-2xl border bg-card p-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-2 h-4 w-48" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
      </section>
      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-5 w-20" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
          <Skeleton className="h-[18px] w-8 rounded-full" />
        </div>
        <div className="mt-6 grid gap-5">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-9 w-48 rounded-lg" />
          </div>
          {["w-28", "w-32", "w-36"].map((w) => (
            <div key={w} className="grid gap-2">
              <Skeleton className={`h-4 ${w}`} />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-[18px] w-8 rounded-full" />
          </div>
          <div className="border-t pt-5">
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </div>
      </section>
    </div>
  );
}
