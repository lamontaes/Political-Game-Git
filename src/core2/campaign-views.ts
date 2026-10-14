/**
 * What a voter thinks of a platform.
 *
 * A person's lean is their own view from PEOPLE's views engine (their CES
 * 2024 cell and household), placed against how their own congressional
 * district voted in 2024 (Clerk of the House). A world run without the views
 * engine (engine tests) orders people by the personality facets the research
 * links to ideology (`data/campaigns/parameters.json`). Their stance on a
 * question is that lean along the question's measured left-right axis
 * (`data/research/campaigns/issue-axes-2026.json`).
 */
import axes from "../../data/research/campaigns/issue-axes-2026.json" with { type: "json" };
import support from "../../data/research/campaigns/policy-support-2026.json" with { type: "json" };
import lineAxes from "./data/legislature/budget-line-axes.json" with { type: "json" };
import calibration from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import delegates from "../../data/research/elections/house-delegates-2024.json" with { type: "json" };
import parameters from "./data/campaigns/parameters.json" with { type: "json" };
import { stableHash } from "../simulation/ids";
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

const leans = new WeakMap<object, Map<string, number>>();
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
  if (!viewKeys.has(people)) viewKeys.set(people, key);
}

/**
 * The counted residents (two-level population) whose records rank with the
 * full people for lean: registered by the elections engine for a world.
 */
export function registerCountedPeople(
  people: object,
  source: () => readonly Pick<PersonState, "id" | "traits">[],
): void {
  if (!countedSources.has(people)) countedSources.set(people, source);
}

/**
 * A person's lean, in [-1, 1]: positive right, negative left. The town's
 * adults are ordered by how far their own view leans right (PEOPLE's views
 * engine; where it doesn't, their personality and the rest of who they are,
 * `openingLeanKey`); each one's lean is where they stand in that order
 * against the share of the vote the right won in their area in 2024, so the
 * town as a whole splits the way its area really voted.
 */
export function personLean(
  people: ReadonlyMap<string, Readonly<PersonState>>,
  person: Readonly<Pick<PersonState, "id" | "traits">>,
  townLean: number,
): number {
  let map = leans.get(people);
  if (!map) {
    // Everyone in the town ranks together: full people and the counted
    // residents (two-level population), each by their own record.
    const counted = (countedSources.get(people)?.() ?? []).filter(
      (p) => !people.has(p.id),
    );
    const everyone = [
      ...[...people.values()].filter((p) => p.alive),
      ...counted,
    ];
    // Each person's own view where the views engine runs (their personality
    // otherwise): that orders them; the town's real vote places the order.
    const viewKey = viewKeys.get(people);
    const scores = everyone.map(personalityLean);
    const mean = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    const sd =
      Math.sqrt(
        scores.reduce((a, b) => a + (b - mean) ** 2, 0) / (scores.length || 1),
      ) || 1;
    const key = new Map(
      everyone.map((p, i) => {
        const z = openingLeanKey(p, (scores[i]! - mean) / sd);
        return [p.id, viewKey ? viewKey(p, z) : z];
      }),
    );
    const ordered = everyone.sort(
      (a, b) => key.get(b.id)! - key.get(a.id)! || a.id.localeCompare(b.id),
    );
    // Rank each place on its own: the world also holds people elsewhere
    // (relatives living away), who must not shift where the town's people
    // stand against the town's vote.
    const byPlace = new Map<string, typeof ordered>();
    for (const p of ordered) {
      const key = (p as { placeId?: string }).placeId ?? "";
      byPlace.set(key, [...(byPlace.get(key) ?? []), p]);
    }
    const rightShare = (1 + townLean) / 2;
    map = new Map(
      [...byPlace.values()].flatMap((group) =>
        group.map((p, rank): [string, number] => [
          p.id,
          Math.max(
            -1,
            Math.min(1, 2 * (rightShare - (rank + 0.5) / group.length)),
          ),
        ]),
      ),
    );
    leans.set(people, map);
  }
  return map.get(person.id) ?? townLean + personalityLean(person);
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

/**
 * How much a person agrees with a platform, in [-1, 1]: the mean, over the
 * stated positions, of their own stance times the position.
 */
export function platformAgreement(
  lean: number,
  platform: readonly Stance[],
): number {
  if (!platform.length) return 0;
  let sum = 0;
  // Their own view times the platform's position: someone with no view of a
  // question is barely moved either way by it; someone who holds it strongly
  // is drawn or put off (owner, Oct 9: most people hold weak views or none).
  for (const stance of platform)
    sum += personStance(lean, stance.question) * stance.position;
  return Math.max(-1, Math.min(1, sum / platform.length));
}
