import type {
  AdminKpi,
  AdminTabItem,
  CarelinDeskRow,
} from "./types";

export const CARELIN_DESK_KPIS: AdminKpi[] = [
  {
    label: "Open today",
    th: "รออยู่",
    num: "7",
    delta: { kind: "up", text: "▲ 3 since yesterday" },
  },
  {
    label: "Answered today",
    th: "ตอบแล้ว",
    num: "12",
    delta: { kind: "up", text: "▲ 4 vs yesterday" },
  },
  {
    label: "Avg response",
    th: "เวลาตอบเฉลี่ย",
    num: "42 min",
    delta: { kind: "down", text: "▼ 12 min faster" },
  },
  {
    label: "Total · this week",
    th: "สัปดาห์นี้",
    num: "68",
    delta: { kind: "flat", text: "— stable" },
  },
];

export const CARELIN_DESK_TABS: AdminTabItem[] = [
  { id: "all", label: "All", count: 19 },
  { id: "open", label: "Open", count: 7 },
  { id: "answered", label: "Answered", count: 12 },
];

export const CARELIN_DESK_ACTIVE_TAB = "all";

export const CARELIN_DESK_ROWS: CarelinDeskRow[] = [
  {
    when: "09:48",
    requester: { name: "วงกต", studentId: "0612", klass: "ม.5/2" },
    title: "หาเพื่อนติวฟิสิกส์ บทคลื่นแม่เหล็กไฟฟ้า",
    snippet: "คือเรียนแล้วงงมาก ใครว่างหลังเลิกเรียน พรุ่งนี้...",
    status: "Open",
  },
  {
    when: "09:33",
    requester: { name: "พลอย", studentId: "0307", klass: "ม.4/1" },
    title: "เครื่องน้ำดื่มอาคาร 5 ชั้น 2 พัง",
    snippet: "น้ำไม่ออกตั้งแต่เช้า รบกวนแจ้งช่าง...",
    status: "Open",
  },
  {
    when: "09:12",
    requester: { name: "นัด", studentId: "0521", klass: "ม.5/4" },
    title: "ลืมกระเป๋าไว้ที่ห้องดนตรี",
    snippet: "มีใครเห็นกระเป๋าสีดำมีพวงกุญแจรูปแมว...",
    status: "Answered",
  },
  {
    when: "เมื่อวาน",
    requester: { name: "เกรซ", studentId: "0855", klass: "ม.3/2" },
    title: "อยากปรึกษาเรื่องเลือกสายชั้น ม.4",
    snippet: "ตัดสินใจระหว่างสายวิทย์-คณิต กับ ศิลป์-คำนวณไม่ได้เลย...",
    status: "Open",
  },
  {
    when: "เมื่อวาน",
    requester: { name: "ภีม", studentId: "0418", klass: "ม.6/3" },
    title: "Wi-Fi อาคาร 4 หลุดบ่อย",
    snippet: "ทำงานกลุ่มในห้องสมุดยากมาก ขอให้ตรวจหน่อย",
    status: "Answered",
  },
  {
    when: "เมื่อวาน",
    requester: { name: "มินทร์", studentId: "0739", klass: "ม.4/3" },
    title: "อยากชวนเพื่อนเข้าชมรมหุ่นยนต์",
    snippet: "ใครสนใจเข้าชมรม Robotics รวมตัว ม.ต้น+ปลาย...",
    status: "Answered",
  },
];
