const POSTS = [
  ["Why masks are cyan, never red", "2026-09-01", "You stare at a mask for hours. Red reads as error; Plate Cyan reads as selection."],
  ["Resolutions, not multipliers", "2026-08-20", "Why UPLIFT targets 1080p / 2K / 4K instead of ×2 / ×4, and how the exact-fit Lanczos step works."],
  ["Non-destructive by law", "2026-08-05", "Originals are never written to. How the job row becomes the record that re-renders any result."],
];

export default function Blog() {
  return (
    <div className="container-grid py-14 max-w-2xl">
      <div className="label mb-3">Blog</div>
      <h1 className="h-display mb-8" style={{ fontSize: 32 }}>Notes from the workbench.</h1>
      <div className="divide-y divide-border">
        {POSTS.map(([title, date, sub]) => (
          <article key={title} className="py-5">
            <div className="num text-[11px] text-text-low">{date}</div>
            <h2 className="text-[18px] font-medium mt-1">{title}</h2>
            <p className="text-[13px] text-text-mid mt-1">{sub}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
