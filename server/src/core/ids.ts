/** A short random id for questions; works in Node 19+ and every modern browser. */
export function shortId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10).padEnd(8, "0");
}
