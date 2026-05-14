export default function StudentLoading() {
  return (
    <div className="animate-pulse px-4 pt-6">
      <div className="bg-mute-200 mb-4 h-6 w-40" />
      <div className="space-y-3">
        <div className="border-line bg-paper h-32 border-[1.5px]" />
        <div className="border-line bg-paper h-24 border-[1.5px]" />
        <div className="border-line bg-paper h-24 border-[1.5px]" />
      </div>
    </div>
  );
}
