/**
 * The sentence that opens a Journal chapter, told by the one outline planner
 * (row `journal-chapter-open`, data/english/outlines.json; the Story lead's
 * brief, Nov 24, 2026). On a new life's first page two moments open a
 * chapter: the birth (the first chapter) and the player's own move (the
 * next). Measured over 5 drawn worlds on Nov 24, nothing else opened one by
 * day one; school, coming of age and every sentence inside a chapter stay
 * with the Journal's row composer (`composeJournal`, journal.ts), as do
 * chapter titles.
 *
 * Pure: reads the moment and the facts composeJournal already found for it,
 * and returns the planner's input. The distinctions the row composer told
 * the line by (whose moment it is, a move the household made together, a
 * moment from before voting age, another person known by name) go in as
 * facts the bank's pieces require or exclude, each citing the moment's own
 * record.
 */
import type { EntityId } from "../core2/kernel/brands";
import type { CoreState, PersonId } from "../core2/types";
import type { GroundedEnglishFact } from "../english/grounded-english";
import type { TellingInput } from "../english/outline-planner";

/** The row's moves, by the Journal row (`kindPrefix`) whose moment opens the chapter. */
const MOVES: Readonly<Record<string, string>> = {
  "person.birth": "born",
  moved: "moved",
};

/** How the row composer would word the moment, as composeJournal decides it. */
export interface ChapterOpenHow {
  /** The person's own moment, not someone else's. */
  readonly own: boolean;
  /** A move the household made together ("we"). */
  readonly together: boolean;
  /** The person was under voting age on the day. */
  readonly young: boolean;
  /** Another person in the moment is known by name or relation. */
  readonly named: boolean;
}

/**
 * The planner's input for the sentence that opens a chapter, or null when
 * the moment is not one the row tells (it stays with the row composer).
 * `momentKey` is the key composeJournal words the line under, so a beat's
 * second wording draws again.
 */
export function chapterOpenTelling(
  core: Readonly<CoreState>,
  personId: PersonId,
  moment: { readonly causeId: string },
  row: { readonly kindPrefix: string },
  facts: Readonly<
    Record<
      string,
      { readonly text: string; readonly sourceRecordIds: readonly string[] }
    >
  >,
  how: ChapterOpenHow,
  momentKey: string,
): TellingInput | null {
  const move = MOVES[row.kindPrefix];
  if (!move) return null;
  const me = core.people.get(personId);
  if (!me) return null;
  const ids = [moment.causeId as EntityId];
  const gate = (): GroundedEnglishFact => ({
    text: "yes",
    sourceRecordIds: ids,
  });
  const told: Record<string, GroundedEnglishFact> = {};
  for (const [key, fact] of Object.entries(facts))
    told[key] = {
      text: fact.text,
      sourceRecordIds: fact.sourceRecordIds as EntityId[],
    };
  told[`chapter-${move}`] = gate();
  told[how.own ? "own-moment" : "other-moment"] = gate();
  if (how.together) told["household-together"] = gate();
  if (how.young) told["young-then"] = gate();
  if (how.named) told["other-named"] = gate();
  return {
    kind: "journal-chapter-open",
    facts: told,
    momentKey: `journal-chapter:${momentKey}`,
    worldSeed: core.seed,
    sourceRecordIds: ids,
    knower: personId as EntityId,
    traits: me.traits,
  };
}
