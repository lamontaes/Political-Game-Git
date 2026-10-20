/**
 * What a voter thinks of a platform: the stand-in for individual views.
 *
 * OPUS-PEOPLE's views engine will give each person their own stance on each
 * question, formed from their life. Until it does (SG-GOV-views-stand-in), a
 * person's lean starts from how their own congressional district voted in
 * 2024 (Clerk of the House), placed by the personality facets the research
 * links to ideology, at the small share the research measures, and by the
 * upbringing and family the facets don't capture
 * (`data/campaigns/parameters.json`). Their stance on a
 * question is that lean along the question's measured left-right axis
 * (`data/research/campaigns/issue-axes-2026.json`).
 */
import axes from "../../data/research/campaigns/issue-axes-2026.json" with { type: "json" };
import support from "../../data/research/campaigns/policy-support-2026.json" with { type: "json" };
import lineAxes from "./data/legislature/budget-line-axes.json" with { type: "json" };
import calibration from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import delegates from "../../data/research/elections/house-delegates-2024.json" with { type: "json" };
import parameters from "./data/campaigns/parameters.json" with { type: "json" };
import stanceLoadings from "../../data/research/people/opening-stance-loadings.json" with { type: "json" };
import { stableHash } from "./kernel/ids";
import type { PersonState } from "./types";

/** One stated position: support (+1) or oppose (-1) a policy question. */
export interface Stance {
  readonly question: string;
  readonly position: number;
}

export function campaignParameter(key: string): number {
  const row = (parameters as { parameters: Record<string, { value: number }> })
    .parameters[key];
  if (!row) throw new Error(`Unknown campaign parameter: ${key}`);
  return row.value;
}

const axisOf = (axes as { axes: Record<string, { axis: number }> }).axes;
export const PLATFORM_QUESTIONS: readonly string[] = Object.keys(axisOf).sort();

const districtShare = new Map<string, number>(
  (
    calibration as unknown as {
      house: {
        districtGeoid: string;
        democraticTwoPartyShare: number | null;
      }[];
    }
  ).house
    .filter((row) => row.democraticTwoPartyShare !== null)
    .map((row) => [row.districtGeoid, row.democraticTwoPartyShare!]),
);

/** The town's starting lean: right minus left share of its House district's 2024 vote, in [-1, 1]. */
export function districtLean(
  districtGeoid: string | null,
  stateKey: string,
): number {
  const share =
    (districtGeoid ? districtShare.get(districtGeoid) : undefined) ??
    delegateShare(stateKey);
  return share === undefined ? 0 : 1 - 2 * share;
}

function delegateShare(stateKey: string): number | undefined {
  const rows = (
    delegates as unknown as {
      places: Record<
        string,
        { democraticPercent: number; republicanPercent: number }
      >;
    }
  ).places;
  const row = rows[stateKey.slice(3)];
  if (!row) return undefined;
  return (
    row.democraticPercent / (row.democraticPercent + row.republicanPercent)
  );
}

/** How far a person's personality leans right, by the facets the research links to ideology. */
function personalityLean(
  person: Readonly<Pick<PersonState, "traits">>,
): number {
  const t = person.traits;
  return (
    campaignParameter("leanPerDutyBound") *
      (t["personality-v1:facet-duty-bound"] ?? 0) +
    campaignParameter("leanPerGenerous") *
      (t["personality-v1:facet-generous"] ?? 0) +
    campaignParameter("leanPerPractical") *
      (t["personality-v1:facet-practical"] ?? 0)
  );
}

/** A standard normal value for a key (Box and Muller 1958). */
function normalOf(key: string): number {
  const uniform = (k: string) =>
    (parseInt(stableHash(k).slice(0, 12), 16) + 0.5) / 16 ** 12;
  return (
    Math.sqrt(-2 * Math.log(uniform(`${key}:a`))) *
    Math.cos(2 * Math.PI * uniform(`${key}:b`))
  );
}

/**
 * Where a person stands before anything happens in play, standardized: their
 * personality's lean (`z`) carries only its measured share; the rest is the
 * upbringing, family and life the personality facets don't capture, keyed to
 * the person and, for a full person, partly shared with their household.
 */
function openingLeanKey(
  person: Readonly<Pick<PersonState, "id" | "traits">>,
  z: number,
): number {
  const fromPersonality = campaignParameter("personalityLeanCorrelation");
  const household = (person as { householdId?: string }).householdId;
  const shared = household ? campaignParameter("householdLeanShare") : 0;
  const own =
    shared * normalOf(`lean:home:${household}`) +
    Math.sqrt(1 - shared * shared) * normalOf(`lean:person:${person.id}`);
  return (
    fromPersonality * z + Math.sqrt(1 - fromPersonality * fromPersonality) * own
  );
}

interface LeanRank {
  z: number;
  key: number;
  placeId: string;
  rank: number;
  size: number;
}
interface LeanCalibration {
  mean: number;
  sd: number;
  byPlace: Map<string, { id: string; key: number }[]>;
  ranks: Map<string, LeanRank>;
}
const leans = new WeakMap<object, LeanCalibration>();
const countedSources = new WeakMap<
  object,
  () => readonly Pick<PersonState, "id" | "traits">[]
>();

const viewKeys = new WeakMap<
  object,
  (person: Readonly<Pick<PersonState, "id" | "traits">>, z: number) => number
>();

/**
 * Where PEOPLE's views engine runs, each person ranks by their own view's
 * lean; `z` is their standardized opening lean (`openingLeanKey`), for
 * counted residents the engine holds no view for. Registered with the
 * electorate.
 */
export function registerViewLeans(
  people: object,
  key: (
    person: Readonly<Pick<PersonState, "id" | "traits">>,
    z: number,
  ) => number,
): void {
  if (!viewKeys.has(people)) {
    viewKeys.set(people, key);
    leans.delete(people);
  }
}

/**
 * The counted residents (two-level population) whose records rank with the
 * full people for lean: registered by the elections engine for a world.
 */
export function registerCountedPeople(
  people: object,
  source: () => readonly Pick<PersonState, "id" | "traits">[],
): void {
  if (!countedSources.has(people)) {
    countedSources.set(people, source);
    leans.delete(people);
  }
}

/**
 * A person's lean, in [-1, 1]: positive right, negative left. The town's
 * adults are ordered by how far their own view leans right (PEOPLE's views
 * engine; where it doesn't, their personality and the rest of who they are,
 * `openingLeanKey`); each one's lean is where they stand in that order
 * against the share of the vote the right won in their area in 2024, so the
 * opening town splits the way its area really voted. Later views are located
 * against that opening distribution, so a person's changed view is read
 * without forcing the town back to its historical vote share.
 */
export function personLean(
  people: ReadonlyMap<string, Readonly<PersonState>>,
  person: Readonly<Pick<PersonState, "id" | "traits">>,
  townLean: number,
): number {
  let calibration = leans.get(people);
  const viewKey = viewKeys.get(people);
  if (!calibration) {
    const counted = (countedSources.get(people)?.() ?? []).filter(
      (p) => !people.has(p.id),
    );
    const everyone = [
      ...[...people.values()].filter((p) => p.alive),
      ...counted,
    ];
    const scores = everyone.map(personalityLean);
    const mean = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    const sd =
      Math.sqrt(
        scores.reduce((a, b) => a + (b - mean) ** 2, 0) / (scores.length || 1),
      ) || 1;
    const byPlace: LeanCalibration["byPlace"] = new Map();
    const ranks: LeanCalibration["ranks"] = new Map();
    for (const [i, p] of everyone.entries()) {
      const z = openingLeanKey(p, (scores[i]! - mean) / sd);
      const key = viewKey ? viewKey(p, z) : z;
      const placeId = (p as { placeId?: string }).placeId ?? "";
      let group = byPlace.get(placeId);
      if (!group) byPlace.set(placeId, (group = []));
      group.push({ id: p.id, key });
      ranks.set(p.id, { z, key, placeId, rank: 0, size: 0 });
    }
    for (const group of byPlace.values()) {
      group.sort((a, b) => b.key - a.key || a.id.localeCompare(b.id));
      for (const [rank, p] of group.entries()) {
        const held = ranks.get(p.id)!;
        held.rank = rank;
        held.size = group.length;
      }
    }
    calibration = { mean, sd, byPlace, ranks };
    leans.set(people, calibration);
  }
  const placeId = (person as { placeId?: string }).placeId ?? "";
  let held = calibration.ranks.get(person.id);
  const z =
    held?.z ??
    openingLeanKey(
      person,
      (personalityLean(person) - calibration.mean) / calibration.sd,
    );
  // A counted resident may now have a full person's own view; a later view
  // change must also reach campaigns. Keep the opening distribution, not a
  // frozen answer for this person. Only a changed key needs a binary search.
  const key = viewKey ? viewKey(person, z) : z;
  if (!held || held.key !== key || held.placeId !== placeId) {
    const group = calibration.byPlace.get(placeId) ?? [];
    let low = 0,
      high = group.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      const row = group[middle]!;
      if (
        row.key > key ||
        (row.key === key && row.id.localeCompare(person.id) < 0)
      )
        low = middle + 1;
      else high = middle;
    }
    held = { z, key, placeId, rank: low, size: group.length };
    calibration.ranks.set(person.id, held);
  }
  const rightShare = (1 + townLean) / 2;
  return Math.max(
    -1,
    Math.min(
      1,
      held.size
        ? 2 * (rightShare - (held.rank + 0.5) / held.size)
        : townLean + personalityLean(person),
    ),
  );
}

/** How strongly a person supports a question's "yes", in [-1, 1]. */
export function personStance(lean: number, question: string): number {
  return lean * questionAxis(question);
}

const lineAxis = (lineAxes as { lines: Record<string, { axis: number }> })
  .lines;

/**
 * A question's left-right direction: a recorded policy question's, or for
 * spending on a budget line ("budget-line:<line>"), who wants more spent on
 * it (GSS and Pew by party).
 */
export function questionAxis(question: string): number {
  if (question.startsWith("budget-line:"))
    return lineAxis[question.slice("budget-line:".length)]?.axis ?? 0;
  return axisOf[question]?.axis ?? 0;
}

const supportOf = (
  support as unknown as { questions: Record<string, { support: number }> }
).questions;

/**
 * How strongly a person supports a question's "yes" as a voter deciding it
 * directly (a ballot measure, a recall over it), in [-2, 2]: their own lean
 * on the question plus how popular the policy is across the country, set so
 * that a country spread evenly from left to right favors it in the polled
 * share (`data/research/campaigns/policy-support-2026.json`).
 */
export function publicSupport(lean: number, question: string): number {
  const axis = axisOf[question]?.axis ?? 0;
  const share = supportOf[question]?.support ?? 0.5;
  return lean * axis + publicOffset(question, axis, share);
}

/** The popularity term alone: |axis| × (2 × polled share − 1). */
export function publicOffset(
  question: string,
  axis = axisOf[question]?.axis ?? 0,
  share = supportOf[question]?.support ?? 0.5,
): number {
  return Math.abs(axis) * (2 * share - 1);
}

/** Where a person sits on the survey's faith index (0 to 1) and whether they hold a four-year degree (0 or 1). */
export interface StanceProfile {
  readonly faith: number;
  readonly college: number;
}

const LOADINGS = stanceLoadings.questions as unknown as Record<
  string,
  { loadings: { faith: { value: number }; college: { value: number } } }
>;
const PREDICTORS = stanceLoadings.predictors;

/** The faith index a CES 2020 faith group sits at (its mean), or undefined for a group the survey lacks. */
export function faithIndexOf(group: string): number | undefined {
  return (PREDICTORS.faithMeanByGroup as Record<string, number>)[group];
}

/**
 * What a person's faith and degree add to their opening stance on a question
 * the 2020 Cooperative Election Study asked (`opening-stance-loadings.json`):
 * each loading times how far they sit from the average person, so a town's
 * mean stance stays on the lean axis. A question with no survey item, or a
 * person with no profile, adds nothing (ESTIMATED).
 */
export function loadingShift(
  profile: StanceProfile | null | undefined,
  question: string,
): number {
  const loadings = LOADINGS[question]?.loadings;
  if (!loadings || !profile) return 0;
  return (
    loadings.faith.value * (profile.faith - PREDICTORS.nationalFaithMean) +
    loadings.college.value * (profile.college - PREDICTORS.collegeShare)
  );
}

/**
 * How much a person or counted group agrees with a platform, in [-1, 1]: the
 * mean, over the stated positions, of their stance on each (their lean along
 * the question's axis, and what their faith and degree add) times the
 * position. A counted voter and a full person of the same lean and profile
 * agree alike (one model, two tiers).
 */
export function groupAgreement(
  lean: number,
  platform: readonly Stance[],
  profile: StanceProfile | null | undefined,
): number {
  if (!platform.length) return 0;
  let sum = 0;
  // Their own view times the platform's position: someone with no view of a
  // question is barely moved either way by it; someone who holds it strongly
  // is drawn or put off (owner, Oct 9: most people hold weak views or none).
  for (const stance of platform)
    sum +=
      Math.max(
        -1,
        Math.min(
          1,
          personStance(lean, stance.question) +
            loadingShift(profile, stance.question),
        ),
      ) * stance.position;
  return Math.max(-1, Math.min(1, sum / platform.length));
}
