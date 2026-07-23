/**
 * Route-level loading UI for every authed page. Next shows this instantly while
 * the destination segment (its JS chunk / any server work) loads on navigation,
 * so switching tabs never looks frozen. The sidebar/header (in the layout) stay
 * put; only this content area is replaced. Each page then shows its own
 * data-loading state once mounted.
 */
export default function AppLoading() {
  return (
    <main
      className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-6 w-40 animate-pulse rounded-lg bg-hairline" />
      <div className="mt-2.5 h-4 w-64 animate-pulse rounded bg-hairline/70" />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-hairline/60" />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-hairline/50" />
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </main>
  );
}
