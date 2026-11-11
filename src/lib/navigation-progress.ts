/** สั่งให้ loading bar บนสุดเริ่มวิ่ง — เรียกก่อน router.push/replace (คลิกลิงก์จับให้อัตโนมัติแล้ว) */
export const NAVIGATION_START_EVENT = "kortangnoi:navigation-start";

export function startNavigationProgress() {
  window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
}
