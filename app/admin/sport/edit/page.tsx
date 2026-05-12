import Link from "next/link";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { getScoreboard } from "@/lib/queries/houses";
import { editScoreboard } from "../actions";

const HOUSE_ID_BY_KEY = { green: 1, purple: 2, orange: 3, pink: 4 } as const;

export default async function EditScoreboardPage() {
  const scoreboard = await getScoreboard();
  return (
    <>
      <AdminTopbar
        titleTh="แก้ไขคะแนน"
        eyebrow="Edit scoreboard"
        actions={
          <Link
            href="/admin/sport"
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            ← Back
          </Link>
        }
      />
      <Card>
        <CardTitle th="คะแนนบ้าน" en="House scores" />
        <form
          action={editScoreboard}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          {scoreboard.map((entry) => {
            const id = HOUSE_ID_BY_KEY[entry.house];
            return (
              <label key={entry.house} className="block">
                <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
                  {entry.nameEn} · {entry.nameTh}
                </span>
                <input
                  name={`score_${id}`}
                  type="number"
                  min={0}
                  step={1}
                  required
                  defaultValue={entry.score}
                  className="border-line bg-paper font-display text-ink mt-1 w-full border-[1.5px] px-3 py-2 text-[24px] italic"
                />
              </label>
            );
          })}
          <div className="md:col-span-2">
            <Btn variant="primary">Save scores →</Btn>
          </div>
        </form>
      </Card>
    </>
  );
}
