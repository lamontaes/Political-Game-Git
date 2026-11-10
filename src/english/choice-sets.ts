/**
 * Reads the whole set of replies one spot offers together, not one line, for
 * the rule `four-replies-are-four-answers` (data/english/line-rules.json):
 * a spot offers four replies of four different meaning groups
 * (src/director/data/reply-meanings.json), never two of one group.
 *
 * Pure: the spots come in (`scripts/words/choice-sets.ts` builds them from the
 * director's own composers), the flags and the pieces to queue come out.
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
}

export interface ChoiceFlag {
  readonly spot: string;
  readonly problems: readonly string[];
  readonly replies: readonly ChoiceReply[];
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
 * `directorChoicesPerTurn`, four). Deterministic: the order of the spots
 * decides nothing.
 */
export function choicesReport(
  spots: readonly ChoiceSpot[],
  wanted: number,
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
    flagged.push({ spot: spot.id, problems, replies: spot.replies });
  }
  return {
    spots: spots.length,
    fourOfFour: spots.length - flagged.length,
    flagged,
  };
}
