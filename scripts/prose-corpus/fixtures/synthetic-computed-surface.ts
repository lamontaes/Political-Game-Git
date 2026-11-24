/**
 * SYNTHETIC TEST DATA — NOT PRODUCTION PROSE.
 *
 * These sentences exist only to attack the computed-surface identity
 * algorithm. Nothing here is authored for a player, nothing here is reachable
 * in play, and the coverage scanner classifies this directory as a fixture.
 * The words are deliberately dull; they are chosen so that pairs of them share
 * a long common prefix, which is the property under test.
 */

/** Two sentences sharing their first eight words. */
export function recapSentence(which: number): string {
  if (which === 0) return "You meet with your old friend again after work.";
  return "You meet with your old friend again after school.";
}

/** The same literal twice at genuinely distinct branches. */
export function quietSentence(which: number): string {
  if (which === 0) return "Nothing much happened that week.";
  if (which === 1) return "Nothing much happened that week.";
  return "The week went by without anything to decide.";
}

/** Slot-bearing sentences that differ only past the eighth word. */
export function steadyState(which: number): string {
  if (which === 0)
    return "{self} kept the same routine all through the spring.";
  return "{self} kept the same routine all through the winter.";
}
