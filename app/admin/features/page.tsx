import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { Pill } from "@/components/admin/Pill";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { requireRootAdmin } from "@/lib/auth";
import { getFeatureFlags } from "@/lib/queries/featureFlags";
import { FEATURE_KEYS, FEATURE_LABELS } from "@/lib/ui/features";
import { toggleFeature } from "./actions";

export default async function AdminFeaturesPage() {
  await requireRootAdmin();
  const flags = await getFeatureFlags();

  return (
    <>
      <AdminTopbar titleTh="ฟีเจอร์" eyebrow="Features · root-only" />

      <Card>
        <CardTitle th="ฟีเจอร์ทั้งหมด" en="Feature flags" />
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Feature", "Status", ""].map((h, i) => (
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
            {FEATURE_KEYS.map((key, i) => {
              const label = FEATURE_LABELS[key];
              const enabled = flags[key];
              const td =
                i < FEATURE_KEYS.length - 1
                  ? "border-b border-dashed border-mute-200"
                  : "";
              return (
                <tr
                  key={key}
                  className="hover:bg-cream [&_td]:px-2.5 [&_td]:py-3 [&_td]:align-middle"
                >
                  <td className={td}>
                    <div className="font-display text-[15px] italic">
                      {label.en}
                    </div>
                    <div className="text-mute-500 font-mono text-[10px] tracking-[0.14em] uppercase">
                      {key} · {label.th}
                    </div>
                  </td>
                  <td className={td}>
                    {enabled ? (
                      <Pill variant="ok">enabled</Pill>
                    ) : (
                      <Pill variant="pend">disabled</Pill>
                    )}
                  </td>
                  <td className={td}>
                    <form action={toggleFeature}>
                      <input type="hidden" name="key" value={key} />
                      <Btn type="submit">
                        {enabled ? "Disable" : "Enable"}
                      </Btn>
                    </form>
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
