import Image from "next/image";
import { getAssetUrl } from "@/lib/storage";
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
  art_image_path?: string | null;
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
      <form
        className="grid grid-cols-1 gap-3 md:grid-cols-2"
        encType="multipart/form-data"
      >
        {d.id && <input type="hidden" name="id" value={d.id} />}

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Slug (lowercase, hyphens)
          </span>
          <input
            name="slug"
            type="text"
            required
            pattern="[a-z0-9-]+"
            maxLength={80}
            defaultValue={d.slug ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[13px]"
          />
        </label>

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Num label (e.g. &quot;01&quot;)
          </span>
          <input
            name="num_label"
            type="text"
            maxLength={6}
            defaultValue={d.num_label ?? ""}
            className="border-line bg-paper font-display text-ink mt-1 w-full border-[1.5px] px-3 py-2 text-[20px] italic"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Title
          </span>
          <input
            name="title"
            type="text"
            required
            maxLength={120}
            defaultValue={d.title ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[15px]"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Snippet
          </span>
          <input
            name="snippet"
            type="text"
            maxLength={240}
            defaultValue={d.snippet ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Body (Markdown)
          </span>
          <textarea
            name="body_md"
            rows={12}
            defaultValue={d.body_md ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[13px]"
          />
        </label>

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Author alias
          </span>
          <input
            name="author_alias"
            type="text"
            maxLength={80}
            defaultValue={d.author_alias ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
          />
        </label>

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Halftone variant
          </span>
          <select
            name="art_halftone"
            defaultValue={d.art_halftone ?? "halftone-bl"}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[13px]"
          >
            {HALFTONES.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Art background (CSS color, optional)
          </span>
          <input
            name="art_bg"
            type="text"
            maxLength={40}
            placeholder="var(--color-cream)"
            defaultValue={d.art_bg ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[13px]"
          />
        </label>

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Num color (CSS color, optional)
          </span>
          <input
            name="art_num_color"
            type="text"
            maxLength={40}
            placeholder="var(--color-ink)"
            defaultValue={d.art_num_color ?? ""}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[13px]"
          />
        </label>

        <div className="md:col-span-2">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Header image (optional, jpg/png/webp, ≤5 MB)
          </span>
          {d.art_image_path && (
            <div className="border-line bg-paper mt-1 aspect-[5/3] overflow-hidden border-[1.5px]">
              <Image
                src={getAssetUrl(d.art_image_path)}
                alt=""
                width={600}
                height={360}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13px]"
          />
          {d.art_image_path && (
            <p className="text-mute-500 mt-1 font-mono text-[10px]">
              Leave empty to keep current image.
            </p>
          )}
        </div>

        <label className="block md:col-span-2">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Tags (comma-separated, e.g. &quot;#math-olympiad, #tmo&quot;)
          </span>
          <input
            name="tags"
            type="text"
            defaultValue={(d.tags ?? []).join(", ")}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-mono text-[13px]"
          />
        </label>

        <div className="flex gap-2 md:col-span-2">
          <button
            type="submit"
            formAction={saveDraft}
            className={SECONDARY_BTN}
          >
            Save draft
          </button>
          <button
            type="submit"
            formAction={publishPost}
            className={PRIMARY_BTN}
          >
            Publish →
          </button>
        </div>
      </form>
    </Card>
  );
}
