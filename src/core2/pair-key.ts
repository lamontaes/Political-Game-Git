/**
 * The id of the tie between two people: their ids in order, joined by a colon.
 * It is the same key as sorting the two ids and joining them (strings compare
 * by UTF-16 code unit both ways) without building an array for every pair,
 * which a played year does for every known person of every person who acts.
 */
export function pairKey(a: string, b: string): string {
  return a <= b ? `${a}:${b}` : `${b}:${a}`;
}
