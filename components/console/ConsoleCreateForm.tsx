import { HOUSES } from "@/lib/ui/sport";
import { createMatch } from "@/app/admin/scoreboard/actions";
import { Button, FIELD, LABEL, Panel } from "@/components/console/ui";
import { ConsoleFormatFields } from "@/components/console/ConsoleFormatFields";

export function ConsoleCreateForm() {
  return (
    <Panel title="New match · สร้างการแข่งขัน">
      <form
        action={createMatch}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <input type="hidden" name="return_to" value="/console/match" />

        {/* Sport + the format fields that sport needs (sets vs. periods). */}
        <ConsoleFormatFields />

        <label className="block">
          <span className={LABEL}>Team A · ทีม A</span>
          <select name="house_a" required defaultValue="1" className={FIELD}>
            {HOUSES.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={LABEL}>Team B · ทีม B</span>
          <select name="house_b" required defaultValue="2" className={FIELD}>
            {HOUSES.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-4 md:col-span-2">
          <Button type="submit" variant="primary" className="px-6">
            Create match →
          </Button>
          <span className="text-[12px] text-gray-500">
            Teams must differ · the board shows the next match automatically
          </span>
        </div>
      </form>
    </Panel>
  );
}
