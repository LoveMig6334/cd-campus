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
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <PshareEditor defaults={{}} />
    </>
  );
}
