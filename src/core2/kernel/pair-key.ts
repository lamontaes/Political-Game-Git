/** One key for an unordered pair of ids: the smaller, a colon, the larger (what sorting the two and joining them gives). */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
