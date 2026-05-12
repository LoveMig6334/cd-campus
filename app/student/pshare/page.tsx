import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { Blurb } from "@/components/student/Blurb";
import { PshareCard } from "@/components/student/PshareCard";
import { TagChipRow } from "@/components/student/TagChipRow";
import { IconButton } from "@/components/ui/IconButton";
import { getStudentPshareFeed } from "@/lib/queries/pshare";
import { PSHARE_ACTIVE_TAG, PSHARE_TAGS } from "@/lib/ui/pshare";

export default async function StudentPshare() {
  const posts = await getStudentPshareFeed();
  return (
    <>
      <PageHead
        titleTh="พี่แชร์ น้องชัวร์"
        titleEn="P'share N'sure"
        action={
          <IconButton label="Search · ค้นหา">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
          </IconButton>
        }
      />
      <MobileBody className="space-y-3.5">
        <Blurb accent="yellow">
          ★ พี่ ม.ปลาย เขียนแชร์ความรู้ให้น้อง — โอลิมปิก, โครงงาน, การบ้าน,
          life tips
        </Blurb>

        <TagChipRow tags={PSHARE_TAGS} activeTag={PSHARE_ACTIVE_TAG} />

        <div className="grid grid-cols-1 gap-3">
          {posts.map((post) => (
            <PshareCard key={post.slug} post={post} />
          ))}
        </div>
      </MobileBody>
    </>
  );
}
