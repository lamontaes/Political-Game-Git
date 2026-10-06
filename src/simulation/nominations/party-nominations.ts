import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import {
  ensurePeopleTraitCatalog,
  ensurePeopleTraits,
  traitConsiderations,
} from "../people-traits";
import type {
  DecisionConsideration,
  EntityId,
  HistoricalEvent,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import type { NominationMethod, NominationPlan } from "./nomination-rules";

/**
 * THE NOMINATION STAGE — how a field of candidates becomes the names on the
 * general-election ballot, under the state's own method.
 *
 * - A party primary (most states): each party's entrants meet among
 *   themselves. One entrant is nominated unopposed; two or more split the
 *   vote. Where the state has a runoff and nobody reaches its threshold, the
 *   top two meet again on the runoff date (in North Carolina only if the
 *   runner-up asks).
 * - An all-party primary (California and Washington top two, Alaska top four,
 *   Nebraska's legislature): every entrant of every party is on one ballot,
 *   and the top finishers go on, even two of one party.
 * - An all-party majority primary (Louisiana's state offices): a majority wins
 *   outright; otherwise the top two go on.
 *
 * One public record per seat and stage (`election.party-nomination`, then
 * `election.nomination-runoff`) names every entrant with their share of the
 * vote and what became of them. Nothing else is stored: who is on the general
 * ballot is read back from those records.
 *
 * ESTIMATED FROM GAME EVIDENCE: primary voters split from the standing the
 * game records for each candidate. Across every represented place, a sitting
 * member has pull 1.5, a party-recruited candidate 1.25, and another entrant
 * 1. In an all-party primary, the district's recorded party share also bears
 * on that pull. Nothing is drawn: the same recorded field gives the same
 * result. A runoff uses each finalist's recorded primary share.
 *
 * An exact tie at the place that decides who goes on is not broken here:
 * the tied entrants are recorded as tied and nobody takes that place, as the
 * state's own recount or lot would have to settle it.
 */

export const NOMINATION_VERSION = "party-nominations/v1";
export const NOMINATION_EVENT = "election.party-nomination";
export const NOMINATION_RUNOFF_EVENT = "election.nomination-runoff";

export const NOMINATION_PULL = {
  id: "ocd-primary-pull-estimate/v2",
  incumbent: 1.5,
  partyBacked: 1.25,
  other: 1,
} as const;

export interface NominationEntrant {
  readonly personId: EntityId;
  readonly party: string;
  readonly incumbent: boolean;
  /** The party asked this person to run. */
  readonly partyBacked: boolean;
}

export interface Nominee {
  readonly personId: EntityId;
  readonly party: string;
}

type Status =
  | "unopposed"
  | "nominated"
  | "advanced"
  | "runoff"
  | "lost"
  | "conceded"
  | "tied";

interface Tally {
  readonly entrant: NominationEntrant;
  readonly permille: number;
}

const primaryKey = (key: string) => `${key}:primary`;
const runoffKey = (key: string) => `${key}:runoff`;

/**
 * Nomination records by stable key, indexed once per history array. History
 * arrays are replaced rather than edited, so an index keyed by the array is
 * exact, and a day with no new record reuses it.
 */
const EVENTS_BY_KEY = new WeakMap<
  readonly HistoricalEvent[],
  Map<string, HistoricalEvent>
>();

function eventByKey(world: World, stableKey: string): HistoricalEvent | null {
  const events = world.history.events;
  let index = EVENTS_BY_KEY.get(events);
  if (!index) {
    index = new Map();
    for (const event of events)
      if (
        event.type === NOMINATION_EVENT ||
        event.type === NOMINATION_RUNOFF_EVENT
      )
        index.set(event.stableKey, event);
    EVENTS_BY_KEY.set(events, index);
  }
  return index.get(stableKey) ?? null;
}

/** An entrant's pull with the voters, from their recorded standing. */
function pullOf(
  entrant: NominationEntrant,
  partyShare: ((party: string) => number | null) | null,
): number {
  const base = entrant.incumbent
    ? NOMINATION_PULL.incumbent
    : entrant.partyBacked
      ? NOMINATION_PULL.partyBacked
      : NOMINATION_PULL.other;
  const share = partyShare ? (partyShare(entrant.party) ?? 0.5) : 1;
  return base * Math.max(share, 0.01);
}

function tally(
  entrants: readonly NominationEntrant[],
  pull: (entrant: NominationEntrant) => number,
): readonly Tally[] {
  const pulls = entrants.map((entrant) => ({
    entrant,
    pull: pull(entrant),
  }));
  const total = pulls.reduce((sum, row) => sum + row.pull, 0);
  return pulls
    .map((row) => ({
      entrant: row.entrant,
      permille: Math.round((row.pull / total) * 1000),
    }))
    .sort(
      (a, b) =>
        b.permille - a.permille ||
        a.entrant.personId.localeCompare(b.entrant.personId),
    );
}

/**
 * The share tied across the line when the first `goOn` finishers go on, or
 * null when the line falls between different shares. Entrants with that
 * share neither go on nor lose: the tie is the state's to settle.
 */
function tiedAtLine(tallies: readonly Tally[], goOn: number): number | null {
  const last = tallies[goOn - 1];
  const next = tallies[goOn];
  return last && next && last.permille === next.permille ? last.permille : null;
}

function reachesThreshold(
  permille: number,
  runoff: NonNullable<Extract<NominationPlan, { known: true }>["runoff"]>,
): boolean {
  const threshold = runoff.thresholdPercent * 10;
  return runoff.outright === "at-least"
    ? permille >= threshold
    : permille > threshold;
}

/**
 * ESTIMATED FROM RECORDED RESULT: a runner-up within 100 per mille (10
 * percentage points) of the leader counts as within reach when deciding
 * whether to request a runoff. The estimate uses the same recorded primary
 * shares in every place with a request-only runoff; the runner-up's recorded
 * temperament then decides whether they ask.
 */
const WITHIN_REACH_PERMILLE = 100;

/** Whether the runner-up asks for the runoff a state holds only on request. */
function runnerUpAsks(
  world: World,
  stageKey: string,
  leader: Tally,
  runnerUp: Tally,
  date: IsoDate,
): { world: World; asks: boolean } {
  // A result read on a later advance still decides on its own day, so the
  // runner-up's temperament is recorded on that day, not after it.
  let next = ensurePeopleTraits(
    ensurePeopleTraitCatalog(world),
    [runnerUp.entrant.personId],
    date < world.currentDate ? date : world.currentDate,
  );
  const key = `${stageKey}:runoff-request:${runnerUp.entrant.personId}`;
  const gap = leader.permille - runnerUp.permille;
  const considerations: DecisionConsideration[] = [
    {
      stableKey: `${key}:margin`,
      optionKey: gap <= WITHIN_REACH_PERMILLE ? "request" : "concede",
      sourceType: "context:election-result",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation:
        gap <= WITHIN_REACH_PERMILLE
          ? "They finished within reach of the leader."
          : "They finished far behind the leader.",
      sourceRefs: [],
    },
    ...traitConsiderations(next, runnerUp.entrant.personId, key, [
      {
        optionKey: "request",
        trait: "risk",
        pole: "high",
        explanation: "They would rather take another chance than concede.",
      },
      {
        optionKey: "concede",
        trait: "risk",
        pole: "low",
        explanation: "Another campaign is a risk they would rather not take.",
      },
    ]),
  ];
  const evaluation = evaluateDecision(next, {
    stableKey: key,
    decisionType: "election.consider-nomination-runoff",
    actorPersonId: runnerUp.entrant.personId,
    cutoff: {
      asOfDate: date,
      historySequenceExclusive: next.history.nextSequence,
    },
    subject: { kind: "context:life", key: stageKey, entityId: null },
    options: [
      { key: "request", label: "Ask for a runoff", description: "Run again." },
      { key: "concede", label: "Concede", description: "Accept the result." },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  next = recordDurableDecisionTrace(next, evaluation);
  return { world: next, asks: evaluation.selectedOptionKey === "request" };
}

export interface HoldNominationInput {
  /** The seat and year, e.g. `congress-candidates/v1:slate:us-house-tx-07:2026`. */
  readonly stableKey: string;
  readonly seatKey: string;
  readonly title: string;
  readonly jurisdictionId: EntityId;
  readonly involvedEntityIds: readonly EntityId[];
  readonly plan: Extract<NominationPlan, { known: true }>;
  readonly entrants: readonly NominationEntrant[];
  /** The party's share of the district's voters, for an all-party primary. */
  readonly partyShare: (party: string) => number | null;
}

function isAllParty(method: NominationMethod): boolean {
  return method !== "party-primary";
}

/** Hold the primary on its date. Writes nothing if it was already held. */
export function holdNominationPrimary(
  world: World,
  input: HoldNominationInput,
): World {
  const stableKey = primaryKey(input.stableKey);
  if (eventByKey(world, stableKey)) return world;
  const { plan } = input;
  let next = world;
  const rows: { tally: Tally; status: Status; party: string }[] = [];
  const runoffParties: string[] = [];
  const groups = isAllParty(plan.method)
    ? [{ party: "all", entrants: input.entrants }]
    : [...new Set(input.entrants.map((entrant) => entrant.party))]
        .sort()
        .map((party) => ({
          party,
          entrants: input.entrants.filter((entrant) => entrant.party === party),
        }));
  for (const group of groups) {
    const tallies = tally(group.entrants, (entrant) =>
      pullOf(entrant, isAllParty(plan.method) ? input.partyShare : null),
    );
    if (isAllParty(plan.method)) {
      const majority =
        plan.method === "all-party-majority" &&
        tallies.length > 0 &&
        tallies[0]!.permille > 500;
      const goOn = majority ? 1 : plan.advance;
      const tied = tiedAtLine(tallies, goOn);
      tallies.forEach((row, index) =>
        rows.push({
          tally: row,
          party: row.entrant.party,
          status:
            tallies.length === 1
              ? "unopposed"
              : tied !== null && row.permille === tied
                ? "tied"
                : index < goOn
                  ? majority
                    ? "nominated"
                    : "advanced"
                  : "lost",
        }),
      );
      continue;
    }
    if (tallies.length === 1) {
      rows.push({
        tally: tallies[0]!,
        party: group.party,
        status: "unopposed",
      });
      continue;
    }
    const [leader, runnerUp] = tallies as [Tally, Tally, ...Tally[]];
    const runoff = plan.runoff;
    let needsRunoff =
      runoff !== null &&
      runoff.date !== null &&
      !reachesThreshold(leader.permille, runoff) &&
      (runoff.minimumCandidates === null ||
        tallies.length >= runoff.minimumCandidates);
    if (needsRunoff && runoff!.onRequest) {
      const asked = runnerUpAsks(
        next,
        `${stableKey}:${group.party}`,
        leader,
        runnerUp,
        plan.primaryDate,
      );
      next = asked.world;
      needsRunoff = asked.asks;
    }
    const tied = tiedAtLine(tallies, needsRunoff ? 2 : 1);
    tallies.forEach((row, index) =>
      rows.push({
        tally: row,
        party: group.party,
        status:
          tied !== null && row.permille === tied
            ? "tied"
            : needsRunoff
              ? index < 2
                ? "runoff"
                : "lost"
              : index === 0
                ? "nominated"
                : runoff?.onRequest &&
                    index === 1 &&
                    !reachesThreshold(leader.permille, runoff)
                  ? "conceded"
                  : "lost",
      }),
    );
    if (needsRunoff) runoffParties.push(group.party);
  }
  const runoffDate = runoffParties.length ? plan.runoff!.date : null;
  return recordWorldEvent(next, {
    stableKey,
    type: NOMINATION_EVENT,
    occurredAt: plan.primaryDate,
    recordedAt: next.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [
      ...new Set([
        ...input.involvedEntityIds,
        ...rows.map((row) => row.tally.entrant.personId),
      ]),
    ].sort(),
    participants: rows.map((row) => ({
      personId: row.tally.entrant.personId,
      role: "presence:candidate" as const,
      detail: `${row.tally.entrant.party}|${row.tally.permille}|${row.status}`,
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      NOMINATION_VERSION,
      NOMINATION_PULL.id,
      `seat:${input.seatKey}`,
      `method:${plan.method}`,
      `date-basis:${plan.dateBasis}`,
      ...plan.estimated.map((part) => `estimated-from-average:${part}`),
      ...runoffParties.map((party) => `runoff-party:${party}`),
      ...(runoffDate ? [`runoff-date:${runoffDate}`] : []),
    ],
    summary: nominationSummary(input.title, plan.method, rows, runoffParties),
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function nominationSummary(
  title: string,
  method: NominationMethod,
  rows: readonly { party: string; status: Status }[],
  runoffParties: readonly string[],
): string {
  const contested = new Set(
    rows.filter((row) => row.status !== "unopposed").map((row) => row.party),
  );
  const tied = [
    ...new Set(
      rows.filter((row) => row.status === "tied").map((row) => row.party),
    ),
  ];
  if (tied.length)
    return isAllParty(method)
      ? `The primary for ${title} ended in a tie for the last place on the ballot, which the state must settle.`
      : `The ${tied.join(" and ")} primary for ${title} ended in a tie, which the state must settle before anyone is nominated.`;
  if (isAllParty(method))
    return rows.length === 1
      ? `One candidate filed for ${title}, so the primary sent them on alone.`
      : `${rows.length} ${rows.length === 1 ? "candidate" : "candidates"} of every party met in one primary for ${title}.`;
  if (runoffParties.length)
    return `No ${runoffParties.join(" or ")} candidate for ${title} won enough of the primary vote, so the top two meet in a runoff.`;
  return contested.size
    ? `The ${[...contested].join(" and ")} primary for ${title} chose a nominee.`
    : `Each party's candidate for ${title} was nominated unopposed.`;
}

/** Hold the runoffs a primary left open, on the runoff date. */
export function holdNominationRunoff(
  world: World,
  input: Omit<HoldNominationInput, "entrants" | "partyShare" | "plan">,
): World {
  const primary = eventByKey(world, primaryKey(input.stableKey));
  if (!primary || eventByKey(world, runoffKey(input.stableKey))) return world;
  const date = runoffDateOf(primary);
  if (!date) return world;
  const parties = primary.tags
    .filter((tag) => tag.startsWith("runoff-party:"))
    .map((tag) => tag.slice("runoff-party:".length));
  const rows: { personId: EntityId; detail: string }[] = [];
  let tiedParties: string[] = [];
  for (const party of parties) {
    // Each finalist's recorded share of the primary vote is their standing
    // with the party's voters in the runoff.
    const primaryShare = new Map<EntityId, number>();
    const entrants: NominationEntrant[] = primary.participants.flatMap(
      (participant) => {
        const [p, permille, status] = (participant.detail ?? "").split("|");
        if (p !== party || status !== "runoff") return [];
        primaryShare.set(participant.personId, Number(permille));
        return [
          {
            personId: participant.personId,
            party,
            incumbent: false,
            partyBacked: false,
          },
        ];
      },
    );
    // A candidate who died before the runoff cannot win it.
    const living = entrants.filter(
      (entrant) =>
        !world.history.personDeaths.some(
          (death) =>
            death.personId === entrant.personId && death.diedAt <= date,
        ),
    );
    const tallies = tally(living, (entrant) =>
      Math.max(primaryShare.get(entrant.personId) ?? 0, 1),
    );
    const tied = tiedAtLine(tallies, 1);
    if (tied !== null) tiedParties = [...tiedParties, party];
    tallies.forEach((row, index) =>
      rows.push({
        personId: row.entrant.personId,
        detail: `${party}|${row.permille}|${
          tied !== null && row.permille === tied
            ? "tied"
            : index === 0
              ? "nominated"
              : "lost"
        }`,
      }),
    );
  }
  return recordWorldEvent(world, {
    stableKey: runoffKey(input.stableKey),
    type: NOMINATION_RUNOFF_EVENT,
    occurredAt: date,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [
      ...new Set([...input.involvedEntityIds, ...rows.map((r) => r.personId)]),
    ].sort(),
    participants: rows.map((row) => ({
      personId: row.personId,
      role: "presence:candidate" as const,
      detail: row.detail,
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      NOMINATION_VERSION,
      NOMINATION_PULL.id,
      `seat:${input.seatKey}`,
      `primary:${primary.id}`,
    ],
    summary: tiedParties.length
      ? `The ${tiedParties.join(" and ")} runoff for ${input.title} ended in a tie, which the state must settle before anyone is nominated.`
      : `The ${parties.join(" and ")} runoff for ${input.title} chose a nominee.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** The runoff date a primary record left open, or null when none is pending. */
export function runoffDateOf(primary: HistoricalEvent): IsoDate | null {
  const tag = primary.tags.find((candidate) =>
    candidate.startsWith("runoff-date:"),
  );
  return tag ? (tag.slice("runoff-date:".length) as IsoDate) : null;
}

/**
 * Who the nomination stage put on the general ballot, or null while it has
 * not finished (no primary yet, or a runoff still to come).
 */
export function nominationNominees(
  world: World,
  stableKey: string,
): readonly Nominee[] | null {
  const primary = eventByKey(world, primaryKey(stableKey));
  if (!primary) return null;
  const pendingRunoff = runoffDateOf(primary) !== null;
  const runoff = pendingRunoff ? eventByKey(world, runoffKey(stableKey)) : null;
  if (pendingRunoff && !runoff) return null;
  const rows = [
    ...primary.participants,
    ...(runoff?.participants ?? []),
  ].flatMap((participant) => {
    const [party, , status] = (participant.detail ?? "").split("|");
    return party &&
      (status === "unopposed" ||
        status === "nominated" ||
        status === "advanced")
      ? [{ personId: participant.personId, party }]
      : [];
  });
  return rows;
}

/** The primary record for a seat and year, when it was held. */
export function nominationPrimaryRecord(
  world: World,
  stableKey: string,
): HistoricalEvent | null {
  return eventByKey(world, primaryKey(stableKey));
}

/** What the stage needs to know about one filed field's seat. */
export interface FiledSeat {
  readonly seatKey: string;
  readonly title: string;
  readonly jurisdictionId: EntityId;
  readonly involvedEntityIds: readonly EntityId[];
  /** The plan under the law in force when the year's filing opened. */
  readonly plan: () => NominationPlan;
  readonly partyShare: (party: string) => number | null;
  /** Whether this person was alive on a date. */
  readonly aliveOn: (personId: EntityId, date: IsoDate) => boolean;
}

/**
 * Hold every primary and runoff whose date the clock crossed, for the fields
 * of one kind filed for one year. A field records its primary date when it
 * files (`primary-date:` on the field record); a field without one, from an
 * older save or a seat whose primary falls on the general election day, goes
 * straight to November.
 */
export function holdFiledNominations(
  before: IsoDate,
  world: World,
  input: {
    readonly fieldType: string;
    readonly stableKeySuffix: string;
    readonly seatFor: (field: HistoricalEvent) => FiledSeat | null;
  },
): World {
  const after = world.currentDate;
  let next = world;
  for (const field of world.history.events) {
    if (
      field.type !== input.fieldType ||
      !field.stableKey.endsWith(input.stableKeySuffix)
    )
      continue;
    const primaryDate = tagOf(field, "primary-date:") as IsoDate | null;
    if (!primaryDate) continue;
    const primaryDue = before < primaryDate && primaryDate <= after;
    const pending = nominationPrimaryRecord(next, field.stableKey);
    const runoffDate = pending ? runoffDateOf(pending) : null;
    const runoffDue =
      runoffDate !== null && before < runoffDate && runoffDate <= after;
    if (!primaryDue && !runoffDue) continue;
    const seat = input.seatFor(field);
    if (!seat) continue;
    const common = {
      stableKey: field.stableKey,
      seatKey: seat.seatKey,
      title: seat.title,
      jurisdictionId: seat.jurisdictionId,
      involvedEntityIds: seat.involvedEntityIds,
    };
    if (primaryDue) {
      const plan = seat.plan();
      if (plan.known && plan.primaryDate === primaryDate) {
        const entrants: NominationEntrant[] = field.participants.flatMap(
          (participant) => {
            const [party, kind, how] = (participant.detail ?? "").split("|");
            if (!party || !seat.aliveOn(participant.personId, primaryDate))
              return [];
            return [
              {
                personId: participant.personId,
                party,
                incumbent: kind === "incumbent",
                partyBacked: kind !== "incumbent" && how !== "self-starter",
              },
            ];
          },
        );
        if (entrants.length > 0)
          next = holdNominationPrimary(next, {
            ...common,
            plan,
            entrants,
            partyShare: seat.partyShare,
          });
      }
    }
    const primary = nominationPrimaryRecord(next, field.stableKey);
    const runoffOn = primary ? runoffDateOf(primary) : null;
    if (runoffOn && before < runoffOn && runoffOn <= after)
      next = holdNominationRunoff(next, common);
  }
  return next;
}

function tagOf(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

/**
 * The general-election candidates from a filed field: the nomination stage's
 * nominees, in the order they finished, once it has finished; otherwise one
 * per party, the sitting member first, then the party's recruit.
 */
export function generalCandidatesFromField<
  T extends {
    readonly personId: EntityId;
    readonly party: string | null;
    readonly incumbent: boolean;
    readonly selfStarter?: boolean;
  },
>(world: World, fieldStableKey: string, field: readonly T[]): readonly T[] {
  const nominees = nominationNominees(world, fieldStableKey);
  if (nominees) {
    return nominees.flatMap((nominee) => {
      const filed = field.find((row) => row.personId === nominee.personId);
      return filed ? [filed] : [];
    });
  }
  const byParty = new Map<string | null, T>();
  for (const row of field) {
    const held = byParty.get(row.party);
    if (
      !held ||
      (row.incumbent && !held.incumbent) ||
      (held.selfStarter && !row.selfStarter && !held.incumbent)
    )
      byParty.set(row.party, row);
  }
  return field.filter((row) => byParty.get(row.party) === row);
}
