import type { Category } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/constants";

export function CategoryChip({ category }: { category: Category }) {
  const meta = CATEGORY_MAP[category];
  return (
    <span
      className="chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={
        {
          backgroundColor: meta.bg,
          color: meta.ink,
          "--chip-color": meta.color,
        } as React.CSSProperties
      }
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: meta.color }}
        aria-hidden="true"
      />
      {meta.label}
    </span>
  );
}
