import { HandCoins } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <HandCoins className="size-7" aria-hidden />
        </div>
        <h1 className="text-3xl font-bold">KORTANGNOI</h1>
        <p className="mt-2 text-muted-foreground">
          รับโดเนทผ่านพร้อมเพย์ ไม่มีค่าธรรมเนียม ขึ้นจอ OBS อัตโนมัติ
        </p>
        <Button className="mt-6 rounded-full px-6" size="lg">
          เริ่มต้นใช้งาน
        </Button>
      </div>
    </main>
  );
}
