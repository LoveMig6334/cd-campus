import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Card, CardTitle } from "@/components/admin/Card";
import { Pill } from "@/components/admin/Pill";
import { Btn } from "@/components/admin/Btn";
import { requireRootAdmin } from "@/lib/auth";
import { getAdmins } from "@/lib/queries/admins";
import { createAdmin, disableAdmin } from "./actions";

export default async function AdminAdminsPage() {
  const self = await requireRootAdmin();
  const admins = await getAdmins();
  return (
    <>
      <AdminTopbar titleTh="แอดมิน" eyebrow="Admins · root-only" />

      <Card className="mb-[18px]">
        <CardTitle th="เพิ่มแอดมิน" en="New admin" />
        <form
          action={createAdmin}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Email
            <input
              name="email"
              type="email"
              required
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Display name · ชื่อแสดง
            <input
              name="display_name"
              type="text"
              required
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Password (≥ 12 chars)
            <input
              name="password"
              type="password"
              required
              minLength={12}
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            />
          </label>
          <label className="text-mute-700 flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
            Tier
            <select
              name="tier"
              defaultValue="normal"
              className="border-line bg-paper text-ink border-[1.5px] px-3 py-2 font-sans text-[13px] tracking-normal normal-case"
            >
              <option value="normal">normal</option>
              <option value="root">root</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <Btn variant="primary">Create admin →</Btn>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle th="แอดมินทั้งหมด" en="All admins" />
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Display name", "Email", "Tier", "Status", ""].map((h, i) => (
                <th
                  key={i}
                  className="border-ink bg-cream text-mute-700 border-b-[1.5px] px-2.5 py-2 text-left font-mono text-[10px] tracking-[0.14em] uppercase"
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
                    <span className="font-display text-[15px] italic">
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
                  <td className={td}>
                    {a.is_active && a.id !== self.id && (
                      <form action={disableAdmin}>
                        <input type="hidden" name="id" value={a.id} />
                        <Btn>Disable</Btn>
                      </form>
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
