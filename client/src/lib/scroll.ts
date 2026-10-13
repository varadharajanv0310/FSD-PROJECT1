/**
 * Scroll positions across navigations. New pages start at the top, and Back or
 * Forward return to where the reader was. Inside the app shell the outgoing
 * page fades out first, so its scroll is applied once the next page mounts —
 * scrolling earlier would make the outgoing page jump.
 */
const positions = new Map<string, number>();
let lastScrollY = 0;
let deferred: number | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("scroll", () => (lastScrollY = window.scrollY), { passive: true });
}

/** Records where the reader was on the history entry they're leaving. */
export function rememberScroll(key: string): void {
  positions.set(key, lastScrollY);
}

export function savedScroll(key: string): number {
  return positions.get(key) ?? 0;
}

export function scrollToNow(top: number): void {
  window.scrollTo({ top, behavior: "instant" });
}

/** Holds a scroll until the next app page has mounted. */
export function deferScroll(top: number): void {
  deferred = top;
}

export function applyDeferredScroll(): void {
  if (deferred === null) return;
  scrollToNow(deferred);
  deferred = null;
}
