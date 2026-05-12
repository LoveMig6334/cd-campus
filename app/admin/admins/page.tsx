import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Card, CardTitle } from "@/components/admin/Card";
import { Pill } from "@/components/admin/Pill";
import { requireRootAdmin } from "@/lib/auth";
import { getAdmins } from "@/lib/queries/admins";

export default async function AdminAdminsPage() {
  await requireRootAdmin();
  const admins = await getAdmins();
  return (
    <>
      <AdminTopbar titleTh="แอดมิน" eyebrow="Admins · root-only" />

      <Card>
        <CardTitle th="แอดมินทั้งหมด" en="All admins" />
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Display name", "Email", "Tier", "Status"].map((h, i) => (
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
            {admins.map((a, i) => {
              const td =
                i < admins.length - 1
                  ? "border-b border-dashed border-mute-200"
                  : "";
              return (
                <tr
                  key={a.id}
                  className="hover:bg-cream [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
                >
                  <td className={td}>
                    <span className="font-display italic text-[15px]">
                      {a.display_name}
                    </span>
                  </td>
                  <td className={td}>
                    <span className="font-mono text-[12px]">{a.email}</span>
                  </td>
                  <td className={td}>
                    {a.tier === "root" ? (
                      <Pill variant="ok">root</Pill>
                    ) : (
                      <Pill>normal</Pill>
                    )}
                  </td>
                  <td className={td}>
                    {a.is_active ? (
                      <Pill variant="ok">active</Pill>
                    ) : (
                      <Pill variant="pend">disabled</Pill>
                    )}
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
