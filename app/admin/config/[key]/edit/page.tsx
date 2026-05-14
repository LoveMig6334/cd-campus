import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Card, CardTitle } from "@/components/admin/Card";
import { Btn } from "@/components/admin/Btn";
import { getConfigByKey } from "@/lib/queries/siteConfig";
import type { AdminKpi, HomeHero, PortfolioStats } from "@/lib/types";
import { updateSiteConfig } from "../../actions";
import {
  isEditableKey,
  KEY_LABELS,
  HOUSE_KEYS,
  KPI_KINDS,
} from "@/lib/ui/siteConfig";

const INPUT_CLS =
  "mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink";
const INPUT_MONO =
  "mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-mono text-[13px] text-ink";
const LABEL_CLS =
  "block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700";

export default async function EditConfigPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!isEditableKey(key)) notFound();
  const labels = KEY_LABELS[key];

  return (
    <>
      <AdminTopbar
        titleTh={labels.th}
        eyebrow={`Site config · ${labels.en}`}
        actions={
          <Link
            href="/admin/config"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />

      <Card>
        <CardTitle th="แก้ไขคอนฟิก" en={`Edit · ${key}`} />
        <form action={updateSiteConfig} className="grid grid-cols-1 gap-3">
          <input type="hidden" name="key" value={key} />

          {key === "home_hero" && <HomeHeroFields />}
          {(key === "overview_kpis" ||
            key === "portfolio_kpis" ||
            key === "carelin_kpis") && <KpiArrayFields configKey={key} />}
          {key === "portfolio_stats" && <PortfolioStatsFields />}
          {key === "trend_chart" && <TrendChartFields />}

          <div className="flex gap-2 pt-2">
            <Btn type="submit" variant="primary">
              Save changes →
            </Btn>
            <Link
              href="/admin/config"
              className="border-line bg-paper text-ink inline-block border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] uppercase"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </>
  );
}

async function HomeHeroFields() {
  const v = await getConfigByKey<HomeHero>("home_hero");
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <label className="block md:col-span-2">
        <span className={LABEL_CLS}>Eyebrow (mono caps)</span>
        <input
          name="eyebrow"
          type="text"
          required
          maxLength={120}
          defaultValue={v.eyebrow}
          className={INPUT_MONO}
        />
      </label>

      <label className="block md:col-span-2">
        <span className={LABEL_CLS}>
          Title lines (one per line · stacked headline)
        </span>
        <textarea
          name="titleLines"
          rows={3}
          required
          defaultValue={v.titleLines.join("\n")}
          className={INPUT_CLS}
        />
      </label>

      <label className="block">
        <span className={LABEL_CLS}>Where (TH)</span>
        <input
          name="whereTh"
          type="text"
          required
          maxLength={80}
          defaultValue={v.whereTh}
          className={INPUT_CLS}
        />
      </label>

      <label className="block">
        <span className={LABEL_CLS}>Leading · house</span>
        <select
          name="leading_house"
          defaultValue={v.leading.house}
          className={INPUT_MONO}
        >
          {HOUSE_KEYS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={LABEL_CLS}>Leading · label</span>
        <input
          name="leading_label"
          type="text"
          required
          maxLength={40}
          defaultValue={v.leading.label}
          className={INPUT_CLS}
        />
      </label>

      <label className="block">
        <span className={LABEL_CLS}>Leading · points</span>
        <input
          name="leading_points"
          type="number"
          required
          defaultValue={v.leading.points}
          className={INPUT_MONO}
        />
      </label>

      <label className="block">
        <span className={LABEL_CLS}>Weather · degrees</span>
        <input
          name="weather_degrees"
          type="number"
          required
          defaultValue={v.weather.degrees}
          className={INPUT_MONO}
        />
      </label>

      <label className="block">
        <span className={LABEL_CLS}>Weather · glyph</span>
        <input
          name="weather_glyph"
          type="text"
          required
          maxLength={4}
          defaultValue={v.weather.glyph}
          className={INPUT_MONO}
        />
      </label>
    </div>
  );
}

async function KpiArrayFields({
  configKey,
}: {
  configKey: "overview_kpis" | "portfolio_kpis" | "carelin_kpis";
}) {
  const v = await getConfigByKey<AdminKpi[]>(configKey);
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: 4 }).map((_, i) => {
        const k = v[i] ?? {
          label: "",
          th: "",
          num: "",
          delta: { kind: "flat" as const, text: "" },
        };
        return (
          <div
            key={i}
            className="border-line bg-cream border-[1.5px] px-4 py-3"
          >
            <div className="text-mute-700 mb-2 font-mono text-[10px] tracking-[0.16em] uppercase">
              KPI #{i + 1}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <span className={LABEL_CLS}>Label (EN)</span>
                <input
                  name={`kpi_${i}_label`}
                  type="text"
                  required
                  maxLength={60}
                  defaultValue={k.label}
                  className={INPUT_CLS}
                />
              </label>
              <label className="block">
                <span className={LABEL_CLS}>Label (TH)</span>
                <input
                  name={`kpi_${i}_th`}
                  type="text"
                  required
                  maxLength={60}
                  defaultValue={k.th}
                  className={INPUT_CLS}
                />
              </label>
              <label className="block">
                <span className={LABEL_CLS}>Number (string)</span>
                <input
                  name={`kpi_${i}_num`}
                  type="text"
                  required
                  maxLength={20}
                  defaultValue={k.num}
                  className={INPUT_MONO}
                />
              </label>
              <label className="block">
                <span className={LABEL_CLS}>Delta · kind</span>
                <select
                  name={`kpi_${i}_kind`}
                  defaultValue={k.delta.kind}
                  className={INPUT_MONO}
                >
                  {KPI_KINDS.map((kk) => (
                    <option key={kk} value={kk}>
                      {kk}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className={LABEL_CLS}>Delta · text</span>
                <input
                  name={`kpi_${i}_text`}
                  type="text"
                  maxLength={80}
                  defaultValue={k.delta.text}
                  className={INPUT_CLS}
                />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function PortfolioStatsFields() {
  const v = await getConfigByKey<PortfolioStats[]>("portfolio_stats");
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => {
        const s = v[i] ?? { num: 0, label: "" };
        return (
          <div
            key={i}
            className="border-line bg-cream border-[1.5px] px-4 py-3"
          >
            <div className="text-mute-700 mb-2 font-mono text-[10px] tracking-[0.16em] uppercase">
              Stat #{i + 1}
            </div>
            <label className="block">
              <span className={LABEL_CLS}>Number</span>
              <input
                name={`stat_${i}_num`}
                type="number"
                required
                defaultValue={s.num}
                className={INPUT_MONO}
              />
            </label>
            <label className="mt-2 block">
              <span className={LABEL_CLS}>Label</span>
              <input
                name={`stat_${i}_label`}
                type="text"
                required
                maxLength={40}
                defaultValue={s.label}
                className={INPUT_CLS}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}

async function TrendChartFields() {
  const v = await getConfigByKey<{
    months: readonly string[];
    path: string;
    points: { x: number; y: number }[];
  }>("trend_chart");
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="border-line bg-cream border-[1.5px] px-4 py-3">
        <div className="text-mute-700 mb-2 font-mono text-[10px] tracking-[0.16em] uppercase">
          Months · 12 labels (last entry is highlighted)
        </div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <label key={i} className="block">
              <span className={LABEL_CLS}>#{i + 1}</span>
              <input
                name={`month_${i}`}
                type="text"
                required
                maxLength={6}
                defaultValue={v.months[i] ?? ""}
                className={INPUT_MONO}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="border-line bg-cream border-[1.5px] px-4 py-3">
        <div className="text-mute-700 mb-2 font-mono text-[10px] tracking-[0.16em] uppercase">
          Points · 13 (x, y) pairs in viewBox 0 0 600 120 · SVG path is
          re-derived on save
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {Array.from({ length: 13 }).map((_, i) => {
            const p = v.points[i] ?? { x: 0, y: 0 };
            return (
              <div key={i} className="flex items-end gap-2">
                <span className="text-mute-700 pb-2 font-mono text-[10px] tracking-[0.16em] uppercase">
                  #{i + 1}
                </span>
                <label className="block flex-1">
                  <span className={LABEL_CLS}>x</span>
                  <input
                    name={`point_${i}_x`}
                    type="number"
                    required
                    defaultValue={p.x}
                    className={INPUT_MONO}
                  />
                </label>
                <label className="block flex-1">
                  <span className={LABEL_CLS}>y</span>
                  <input
                    name={`point_${i}_y`}
                    type="number"
                    required
                    defaultValue={p.y}
                    className={INPUT_MONO}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
