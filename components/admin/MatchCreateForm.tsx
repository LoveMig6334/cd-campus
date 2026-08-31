import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { HOUSES } from "@/lib/ui/sport";
import { BEST_OF_CHOICES, SPORTS } from "@/lib/sport/rules";
import { createMatch } from "@/app/admin/scoreboard/actions";

const FIELD =
  "border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]";
const LABEL =
  "text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase";

export function MatchCreateForm() {
  return (
    <Card>
      <CardTitle th="สร้างการแข่งขัน" en="New match" />
      <form
        action={createMatch}
        className="grid grid-cols-1 gap-3 md:grid-cols-2"
      >
        <label className="block">
          <span className={LABEL}>Sport · กีฬา</span>
          <select name="sport" required className={FIELD}>
            {Object.values(SPORTS)
              .filter((s) => s.kind === "sets")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.labelEn} · {s.labelTh}
                </option>
              ))}
          </select>
        </label>

        <label className="block">
          <span className={LABEL}>Round · รอบ (optional)</span>
          <input
            name="round_label"
            type="text"
            maxLength={60}
            placeholder="e.g. Semi-final"
            className={FIELD}
          />
        </label>

        <label className="block">
          <span className={LABEL}>Sets · จำนวนเซต</span>
          <select name="best_of" required defaultValue="3" className={FIELD}>
            {BEST_OF_CHOICES.map((n) => (
              <option key={n} value={n}>
                Best of {n} · ชนะ {Math.floor(n / 2) + 1} เซต
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={LABEL}>Points per set · แต้มต่อเซต</span>
          <input
            name="points_to_win"
            type="number"
            required
            defaultValue={15}
            min={1}
            max={99}
            step={1}
            className={FIELD}
          />
          <span className="text-mute-500 mt-1 block font-mono text-[9px] tracking-[0.12em] uppercase">
            Advisory target — sets end when the referee presses End set
          </span>
        </label>

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

        <label className="block">
          <span className={LABEL}>Venue · สถานที่ (optional)</span>
          <input
            name="venue"
            type="text"
            maxLength={60}
            placeholder="e.g. โรงยิม 1"
            className={FIELD}
          />
        </label>

        <label className="block">
          <span className={LABEL}>Scheduled · เวลาแข่ง (optional)</span>
          <input name="scheduled_at" type="datetime-local" className={FIELD} />
        </label>

        <div className="md:col-span-2">
          <Btn type="submit" variant="primary">
            Create match →
          </Btn>
          <p className="text-mute-500 mt-2 font-mono text-[10px] tracking-[0.12em] uppercase">
            Teams must differ · the board shows the next match automatically
          </p>
        </div>
      </form>
    </Card>
  );
}
