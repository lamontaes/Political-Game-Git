/**
 * What a voter thinks of a platform: the stand-in for individual views.
 *
 * OPUS-PEOPLE's views engine will give each person their own stance on each
 * question, formed from their life. Until it does (SG-GOV-views-stand-in), a
 * person's lean starts from how their own congressional district voted in
 * 2024 (Clerk of the House), moved by the personality facets the research
 * links to ideology (`data/campaigns/parameters.json`). Their stance on a
 * question is that lean along the question's measured left-right axis
 * (`data/research/campaigns/issue-axes-2026.json`).
 */
import axes from "../../data/research/campaigns/issue-axes-2026.json" with { type: "json" };
import support from "../../data/research/campaigns/policy-support-2026.json" with { type: "json" };
import calibration from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import delegates from "../../data/research/elections/house-delegates-2024.json" with { type: "json" };
import parameters from "./data/campaigns/parameters.json" with { type: "json" };
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
function personalityLean(person: Readonly<PersonState>): number {
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

const leans = new WeakMap<object, Map<string, number>>();

/**
 * A person's lean, in [-1, 1]: positive right, negative left. The town's
 * adults are ordered by how far their personality leans right (generation
 * order breaks ties); each one's lean is where they stand in that order
 * against the share of the vote the right won in their area in 2024, so the
 * town as a whole splits the way its area really voted.
 */
export function personLean(
  people: ReadonlyMap<string, Readonly<PersonState>>,
  person: Readonly<PersonState>,
  townLean: number,
): number {
  let map = leans.get(people);
  if (!map) {
    const ordered = [...people.values()]
      .filter((p) => p.alive)
      .sort(
        (a, b) =>
          personalityLean(b) - personalityLean(a) || a.id.localeCompare(b.id),
      );
    const rightShare = (1 + townLean) / 2;
    map = new Map(
      ordered.map((p, rank) => [
        p.id,
        Math.max(
          -1,
          Math.min(1, 2 * (rightShare - (rank + 0.5) / ordered.length)),
        ),
      ]),
    );
    leans.set(people, map);
  }
  return map.get(person.id) ?? townLean + personalityLean(person);
}

/** How strongly a person supports a question's "yes", in [-1, 1]. */
export function personStance(lean: number, question: string): number {
  return lean * (axisOf[question]?.axis ?? 0);
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
 * stated positions, of how close the position is to their own stance.
 */
export function platformAgreement(
  lean: number,
  platform: readonly Stance[],
): number {
  if (!platform.length) return 0;
  let sum = 0;
  for (const stance of platform)
    sum += 1 - Math.abs(personStance(lean, stance.question) - stance.position);
  return Math.max(-1, Math.min(1, sum / platform.length));
}
