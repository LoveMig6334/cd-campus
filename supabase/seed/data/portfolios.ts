import type { PortfolioStats, Project } from "./types";

export const PORTFOLIO_STATS: PortfolioStats[] = [
  { num: 142, label: "Projects" },
  { num: 38, label: "Awards" },
  { num: 21, label: "Published" },
];

export const PORTFOLIO_PROJECTS: Project[] = [
  {
    title: "CropPlanner",
    titleTh: "ระบบช่วยตัดสินใจเพาะปลูกพืช 4 ชนิด",
    desc: "Agricultural decision support combining Rolling-Window LSTM price forecasting with a greedy weighted scheduling algorithm for Thai farmers.",
    authorLine: "ธรรศ์ × นนท์ — Y9 / 2025",
    tags: ["ML", "IEEE"],
    iconKey: "crop",
  },
  {
    title: "Solar Lab Monitor",
    titleTh: "เซ็นเซอร์วัดประสิทธิภาพแผงโซลาร์",
    desc: "IoT-based real-time monitoring system using ESP32 + Supabase to track solar panel output and predict cleaning intervals.",
    authorLine: "วีรชาติ ส. — Y8 / 2024",
    tags: ["IoT", "Award"],
    iconKey: "solar",
  },
  {
    title: "SHM Visualizer",
    titleTh: "เครื่องมือเสริมการสอนการเคลื่อนที่แบบ SHM",
    desc: "Interactive web tool that visualises Hooke's law through phase-space ellipses with adjustable mass, spring constant, and amplitude.",
    authorLine: "ปริญญ์ ก. — Y9 / 2025",
    tags: ["Physics"],
    iconKey: "shm",
  },
];
