const TH_WEEKDAYS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

const TH_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export type BilingualDate = {
  en: string;
  thWeekday: string;
  thDay: number;
  thMonth: string;
};

export function formatBilingualDate(date: Date): BilingualDate {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    date,
  );
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(
    date,
  );
  return {
    en: `${weekday} · ${date.getDate()} ${month} ${date.getFullYear()}`,
    thWeekday: TH_WEEKDAYS[date.getDay()] + "ที่",
    thDay: date.getDate(),
    thMonth: TH_MONTHS[date.getMonth()],
  };
}
