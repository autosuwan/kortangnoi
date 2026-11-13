/** ข้อความในช่องตัวเลข: เก็บเฉพาะตัวเลข ตัด 0 นำหน้า (ว่างได้ ระหว่างพิมพ์) */
export function sanitizeIntegerText(text: string): string {
  return text
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, 9);
}

/** ค่าที่ใช้ตอนออกจากช่อง: ว่าง → min, นอกช่วง → ปัดเข้าช่วง */
export function commitIntegerText(text: string, min: number, max: number) {
  const n = text === "" ? min : Number(text);
  return Math.min(max, Math.max(min, n));
}
