/**
 * The replies in a scene that answer an ask or an invitation: the ones that say yes and the one that
 * says no. Every engine that reads the player's reply to an ask reads these (press, campaigns,
 * parties), so a scene's moves mean the same thing wherever the ask came from.
 */
/** The replies in an invitation's scene that accept it. */
export const ACCEPTING_MOVES: ReadonlySet<string> = new Set([
  "agree",
  "relent",
]);
/** The replies in an invitation's scene that turn it down. */
export const REFUSING_MOVES: ReadonlySet<string> = new Set(["decline"]);
