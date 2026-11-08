/**
 * Which arc a scene plays (owner, Nov 8, 9:50 voice note: "they've gotta have
 * like a variance. So even though there's only 5 in corruption scenes right
 * now, you could get, I'm just making a number up, 30 different scenes within
 * there"). One kind of scene may have several arcs, its variants: the same
 * purpose played as a small gift, a large sum, a friend's favor, a second ask,
 * a desperate plea. Which one a scene plays is read from the records, the way
 * an address's kind is (address-kind.ts): each variant's score is what the
 * records give it, a sum of named reads each between 0 and 1 with its weight,
 * times one plus the asker's pull toward it (the mean of the personality facets
 * the variant lists). The highest score wins and a tie goes to the name first
 * in the alphabet. No roll picks it, and nothing flips at a threshold: a
 * bribe a little smaller than another is a little more of a gift.
 *
 * This is the one engine for every kind. A kind with no row in
 * `data/arc-variants.json` plays its purpose's single arc as before. The
 * variant's arc (state, replies, follow, again, endings) is a row of the same
 * data; the words are the scene bank's, by the variant's own purpose id, and
 * the family's pieces serve where a variant has none of its own
 * (`SceneMove.family`). It holds no sentence and no kind's name: what a read
 * looks at is data, and the reads are four ways of looking.
 *
 * The reads use only what stays true while the scene is open (the record the
 * cause names, the tie as that record kept it, what happened before the
 * cause's day), so the tree the player sees is the tree their reply is
 * matched against.
 */
import { P, parameter } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { directorStopgap, WORDS_STOPGAP_HITS } from "./stopgaps";
import variantFile from "./data/arc-variants.json" with { type: "json" };

interface Tagged {
  value: number;
}

/** One way of looking at the records, by its kind. */
type ReadSpec =
  | {
      /** A number kept on a module's record, named by a fact of the cause record. */
      kind: "record";
      module: string;
      table: string;
      /** The cause record's fact that names the row. */
      idFact: string;
      /** The field, as a path through the row. */
      field: string;
      /** A share of the asked person's year of living costs, or their household's if larger: field / (field + their year). */
      against?: "asked-year";
      /** A share of this much: field / (field + scale). Without either, the field itself between 0 and 1. */
      scale?: Tagged;
    }
  | {
      /** How many earlier records of these kinds name both people, as count / (count + scale). */
      kind: "history";
      events: readonly string[];
      /** A record sharing this fact's value with the cause is the same matter, not an earlier one. */
      exceptSameFact: string;
      scale: Tagged;
    }
  | {
      /**
       * How hard pressed the asker is for money: a year of their living costs
       * against that year plus the cash they hold (the corruption engine's own
       * shape for an official's money pressure), 1 with nothing put by.
       */
      kind: "strain";
    }
  | {
      /** 1 where the scene is set at this kind of place, else 0. */
      kind: "setting";
      is: string;
    };

interface Term {
  read: string;
  weight: number;
  /** Use one minus the read: a small bribe is a bribe that is not large. */
  low?: boolean;
}

interface VariantRow {
  /** The purpose id the scene plays: the family's own for the plain variant. */
  purpose: string;
  base: number;
  terms?: readonly Term[];
  pull?: readonly string[];
  /** The variant's arc; absent for the family's own purpose, whose arc is in purpose-arcs.json. */
  arc?: unknown;
}

interface VariantData {
  reads: Readonly<Record<string, ReadSpec>>;
  families: Readonly<
    Record<string, { variants: Readonly<Record<string, VariantRow>> }>
  >;
}

const DATA = variantFile as unknown as VariantData;

/** Every variant's arc by its purpose id. */
const ARCS = new Map<string, unknown>(
  Object.values(DATA.families).flatMap((family) =>
    Object.values(family.variants).flatMap((row) =>
      row.arc ? [[row.purpose, row.arc] as const] : [],
    ),
  ),
);

/** The arc a variant purpose plays, or undefined for a purpose that is not a variant. */
export function variantArc(purpose: string): unknown {
  return ARCS.get(purpose);
}

/** What the scene is, as the choice reads it. */
export interface VariantInput {
  /** The type's own purpose: the family. */
  readonly family: string;
  readonly askerId: PersonId;
  readonly askedId: PersonId;
  /** The record that fired the scene. */
  readonly cause: {
    readonly id: string;
    readonly date: string;
    readonly facts: Readonly<Record<string, string>>;
  };
  /** The kind of place it is set at (the binding's setting). */
  readonly setting?: string;
}

export interface VariantScore {
  readonly variant: string;
  readonly purpose: string;
  readonly score: number;
}

export interface VariantChoice {
  /** The variant's name within its family. */
  readonly variant: string;
  /** The purpose id the scene plays. */
  readonly purpose: string;
  readonly family: string;
  /** Every variant's score, highest first. */
  readonly scores: readonly VariantScore[];
  /** Every read that mattered, between 0 and 1. */
  readonly reads: Readonly<Record<string, number>>;
  /** The records the reads came from. */
  readonly recordIds: readonly string[];
}

const clamp = (value: number) => Math.max(P.zero, Math.min(P.one, value));

/** A field of a row, by path ("reasons.offer.stake"); undefined when it is not a number. */
function fieldOf(row: unknown, path: string): number | undefined {
  let at: unknown = row;
  for (const step of path.split(".")) {
    if (typeof at !== "object" || at === null) return undefined;
    at = (at as Record<string, unknown>)[step];
  }
  return typeof at === "number" && Number.isFinite(at) ? at : undefined;
}

/** The mean of the asker's values on the facets a variant lists, between -1 and 1. */
function pullOf(
  core: Readonly<CoreState>,
  askerId: PersonId,
  facets: readonly string[],
): number {
  const traits = core.people.get(askerId)?.traits ?? {};
  if (!facets.length) return P.zero;
  const sum = facets.reduce(
    (total, key) => total + (traits[key] ?? P.zero),
    P.zero,
  );
  return Math.max(-P.one, Math.min(P.one, sum / facets.length));
}

/**
 * A person's year of living costs, or their household's if that is larger: a
 * person still in their parents' household has costs only there.
 */
function yearOf(core: Readonly<CoreState>, personId: PersonId): number {
  const person = core.people.get(personId);
  if (!person) return P.zero;
  const household = core.households.get(person.householdId);
  const daily = (household?.memberIds ?? []).reduce(
    (total, id) =>
      total + (core.people.get(id)?.livingCostDailyMinor ?? P.zero),
    P.zero,
  );
  return (
    Math.max(person.livingCostDailyMinor, daily) *
    parameter("daysPerMeanYear", core.data.parameters)
  );
}

/**
 * One read, between 0 and 1, with the record ids it came from. A record the
 * records do not hold reads as nothing (0), never as a guess.
 */
function readOf(
  core: Readonly<CoreState>,
  spec: ReadSpec,
  input: VariantInput,
  recordIds: Set<string>,
): number {
  if (spec.kind === "setting")
    return input.setting === spec.is ? P.one : P.zero;
  if (spec.kind === "strain") {
    // The corruption engine's own shape for money pressure, over a year.
    const asker = core.people.get(input.askerId);
    if (!asker) return P.zero;
    const year =
      asker.livingCostDailyMinor *
      parameter("daysPerMeanYear", core.data.parameters);
    return clamp(year / (year + asker.liquidMinor + P.one));
  }
  if (spec.kind === "history") {
    const own = input.cause.facts[spec.exceptSameFact];
    let count = P.zero;
    for (const kind of spec.events)
      for (const id of core.logByKind.get(kind) ?? []) {
        const event = core.durableLog.get(id);
        if (!event || event.id === input.cause.id) continue;
        if (event.date >= input.cause.date) continue;
        if (own !== undefined && event.facts?.[spec.exceptSameFact] === own)
          continue;
        const named = [...event.personIds, ...(event.witnessIds ?? [])];
        if (!named.includes(input.askerId) || !named.includes(input.askedId))
          continue;
        count += P.one;
        recordIds.add(event.id);
      }
    return count / (count + spec.scale.value);
  }
  // A number on a module's record, named by the cause.
  const rowId = input.cause.facts[spec.idFact];
  if (!rowId || !core.modules.has(spec.module)) return P.zero;
  const row = coreAPI(core as CoreState)
    .moduleState(spec.module)
    .table(spec.table)
    .get(rowId);
  const value = row ? fieldOf(row, spec.field) : undefined;
  if (value === undefined) return P.zero;
  recordIds.add(rowId);
  if (spec.against) {
    const year = yearOf(core, input.askedId);
    return clamp(value / (value + year + P.one));
  }
  if (spec.scale) return clamp(value / (value + spec.scale.value));
  return clamp(value);
}

/**
 * Which variant of the scene's purpose the records give, or null when the
 * purpose has none (it plays its one arc).
 */
export function chooseVariant(
  core: Readonly<CoreState>,
  input: VariantInput,
): VariantChoice | null {
  const family = DATA.families[input.family];
  if (!family) return null;
  // A cause plays one variant for as long as its scene is open: the asker's
  // cash moves day to day, and a tree that changed under the player's reply
  // would match it to the wrong line. The first choice stands.
  let kept = CHOSEN.get(core);
  if (!kept) CHOSEN.set(core, (kept = new Map()));
  const memo = `${input.family}|${input.cause.id}`;
  const chosen = kept.get(memo);
  if (chosen) return chosen;
  directorStopgap("SG-STORY-arc-variant-weights", WORDS_STOPGAP_HITS);
  const recordIds = new Set<string>();
  const reads: Record<string, number> = {};
  const read = (name: string) =>
    (reads[name] ??= readOf(core, DATA.reads[name]!, input, recordIds));
  const scores: VariantScore[] = Object.entries(family.variants)
    .map(([variant, row]) => {
      const world = (row.terms ?? []).reduce((total, term) => {
        const value = read(term.read);
        return total + term.weight * (term.low ? P.one - value : value);
      }, row.base);
      return {
        variant,
        purpose: row.purpose,
        score:
          Math.max(P.zero, world) *
          (P.one + pullOf(core, input.askerId, row.pull ?? [])),
      };
    })
    .sort((a, b) => b.score - a.score || a.variant.localeCompare(b.variant));
  const best = scores[P.zero]!;
  const choice: VariantChoice = {
    variant: best.variant,
    purpose: best.purpose,
    family: input.family,
    scores,
    reads,
    recordIds: [...recordIds].sort(),
  };
  kept.set(memo, choice);
  return choice;
}

/** The variant each cause has played, per world: the first choice stands. */
const CHOSEN = new WeakMap<object, Map<string, VariantChoice>>();
