import { describe, expect, it } from "vitest";

import { dequeue, emptyQueue, enqueue } from "./alert-queue";
import type { OverlayAlert } from "./overlay";

const alert = (id: string): OverlayAlert => ({
  donationId: id,
  donorName: "a",
  amountSatang: 100,
  message: null,
  isTest: false,
  imageUrl: "/x.png",
  nameColor: "#FFFFFF",
  supportText: "โดเนท",
  ttsText: null,
  ttsUrl: null,
});

describe("alert queue", () => {
  it("แสดงตามลำดับที่เข้ามา ทีละอัน", () => {
    let q = enqueue(enqueue(emptyQueue(), alert("1")), alert("2"));
    const [first, q2] = dequeue(q);
    const [second, q3] = dequeue(q2);
    const [none] = dequeue(q3);
    expect([first?.donationId, second?.donationId, none]).toEqual([
      "1",
      "2",
      null,
    ]);
    q = q3;
    expect(q.items).toEqual([]);
  });

  it("กันซ้ำ แม้แสดงไปแล้ว", () => {
    let q = enqueue(emptyQueue(), alert("1"));
    q = enqueue(q, alert("1"));
    expect(q.items).toHaveLength(1);
    const [, after] = dequeue(q);
    expect(enqueue(after, alert("1")).items).toHaveLength(0);
  });

  it("จำ id ล่าสุดไม่เกิน 200 ตัว", () => {
    let q = emptyQueue();
    for (let i = 0; i < 250; i++) q = enqueue(q, alert(String(i)));
    expect(q.seen).toHaveLength(200);
    expect(q.seen[0]).toBe("50");
  });
});
