import { MobileBody } from "@/components/layout/MobileBody";
import { PageHead } from "@/components/layout/PageHead";
import { StubCard } from "@/components/layout/StubCard";

export default function StudentPshare() {
  return (
    <>
      <PageHead titleTh="พี่แชร์" titleEn="P'share · พี่แชร์ น้องชัวร์" />
      <MobileBody>
        <StubCard titleEn="P'share" titleTh="พี่แชร์ น้องชัวร์" />
      </MobileBody>
    </>
  );
}
