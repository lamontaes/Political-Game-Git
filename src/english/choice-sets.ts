/**
 * Reads the whole set of replies one spot offers together, not one line, for
 * the rule `four-replies-are-four-answers` (data/english/line-rules.json):
 * a spot offers four replies of four different meaning groups
 * (src/director/data/reply-meanings.json), never two of one group.
 *
 * Pure: the spots come in (`scripts/words/choice-sets.ts` builds them from the
 * director's own composers), the flags come out, each with the meaning groups
 * its spot is missing. A flag names a spot, never a line: a short set needs
 * another reply, not one fewer.
 */

/** One reply a spot offers: the move it makes, what that move does, the pieces that word it. */
export interface ChoiceReply {
  readonly move: string;
  readonly group: string;
  readonly pieces: readonly string[];
  readonly text: string;
}

/** The replies a spot can offer together. */
export interface ChoiceSpot {
  readonly id: string;
  readonly replies: readonly ChoiceReply[];
  /**
   * The meaning groups of every move this spot allows, offered or not (a
   * scene's moves after this asker line, the lie aside). A group here that is
   * not offered is a move with no line written for this spot.
   */
  readonly allowed?: readonly string[];
}

export interface ChoiceFlag {
  readonly spot: string;
  readonly problems: readonly string[];
  readonly replies: readonly ChoiceReply[];
  /** How many more different answers the spot needs to offer four. */
  readonly needs: number;
  /**
   * The groups the spot is missing: first those its own moves allow but no
   * line is written for here, then the groups a new move fills a gap with
   * (`fill`), never one it offers already.
   */
  readonly missing: readonly string[];
}

export interface ChoicesReport {
  readonly spots: number;
  /** Spots that offer four replies of four groups. */
  readonly fourOfFour: number;
  readonly flagged: readonly ChoiceFlag[];
}

/**
 * Flags every spot whose set holds two replies of one meaning group, or fewer
 * groups than a turn offers replies (`wanted`: the director's
 * `directorChoicesPerTurn`, four), and names the groups it is missing (`fill`:
 * the groups a new move fills a gap with, reply-meanings.json). Deterministic:
 * the order of the spots decides nothing.
 */
export function choicesReport(
  spots: readonly ChoiceSpot[],
  wanted: number,
  fill: readonly string[] = [],
): ChoicesReport {
  const flagged: ChoiceFlag[] = [];
  for (const spot of [...spots].sort((a, b) => a.id.localeCompare(b.id))) {
    const groups = spot.replies.map((reply) => reply.group);
    const distinct = new Set(groups);
    const problems: string[] = [];
    if (distinct.size < groups.length)
      problems.push("two replies of one meaning group");
    if (distinct.size < wanted) problems.push("fewer than four meaning groups");
    if (!problems.length) continue;
    const missing = [
      ...new Set([...[...(spot.allowed ?? [])].sort(), ...fill]),
    ].filter((group) => !distinct.has(group));
    flagged.push({
      spot: spot.id,
      problems,
      replies: spot.replies,
      needs: Math.max(wanted - distinct.size, 0),
      missing,
    });
  }
  return {
    spots: spots.length,
    fourOfFour: spots.length - flagged.length,
    flagged,
  };
}
