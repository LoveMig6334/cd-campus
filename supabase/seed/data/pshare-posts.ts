import type { PsharePost, PshareTagFilter } from "@/lib/types";

export const PSHARE_TAGS: PshareTagFilter[] = [
  "All",
  "#math-olympiad",
  "#physics",
  "#sci-project",
  "#thai-essay",
  "#tcas",
  "#life",
];

export const PSHARE_ACTIVE_TAG: PshareTagFilter = "All";

export const PSHARE_POSTS: PsharePost[] = [
  {
    slug: "tmo-prep",
    num: "01",
    title: "เตรียมตัวสอบ TMO ฉบับเข้าใจง่าย",
    snippet:
      "สรุปเทคนิคทำข้อสอบเลขโอลิมปิกระดับมัธยมต้น ที่พี่ใช้สอบจริง พร้อม pattern ข้อที่เจอบ่อย",
    author: "พี่ฟ้า · ม.6/3",
    date: "3 พ.ค.",
    tags: ["#math-olympiad", "#tmo"],
    art: { halftone: "halftone-bl" },
  },
  {
    slug: "sci-project-topic",
    num: "02",
    title: "วิธีเลือกหัวข้อโครงงานวิทย์ที่ไม่จำเจ",
    snippet:
      "3 เทคนิคหา research question ที่ไม่ซ้ำใคร จากประสบการณ์ทำโครงงาน 2 ปี ได้รางวัลระดับประเทศ",
    author: "พี่จุง · ม.6/1",
    date: "10 พ.ค.",
    tags: ["#sci-project", "#research"],
    art: {
      halftone: "halftone-bk",
      bg: "var(--color-cream-2)",
      numColor: "var(--color-blue)",
    },
  },
  {
    slug: "tcas-portfolio",
    num: "03",
    title: "TCAS 67 — แชร์ portfolio พี่ปีก่อน",
    snippet:
      "พี่ติดวิศวะจุฬาด้วย portfolio แบบไหน เปิดให้น้องดูทั้งเล่ม + tip การเขียน statement",
    author: "พี่ลีโอ · ม.6/2",
    date: "8 พ.ค.",
    tags: ["#tcas", "#portfolio"],
    art: { halftone: "halftone-bl" },
  },
  {
    slug: "thai-essay",
    num: "04",
    title: "เขียน essay ภาษาไทยให้สวย ใน 3 ย่อหน้า",
    snippet:
      "โครงสร้างย่อหน้าแบบ pyramid + คำเชื่อมที่ครูชอบเห็น ใช้ได้ทั้งสอบและการบ้าน",
    author: "พี่นัท · ม.5/4",
    date: "5 พ.ค.",
    tags: ["#thai-essay"],
    art: { halftone: "halftone-soft", bg: "var(--color-yellow)" },
  },
  {
    slug: "freshman-routine",
    num: "05",
    title: "เริ่มต้น life routine ม.4 ยังไงดี",
    snippet:
      "ตารางชีวิตของพี่ตอนขึ้น ม.ปลาย — เวลานอน, อ่านหนังสือ, ทำกิจกรรม ยังไงให้ไม่หมดไฟ",
    author: "พี่บัว · ม.5/2",
    date: "3 พ.ค.",
    tags: ["#life", "#freshman"],
    art: { halftone: "halftone-bk" },
  },
];
