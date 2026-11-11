import { NextResponse } from "next/server";

/** error ที่ service โยนได้ แล้ว route handler แปลงเป็น response รูปแบบเดียวกันทั้งระบบ */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ApiErrorBody = { error: { code: string; message: string } };

export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json<ApiErrorBody>(
    { error: { code, message } },
    { status },
  );
}

/** แปลง error อะไรก็ได้เป็น response — error ที่ไม่รู้จักตอบ 500 และ log ไว้ ไม่ส่งรายละเอียดออกไป */
export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error.status, error.code, error.message);
  }
  console.error(error);
  return errorResponse(500, "INTERNAL_ERROR", "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
}

export const unauthorized = () =>
  errorResponse(401, "UNAUTHORIZED", "กรุณาเข้าสู่ระบบ");
