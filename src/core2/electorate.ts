/**
 * The electorate the world doesn't name, in one engine (owner, Oct 14, 2026):
 * the town's counted residents (two-level population) each vote from their
 * own record (age, traits, work hours, place in the town's lean order)
 * without being filled in as a full person, and every place outside them (the
 * rest of a county, district or state, other states) is counted on the same
 * engine at a coarser level: the town's counted voters re-placed on that
 * place's own lean and weighted to its eligible voters
 * (`electorate-places.ts`). Filled-in residents are full people and vote
 * through the named route. See docs/design/electorate-one-model.md.
 */
import {
  campaignParameter,
  platformAgreement,
  registerCountedPeople,
  registerViewLeans,
  type Stance,
} from "./campaign-views";
import { electorateParameter } from "./electorate-inputs";
import { interestOf, turnoutShare } from "./turnout";
import type { ElectoratePlace } from "./electorate-places";
import { stateOfPlaceKey } from "./places";
import { residentsRuntime } from "./modules/residents";
import { isDemoted } from "./counted-groups";
import { VIEWS_KEYS, VIEWS_MODULE_ID, viewOf } from "./modules/views";
import { corePlaceByJurisdictionId } from "./place-lookup";
import viewsData from "./data/views/views.json" with { type: "json" };
import { coreAPI } from "./state";
import type { CoreState } from "./types";

export interface CountedVoter {
  readonly id: string;
  readonly birthDate: string;
  readonly placeId: string;
  readonly traits: Readonly<Record<string, number>>;
  /** Scheduled weekly work, from their recorded commitments. */
  readonly weeklyMinutes: number;
  /** The highest hourly pay of their open work commitments; zero with no work. */
  readonly hourlyMinor: number;
  /** Real voters this record stands for (its household's weight; one where the town opened at its own count). */
  readonly weight: number;
}

const cache = new WeakMap<CoreState, { date: string; rows: CountedVoter[] }>();

/** The state key of the world's own town ("US-MA"), the home of its counted people. */
function townStateKey(core: CoreState): string {
  return stateOfPlaceKey(core.placeMetadata?.placeKey ?? "") ?? "";
}

/** A counted resident's survey cell (see `surveyCell`): their state's, falling back to the nation's where the survey has no state sample. */
export function countedSurveyCell(
  core: CoreState,
  voter: Pick<CountedVoter, "placeId" | "birthDate">,
) {
  return surveyCell(
    voter.placeId,
    voter.birthDate,
    core.startedAt,
    townStateKey(core),
  );
}

/** Every counted resident still counted (not filled in), with their record's facts. */
export function countedResidents(core: CoreState): readonly CountedVoter[] {
  const hit = cache.get(core);
  // Kept for the day, until someone is filled in or the people change.
  const key = `${core.date}|${core.people.size}|${residentsRuntime(core)?.store.membersVersion ?? 0}`;
  if (hit && hit.date === key) return hit.rows;
  const rt = residentsRuntime(core);
  const rows: CountedVoter[] = [];
  if (rt) {
    // Read straight from the counted groups' columns: traits in place, no
    // record per person (one model, two tiers).
    const store = rt.store;
    for (const h of store.liveHouseholds()) {
      const minutes = new Map<string, number>();
      const hourly = new Map<string, number>();
      for (const c of h.workCommitments) {
        if (c.endsAt !== undefined && c.endsAt <= core.date) continue;
        minutes.set(
          c.personId,
          (minutes.get(c.personId) ?? 0) + c.expectedWeeklyMinutes,
        );
        hourly.set(
          c.personId,
          Math.max(hourly.get(c.personId) ?? 0, c.hourlyMinor),
        );
      }
      for (const m of store.countedMembers(h)) {
        const id = store.ids[m]!;
        // A full person returned to the counts votes as counted.
        const full = core.people.get(id);
        if (full && !isDemoted(full)) continue;
        rows.push({
          id,
          birthDate: store.born[m]!,
          placeId: store.text(store.placeIx[m]!)!,
          traits: store.packedTraits(m),
          weeklyMinutes: minutes.get(id) ?? 0,
          hourlyMinor: hourly.get(id) ?? 0,
          weight: store.weightOf(h),
        });
      }
    }
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  cache.set(core, { date: key, rows });
  return rows;
}

/**
 * A custom world's politics settings (recorded in `worldSettings`): the
 * shift of the town's lean (-1 left to +1 right) and the turnout setting,
 * which divides every voter's cost of voting. A real world has neither.
 */
export function customPolitics(core: CoreState): {
  readonly leanShift: number;
  readonly turnout: number;
} {
  const raw = core.placeMetadata.worldSettings;
  if (typeof raw !== "string" || !raw) return { leanShift: 0, turnout: 1 };
  const politics = (
    JSON.parse(raw) as {
      politics?: { leanShift?: number; turnout?: number };
    }
  ).politics;
  return {
    leanShift: politics?.leanShift ?? 0,
    turnout: politics?.turnout ?? 1,
  };
}

/**
 * A custom world's strength for one party (`politics.partyStrength`, a
 * multiplier by party name): how hard that party's label pulls a voter whose
 * lean favors it. A name matches the party's label whether or not "Party" is
 * written; no setting, or no match, is 1.
 */
export function partyStrength(core: CoreState, party: string | null): number {
  const raw = core.placeMetadata.worldSettings;
  if (!party || typeof raw !== "string" || !raw) return 1;
  const strengths = (
    JSON.parse(raw) as {
      politics?: { partyStrength?: Readonly<Record<string, number>> };
    }
  ).politics?.partyStrength;
  if (!strengths) return 1;
  const label = party.toLowerCase();
  for (const [name, value] of Object.entries(strengths)) {
    const key = name.toLowerCase().replace(/\s*party$/, "");
    if (
      key &&
      (label === key ||
        label.startsWith(`${key} `) ||
        label === name.toLowerCase())
    )
      return value;
  }
  return 1;
}

/** Let the counted residents rank with the full people for lean. */
export function registerElectorate(core: CoreState): void {
  registerCountedPeople(core.people, () => countedResidents(core));
  // Where PEOPLE's views engine runs, a full person's lean is their own
  // view; a counted resident's is their survey cell's (state, age,
  // education and faith) spread by their personality.
  if (!core.modules.has(VIEWS_MODULE_ID)) return;
  const api = coreAPI(core);
  const counted = new Map<string, CountedVoter>();
  registerViewLeans(core.people, (person, z) => {
    if (core.people.has(person.id)) return viewOf(api, person.id)?.lean ?? 0;
    if (!counted.size)
      for (const row of countedResidents(core)) counted.set(row.id, row);
    const row = counted.get(person.id);
    if (!row) return 0;
    const cell = surveyCell(
      row.placeId,
      row.birthDate,
      core.startedAt,
      townStateKey(core),
    );
    return cell.mean + cell.sd * z;
  });
}

const MIN_CELL = (
  viewsData.parameters as unknown as Record<string, { value: number }>
).minimumCellRespondents!.value;
const cells = new Map<
  string,
  { mean: number; sd: number; engagement?: number }
>();
/**
 * A counted resident's survey cell: their state's CES 2024 spread at their
 * age (the state's whole spread where the age cell is thin, the nation's
 * where the survey has no state sample), shared by everyone of that age.
 */
function surveyCell(
  placeId: string,
  birthDate: string,
  date: string,
  townState: string,
): { mean: number; sd: number; engagement?: number } {
  // The town's own counted households keep their governing unit's place id,
  // which the place lookup may not know: they are the town's people, in its state.
  const key =
    corePlaceByJurisdictionId(placeId as never)?.stateJurisdictionKey ??
    townState;
  const state = key ? key.slice(key.lastIndexOf("-") + 1) : "";
  const age =
    Number(date.slice(0, 4)) -
    Number(birthDate.slice(0, 4)) -
    (date.slice(5) < birthDate.slice(5) ? 1 : 0);
  const band =
    VIEWS_KEYS.ageBands.find((b) => {
      const [low, high] = b.split("-");
      return age >= Number(low) && (high === "plus" || age <= Number(high));
    }) ?? VIEWS_KEYS.ageBands[0]!;
  const id = `${state}:${band}`;
  let cell = cells.get(id);
  if (!cell) {
    const row = VIEWS_KEYS.states[state];
    const byAge = row?.byAge[band];
    cell = row
      ? byAge && byAge.n >= MIN_CELL
        ? byAge
        : row
      : VIEWS_KEYS.national;
    cells.set(id, cell);
  }
  return cell;
}

/**
 * How closely a voter follows politics (CES 2024 news interest, 0 to 1),
 * where PEOPLE's views engine runs: a full person's own, a counted
 * resident's survey cell's (state and age). Null without the engine.
 */
export function engagementOf(
  core: CoreState,
  voter: {
    readonly id: string;
    readonly birthDate?: string;
    readonly placeId?: string;
  },
): number | null {
  if (!core.modules.has(VIEWS_MODULE_ID)) return null;
  if (core.people.has(voter.id))
    return viewOf(coreAPI(core), voter.id)?.engagement ?? null;
  if (!voter.birthDate || !voter.placeId) return null;
  const cell = surveyCell(
    voter.placeId,
    voter.birthDate,
    core.startedAt,
    townStateKey(core),
  ) as {
    engagement?: number;
  };
  return cell.engagement ?? VIEWS_KEYS.national.engagement ?? null;
}

/** The nation's average engagement, the center turnout reads it against. */
export const NATIONAL_ENGAGEMENT = VIEWS_KEYS.national.engagement ?? 0;

/**
 * What a counted voter can know of one candidate on a ballot: the party
 * label, the candidate's public standing (appeal on the lean scale), and, for
 * the town's own people, how well known the candidate is in town and for
 * what.
 */
export interface CountedFieldEntry {
  readonly id: string;
  readonly side: number;
  readonly isIncumbent: boolean;
  /** Public standing every voter in the race sees, appeal units. */
  readonly standing: number;
  /** Standing felt only in the town and the place around it (its jobs and crime). */
  readonly localStanding: number;
  /** The share of the town's named adults who have heard of the candidate. */
  readonly recognition: number;
  readonly platform: readonly Stance[];
  /**
   * A reported scandal as the town received it: the penalty in appeal units
   * times the share of the town's named adults the story reached (0 where
   * none was reported). A named voter reads their own knowledge instead.
   */
  readonly scandal?: number;
  /**
   * What the candidate's place on each form of the printed ballot brings,
   * appeal units (the first-listed edge); one form unless the law rotates
   * names (`ballot-order.ts`).
   */
  readonly ballotCues?: readonly number[];
}

/** One counted voter's appeal for a candidate, with its parts. */
export interface CountedAppeal {
  readonly total: number;
  /** The candidate's party side against the voter's own lean. */
  readonly party: number;
  /** The candidate's public standing (incumbency, record, economy...). */
  readonly standing: number;
  /** Being known in town, and for what. */
  readonly recognition: number;
  /** The incumbent side of the voter's traits. */
  readonly incumbent: number;
  /** The candidate's place on the printed ballot. */
  readonly ballot: number;
  /** A reported scandal, as far as the news reached the town and the voter trusts it. */
  readonly scandal: number;
}

/**
 * A counted voter's appeal for each candidate, from what the ballot and the
 * town tell them: the party label against their own lean, each candidate's
 * public standing, how well known each is in town with the platform they're
 * known for (the town's own people only), and the incumbent side of their
 * traits.
 */
export function countedAppeal(
  lean: number,
  field: readonly CountedFieldEntry[],
  where: {
    readonly inTown: boolean;
    readonly local: boolean;
    readonly incumbentLean: number;
    /** How much the voter trusts the press against the average reader (1); news-weighted parts scale by it. */
    readonly trust?: number;
    /** Which form of the ballot the voter holds (their precinct's place in a rotation). */
    readonly ballotForm?: number;
  },
): Record<string, CountedAppeal> {
  const appeal: Record<string, CountedAppeal> = {};
  for (const entry of field) {
    const party = lean * entry.side;
    const standing = entry.standing + (where.local ? entry.localStanding : 0);
    const recognition = where.inTown
      ? entry.recognition *
        (campaignParameter("countedRecognitionWeight") +
          platformAgreement(lean, entry.platform))
      : 0;
    const incumbent = entry.isIncumbent ? where.incumbentLean : 0;
    const cues = entry.ballotCues ?? [];
    const ballot = cues.length
      ? cues[(where.ballotForm ?? 0) % cues.length]!
      : 0;
    // A local outlet's story reaches only the town's own people.
    const scandal = where.inTown
      ? -(entry.scandal ?? 0) * (where.trust ?? 1)
      : 0;
    appeal[entry.id] = {
      total: party + standing + recognition + incumbent + ballot + scandal,
      party,
      standing,
      recognition,
      incumbent,
      ballot,
      scandal,
    };
  }
  return appeal;
}

/**
 * The candidate a voter backs: the one they rank first, where something
 * separates them from the next; a lone candidate unless the voter is against
 * them (the named voters' rule in voting.ts). With nothing to separate the
 * candidates, the race is left blank.
 */
export function countedChoice(
  appeal: Readonly<Record<string, { readonly total: number }>>,
): string | null {
  const ranked = Object.entries(appeal).sort(
    (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]),
  );
  if (ranked.length === 1)
    return ranked[0]![1].total >= 0 ? ranked[0]![0] : null;
  return ranked.length > 1 && ranked[0]![1].total > ranked[1]![1].total
    ? ranked[0]![0]
    : null;
}

/**
 * The town's counted voters as they stand for a place counted coarsely:
 * each one's place in the town's lean order (0 the farthest right), what
 * moves them to the polls apart from the race (duty and engagement less the
 * cost of voting that day), and the incumbent side of their traits.
 */
export interface SampleVoter {
  readonly id: string;
  readonly rank: number;
  readonly readiness: number;
  readonly incumbentLean: number;
  /** Real voters this sampled record stands for (the order's rank is by their running total). */
  readonly weight: number;
}

/** A place counted coarsely, as a race sees it. */
export type RacePlace = ElectoratePlace & {
  /** Its people are the town's (they know what the town knows). */
  readonly inTown?: boolean;
  /** Its people feel the town's jobs and crime. */
  readonly local?: boolean;
  /** Takes out the barred share. */
  readonly scale?: number;
  /** The change in the cost of voting its state has seen. */
  readonly readinessShift?: number;
};

/** One place's count. */
export interface PlaceResult {
  readonly id: string;
  readonly name: string;
  readonly eligible: number;
  readonly rightShare: number;
  readonly cast: number;
  readonly votes: Readonly<Record<string, number>>;
  readonly source: string;
}

/**
 * Where a place's people stand on the lean order for its 2024 vote. The
 * people who feel most strongly turn out most (interest is the strength of
 * their strongest feeling), so a place whose people stood at its 2024 share
 * would vote past it, toward its majority. Placing them is a calibration of
 * the input, as the 2024 vote is the place's only record of where its people
 * stand: the right share at which these voters, with no candidate standing,
 * would split as the place did. Everything that moves in play (standing,
 * conditions, laws, the cycle) moves the vote from there.
 */
function orderPlacement(
  voters: readonly SampleVoter[],
): (target: number) => number {
  // Each voter's own readiness against their own place in the order: who
  // turns out at what strength of feeling, as the count itself decides it.
  const shareAt = (right: number) => {
    let r = 0,
      all = 0;
    for (const voter of voters) {
      const lean = Math.max(-1, Math.min(1, 2 * (right - voter.rank)));
      // The one turnout rule (`turnout.ts`): with two typical candidates the
      // gap between them in this voter's eyes is twice their lean.
      const share = turnoutShare(voter.readiness, 2 * Math.abs(lean));
      all += share;
      if (lean > 0) r += share;
      else if (lean === 0) r += share / 2;
    }
    return all ? r / all : right;
  };
  const cache = new Map<number, number>();
  return (target) => {
    if (!voters.length) return target;
    const hit = cache.get(target);
    if (hit !== undefined) return hit;
    let lo = 0,
      hi = 1;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (shareAt(mid) < target) lo = mid;
      else hi = mid;
    }
    const right = (lo + hi) / 2;
    cache.set(target, right);
    return right;
  };
}

/**
 * Count places outside the town's counted residents on the same engine:
 * each place's voters are the town's counted voters re-placed on the
 * place's own lean (the same rank in the order, against the place's right
 * share) and weighted to its eligible voters. They turn out by the same
 * rule (readiness and how strongly they feel about the race) and choose by
 * the same rule; nobody is filled in to do it. In a primary only those who
 * take part (party identifiers of the side, and others where it is open)
 * vote.
 */
export function countPlaces(
  sample: readonly SampleVoter[],
  places: readonly RacePlace[],
  field: readonly CountedFieldEntry[],
  primary?: {
    readonly side: number | null;
    readonly cut: number;
    readonly open: boolean;
  },
): {
  readonly votes: Readonly<Record<string, number>>;
  readonly cast: number;
  readonly places: readonly PlaceResult[];
} {
  const size = Math.max(1, electorateParameter("coarseSampleVoters"));
  // Evenly spaced through the town's voters, each record counting as many
  // places in the line as the real voters it stands for.
  const total = sample.reduce((n, v) => n + v.weight, 0);
  const step = Math.max(1, total / size);
  const voters: SampleVoter[] = [];
  let upTo = 0,
    at = 0;
  for (let i = step / 2; i < total && at < sample.length; i += step) {
    while (at < sample.length - 1 && upTo + sample[at]!.weight <= i) {
      upTo += sample[at]!.weight;
      at += 1;
    }
    voters.push(sample[at]!);
  }
  const totals: Record<string, number> = {};
  const results: PlaceResult[] = [];
  const placement = orderPlacement(voters);
  let cast = 0;
  for (const place of places) {
    const votes: Record<string, number> = {};
    let placeCast = 0;
    const weight =
      voters.length && place.eligible > 0
        ? (place.eligible * (place.scale ?? 1)) / voters.length
        : 0;
    // Where the place's people stand on the lean order: so that with no
    // candidate standing they would split as the place voted in 2024 (the
    // town's own people stand where the town's order puts them).
    const right = place.inTown ? place.rightShare : placement(place.rightShare);
    if (weight > 0)
      for (const [form, voter] of voters.entries()) {
        const lean = Math.max(-1, Math.min(1, 2 * (right - voter.rank)));
        if (primary) {
          const identifies = Math.abs(lean) >= primary.cut && lean !== 0;
          const takesPart =
            primary.side === null ||
            (identifies && Math.sign(lean) === primary.side) ||
            (primary.open && !identifies);
          if (!takesPart) continue;
        }
        const appeal = countedAppeal(lean, field, {
          inTown: place.inTown ?? false,
          local: place.local ?? false,
          incumbentLean: voter.incumbentLean,
          // The place's voters hold each form of a rotated ballot in turn.
          ballotForm: form,
        });
        // The one turnout rule (`turnout.ts`): each sample voter stands for
        // the place's people like them, who turn out at their propensity.
        const share =
          weight *
          turnoutShare(
            voter.readiness + (place.readinessShift ?? 0),
            interestOf(appeal),
          );
        placeCast += share;
        const choice = countedChoice(appeal);
        if (choice) votes[choice] = (votes[choice] ?? 0) + share;
      }
    for (const id of Object.keys(votes)) {
      votes[id] = Math.round(votes[id]!);
      totals[id] = (totals[id] ?? 0) + votes[id]!;
    }
    const placeCastRounded = Math.round(placeCast);
    cast += placeCastRounded;
    results.push({
      id: place.id,
      name: place.name,
      eligible: place.eligible,
      rightShare: place.rightShare,
      cast: placeCastRounded,
      votes,
      source: place.source,
    });
  }
  return { votes: totals, cast, places: results };
}
