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
import { P } from "../core2/parameters";
import { familyRelation } from "../core2/closeness";
import type { CoreState, PersonId, PersonState } from "../core2/types";
import type { GroundedEnglishFact } from "../english/grounded-english";
import type { TellingInput } from "../english/outline-planner";

/** The row's moves, by the Journal row (`kindPrefix`) whose moment opens the chapter. */
const MOVES: Readonly<Record<string, string>> = {
  "person.birth": "born",
  moved: "moved",
};

/**
 * A person's place among their brothers and sisters on the record: `only-child`
 * where nobody is their sibling, `first-born` where every sibling is younger,
 * else `older-sibling` (the nearest older one's given name). Each cites the
 * sibling records it rests on.
 */
function birthOrder(
  core: Readonly<CoreState>,
  me: PersonState,
): Record<string, GroundedEnglishFact> {
  const siblings = [
    ...new Set([
      ...(core.households.get(me.householdId)?.memberIds ?? []),
      ...(me.familyIds ?? []),
    ]),
  ]
    .filter((id) => familyRelation(core, me.id, id) === "sibling")
    .map((id) => core.people.get(id))
    .filter((person): person is PersonState => !!person);
  const self = [me.id as EntityId];
  if (!siblings.length)
    return { "only-child": { text: "yes", sourceRecordIds: self } };
  const older = siblings
    .filter((person) => person.birthDate < me.birthDate)
    .sort(
      (a, b) =>
        b.birthDate.localeCompare(a.birthDate) || a.id.localeCompare(b.id),
    );
  const nearest = older[P.zero];
  return nearest
    ? {
        "older-sibling": {
          text: nearest.givenName,
          sourceRecordIds: [nearest.id as EntityId],
        },
      }
    : {
        "first-born": {
          text: "yes",
          sourceRecordIds: siblings.map((person) => person.id as EntityId),
        },
      };
}

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
  moment: { readonly causeId: string; readonly date: string },
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
  // The year the moment happened, from its own record (W3, Nov 24: a birth
  // opener had only its place to say).
  told["moment-year"] = {
    text: moment.date.slice(P.zero, moment.date.indexOf("-")),
    sourceRecordIds: ids,
  };
  // Where the person came in the family, from who holds them as a sibling
  // (W3, Nov 24: the birth record gave the chapter little to say): an only
  // child, the first born, or born after a brother or sister, named.
  if (move === "born" && how.own) {
    Object.assign(told, birthOrder(core, me));
    // The day of the week and the month the person was born, from the birth
    // date on their record (W3, Nov 24: one more birth fact so a line need not
    // lean on the place).
    const born = new Date(`${me.birthDate}T00:00:00Z`);
    for (const [key, part] of [
      ["born-weekday", { weekday: "long" }],
      ["born-month", { month: "long" }],
    ] as const)
      told[key] = {
        text: born.toLocaleDateString("en-US", { ...part, timeZone: "UTC" }),
        sourceRecordIds: [me.id as EntityId],
      };
  }
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
