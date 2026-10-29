/**
 * The narrator's lines for election day and election night: the morning, the
 * canvass, the choice to vote, the returns as each place reports, and the
 * call. Each moment is worded by the one word maker every scene uses
 * (`wordSceneMove`), from the election-night pieces of the scene bank, with
 * the contest's record facts in their slots; a piece whose facts the moment
 * lacks is left out, and a moment no piece fits says nothing.
 */
import { P } from "../core2/parameters";
import { wordSceneMove, type Fact } from "../english/scene-talk-words";

export type DayFact = Fact;

const NARRATOR = "narrator:election-day";
const zero = P.zero;
const one = P.one;

/**
 * One narrator's line for a moment of election day or night (`move`), from
 * the facts the moment holds, or null when no piece fits them.
 */
export function electionDayLine(
  move: string,
  facts: Readonly<Record<string, DayFact>>,
  moment: {
    readonly key: string;
    readonly worldSeed: string;
    /** The records the moment stands on (the contest, the filing): every fact cites them. */
    readonly recordIds: readonly string[];
  },
): { text: string; sourceRecordIds: string[] } | null {
  const cited = Object.fromEntries(
    Object.entries(facts).map(([name, fact]) => [
      name,
      {
        text: fact.text,
        sourceRecordIds: [
          ...new Set([...fact.sourceRecordIds, ...moment.recordIds]),
        ],
      },
    ]),
  );
  // Election day and night are told on the election's own day (the bench
  // calls these on it), so "today" and "tonight" are true.
  cited["same-day"] = { text: "yes", sourceRecordIds: [...moment.recordIds] };
  const worded = wordSceneMove({
    move: {
      step: "narrate",
      move,
      role: "narrator",
      purpose: "election-night",
      key: "election-day",
    },
    facts: cited,
    seed: moment.worldSeed,
    speakerId: NARRATOR,
    traits: {},
    momentKey: `election-day:${moment.key}:${move}`,
    said: new Set(),
  });
  if (!worded || !("text" in worded)) return null;
  return {
    text: worded.text.charAt(zero).toUpperCase() + worded.text.slice(one),
    sourceRecordIds: [
      ...new Set([
        ...moment.recordIds,
        ...Object.values(facts).flatMap((fact) => fact.sourceRecordIds),
        ...worded.slotRecordIds,
      ]),
    ],
  };
}
