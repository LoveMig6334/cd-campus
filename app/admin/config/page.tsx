import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Card, CardTitle } from "@/components/admin/Card";
import { EDITABLE_KEYS, KEY_LABELS } from "@/lib/ui/siteConfig";

export default async function AdminConfigIndex() {
  return (
    <>
      <AdminTopbar titleTh="คอนฟิก" eyebrow="Site config" />

      <Card>
        <CardTitle th="คอนฟิกทั้งหมด" en="All keys" />
        <ul className="divide-mute-200 divide-y divide-dashed">
          {EDITABLE_KEYS.map((k) => (
            <li
              key={k}
              className="flex items-center justify-between px-3 py-3"
            >
              <div>
                <div className="font-display text-[15px] italic">
                  {KEY_LABELS[k].en}
                </div>
                <div className="text-mute-500 font-mono text-[11px]">
                  {k} · {KEY_LABELS[k].th}
                </div>
              </div>
              <Link
                href={`/admin/config/${k}/edit`}
                className="border-line bg-paper text-mute-700 hover:bg-cream border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
              >
                Edit →
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
