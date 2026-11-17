/**
 * The card's own gates and weights (docs/design/director-board.md, section 2):
 * a situation type's row, or a scene from circumstance's row, may name
 * yes-or-no facts it `requires` and `excludes`, and `weights` that move its
 * score. Facts gate; amounts weight (rule 152). A no is a record (section 3):
 * the `ended:` facts are read from the ledger's reply index, and the board's
 * default exclusion is the person told no twice by the same asker about the
 * same scene (director-two-noes-no-third-ask). The weights are read with the
 * arc-variant grammar (`readNamed`, `pullOf`), so scoring is in one place.
 * Nothing is rolled.
 */
import { daysBetweenText } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import { pullOf, readNamed, type Term } from "./arc-variant";
import { stakeOf } from "./family-stake";
import { passedBetween } from "./relation-facts";
import type { SituationLibrary } from "./scheduling";
import type { Ledger } from "./types";

const { zero, one } = P;

/** A card's own gates and weights, on its situation-type row or its circumstance row. */
export interface CardFields {
  /** Yes-or-no facts that must all hold (`ended:`, `stake:`). */
  requires?: readonly string[];
  /** Yes-or-no facts none of which may hold. */
  excludes?: readonly string[];
  /** Terms in the arc-variant grammar: the score is multiplied by one plus their sum. */
  weights?: readonly Term[];
  /** Trait facets of the one who comes, averaged: the score is multiplied by one plus it. */
  pull?: readonly string[];
}

/** The card's cut, when one of its own gates fails. */
export type CardCut = "requires" | "excludes" | "asked-twice";

/** What a card's facts are read against. */
export interface CardContext {
  core: Readonly<CoreState>;
  /** The ledger's reply index (relation-facts.ts indexReply). */
  replies: Ledger["repliesByPlayer"];
  /** The person the scene comes to. */
  personId: PersonId;
  /** The one who comes, asks or calls, where the card has one. */
  castId?: PersonId;
  /** The cause record. */
  causeId: string;
  /** The card's situation type. */
  typeKey: string;
  /** The family the reads are named for (the type's purpose). */
  family: string;
}

/**
 * Whether a fact is one a card may name: `ended:<typeKey>:<ending>` (with
 * `:any` for any counterpart), `refused:<typeKey>` (with `:any`: the person
 * said no in such a scene), or `stake:<any|money|time|worked|gave>`.
 */
export function knownFact(fact: string): boolean {
  const [family, first, second, scope, ...more] = fact.split(":");
  if (more.length) return false;
  if (family === "ended")
    return !!first && !!second && (scope === undefined || scope === "any");
  if (family === "refused")
    return !!first && (second === undefined || second === "any") && !scope;
  if (family === "stake")
    return (
      !!first &&
      second === undefined &&
      ["any", "money", "time", "worked", "gave"].includes(first)
    );
  return false;
}

/**
 * Whether a scene of this type ended this way between the person and the one
 * who comes (or anyone, with `:any`), within the library's `endedDays`, by
 * the `scene.reply` records in the ledger's reply index.
 */
function ended(
  ctx: CardContext,
  library: SituationLibrary,
  typeKey: string,
  ending: string,
  anyone: boolean,
): boolean {
  const byOther = ctx.replies.get(ctx.personId);
  if (!byOther) return false;
  const others = anyone
    ? [...byOther.values()]
    : ctx.castId
      ? [byOther.get(ctx.castId) ?? []]
      : [];
  const days = library.scheduling.endedDays?.value ?? zero;
  for (const ids of others)
    for (const id of ids) {
      const event = ctx.core.durableLog.get(id);
      if (!event || event.date >= ctx.core.date) continue;
      if (daysBetweenText(event.date, ctx.core.date) > days) continue;
      if (event.facts?.typeKey === typeKey && event.facts?.ending === ending)
        return true;
    }
  return false;
}

/**
 * Whether the person said no in a scene of this type to the one who comes (or
 * to anyone, with `:any`) within the library's `endedDays`: a reply whose move
 * is a refusal (relation-facts.ts `passedBetween`), whichever ending the scene
 * reached, or none where the other spoke again after it.
 */
function refused(
  ctx: CardContext,
  library: SituationLibrary,
  typeKey: string,
  anyone: boolean,
): boolean {
  const others = anyone
    ? [...(ctx.replies.get(ctx.personId)?.keys() ?? [])]
    : ctx.castId
      ? [ctx.castId]
      : [];
  const days = library.scheduling.endedDays?.value ?? zero;
  return others.some((otherId) =>
    passedBetween(
      { repliesByPlayer: ctx.replies },
      ctx.core,
      otherId,
      ctx.personId,
    ).refusedBefore.some((id) => {
      const event = ctx.core.durableLog.get(id);
      return (
        event?.facts?.typeKey === typeKey &&
        daysBetweenText(event.date, ctx.core.date) <= days
      );
    }),
  );
}

/** Whether one fact holds for the card's person, cast and cause. */
export function factHolds(
  fact: string,
  ctx: CardContext,
  library: SituationLibrary,
): boolean {
  if (!knownFact(fact)) throw new Error(`Unknown card fact: ${fact}`);
  const [family, first, second, scope] = fact.split(":") as [
    "ended" | "refused" | "stake",
    string,
    string?,
    string?,
  ];
  if (family === "ended")
    return ended(ctx, library, first, second!, scope === "any");
  if (family === "refused")
    return refused(ctx, library, first, second === "any");
  // The household's books or calendar give the one at home something to say
  // (family-stake.ts: the money against the race, a young child while the
  // person works, a race they worked or paid for).
  if (!ctx.castId) return false;
  const stake = stakeOf(ctx.core, ctx.personId, ctx.causeId, ctx.castId);
  return !!stake && (first === "any" || stake.kind === first);
}

/**
 * The card's first failed gate of its own: a fact it requires that does not
 * hold, a fact it excludes that holds, or the person told the one who comes
 * no about this scene as often as the library's `noesBeforeExcluded` (the
 * board's default exclusion: a third ask after two noes is not staged).
 */
export function cardCut(
  card: CardFields,
  ctx: CardContext,
  library: SituationLibrary,
): CardCut | undefined {
  if (card.requires?.some((fact) => !factHolds(fact, ctx, library)))
    return "requires";
  if (card.excludes?.some((fact) => factHolds(fact, ctx, library)))
    return "excludes";
  const noes = library.scheduling.noesBeforeExcluded?.value;
  if (noes && ctx.castId) {
    const refused = passedBetween(
      { repliesByPlayer: ctx.replies },
      ctx.core,
      ctx.castId,
      ctx.personId,
    ).refusedBefore.filter(
      (id) => ctx.core.durableLog.get(id)?.facts?.typeKey === ctx.typeKey,
    );
    if (refused.length >= noes) return "asked-twice";
  }
  return undefined;
}

/** What a card's weights read: the factor on its score, each read, and the records they came from. */
export interface CardWeight {
  factor: number;
  reads: Record<string, number>;
  recordIds: string[];
}

/**
 * The card's weights, read with the arc-variant grammar: one plus the sum of
 * each term's weight times its read (never below nothing), times one plus the
 * pull of the one who comes. A card with none weighs one.
 */
export function cardWeight(card: CardFields, ctx: CardContext): CardWeight {
  if (!card.weights?.length && !card.pull?.length)
    return { factor: one, reads: {}, recordIds: [] };
  const recordIds = new Set<string>();
  const reads: Record<string, number> = {};
  const cause = ctx.core.durableLog.get(ctx.causeId);
  const input = {
    family: ctx.family,
    askerId: ctx.castId ?? ctx.personId,
    askedId: ctx.personId,
    cause: {
      id: ctx.causeId,
      date: cause?.date ?? ctx.core.date,
      facts: (cause?.facts ?? {}) as Readonly<Record<string, string>>,
    },
  };
  const sum = (card.weights ?? []).reduce((total, term) => {
    const value = (reads[term.read] ??= readNamed(
      ctx.core,
      term.read,
      input,
      recordIds,
    ));
    return total + term.weight * (term.low ? one - value : value);
  }, zero);
  const pull = ctx.castId
    ? pullOf(ctx.core, ctx.castId, card.pull ?? [])
    : zero;
  return {
    factor: Math.max(zero, one + sum) * (one + pull),
    reads,
    recordIds: [...recordIds],
  };
}
