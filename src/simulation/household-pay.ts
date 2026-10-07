import programs from "../../data/research/money/public-programs-2026.json" with { type: "json" };
import { yearOf } from "./dates";
import { povertyLineMinor } from "./public-benefit-formulas";
import { STATES } from "./state-reference";
import type { EntityId, IsoDate, World } from "./types";

/**
 * A household's recorded pay and the poverty line it is measured against:
 * the one definition of each. Health coverage, town rent, migration and
 * people-upbringing all read them from here.
 *
 * A leaf: it reads history and reference data only, so a module low in the
 * import graph (people-upbringing) can read pay without loading the coverage
 * pass, the campaign clock or any scenario.
 */

// ─── Poverty line ───────────────────────────────────────────────────────

/**
 * A year's guideline: the contiguous states' amounts, and a first-person
 * amount for each state that has its own, keyed by the state's name.
 */
type Guideline = {
  readonly contiguous: {
    readonly "1": number;
    readonly eachAdditional: number;
  };
} & Readonly<Record<string, { readonly "1": number }>>;

const GUIDELINES = Object.entries(
  programs.federal.povertyGuidelines as unknown as Record<
    string,
    { readonly value?: Guideline }
  >,
)
  .flatMap(([year, row]) =>
    /^\d{4}$/.test(year) && row.value
      ? [[Number(year), row.value] as const]
      : [],
  )
  .sort((a, b) => a[0] - b[0]);

/**
 * The annual poverty line for a household in a state, in cents: the year's
 * HHS guideline for the state, through the shared formula
 * (`povertyLineMinor`).
 */
export function annualPovertyLineMinor(
  stateKey: string,
  householdSize: number,
  onDate: IsoDate,
): number {
  const year = yearOf(onDate);
  const guideline = (GUIDELINES.filter(([read]) => read <= year).at(-1) ??
    GUIDELINES[0]!)[1];
  const contiguous = guideline.contiguous;
  const name = STATES[stateKey.slice(3)]?.name.toLowerCase();
  const own = name && name !== "contiguous" ? guideline[name] : undefined;
  const first = own?.["1"] ?? contiguous["1"];
  const added = own
    ? (contiguous.eachAdditional * own["1"]) / contiguous["1"]
    : contiguous.eachAdditional;
  return Math.round(
    povertyLineMinor(Math.max(1, householdSize), first, added) * 100,
  );
}

// ─── Pay ────────────────────────────────────────────────────────────────

const PERIODS_PER_YEAR: Readonly<Record<string, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

/**
 * Which pay counts: every compensation (wages, salaries and an owner's draw
 * from their own business), or wages from work only.
 */
export type RecordedPayBasis = "compensation" | "work";

// Coverage writes only crisis history. Reuse the pay index while its
// immutable source arrays and review date remain unchanged.
const MONTHLY_PAY_CACHE = new WeakMap<
  World["history"]["resourceFlowTerms"],
  {
    flows: World["history"]["resourceFlows"];
    onDate: IsoDate;
    pay: ReadonlyMap<EntityId, number>;
  }
>();

/**
 * Each person's recorded pay a month on a date, in cents, read from the
 * latest terms of their pay flows. A person with no pay terms is absent, not
 * zero. The work-only reading returns a fresh map its caller may keep.
 */
export function recordedMonthlyPayByPerson(
  world: World,
  onDate: IsoDate,
  basis: "work",
): Map<EntityId, number>;
export function recordedMonthlyPayByPerson(
  world: World,
  onDate: IsoDate,
  basis?: "compensation",
): ReadonlyMap<EntityId, number>;
export function recordedMonthlyPayByPerson(
  world: World,
  onDate: IsoDate,
  basis: RecordedPayBasis = "compensation",
): ReadonlyMap<EntityId, number> {
  const cached =
    basis === "compensation"
      ? MONTHLY_PAY_CACHE.get(world.history.resourceFlowTerms)
      : undefined;
  if (cached?.flows === world.history.resourceFlows && cached.onDate === onDate)
    return cached.pay;
  const recipients = new Map<EntityId, EntityId>();
  for (const flow of world.history.resourceFlows)
    if (
      (basis === "work"
        ? flow.basisKind === "compensation:work"
        : flow.basisKind.startsWith("compensation:")) &&
      flow.recipient.kind === "person"
    )
      recipients.set(flow.id, flow.recipient.personId);
  const latest = new Map<
    EntityId,
    (typeof world.history.resourceFlowTerms)[number]
  >();
  for (const row of world.history.resourceFlowTerms)
    if (recipients.has(row.resourceFlowId) && row.effectiveAt <= onDate)
      latest.set(row.resourceFlowId, row);
  const byPerson = new Map<EntityId, number>();
  for (const [flowId, row] of latest) {
    if (row.status !== "active") continue;
    const match = /(weekly|biweekly|semimonthly|monthly)/.exec(row.cadenceKind);
    const perYear = match ? PERIODS_PER_YEAR[match[1]!] : undefined;
    if (!perYear) continue;
    const personId = recipients.get(flowId)!;
    byPerson.set(
      personId,
      (byPerson.get(personId) ?? 0) + (row.amount.minorUnits * perYear) / 12,
    );
  }
  if (basis === "compensation")
    MONTHLY_PAY_CACHE.set(world.history.resourceFlowTerms, {
      flows: world.history.resourceFlows,
      onDate,
      pay: byPerson,
    });
  return byPerson;
}
