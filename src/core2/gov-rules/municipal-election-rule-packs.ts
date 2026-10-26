/**
 * The parts of each state's municipal-election rule pack the town readers use:
 * when its towns vote, and how its voters may recall an official. Read from
 * the 92O national research synthesis
 * (`data/municipal-elections/92O-national-state-baseline.json`) the way the
 * old engine's `municipal-election-rule-packs.ts` compiles it; the prose,
 * citations and the rules nothing here reads are left out.
 *
 * Every value is `secondary-synthesis-only`: the best reading of state law
 * available, and unaudited.
 */
import corpus from "../../../data/municipal-elections/92O-national-state-baseline.json" with { type: "json" };
import conditionalRecall from "../data/elections/recall-form-conditional.json" with { type: "json" };
import unresolvedRecall from "../data/elections/recall-threshold-unresolved.json" with { type: "json" };
import type {
  MunicipalElectionTiming,
  MunicipalRecallDoctrine,
  PetitionSignatureBase,
  PetitionThreshold,
} from "./municipal-election-rules";

/** A rule as a pack holds it; only the kinds a reader acts on carry a value. */
export type PackRule<T> =
  | { readonly kind: "known"; readonly value: T }
  | {
      readonly kind: "locally-selectable";
      readonly options: readonly T[];
      readonly statutoryDefault: T | null;
    }
  | { readonly kind: "unknown" }
  | { readonly kind: "not-applicable" };

export interface MunicipalRulePack {
  readonly electionTiming: PackRule<MunicipalElectionTiming>;
  readonly recallDoctrine: PackRule<MunicipalRecallDoctrine>;
  readonly recallGroundsRequired: PackRule<boolean>;
  readonly recallPetitionThreshold: PackRule<PetitionThreshold>;
  readonly recallCirculationWindowDays: PackRule<number>;
  /** Which places' offices the state's recall reaches, as the pack reads the law; null where it does not say. */
  readonly recallScope: string | null;
  /** The grounds a petition must state, where the law sets them. */
  readonly recallGrounds: string | null;
  readonly recallCitation: string | null;
}

/**
 * States whose recall depends on a municipal form, charter or local adoption
 * the corpus resolves for no town: the options each may take, and the one
 * state law gives a town until it adopts another.
 */
interface FormConditionalRecall {
  readonly options: readonly MunicipalRecallDoctrine[];
  readonly statutoryDefault: MunicipalRecallDoctrine | null;
}
const FORM_CONDITIONAL_RECALL = conditionalRecall.states as Readonly<
  Record<string, FormConditionalRecall>
>;

/**
 * States with a statewide recall whose signature requirement is tiered,
 * ranged or compound (population tiers, a ward condition, a second petition),
 * so no one threshold is read. Which states, why and the source are data:
 * `src/core2/data/elections/recall-threshold-unresolved.json`.
 */
const UNRESOLVED_RECALL_THRESHOLD: ReadonlySet<string> = new Set(
  Object.keys((unresolvedRecall as { states: Record<string, unknown> }).states),
);

type CorpusRow = (typeof corpus.jurisdictions)[number];

/** `snake_case` in the corpus, kebab-case in the runtime. */
function kebab(value: string): string {
  return value.replace(/_/g, "-");
}

function known<T>(value: T | null): PackRule<T> {
  return value === null ? { kind: "unknown" } : { kind: "known", value };
}

function compileElectionTiming(
  row: CorpusRow,
): PackRule<MunicipalElectionTiming> {
  const options = row.electionTimingOptions.map(
    kebab,
  ) as MunicipalElectionTiming[];
  if (options.length === 1) return { kind: "known", value: options[0]! };
  return { kind: "locally-selectable", options, statutoryDefault: null };
}

function compileRecall(
  row: CorpusRow,
): Omit<MunicipalRulePack, "electionTiming"> {
  const text = row as CorpusRow & {
    recallScope?: string | null;
    recallGrounds?: string | null;
  };
  return {
    recallScope: text.recallScope ?? null,
    recallGrounds: text.recallGrounds ?? null,
    recallCitation: row.recallCitation ?? null,
    ...compileRecallRules(row),
  };
}

function compileRecallRules(
  row: CorpusRow,
): Omit<
  MunicipalRulePack,
  "electionTiming" | "recallScope" | "recallGrounds" | "recallCitation"
> {
  const conditional = FORM_CONDITIONAL_RECALL[row.usps];
  if (conditional)
    return {
      recallDoctrine: { kind: "locally-selectable", ...conditional },
      recallGroundsRequired: { kind: "unknown" },
      recallPetitionThreshold: { kind: "unknown" },
      recallCirculationWindowDays: { kind: "unknown" },
    };
  const doctrine = kebab(row.recallDoctrine) as MunicipalRecallDoctrine;
  // Both of these mean there is no recall election, so nothing inside one
  // applies.
  if (doctrine === "prohibited" || doctrine === "judicial-cause-removal-trial")
    return {
      recallDoctrine: { kind: "known", value: doctrine },
      recallGroundsRequired: { kind: "not-applicable" },
      recallPetitionThreshold: { kind: "not-applicable" },
      recallCirculationWindowDays: { kind: "not-applicable" },
    };
  const base =
    row.recallPetitionBase === null ||
    row.recallPetitionBase === "not_applicable"
      ? null
      : (kebab(row.recallPetitionBase) as PetitionSignatureBase);
  return {
    recallDoctrine: { kind: "known", value: doctrine },
    recallGroundsRequired: known(row.recallGroundsRequired),
    recallPetitionThreshold:
      UNRESOLVED_RECALL_THRESHOLD.has(row.usps) ||
      base === null ||
      row.recallPetitionPercent === null
        ? { kind: "unknown" }
        : {
            kind: "known",
            value: { percent: row.recallPetitionPercent, base },
          },
    recallCirculationWindowDays: known(row.recallCirculationWindowDays),
  };
}

/** Every state's pack, keyed by USPS code, in USPS order. */
export const MUNICIPAL_RULE_PACKS: Readonly<Record<string, MunicipalRulePack>> =
  Object.freeze(
    Object.fromEntries(
      [...corpus.jurisdictions]
        .sort((a, b) => a.usps.localeCompare(b.usps))
        .map((row) => [
          row.usps,
          { electionTiming: compileElectionTiming(row), ...compileRecall(row) },
        ]),
    ),
  );

/**
 * The pack for a state, or null. Null means the corpus does not carry the
 * jurisdiction; it never means the jurisdiction has no municipal law.
 */
export function municipalRulePackFor(usps: string): MunicipalRulePack | null {
  return MUNICIPAL_RULE_PACKS[usps.toUpperCase()] ?? null;
}
