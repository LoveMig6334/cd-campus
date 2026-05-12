import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { PshareEditor } from "@/components/admin/PshareEditor";

export default function NewPsharePost() {
  return (
    <>
      <AdminTopbar
        titleTh="โพสต์ใหม่"
        eyebrow="P'share · new post"
        actions={
          <Link
            href="/admin/pshare"
            className="inline-block border-[1.5px] border-line bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
          >
            ← Back
          </Link>
        }
      />
      <PshareEditor defaults={{}} />
    </>
  );
}
