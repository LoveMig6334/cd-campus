export const FEATURE_KEYS = [
  "calendar",
  "booking",
  "sport",
  "portfolio",
  "pshare",
  "carelin",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function isFeatureKey(v: string): v is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(v);
}

export const FEATURE_LABELS: Record<FeatureKey, { en: string; th: string }> = {
  calendar: { en: "Calendar", th: "ปฏิทินกิจกรรม" },
  booking: { en: "Booking", th: "จองห้อง" },
  sport: { en: "Sport Day", th: "กีฬาสี" },
  portfolio: { en: "Portfolio", th: "รุ่นพี่ · Alumni" },
  pshare: { en: "P'share", th: "พี่แชร์ น้องชัวร์" },
  carelin: { en: "CD Carelin", th: "เรื่องที่อยากเล่า" },
};
