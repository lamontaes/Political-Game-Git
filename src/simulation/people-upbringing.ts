import { childhoodRecordEntries } from "./childhood-record";
import { recordsByStringField } from "./history-index";
import { ageOnDate, dateAtAge } from "./dates";
import {
  annualPovertyLineMinor,
  recordedMonthlyPayByPerson,
} from "./household-pay";
import { homeStateKey } from "./state-jurisdiction-id";
import {
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  peopleInHouseholdAt,
} from "./life-queries";
import { factsForPerson } from "./people";
import { STATES } from "./state-reference";
import { stateKeyForJurisdiction } from "./state-jurisdiction-id";
import {
  CHILD_INCOME_CENTILES,
  NATIONAL_CHILD_POVERTY,
  STATE_CHILD_POVERTY,
  NATIONAL_RANK_CORRELATION,
  INCOME_TABLE_POVERTY_DOLLARS,
  LOW_INCOME_TO_POVERTY,
} from "./upbringing-income-data";
import type { EntityId, IsoDate, World } from "./types";
import type { PeopleTrait, TraitValue } from "./people-trait-definitions";
import type { TraitLifePart } from "./personality-trait-registry";
import { isPersonAliveAt } from "./vitality-integrity";

/** Broad periods preserve change without pretending to know annual household accounts. */
export type UpbringingPeriod = "early-childhood" | "adolescence";
export type FamilyMoney = "secure" | "strained" | "severe-scarcity";
export type HomeStability = "stable" | "some-moves" | "disrupted";
export type CaregivingClimate =
  | "protective-reliable"
  | "consistent-firm"
  | "inconsistent"
  | "high-conflict"
  | "harsh"
  // A person born in play: no household record says how their caregivers
  // treated them yet, so nothing is drawn and no tendency is read from it.
  | "not-recorded";
export type UpbringingEvent =
  | "parent-death"
  | "parent-separation"
  | "serious-illness"
  | "family-illness-care"
  | "law-allegation"
  | "adjudicated-law-trouble"
  | "harsh-authority-treatment";
export type SchoolExperience =
  | "reliable-support"
  | "earned-success"
  | "supported-setbacks"
  | "ridicule-or-exclusion"
  | "peer-belonging"
  | "bullying";
export type FirstJobExperience =
  | "none"
  | "reliable-supervision"
  | "autonomy"
  | "public-contact"
  | "precarious";

export interface UpbringingSource {
  readonly kind: "public-data" | "world-record" | "game-profile";
  readonly key: string;
  readonly note: string;
}

export interface PersonUpbringing {
  readonly personId: EntityId;
  /**
   * "childhood-record": a person born in play, read from their childhood
   * record, the household pay and the family records with no draw.
   * "game-profile": an opening-world person whose childhood predates the
   * world, so marked public-data estimates stand in for unrecorded money.
   */
  readonly basis: "childhood-record" | "game-profile";
  readonly money: readonly {
    readonly period: UpbringingPeriod;
    readonly level: FamilyMoney;
    readonly source: UpbringingSource;
    /** A marked backcast, never a recorded parent income or an actor draw. */
    readonly estimatedParentIncomeRank?: number;
  }[];
  /** 0 to 1: moves / (moves + K). The number readers weigh by. */
  readonly disruption: number;
  /** Display only; see `homeStabilityLabel`. */
  readonly homeStability: HomeStability;
  readonly caregiving: CaregivingClimate;
  readonly protectiveCaregiver: boolean;
  readonly events: readonly UpbringingEvent[];
  readonly schooling: readonly SchoolExperience[];
  readonly firstJob: FirstJobExperience;
}

export interface UpbringingTraitTendency {
  readonly trait: string;
  readonly weight: number;
  readonly lifePart: TraitLifePart | null;
  readonly because: string;
  readonly pole: "low" | "high";
}

/**
 * A family's money when the World holds no household pay for that part of a
 * childhood: the level of the median child, marked as an estimate.
 *
 * ACS 2024 1-year, table B17024 (ratio of income to poverty level by age),
 * United States: of 21,699,134 children under 6, 3,568,376 (16.4%) lived
 * under the poverty level, 4,304,160 (19.8%) at 100 to 199% of it and
 * 13,826,598 (63.7%) at 200% or more; of 25,998,996 aged 12 to 17, 14.5%,
 * 18.7% and 66.8%. The median child in both periods is in a family at 200%
 * of poverty or more, which this model calls secure.
 */
const MONEY_ESTIMATE: UpbringingSource = {
  kind: "public-data",
  key: "acs-2024-1yr-b17024-median-child",
  note: "ESTIMATED FROM AVERAGE: no household pay is on record for this part of the childhood, so it takes the median U.S. child's family level (ACS 2024 1-year B17024: 63.7% of children under 6 and 66.8% aged 12 to 17 live at 200% of poverty or more).",
};

const MONEY_FROM_RECORDS: UpbringingSource = {
  kind: "world-record",
  key: "household-pay-against-poverty-line",
  note: "The household's recorded pay against the HHS poverty guideline for its size and state: at or under 100% is severe scarcity and at or under 200% strained (the Census poverty and low-income bands).",
};

/** The ages each money period covers, and the age its record is read at. */
const MONEY_PERIODS: Readonly<
  Record<UpbringingPeriod, { from: number; until: number; readAt: number }>
> = {
  "early-childhood": { from: 0, until: 6, readAt: 3 },
  adolescence: { from: 12, until: 18, readAt: 15 },
};

/**
 * The day a money period's records are read: today while the person is in
 * it, the middle of it once it is over. None when the period is still ahead
 * or was over before the World's history begins.
 */
function moneyRecordDate(
  world: World,
  birthDate: IsoDate,
  period: UpbringingPeriod,
): IsoDate | null {
  const { from, until, readAt } = MONEY_PERIODS[period];
  if (world.currentDate < dateAtAge(birthDate, from)) return null;
  if (world.currentDate < dateAtAge(birthDate, until)) return world.currentDate;
  const middle = dateAtAge(birthDate, readAt);
  return middle < world.startedAt ? null : middle;
}

/**
 * A family's money in one part of a childhood, read from the household's
 * recorded pay on that day. When the World has no such record (the period
 * is before its history, still ahead, or someone at work has no recorded
 * pay), it is the median child's level, marked as an estimate.
 */
export function familyMoneyFor(
  world: World,
  personId: EntityId,
  period: UpbringingPeriod,
): { readonly level: FamilyMoney; readonly source: UpbringingSource } {
  const estimate = { level: "secure" as const, source: MONEY_ESTIMATE };
  const person = world.people[personId]!;
  const onDate = moneyRecordDate(world, person.birthDate, period);
  if (onDate === null) return estimate;
  const cutoff = {
    asOfDate: onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const household = householdMembershipsAt(world, personId, cutoff)[0];
  const stateKey = homeStateKey(world, personId);
  if (!household || !stateKey) return estimate;
  const members = peopleInHouseholdAt(
    world,
    household.household.id,
    cutoff,
  ).filter((id) => isPersonAliveAt(world, id, cutoff));
  const pay = recordedMonthlyPayByPerson(world, onDate);
  const working = members.filter(
    (id) => activeWorkRelationshipsAt(world, id, cutoff).length > 0,
  );
  // Unknown is not zero: a household with nobody on a payroll, or somebody
  // at work whose pay is not recorded, has no income the World can read.
  if (working.length === 0 || working.some((id) => !pay.has(id)))
    return estimate;
  const annualMinor =
    members.reduce((sum, id) => sum + (pay.get(id) ?? 0), 0) * 12;
  const line = annualPovertyLineMinor(stateKey, members.length, onDate);
  const level: FamilyMoney =
    annualMinor <= line
      ? "severe-scarcity"
      : annualMinor <= line * 2
        ? "strained"
        : "secure";
  return { level, source: MONEY_FROM_RECORDS };
}

function otherPerson(
  pair: readonly [EntityId, EntityId],
  personId: EntityId,
): EntityId {
  return pair[0] === personId ? pair[1] : pair[0];
}

function recordedParents(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const child = world.people[personId];
  if (!child) return [];
  return kinshipRelationshipsAt(world, personId)
    .filter(({ kind }) => kind === "lineal:parent-child")
    .map(({ personIds }) => otherPerson(personIds, personId))
    .filter((candidate) => {
      const person = world.people[candidate];
      return person && person.birthDate < child.birthDate;
    });
}

function recordedChildhoodParentDeath(
  world: World,
  personId: EntityId,
  parentIds: readonly EntityId[],
): boolean {
  const child = world.people[personId]!;
  const adulthood = dateAtAge(child.birthDate, 18);
  return world.history.personDeaths.some(
    ({ personId: deceased, diedAt }) =>
      parentIds.includes(deceased) && diedAt < adulthood,
  );
}

/**
 * How disrupted a childhood was, from 0 (no move during a school year) toward
 * 1 (ever more of them): moves / (moves + K). PLACEHOLDER: K = 2 until the
 * research on how many school-year moves a child takes in stride is read.
 * Every reader weighs by this number; nothing flips at a count.
 */
const DISRUPTION_K = 2;
function disruptionFromMoves(moves: number): number {
  return moves / (moves + DISRUPTION_K);
}

/**
 * HARDWIRED display rule: the label a screen may show for a disruption number.
 * No reader uses it as a weight.
 */
function homeStabilityLabel(disruption: number): HomeStability {
  return disruption === 0
    ? "stable"
    : disruption < 0.5
      ? "some-moves"
      : "disrupted";
}

function nearestYear(
  rows: readonly (readonly [number, number])[],
  year: number,
): readonly [number, number] {
  return rows.reduce((best, row) =>
    Math.abs(row[0] - year) < Math.abs(best[0] - year) ? row : best,
  );
}

/** Linear interpolation through the published adult-family-income centiles. */
function adultIncomeRank(income: number): number {
  const first = CHILD_INCOME_CENTILES[0]!;
  if (income <= first[0]) return first[1];
  for (let i = 1; i < CHILD_INCOME_CENTILES.length; i += 1) {
    const right = CHILD_INCOME_CENTILES[i]!;
    if (income <= right[0]) {
      const left = CHILD_INCOME_CENTILES[i - 1]!;
      return (
        left[1] +
        ((income - left[0]) / (right[0] - left[0])) * (right[1] - left[1])
      );
    }
  }
  return CHILD_INCOME_CENTILES.at(-1)![1];
}

/** Opening-only estimate: recorded adult household pay, recorded birthplace and birth cohort. */
function openingFamilyMoney(
  world: World,
  personId: EntityId,
  period: UpbringingPeriod,
) {
  const person = world.people[personId]!;
  const birth = factsForPerson(person).find(
    (fact) => fact.kind === "birthplace",
  );
  const jurisdiction = birth?.jurisdictionId
    ? world.jurisdictions[birth.jurisdictionId]
    : undefined;
  const stateKey =
    jurisdiction &&
    (stateKeyForJurisdiction(jurisdiction) ??
      Object.entries(STATES).find(
        ([, row]) => row.name === jurisdiction.parentName,
      )?.[0]);
  const usps = stateKey?.replace(/^US-/, "");
  const year =
    Number(person.birthDate.slice(0, 4)) + MONEY_PERIODS[period].readAt;
  const cohort = nearestYear(NATIONAL_CHILD_POVERTY, year);
  const placeRows = usps ? STATE_CHILD_POVERTY[usps] : undefined;
  const place = nearestYear(placeRows ?? STATE_CHILD_POVERTY.US!, year);
  const nationalAtPlaceYear = nearestYear(NATIONAL_CHILD_POVERTY, place[0]);
  // National cohort change scales the nearest published state observation.
  // This is a disclosed estimate, not a claim of an observed state/cohort rate.
  const povertyShare = Math.min(
    100,
    (place[1] * cohort[1]) / nationalAtPlaceYear[1],
  );
  const cutoff = {
    asOfDate: world.startedAt,
    historySequenceExclusive: world.history.nextSequence,
  };
  const household = householdMembershipsAt(world, personId, cutoff)[0];
  const home = homeStateKey(world, personId);
  const members = household
    ? peopleInHouseholdAt(world, household.household.id, cutoff).filter((id) =>
        isPersonAliveAt(world, id, cutoff),
      )
    : [];
  const pay = recordedMonthlyPayByPerson(world, world.startedAt);
  const working = members.filter(
    (id) => activeWorkRelationshipsAt(world, id, cutoff).length > 0,
  );
  const hasPay =
    ageOnDate(person.birthDate, world.startedAt) >= 18 &&
    home !== null &&
    working.length > 0 &&
    working.every((id) => pay.has(id));
  const adultRank = hasPay
    ? adultIncomeRank(
        ((members.reduce((sum, id) => sum + (pay.get(id) ?? 0), 0) * 12) /
          annualPovertyLineMinor(home!, members.length, world.startedAt)) *
          INCOME_TABLE_POVERTY_DOLLARS,
      )
    : 50;
  // National ranks have equal variance: the best linear reverse predictor
  // shrinks toward 50 with the correlation. Dividing by the forward slope
  // would incorrectly assert that childhood income determines adult income.
  const estimatedParentIncomeRank =
    50 + NATIONAL_RANK_CORRELATION * (adultRank - 50);
  const level: FamilyMoney =
    estimatedParentIncomeRank <= povertyShare
      ? "severe-scarcity"
      : estimatedParentIncomeRank <=
          Math.min(100, povertyShare * LOW_INCOME_TO_POVERTY[period])
        ? "strained"
        : "secure";
  return {
    level,
    estimatedParentIncomeRank,
    source: {
      kind: "public-data" as const,
      key: "chetty-2014-rank-backcast-census-child-poverty-v1",
      note: `ESTIMATED FROM AVERAGE: national rank correlation 0.341 gives parent rank ${estimatedParentIncomeRank.toFixed(2)} from ${hasPay ? "recorded opening adult household job/pay" : "median adult rank (adult job/pay not recorded)"}. Birthplace ${placeRows ? usps : "national proxy (birthplace has no SAIPE coverage)"}, nearest SAIPE ${place[0]} child poverty ${place[1]}%, scaled by national CPS ${cohort[0]} childhood-year poverty ${cohort[1]}%; estimated local share ${povertyShare.toFixed(2)}%. ACS age-band low-income/poverty ratio supplies the 200% band. This is a linear estimate, not a recorded childhood; national 1980–82 mobility applies outside that cohort and no verified birthplace-to-CZ crosswalk is present.`,
    },
  };
}

/**
 * The same person in the same world always receives the same upbringing.
 * Recorded childhood wins. Opening money is a marked sourced backcast;
 * missing individual adversity is never manufactured.
 */
// The World is immutable. Repeated trait reads of this exact snapshot may
// share one upbringing, but another snapshot or date always reads afresh.
const UPBRINGING_READS = new WeakMap<
  World,
  { readonly date: IsoDate; readonly byPerson: Map<EntityId, PersonUpbringing> }
>();

export function upbringingFor(
  world: World,
  personId: EntityId,
): PersonUpbringing {
  let snapshot = UPBRINGING_READS.get(world);
  if (!snapshot || snapshot.date !== world.currentDate) {
    snapshot = { date: world.currentDate, byPerson: new Map() };
    UPBRINGING_READS.set(world, snapshot);
  }
  const prior = snapshot.byPerson.get(personId);
  if (prior) return prior;
  const result = readUpbringing(world, personId);
  snapshot.byPerson.set(personId, result);
  return result;
}

function readUpbringing(world: World, personId: EntityId): PersonUpbringing {
  const person = world.people[personId];
  if (!person) throw new Error(`No person ${personId} exists.`);
  const parents = recordedParents(world, personId);
  const parentDied = recordedChildhoodParentDeath(world, personId, parents);
  const earlyMoney = familyMoneyFor(world, personId, "early-childhood");
  const laterMoney = familyMoneyFor(world, personId, "adolescence");
  const money = [
    { period: "early-childhood", ...earlyMoney },
    { period: "adolescence", ...laterMoney },
  ] as const;
  const entries = recordsByStringField(
    childhoodRecordEntries(world),
    "personId",
    personId,
  );
  if (entries.some(({ kind }) => kind === "birth")) {
    const disruption = disruptionFromMoves(
      entries.filter(({ kind }) => kind === "school-year-move").length,
    );
    return {
      personId,
      basis: "childhood-record",
      money,
      disruption,
      homeStability: homeStabilityLabel(disruption),
      caregiving: "not-recorded",
      protectiveCaregiver: false,
      events: parentDied ? ["parent-death"] : [],
      schooling: [],
      firstJob: "none",
    };
  }
  const disruption = disruptionFromMoves(
    entries.filter(({ kind }) => kind === "school-year-move").length,
  );
  return {
    personId,
    basis: "game-profile",
    money: money.map((row) =>
      row.source.kind === "world-record"
        ? row
        : {
            period: row.period,
            ...openingFamilyMoney(world, personId, row.period),
          },
    ),
    disruption,
    homeStability: homeStabilityLabel(disruption),
    caregiving: "not-recorded",
    protectiveCaregiver: false,
    events: parentDied ? ["parent-death"] : [],
    schooling: [],
    firstJob: "none",
  };
}

const candidate = (
  trait: string,
  weight: number,
  because: string,
  lifePart: TraitLifePart | null = null,
  pole: "low" | "high" = "high",
): UpbringingTraitTendency => ({ trait, weight, because, lifePart, pole });

/** The approved upbringing table expressed as weighted candidates, never destiny. */
export function upbringingTraitTendencies(
  upbringing: PersonUpbringing,
): readonly UpbringingTraitTendency[] {
  const rows: UpbringingTraitTendency[] = [];
  const levels = new Set(upbringing.money.map(({ level }) => level));
  if (levels.has("secure"))
    rows.push(
      candidate("personality-v1:facet-contented", 1, "material security"),
      candidate("personality-v1:facet-generous", 1, "material security"),
      candidate("personality-v1:uncertain-outlook", 1, "material security"),
    );
  if (levels.has("strained") || levels.has("severe-scarcity"))
    rows.push(
      candidate("personality-v1:facet-practical", 2, "material scarcity"),
      candidate("personality-v1:facet-acquisitive", 1, "material scarcity"),
      candidate("personality-v1:voluntary-effort", 1, "material scarcity"),
    );
  if (upbringing.caregiving === "protective-reliable")
    rows.push(
      candidate(
        "personality-v1:facet-affectionate",
        2,
        "reliable warm care",
        "family",
      ),
      candidate("personality-v1:facet-supportive", 2, "reliable warm care"),
      candidate("personality-v1:initial-trust", 1, "reliable warm care"),
    );
  if (upbringing.caregiving === "consistent-firm")
    rows.push(
      candidate(
        "personality-v1:facet-fair-minded",
        2,
        "consistent household rules",
      ),
      candidate(
        "personality-v1:facet-duty-bound",
        2,
        "consistent household duties",
      ),
      candidate("personality-v1:patience", 1, "consistent household limits"),
    );
  if (upbringing.caregiving === "inconsistent")
    rows.push(
      candidate(
        "personality-v1:facet-defensive",
        2,
        "unpredictable household rules",
      ),
      candidate(
        "personality-v1:facet-guarded",
        2,
        "unpredictable household rules",
      ),
      candidate(
        "personality-v1:initial-trust",
        2,
        "unpredictable household rules",
        null,
        "low",
      ),
    );
  if (
    upbringing.caregiving === "high-conflict" ||
    upbringing.caregiving === "harsh"
  )
    rows.push(
      candidate("personality-v1:facet-defensive", 2, "household conflict"),
      candidate("personality-v1:facet-sensitive", 1, "household conflict"),
      candidate("personality-v1:facet-brooding", 1, "household conflict"),
      candidate(
        "personality-v1:facet-mediating",
        1,
        "household conflict",
        "family",
      ),
    );
  // Smooth in the disruption number: learning to adapt is strongest in the
  // middle (4d(1-d)), the cost of lost homes grows with it (d).
  const d = upbringing.disruption;
  const adapting = 4 * d * (1 - d);
  if (adapting > 0)
    rows.push(
      candidate(
        "personality-v1:method-revision",
        2 * adapting,
        "repeated safe transitions",
      ),
      candidate(
        "personality-v1:facet-observant",
        adapting,
        "repeated transitions",
      ),
      candidate(
        "personality-v1:facet-independent",
        adapting,
        "repeated transitions",
      ),
    );
  if (d > 0)
    rows.push(
      candidate(
        "personality-v1:facet-nostalgic",
        2 * d,
        "lost homes and relationships",
      ),
      candidate("personality-v1:facet-guarded", 2 * d, "disruptive moves"),
      candidate(
        "personality-v1:facet-slow-to-warm-up",
        2 * d,
        "disruptive moves",
      ),
    );
  for (const event of upbringing.events) {
    if (event === "parent-death")
      rows.push(
        candidate(
          "personality-v1:facet-nostalgic",
          2,
          "a parent's death",
          "family",
        ),
        candidate("personality-v1:facet-tender-hearted", 1, "a parent's death"),
        ...(upbringing.protectiveCaregiver
          ? [
              candidate(
                "personality-v1:facet-devoted",
                2,
                "protective care after a parent's death",
                "family",
              ),
            ]
          : [
              candidate(
                "personality-v1:facet-intimacy-guarded",
                2,
                "a parent's death",
                "family",
              ),
            ]),
      );
    if (event === "parent-separation")
      rows.push(
        candidate(
          "personality-v1:facet-guarded",
          1,
          "parental separation",
          "family",
        ),
        candidate("personality-v1:facet-independent", 1, "parental separation"),
      );
    if (event === "serious-illness")
      rows.push(
        candidate("personality-v1:patience", 2, "serious childhood illness"),
        candidate(
          "personality-v1:facet-persistent",
          2,
          "serious childhood illness",
        ),
        candidate(
          "personality-v1:concern-for-distress",
          1,
          "serious childhood illness",
        ),
      );
    if (event === "family-illness-care")
      rows.push(
        candidate(
          "personality-v1:facet-nurturing",
          2,
          "family illness care",
          "family",
        ),
        candidate(
          "personality-v1:facet-duty-bound",
          2,
          "family illness care",
          "family",
        ),
      );
    if (event === "adjudicated-law-trouble")
      rows.push(
        candidate(
          "personality-v1:facet-practical",
          1,
          "accountability after adjudicated conduct",
        ),
        candidate(
          "personality-v1:facet-humble",
          1,
          "accountability after adjudicated conduct",
        ),
      );
    if (event === "harsh-authority-treatment")
      rows.push(
        candidate(
          "personality-v1:facet-cynical",
          2,
          "harsh treatment by authorities",
        ),
        candidate(
          "personality-v1:initial-trust",
          2,
          "harsh treatment by authorities",
          null,
          "low",
        ),
      );
  }
  for (const school of upbringing.schooling) {
    if (school === "reliable-support" || school === "earned-success")
      rows.push(
        candidate(
          "personality-v1:facet-studious",
          2,
          "support and effort at school",
        ),
        candidate(
          "personality-v1:facet-persistent",
          1,
          "support and effort at school",
        ),
        candidate(
          "personality-v1:self-confidence",
          1,
          "support and effort at school",
        ),
      );
    if (school === "supported-setbacks")
      rows.push(
        candidate(
          "personality-v1:facet-persistent",
          2,
          "supported school setbacks",
        ),
        candidate(
          "personality-v1:facet-humble",
          1,
          "supported school setbacks",
        ),
      );
    if (school === "peer-belonging")
      rows.push(
        candidate(
          "personality-v1:facet-friendly",
          2,
          "reciprocal peer belonging",
          "friends",
        ),
        candidate(
          "personality-v1:bond-loyalty",
          1,
          "reciprocal peer belonging",
          "friends",
        ),
      );
    if (school === "ridicule-or-exclusion" || school === "bullying")
      rows.push(
        candidate(
          "personality-v1:facet-self-conscious",
          2,
          "peer ridicule or exclusion",
          "friends",
        ),
        candidate(
          "personality-v1:facet-defensive",
          1,
          "peer ridicule or exclusion",
          "friends",
        ),
        candidate(
          "personality-v1:facet-slow-to-warm-up",
          1,
          "peer ridicule or exclusion",
          "friends",
        ),
      );
  }
  if (upbringing.firstJob === "reliable-supervision")
    rows.push(
      candidate(
        "personality-v1:facet-duty-bound",
        2,
        "responsibility in a first job",
        "work",
      ),
      candidate(
        "personality-v1:facet-meticulous",
        1,
        "reliable first-job supervision",
        "work",
      ),
    );
  if (upbringing.firstJob === "autonomy")
    rows.push(
      candidate(
        "personality-v1:facet-enterprising",
        2,
        "autonomy in a first job",
        "work",
      ),
      candidate(
        "personality-v1:facet-independent",
        1,
        "autonomy in a first job",
        "work",
      ),
    );
  if (upbringing.firstJob === "public-contact")
    rows.push(
      candidate(
        "personality-v1:facet-polite",
        2,
        "public contact in a first job",
        "work",
      ),
      candidate(
        "personality-v1:facet-tactful",
        1,
        "public contact in a first job",
        "work",
      ),
    );
  if (upbringing.firstJob === "precarious")
    rows.push(
      candidate(
        "personality-v1:facet-cynical",
        1,
        "precarious first work",
        "work",
      ),
      candidate(
        "personality-v1:facet-guarded",
        1,
        "precarious first work",
        "work",
      ),
      candidate(
        "personality-v1:facet-assertive",
        1,
        "precarious first work",
        "work",
      ),
    );
  return rows;
}

/** Core directions use the same upbringing rather than a second random biography. */
export function upbringingCoreValue(
  world: World,
  personId: EntityId,
  trait: PeopleTrait,
): TraitValue {
  return upbringingCoreValueFrom(upbringingFor(world, personId), trait);
}

/**
 * A core direction from an upbringing alone. Pure: the same upbringing gives
 * the same value in every world. An upbringing that says nothing about this
 * trait, or pulls both ways equally, leaves the person at the middle.
 */
export function upbringingCoreValueFrom(
  upbringing: PersonUpbringing,
  trait: PeopleTrait,
): TraitValue {
  let score = 0;
  if (trait === "deliberation") {
    if (upbringing.caregiving === "consistent-firm") score -= 1;
    if (upbringing.caregiving === "inconsistent") score += 1;
  } else if (trait === "sociability") {
    if (upbringing.schooling.includes("peer-belonging")) score += 1;
    if (
      upbringing.schooling.some(
        (x) => x === "bullying" || x === "ridicule-or-exclusion",
      )
    )
      score -= 1;
  } else if (trait === "conflict") {
    if (upbringing.caregiving === "protective-reliable") score -= 1;
    if (
      upbringing.caregiving === "high-conflict" ||
      upbringing.caregiving === "harsh"
    )
      score += 1;
  } else if (trait === "reliability") {
    if (
      upbringing.caregiving === "consistent-firm" ||
      upbringing.firstJob === "reliable-supervision"
    )
      score += 1;
    if (upbringing.caregiving === "inconsistent") score -= 1;
  } else if (trait === "risk") {
    score -= Math.max(
      upbringing.disruption,
      upbringing.events.includes("serious-illness") ? 1 : 0,
    );
    if (upbringing.firstJob === "autonomy") score += 1;
  }
  // The scale is whole numbers; the score is rounded once, at the very end.
  return (Math.round(Math.max(-2, Math.min(2, score))) + 0) as TraitValue;
}
