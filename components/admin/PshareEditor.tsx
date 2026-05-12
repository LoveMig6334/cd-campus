import { Card, CardTitle } from "@/components/admin/Card";
import { saveDraft, publishPost } from "@/app/admin/pshare/actions";

type Defaults = {
  id?: string;
  slug?: string;
  title?: string;
  num_label?: string | null;
  snippet?: string | null;
  body_md?: string | null;
  author_alias?: string | null;
  art_halftone?: string | null;
  art_bg?: string | null;
  art_num_color?: string | null;
  tags?: string[];
};

const HALFTONES = ["halftone-bl", "halftone-bk", "halftone-soft"] as const;

const PRIMARY_BTN =
  "inline-block border-[1.5px] border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-all bg-blue text-white [box-shadow:3px_3px_0_var(--color-ink)] hover:[box-shadow:4px_4px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:bg-blue-deep";

const SECONDARY_BTN =
  "inline-block border-[1.5px] border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-all bg-paper text-ink [box-shadow:3px_3px_0_var(--color-ink)] hover:[box-shadow:4px_4px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:bg-cream";

export function PshareEditor({ defaults }: { defaults: Defaults }) {
  const d = defaults;
  return (
    <Card>
      <CardTitle th="แก้ไขโพสต์" en={d.id ? "Edit post" : "New post"} />
      <form className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {d.id && <input type="hidden" name="id" value={d.id} />}

        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
            Slug (lowercase, hyphens)
          </span>
          <input
            name="slug"
            type="text"
            required
            pattern="[a-z0-9-]+"
            maxLength={80}
            defaultValue={d.slug ?? ""}
            className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-mono text-[13px] text-ink"
          />
        </label>

        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
            Num label (e.g. &quot;01&quot;)
          </span>
          <input
            name="num_label"
            type="text"
            maxLength={6}
            defaultValue={d.num_label ?? ""}
            className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-display italic text-[20px] text-ink"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
            Title
          </span>
          <input
            name="title"
            type="text"
            required
            maxLength={120}
            defaultValue={d.title ?? ""}
            className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[15px] text-ink"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
            Snippet
          </span>
          <input
            name="snippet"
            type="text"
            maxLength={240}
            defaultValue={d.snippet ?? ""}
            className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
            Body (Markdown)
          </span>
          <textarea
            name="body_md"
            rows={12}
            defaultValue={d.body_md ?? ""}
            className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-mono text-[13px] text-ink"
          />
        </label>

        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
            Author alias
          </span>
          <input
            name="author_alias"
            type="text"
            maxLength={80}
            defaultValue={d.author_alias ?? ""}
            className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
          />
        </label>

        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
            Halftone variant
          </span>
          <select
            name="art_halftone"
            defaultValue={d.art_halftone ?? "halftone-bl"}
            className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-mono text-[13px] text-ink"
          >
            {HALFTONES.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
            Art background (CSS color, optional)
          </span>
          <input
            name="art_bg"
            type="text"
            maxLength={40}
            placeholder="var(--color-cream)"
            defaultValue={d.art_bg ?? ""}
            className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-mono text-[13px] text-ink"
          />
        </label>

        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
            Num color (CSS color, optional)
          </span>
          <input
            name="art_num_color"
            type="text"
            maxLength={40}
            placeholder="var(--color-ink)"
            defaultValue={d.art_num_color ?? ""}
            className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-mono text-[13px] text-ink"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
            Tags (comma-separated, e.g. &quot;#math-olympiad, #tmo&quot;)
          </span>
          <input
            name="tags"
            type="text"
            defaultValue={(d.tags ?? []).join(", ")}
            className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-mono text-[13px] text-ink"
          />
        </label>

        <div className="md:col-span-2 flex gap-2">
          <button type="submit" formAction={saveDraft} className={SECONDARY_BTN}>
            Save draft
          </button>
          <button type="submit" formAction={publishPost} className={PRIMARY_BTN}>
            Publish →
          </button>
        </div>
      </form>
    </Card>
  );
}
