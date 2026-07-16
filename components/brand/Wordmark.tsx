interface WordmarkProps {
  /** Render the geometric badge mark. */
  showMark?: boolean;
  /** Render the "Daily Tracker" text. */
  showText?: boolean;
  /** on a dark (navy) background */
  onDark?: boolean;
  size?: "sm" | "md" | "lg";
}

const MARK_SIZE = { sm: 24, md: 30, lg: 42 };
const TEXT_SIZE = { sm: "text-base", md: "text-lg", lg: "text-2xl" };

/**
 * Daily Tracker logo: a navy rounded-square badge holding three ascending bars
 * (light-blue → blue → gold) — daily progress / streak — beside the wordmark.
 * "Daily" in the display face, "Tracker" in the body face. Do not recolour.
 */
export function Wordmark({
  showMark = true,
  showText = true,
  onDark = false,
  size = "md",
}: WordmarkProps) {
  const s = MARK_SIZE[size];
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      {showMark && (
        <svg
          width={s}
          height={s}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="dt-badge" x1="0" y1="0" x2="40" y2="40">
              <stop offset="0" stopColor="#164a78" />
              <stop offset="0.5" stopColor="#123E66" />
              <stop offset="1" stopColor="#0b2c4d" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#dt-badge)" />
          {/* ascending "daily progress" bars */}
          <rect x="10" y="21" width="5" height="8" rx="2" fill="#96C0E0" />
          <rect x="17.5" y="16" width="5" height="13" rx="2" fill="#2E7CC4" />
          <rect x="25" y="11" width="5" height="18" rx="2" fill="#FCBC36" />
        </svg>
      )}
      {showText && (
        <span className="inline-flex items-baseline gap-1.5">
          <span
            className={`font-display font-bold tracking-tight ${TEXT_SIZE[size]} ${
              onDark ? "text-white" : "text-navy"
            }`}
          >
            Daily
          </span>
          <span
            className={`font-sans font-medium ${TEXT_SIZE[size]} ${
              onDark ? "text-blue-light" : "text-muted"
            }`}
          >
            Tracker
          </span>
        </span>
      )}
    </span>
  );
}
