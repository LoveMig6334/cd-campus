import { BadmintonScreen } from "@/components/scoreboard/BadmintonScreen";

export const metadata = {
  title: "Badminton Courts · CD Sports Day",
};

export default async function BadmintonBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ court?: string }>;
}) {
  const { court } = await searchParams;
  return (
    <BadmintonScreen court={court === "1" ? 1 : court === "2" ? 2 : null} />
  );
}
