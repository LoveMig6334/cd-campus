export function AdminSearch({
  placeholder = "🔍  ค้นหา · search…",
}: {
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      placeholder={placeholder}
      aria-label="Search · ค้นหา"
      className="border-line bg-paper focus:outline-blue w-[240px] border-[1.5px] px-3.5 py-2 font-sans text-[13px] focus:outline focus:outline-2 focus:-outline-offset-1"
    />
  );
}
