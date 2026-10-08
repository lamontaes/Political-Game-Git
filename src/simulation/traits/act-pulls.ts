import actKindsData from "../../../data/content/act-kinds.json" with { type: "json" };
import optionActsData from "../../../data/content/decision-option-acts.json" with { type: "json" };
import pullsData from "../../../data/content/trait-act-pulls.json" with { type: "json" };
import { latestPersonalityTendenciesForPerson } from "../queries";
import {
  traitDefinitionFromPack,
  type RegisteredTrait,
  type TraitRegistry,
} from "../trait-packs";
import { importanceOf, traitReadingOfRecord } from "../trait-readings";
import type {
  DecisionConsideration,
  DecisionOption,
  EntityId,
  HistoricalCutoff,
  PersonalityTendencyRecord,
  World,
} from "../types";

/**
 * The general trait system: what KIND of act each option is, and which kinds of
 * act each trait pole pulls toward or away from.
 *
 * Three data files hold everything this module knows (`data/content/`):
 * `act-kinds.json` is the closed list of kinds, `decision-option-acts.json`
 * labels the options of each decision with kinds, and `trait-act-pulls.json`
 * says what each pole of each trait pulls toward and away from. A new decision
 * needs only its options labeled; a new trait needs only one row; neither needs
 * a new `.ts` file.
 *
 * The contract is the one every trait reading already has. A reason is
 * additive and cites the record it rests on; a person with no record of a
 * trait gets nothing for it, never a default; nothing is rolled. A trait does
 * not decide, it puts a reason on the table and the scorer picks.
 */

type Pole = "high" | "low";

interface PoleActs {
  readonly toward: ReadonlySet<string>;
  readonly away: ReadonlySet<string>;
}

/** Trait id to the pulls of each pole, in trait-id order. Loaded once. */
const PULLS: ReadonlyMap<string, Partial<Record<Pole, PoleActs>>> = new Map(
  Object.entries(pullsData.pulls)
    .sort(([left], [right]) => compareIds(left, right))
    .map(([traitId, poles]) => {
      const entry: Partial<Record<Pole, PoleActs>> = {};
      for (const pole of ["high", "low"] as const) {
        const row = (
          poles as Partial<
            Record<Pole, { toward: readonly string[]; away: readonly string[] }>
          >
        )[pole];
        if (row) {
          entry[pole] = {
            toward: new Set(row.toward),
            away: new Set(row.away),
          };
        }
      }
      return [traitId, entry] as const;
    }),
);

/** Decision type to option key to the act kinds of that option. Loaded once. */
const OPTION_ACTS: ReadonlyMap<
  string,
  ReadonlyMap<string, ReadonlySet<string>>
> = new Map(
  Object.entries(optionActsData.decisions).map(([decisionType, options]) => [
    decisionType,
    new Map(
      Object.entries(options as Record<string, readonly string[]>).map(
        ([optionKey, kinds]) => [optionKey, new Set(kinds)] as const,
      ),
    ),
  ]),
);

/** Decisions whose option keys are ids, so they carry no labels. */
const UNLABELED: ReadonlySet<string> = new Set(optionActsData.unlabeled);

/** The closed list of act kinds. */
export const ACT_KINDS: ReadonlySet<string> = new Set(
  actKindsData.kinds.map((kind) => kind.id),
);

/** The tables, for the test that holds them against each other. */
export function traitActTables() {
  return {
    kinds: ACT_KINDS,
    pulls: PULLS,
    optionActs: OPTION_ACTS,
    unlabeled: UNLABELED,
  };
}

/** Whether a decision type carries act labels at all. */
export function decisionHasActLabels(decisionType: string): boolean {
  return OPTION_ACTS.has(decisionType) && !UNLABELED.has(decisionType);
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * The trait ids a decision's reasons already name through the two older
 * paths, whose stable keys read `<prefix>:trait:<trait>:<option>:<index>`.
 *
 * `registeredTraitConsiderations` writes the qualified id (`pack:key`).
 * `traitConsiderations` writes the bare name of a core trait, which is
 * qualified here so both name the same trait the pulls table does.
 */
export function traitIdsAlreadyReasoned(
  registry: TraitRegistry,
  considerations: readonly Pick<DecisionConsideration, "stableKey">[],
): ReadonlySet<string> {
  const named = new Set<string>();
  for (const { stableKey } of considerations) {
    const at = stableKey.indexOf(":trait:");
    if (at < 0) continue;
    const parts = stableKey.slice(at + ":trait:".length).split(":");
    const qualified = parts.length >= 2 ? `${parts[0]}:${parts[1]}` : null;
    if (qualified !== null && registry.traits.has(qualified)) {
      named.add(qualified);
      continue;
    }
    const core = `people-mind-v1:${parts[0]}`;
    if (registry.traits.has(core)) named.add(core);
  }
  return named;
}

/** A reason this module already wrote, found by its own stable key and shape. */
export function isActConsideration(
  consideration: Pick<
    DecisionConsideration,
    "stableKey" | "sourceType" | "explanation"
  >,
): boolean {
  return (
    consideration.sourceType === "mind:personality" &&
    consideration.stableKey.includes(":act:") &&
    consideration.explanation.split("|").length === 4
  );
}

/**
 * The reasons a person's recorded traits put on a decision, from what kind of
 * act each option is.
 *
 * For every trait the person has a record of, and whose pole pulls toward a
 * kind an option carries, the option gets a "supports" reason; for every kind
 * the pole pulls away from, an "opposes" reason. At most one of each per trait
 * and option. No record, or a balanced one, contributes nothing.
 *
 * `cutoff` is the decision's own. A reason has to cite a record the person had
 * by then, so a record written afterwards is not read; the pure default is the
 * world's present.
 */
export function traitActConsiderations(
  world: World,
  registry: TraitRegistry,
  actorPersonId: EntityId,
  keyPrefix: string,
  decisionType: string,
  options: readonly DecisionOption[],
  skipTraits: ReadonlySet<string>,
  cutoff?: HistoricalCutoff,
): readonly DecisionConsideration[] {
  const optionActs = OPTION_ACTS.get(decisionType);
  if (!optionActs || UNLABELED.has(decisionType)) return [];

  const records = new Map<string, PersonalityTendencyRecord>(
    latestPersonalityTendenciesForPerson(world, actorPersonId, cutoff).map(
      (record) => [record.tendencyId, record] as const,
    ),
  );
  if (records.size === 0) return [];

  const ordered = [...options].sort((left, right) =>
    compareIds(left.key, right.key),
  );
  const considerations: DecisionConsideration[] = [];
  for (const [traitId, poles] of PULLS) {
    if (skipTraits.has(traitId)) continue;
    const trait: RegisteredTrait | undefined = registry.traits.get(traitId);
    if (!trait) continue;
    const tendencyId = traitDefinitionFromPack(trait).id;
    const record = world.mindCatalog.tendencies[tendencyId]
      ? records.get(tendencyId)
      : undefined;
    if (!record) continue;
    const reading = traitReadingOfRecord(trait, record);
    if (reading.state === "unrecorded" || reading.value === 0) continue;
    const pole: Pole = reading.value > 0 ? "high" : "low";
    const acts = poles[pole];
    if (!acts) continue;
    const importance = importanceOf(trait, reading.value);
    for (const option of ordered) {
      const kinds = optionActs.get(option.key);
      if (!kinds) continue;
      for (const direction of ["supports", "opposes"] as const) {
        const pulled = direction === "supports" ? acts.toward : acts.away;
        if (![...kinds].some((kind) => pulled.has(kind))) continue;
        considerations.push({
          stableKey: `${keyPrefix}:act:${traitId}:${option.key}:${direction}`,
          optionKey: option.key,
          sourceType: "mind:personality",
          direction,
          importance,
          confidence: "medium",
          // The reason key, not a sentence. The English engine composes the
          // words from it; nothing here is ever shown as written.
          explanation: `${traitId}|${decisionType}|${option.key}|${pole}`,
          sourceRefs: [
            {
              kind: "personality-tendency",
              tendencyRecordId: reading.recordId,
            },
          ],
        });
      }
    }
  }
  return considerations;
}
