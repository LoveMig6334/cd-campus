import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Card, CardTitle } from "@/components/admin/Card";
import { Pill } from "@/components/admin/Pill";
import { getAllPsharePosts } from "@/lib/queries/pshare";

const STATUS_LABEL = {
  draft: "Draft",
  published: "Published",
  review: "Review",
} as const;

export default async function AdminPshareList() {
  const posts = await getAllPsharePosts();
  return (
    <>
      <AdminTopbar
        titleTh="พี่แชร์"
        eyebrow="P'share Studio"
        actions={
          <Link
            href="/admin/pshare/new"
            className="inline-block border-[1.5px] border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-all bg-blue text-white [box-shadow:3px_3px_0_var(--color-ink)] hover:[box-shadow:4px_4px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:bg-blue-deep"
          >
            + New post
          </Link>
        }
      />

      <Card>
        <CardTitle th="โพสต์ทั้งหมด" en="All posts" />
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["#", "Title · ชื่อโพสต์", "Author", "Status", ""].map((h, i) => (
                <th
                  key={i}
                  className="border-b-[1.5px] border-ink bg-cream px-2.5 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.map((p, i) => {
              const td =
                i < posts.length - 1
                  ? "border-b border-dashed border-mute-200"
                  : "";
              return (
                <tr
                  key={p.id}
                  className="transition-colors hover:bg-cream [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
                >
                  <td className={td}>
                    <span className="font-display italic text-[15px]">
                      {p.num || "–"}
                    </span>
                  </td>
                  <td className={td}>
                    <span className="font-display italic text-[15px]">{p.title}</span>
                    <small className="mt-px block font-mono text-[10px] text-mute-500">
                      {p.slug}
                    </small>
                  </td>
                  <td className={td}>{p.author}</td>
                  <td className={td}>
                    {p.status === "published" ? (
                      <Pill variant="ok">{STATUS_LABEL[p.status]}</Pill>
                    ) : (
                      <Pill variant="pend">{STATUS_LABEL[p.status]}</Pill>
                    )}
                  </td>
                  <td className={td}>
                    <Link
                      href={`/admin/pshare/${p.id}/edit`}
                      className="inline-block border-[1.5px] border-line bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
