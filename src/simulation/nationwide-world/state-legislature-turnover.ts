import { candidacyPackById } from "../candidacy-packs";
import { addDays, makeIsoDate } from "../dates";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { legislativeTermDates } from "../legislative-office-terms";
import {
  createOrganizationParticipations,
  createWorkRelationships,
  recordWorkStatus,
} from "../life";
import type {
  CreateOrganizationParticipationInput,
  CreateWorkRelationshipInput,
} from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { workStatusAt } from "../life-queries";
import {
  LIVING_WORLD_KEYS,
  PARTY_AFFILIATION_KIND,
  livingWorldOrganizationId,
} from "../living-world/opening";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import { createStableId } from "../ids";
import { bindingFromIdentity } from "../../districts/query";
import { SeededRng } from "../rng";
import {
  clampShare,
  logit,
  logistic,
  standardNormal,
} from "../world-setup/deterministic-math";
import {
  isStateLegislativeSeatDue,
  stateLegislativeElectionRule,
} from "./state-legislative-election-calendar";
import {
  generalElectionDay,
  isElectionYear,
} from "./state-executive-term-rules";
import {
  STATE_LEGISLATURE_KEYS,
  STATE_LEGISLATURE_OPENING_VERSION,
  planStateChambers,
  campaignSeatHolders,
  seatTenureMatch,
  stateLegislativeSeats,
  stateSeatsInDistrict,
} from "./state-legislature-opening";
import { electionContestResult } from "../election-contests";
import { fieldIntakeDay } from "../nominations/field-entry";
import { nominationPlan } from "../nominations/nomination-rules";
import { holdFiledNominations } from "../nominations/party-nominations";
import {
  prepareStateCandidateSlates,
  stateCandidateIntakeDay,
  stateCandidateSeatKey,
  stateCandidateSlate,
  stateGeneralCandidates,
  stateSeatDemocraticShare,
  stateSlateKey,
  STATE_LEGISLATURE_CANDIDATE_PROFILE,
  type StateCandidateSeatPlan,
} from "./state-legislature-candidates";
import {
  hasStableKey,
  recordByStableKey,
  recordsWithFieldValue,
} from "../history-index";

/**
 * STATE LEGISLATIVE CONTINUITY: the regular elections for the chambers an
 * opening seated.
 *
 * Before this, the members seated when a life began served until they died,
 * and nothing filled their seats. After sixteen years a 151-seat House listed
 * 103 members. Time now carries each seat forward:
 *
 * - On the state's regular legislative election day, only the seats due under
 *   `state-legislative-election-calendar.ts` are decided,
 *   and one public results record names the winners.
 * - When the new term begins (`legislativeTermDates`: the sourced date where
 *   there is one, otherwise January 1 after the election) a member leaving
 *   the seat stops serving and the new member starts.
 *
 * Only dates the clock actually crosses act: reading or reopening a save
 * writes nothing, and a save that already passed an election keeps its
 * record.
 *
 * Fictional prospects and incumbent decisions are recorded before the
 * election. The result names a living candidate from that saved slate. A
 * slate with no living candidate leaves a dated vacancy at term start.
 * The intake timing, retirement preferences and bounded swing around the
 * opening's saved generated seat view are explicit game profiles, not
 * research or a forecast. Primaries and vote counts are not modeled.
 *
 * A seat with a campaign on the ballot (the player's own, filed for their
 * district) is left to that campaign: it is not drawn here, and when the term
 * begins its winner holds the seat and the member they replace stops serving.
 * A campaign's winner serves out their own term, and the seat is not drawn
 * while it runs; when it ends, a member who did not file again leaves it.
 */

export const STATE_LEGISLATURE_TURNOVER_VERSION =
  "state-legislature-turnover/v1" as const;
const V = STATE_LEGISLATURE_TURNOVER_VERSION;

export const STATE_LEGISLATURE_TURNOVER_PROFILE = {
  id: "ocd-state-legislature-turnover-game-profile/v2",
  /** Members this old or older retire. */
  retirementAge: 82,
  retirementPreferenceAge: 77,
  // PLACEHOLDER(overnight): deterministic election-to-election variation and
  // a small incumbency effect around the save's recorded generated seat view.
  electionSwingLogit: 0.5,
  incumbencyBonusLogit: 0.18,
} as const;

export const STATE_LEGISLATIVE_RESULTS_EVENT =
  "election.state-legislative-general-results";

const OPENING_EVENT = "world.state-legislature-opening";

const resultsKey = (packId: string, electionDay: IsoDate) =>
  `${V}:${packId}:results:${electionDay}`;

function ageOn(birthDate: IsoDate, date: IsoDate): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

/** The candidacy packs whose legislatures an opening seated in this save. */
function seatedPacks(world: World): string[] {
  const packs: string[] = [];
  for (const event of recordsWithFieldValue(
    world.history.events,
    "type",
    OPENING_EVENT,
  )) {
    if (!event.tags.includes(STATE_LEGISLATURE_OPENING_VERSION)) continue;
    const packId = tagValue(event, "pack:");
    if (packId && !packs.includes(packId)) packs.push(packId);
  }
  return packs;
}

interface SeatOutcome {
  readonly officeKey: string;
  readonly ordinal: number;
  readonly title: string;
  readonly party: string | null;
  /** The sitting member who keeps the seat, or null for a new member. */
  readonly returningPersonId: EntityId | null;
  /** The member leaving the seat, if one is sitting. */
  readonly leavingPersonId: EntityId | null;
  readonly electedPersonId: EntityId;
}

const termStartOf = (officeKey: string, electionDay: IsoDate) =>
  legislativeTermDates(officeKey, electionDay)?.startsAt ??
  makeIsoDate(`${Number(electionDay.slice(0, 4)) + 1}-01-01`);

/** One regular ballot boundary for intake, result and future-seat queries. */
function regularSeatsDue(world: World, packId: string, year: number) {
  const pack = candidacyPackById(packId);
  if (!pack) return [];
  const usps = pack.jurisdictionKey.replace(/^US-/, "");
  return stateLegislativeSeats(world, packId).filter((seat) =>
    isStateLegislativeSeatDue(usps, seat.officeKey, seat.ordinal, year),
  );
}

/** Assign recorded district contests to exact seats in multi-seat districts. */
function contestedStateSeats(
  world: World,
  packId: string,
  electionDay: IsoDate,
): Map<string, EntityId> {
  const pack = candidacyPackById(packId);
  const contested = new Map<string, EntityId>();
  if (!pack) return contested;
  const holders = campaignSeatHolders(world, packId);
  const heldThrough = (officeKey: string, ordinal: number) =>
    holders
      .filter((h) => h.officeKey === officeKey && h.ordinal === ordinal)
      .reduce<IsoDate | null>(
        (latest, h) =>
          latest === null || h.endsAt > latest ? h.endsAt : latest,
        null,
      );
  const contests = (world.history.electionContests ?? [])
    .filter(
      (contest) =>
        contest.electionDate === electionDay &&
        contest.office.districtBinding &&
        pack.offices.some(
          (office) => office.officeKey === contest.office.officeKey,
        ),
    )
    .sort((a, b) => a.sequence - b.sequence);
  for (const contest of contests) {
    const officeKey = contest.office.officeKey;
    const open = stateSeatsInDistrict(
      packId,
      officeKey,
      contest.office.districtBinding!.recordId,
    ).filter((seat) => !contested.has(`${officeKey}|${seat.ordinal}`));
    const seat =
      open.find((candidate) =>
        holders.some(
          (holder) =>
            holder.officeKey === officeKey &&
            holder.ordinal === candidate.ordinal &&
            contest.candidatePersonIds.includes(holder.personId),
        ),
      ) ??
      open.find((candidate) => {
        const through = heldThrough(officeKey, candidate.ordinal);
        return (
          through === null || through <= termStartOf(officeKey, electionDay)
        );
      });
    if (seat) contested.set(`${officeKey}|${seat.ordinal}`, contest.id);
  }
  return contested;
}

function stateIntentKey(seatKey: string, year: number): string {
  return `${V}:seeking:${seatKey}:${year}`;
}

function prepareStateIntake(
  world: World,
  packId: string,
  electionDay: IsoDate,
  due: readonly {
    readonly officeKey: string;
    readonly ordinal: number;
    readonly intakeDate: IsoDate;
  }[],
): World {
  const pack = candidacyPackById(packId);
  const jurisdiction = pack
    ? stateJurisdictionForKey(pack.jurisdictionKey)
    : null;
  if (!pack || !jurisdiction || due.length === 0) return world;
  const year = Number(electionDay.slice(0, 4));
  const contested = contestedStateSeats(world, packId, electionDay);
  const chamberPlans = planStateChambers(pack).chambers;
  const bodyId = createStableId(
    "organization",
    `${world.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  const seats = new Map(
    stateLegislativeSeats(world, packId).map((seat) => [
      `${seat.officeKey}|${seat.ordinal}`,
      seat,
    ]),
  );
  const campaignHolders = campaignSeatHolders(world, packId);
  const plans: StateCandidateSeatPlan[] = [];
  let next = world;
  for (const row of due) {
    const localKey = `${row.officeKey}|${row.ordinal}`;
    if (contested.has(localKey)) continue;
    const seat = seats.get(localKey);
    if (!seat) continue;
    const through = campaignHolders
      .filter(
        (holder) =>
          holder.officeKey === row.officeKey && holder.ordinal === row.ordinal,
      )
      .reduce<IsoDate | null>(
        (latest, holder) =>
          latest === null || holder.endsAt > latest ? holder.endsAt : latest,
        null,
      );
    if (through !== null && through > termStartOf(row.officeKey, electionDay))
      continue;
    const seatKey = stateCandidateSeatKey(packId, row.officeKey, row.ordinal);
    if (stateCandidateSlate(next, seatKey, year)) continue;
    const incumbentId = seat.member?.personId ?? null;
    const incumbent = incumbentId ? next.people[incumbentId] : undefined;
    const alive =
      incumbentId !== null &&
      !recordsWithFieldValue(
        next.history.personDeaths,
        "personId",
        incumbentId,
      ).some((death) => death.diedAt <= row.intakeDate);
    const tooOld =
      incumbent !== undefined &&
      ageOn(incumbent.birthDate, electionDay) >=
        STATE_LEGISLATURE_TURNOVER_PROFILE.retirementAge;
    const controlled =
      incumbentId !== null &&
      next.control.kind === "person" &&
      next.control.personId === incumbentId;
    let seeking = false;
    let decisionTraceId: EntityId | null = null;
    if (incumbent && alive && !tooOld && !controlled) {
      const key = `${stateIntentKey(seatKey, year)}:decision`;
      const serviceStart = next.history.workRelationships.find(
        (work) => work.id === seat.member?.workRelationshipId,
      )?.startedAt;
      const serviceYears = serviceStart
        ? Math.max(0, year - Number(serviceStart.slice(0, 4)))
        : 0;
      const evaluation = evaluateDecision(next, {
        stableKey: key,
        decisionType: "election.consider-another-state-legislative-term",
        actorPersonId: incumbent.id,
        cutoff: {
          asOfDate: row.intakeDate,
          historySequenceExclusive: next.history.nextSequence,
        },
        subject: { kind: "context:life", key: seatKey, entityId: null },
        options: [
          {
            key: "seek",
            label: "Seek another term",
            description: "Run again.",
          },
          {
            key: "step-down",
            label: "Step down",
            description: "Leave the seat.",
          },
        ],
        constraints: [],
        considerations: [
          {
            stableKey: `${key}:serving`,
            optionKey: "seek",
            sourceType: "context:current-office",
            direction: "supports",
            importance: "strong",
            confidence: "high",
            explanation: "They are serving in this seat.",
            sourceRefs: [],
          },
          ...(ageOn(incumbent.birthDate, electionDay) >=
          STATE_LEGISLATURE_TURNOVER_PROFILE.retirementPreferenceAge
            ? [
                {
                  stableKey: `${key}:retirement`,
                  optionKey: "step-down" as const,
                  sourceType: "context:age" as const,
                  direction: "supports" as const,
                  importance: "decisive" as const,
                  confidence: "medium" as const,
                  explanation: "They are considering retirement.",
                  sourceRefs: [],
                },
              ]
            : []),
          ...(serviceYears >= 10
            ? [
                {
                  stableKey: `${key}:long-service`,
                  optionKey: "step-down" as const,
                  sourceType: "context:service-tenure" as const,
                  direction: "supports" as const,
                  importance: "decisive" as const,
                  confidence: "medium" as const,
                  explanation:
                    "They have served for a long period and are considering leaving.",
                  sourceRefs: [],
                },
              ]
            : []),
        ],
        perceptionIds: [],
        randomness: "none",
        retention: "durable",
      });
      next = recordDurableDecisionTrace(next, evaluation);
      decisionTraceId = next.history.decisionTraces.at(-1)!.id;
      seeking = evaluation.selectedOptionKey === "seek";
    }
    const intentKey = stateIntentKey(seatKey, year);
    if (!hasStableKey(next.history.events, intentKey)) {
      next = recordWorldEvent(next, {
        stableKey: intentKey,
        type: "election.state-legislative-candidacy-intent",
        occurredAt: row.intakeDate,
        recordedAt: next.currentDate,
        jurisdictionId: jurisdiction.id,
        involvedEntityIds: [bodyId, ...(incumbentId ? [incumbentId] : [])],
        participants: incumbentId
          ? [
              {
                personId: incumbentId,
                role: "focus:subject",
                detail: seeking ? "seeking" : "not-seeking",
              },
            ]
          : [],
        personFactConstraints: [],
        visibility: "public",
        tags: [
          V,
          STATE_LEGISLATURE_TURNOVER_PROFILE.id,
          `seat:${seatKey}`,
          `intent:${seeking ? "seeking" : "not-seeking"}`,
          ...(seeking
            ? ["qualification:incumbent-provisional-game-profile"]
            : []),
          ...(decisionTraceId ? [`decision-trace:${decisionTraceId}`] : []),
        ],
        summary: seeking
          ? `The holder of ${seat.title} is seeking another term.`
          : incumbentId
            ? `The holder of ${seat.title} is not seeking another term.`
            : `No sitting member is seeking ${seat.title}.`,
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
    const office = pack.offices.find(
      (candidate) => candidate.officeKey === row.officeKey,
    );
    // PLACEHOLDER(overnight): unknown state qualifications remain unknown;
    // this is a fictional prospect age floor, not a claim of legal eligibility.
    const minimumAge =
      office?.qualification.minimumAge.kind === "known"
        ? office.qualification.minimumAge.value
        : STATE_LEGISLATURE_CANDIDATE_PROFILE.unknownMinimumAge;
    plans.push({
      packId,
      jurisdictionKey: pack.jurisdictionKey,
      officeKey: row.officeKey,
      ordinal: row.ordinal,
      title: seat.title,
      minimumAge,
      usesGeneratedResidencyRule:
        office?.qualification.residency.kind === "known" &&
        office.qualification.residency.source?.authority === "game-profile",
      districtBinding: (() => {
        const district = chamberPlans.find(
          (chamber) => chamber.officeKey === row.officeKey,
        )?.districts[row.ordinal - 1];
        return district ? bindingFromIdentity(district) : null;
      })(),
      democraticShare: stateSeatDemocraticShare(
        next,
        packId,
        row.officeKey,
        row.ordinal,
      ),
      incumbentPersonId: incumbentId,
      incumbentParty: seat.member?.party ?? null,
      incumbentSeeking: seeking,
      intakeDate: row.intakeDate,
      nomination: stateNominationPlan(next, pack.jurisdictionKey, year),
    });
  }
  return prepareStateCandidateSlates(next, year, plans);
}

/** Election day: the regular seats due in these chambers are decided. */
function holdStateLegislativeElection(
  world: World,
  packId: string,
  electionDay: IsoDate,
): World {
  const key = resultsKey(packId, electionDay);
  if (hasStableKey(world.history.events, key)) return world;
  const pack = candidacyPackById(packId);
  const jurisdiction = pack
    ? stateJurisdictionForKey(pack.jurisdictionKey)
    : null;
  if (!pack || !jurisdiction) return world;
  const year = Number(electionDay.slice(0, 4));
  const dueSeats = regularSeatsDue(world, packId, year);
  if (dueSeats.length === 0) return world;
  // An older save that missed the fictional intake window gets an honest
  // election-day slate; its record is dated today, not backdated to January.
  let next = prepareStateIntake(
    world,
    packId,
    electionDay,
    dueSeats.map((seat) => ({
      officeKey: seat.officeKey,
      ordinal: seat.ordinal,
      intakeDate: electionDay,
    })),
  );
  const holders = campaignSeatHolders(next, packId);
  const heldThrough = (officeKey: string, ordinal: number) =>
    holders
      .filter((h) => h.officeKey === officeKey && h.ordinal === ordinal)
      .reduce<IsoDate | null>(
        (latest, h) =>
          latest === null || h.endsAt > latest ? h.endsAt : latest,
        null,
      );
  const contested = contestedStateSeats(next, packId, electionDay);
  const campaignSeats: string[] = [];
  const outcomes: SeatOutcome[] = [];
  const unfilled: string[] = [];
  for (const seat of regularSeatsDue(next, packId, year)) {
    const seatKey = `${seat.officeKey}|${seat.ordinal}`;
    const contestId = contested.get(seatKey);
    if (contestId) {
      campaignSeats.push(
        `campaign-seat:${seatKey}|${contestId}|${termStartOf(seat.officeKey, electionDay)}`,
      );
      continue;
    }
    // A campaign's winner still serving their term is not on this ballot.
    const through = heldThrough(seat.officeKey, seat.ordinal);
    if (through !== null && through > termStartOf(seat.officeKey, electionDay))
      continue;
    const sitting = seat.member;
    const canonicalKey = stateCandidateSeatKey(
      packId,
      seat.officeKey,
      seat.ordinal,
    );
    const candidates = stateGeneralCandidates(next, canonicalKey, year).filter(
      (candidate) =>
        !recordsWithFieldValue(
          next.history.personDeaths,
          "personId",
          candidate.personId,
        ).some((death) => death.diedAt <= electionDay),
    );
    if (candidates.length === 0) {
      unfilled.push(`${seatKey}|${termStartOf(seat.officeKey, electionDay)}`);
      continue;
    }
    const share = stateSeatDemocraticShare(
      next,
      packId,
      seat.officeKey,
      seat.ordinal,
    );
    const electionRng = new SeededRng(next.seed).fork(
      `${V}:${packId}:${seat.officeKey}:${seat.ordinal}:${electionDay}:view`,
    );
    const incumbentBonus =
      sitting?.party === "democratic"
        ? STATE_LEGISLATURE_TURNOVER_PROFILE.incumbencyBonusLogit
        : sitting?.party === "republican"
          ? -STATE_LEGISLATURE_TURNOVER_PROFILE.incumbencyBonusLogit
          : 0;
    const electionShare =
      share === null
        ? null
        : logistic(
            logit(clampShare(share, 1e-6)) +
              STATE_LEGISLATURE_TURNOVER_PROFILE.electionSwingLogit *
                standardNormal(electionRng) +
              incumbentBonus,
          );
    // PLACEHOLDER(overnight): the saved generated seat lean chooses between
    // living candidates. A missing lean keeps the incumbent if they filed,
    // then uses stable candidate order; it is not a fabricated vote margin.
    const preferredParty =
      electionShare === null
        ? (sitting?.party ?? null)
        : electionShare >= 0.5
          ? "democratic"
          : "republican";
    const winner =
      candidates.find((candidate) => candidate.party === preferredParty) ??
      [...candidates].sort((left, right) =>
        left.personId.localeCompare(right.personId),
      )[0]!;
    const returns = winner.personId === sitting?.personId;
    outcomes.push({
      officeKey: seat.officeKey,
      ordinal: seat.ordinal,
      title: seat.title,
      party: winner.party,
      returningPersonId: returns ? winner.personId : null,
      leavingPersonId: returns ? null : (sitting?.personId ?? null),
      electedPersonId: winner.personId,
    });
  }
  if (
    outcomes.length === 0 &&
    campaignSeats.length === 0 &&
    unfilled.length === 0
  )
    return next;
  const winnerIds = outcomes.map((outcome) => outcome.electedPersonId);
  const returning = outcomes.filter((o) => o.returningPersonId).length;
  const termStarts = [
    ...new Set([
      ...outcomes.map((outcome) => termStartOf(outcome.officeKey, electionDay)),
      ...campaignSeats.map((tag) => tag.split("|").at(-1)!),
      ...unfilled.map((tag) => tag.split("|").at(-1)!),
    ]),
  ];
  const bodyId = createStableId(
    "organization",
    `${next.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  next = recordWorldEvent(next, {
    stableKey: key,
    type: STATE_LEGISLATIVE_RESULTS_EVENT,
    occurredAt: electionDay,
    recordedAt: next.currentDate,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [bodyId, ...new Set(winnerIds)],
    participants: outcomes.map((outcome, index) => ({
      personId: winnerIds[index]!,
      role: "focus:winner" as const,
      detail: [
        outcome.officeKey,
        outcome.ordinal,
        outcome.party ?? "none",
        outcome.returningPersonId ? "returning" : "new",
        outcome.leavingPersonId ?? "",
        termStartOf(outcome.officeKey, electionDay),
      ].join("|"),
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      V,
      STATE_LEGISLATURE_TURNOVER_PROFILE.id,
      `pack:${packId}`,
      ...termStarts.map((date) => `term-start:${date}`),
      ...campaignSeats,
      ...unfilled.map((seat) => `unfilled:${seat}`),
    ],
    summary: `Voters chose ${outcomes.length + campaignSeats.length} members of the ${pack.displayName} in the ${electionDay.slice(0, 4)} general election: ${returning} return and ${outcomes.length - returning} seats get new members.${unfilled.length ? ` ${unfilled.length} seats have no living candidate.` : ""}${campaignSeats.length === 0 ? "" : campaignSeats.length === 1 ? " The race for one more seat is counted on its own." : ` The races for ${campaignSeats.length} more seats are counted on their own.`}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return next;
}

/** The term begins: departing members stop serving and new members start. */
function seatStateLegislativeWinners(
  world: World,
  packId: string,
  results: HistoricalEvent,
  termStart: IsoDate,
): World {
  const pack = candidacyPackById(packId);
  const jurisdiction = pack
    ? stateJurisdictionForKey(pack.jurisdictionKey)
    : null;
  if (!pack || !jurisdiction) return world;
  const bodyId = createStableId(
    "organization",
    `${world.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  let next = world;
  const seats: CreateWorkRelationshipInput[] = [];
  const affiliations: CreateOrganizationParticipationInput[] = [];
  const current = new Map(
    stateLegislativeSeats(world, packId).map((seat) => [
      `${seat.officeKey}|${seat.ordinal}`,
      seat,
    ]),
  );
  const vacate = (
    officeKey: string,
    ordinal: number,
    cause: "no-living-candidate" | "member-elect-died",
  ) => {
    const vacancyKey = `${V}:${packId}:${officeKey}:${ordinal}:vacancy:${termStart}`;
    if (hasStableKey(next.history.events, vacancyKey)) return;
    const incumbent = current.get(`${officeKey}|${ordinal}`)?.member;
    if (incumbent) {
      const status = workStatusAt(next, incumbent.workRelationshipId);
      if (status && status.status !== "ended")
        next = recordWorkStatus(next, {
          stableKey: `${vacancyKey}:predecessor-ended`,
          workRelationshipId: incumbent.workRelationshipId,
          effectiveAt: addDays(termStart, -1),
          status: "ended",
          reason: "The term ended without a living member-elect.",
          supersedesStatusId: status.id,
          provenance: { kind: "simulated-event", eventId: results.id },
        });
    }
    next = recordWorldEvent(next, {
      stableKey: vacancyKey,
      type: "election.state-legislative-seat-vacancy",
      occurredAt: termStart,
      recordedAt: next.currentDate,
      jurisdictionId: jurisdiction.id,
      involvedEntityIds: [bodyId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        V,
        `pack:${packId}`,
        `seat:${officeKey}|${ordinal}`,
        `vacancy-cause:${cause}`,
      ],
      summary: `The seat for ${current.get(`${officeKey}|${ordinal}`)?.title ?? "the legislature"} is vacant because ${cause === "member-elect-died" ? "the member-elect died before taking office" : "no living candidate remained at the election"}.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  };
  for (const participant of results.participants) {
    const [officeKey, ordinalText, party, kind, , startsOn] = (
      participant.detail ?? ""
    ).split("|");
    if (!officeKey || !ordinalText) continue;
    if (startsOn && startsOn !== termStart) continue;
    const ordinal = Number(ordinalText);
    if (
      recordsWithFieldValue(
        next.history.personDeaths,
        "personId",
        participant.personId,
      ).some((death) => death.diedAt <= termStart)
    ) {
      vacate(officeKey, ordinal, "member-elect-died");
      continue;
    }
    if (kind !== "new") continue;
    const tenureKey = `${STATE_LEGISLATURE_KEYS.seat(officeKey, ordinal)}:tenure:${termStart}`;
    if (hasStableKey(next.history.workRelationships, tenureKey)) continue;
    const seat = current.get(`${officeKey}|${ordinal}`);
    // The member leaving the seat stops serving the day the new term begins.
    const leaving = seat?.member ?? null;
    const leftBeforeTerm =
      leaving !== null &&
      recordsWithFieldValue(
        next.history.personDeaths,
        "personId",
        leaving.personId,
      ).some((death) => death.diedAt <= addDays(termStart, -1));
    // A campaign's winner leaves when their own term expires.
    if (seat?.member && !seat.member.byCampaign && !leftBeforeTerm) {
      const status = workStatusAt(next, seat.member.workRelationshipId);
      if (status && status.status !== "ended")
        next = recordWorkStatus(next, {
          stableKey: `${tenureKey}:predecessor-ended`,
          workRelationshipId: seat.member.workRelationshipId,
          effectiveAt: addDays(termStart, -1),
          status: "ended",
          reason: "Their term ended and someone else won the seat.",
          supersedesStatusId: status.id,
          provenance: { kind: "simulated-event", eventId: results.id },
        });
    }
    seats.push({
      stableKey: tenureKey,
      personId: participant.personId,
      organizationId: bodyId,
      startedAt: termStart,
      kind: "employment:legislative-member",
      compensation: "paid",
      authority: "shared",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "simulated-event", eventId: results.id },
      initialRole: {
        title: seat?.title ?? "Member of the Legislature",
        occupationClassification: "service:elected-legislator",
        locationJurisdictionId: jurisdiction.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 10, maximumHours: 45 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: jurisdiction.id,
        },
      },
    });
    if (party && party !== "none")
      affiliations.push({
        stableKey: `${tenureKey}:affiliation`,
        personId: participant.personId,
        organizationId: livingWorldOrganizationId(
          next,
          LIVING_WORLD_KEYS.nationalParty(party),
        ),
        startedAt: termStart,
        initialStatus: "active",
        kind: PARTY_AFFILIATION_KIND,
        roleKind: "member:public-affiliation",
        context: "Public party affiliation",
        provenance: { kind: "simulated-event", eventId: results.id },
      });
  }
  // A campaign winner seated before this was kept (an older save) can share
  // their seat with the member they replaced; that member stops serving now.
  for (const holder of campaignSeatHolders(next, packId)) {
    if (holder.status !== "active") continue;
    for (const work of next.history.workRelationships) {
      if (work.organizationId !== bodyId) continue;
      const match = seatTenureMatch(work.stableKey);
      if (
        !match ||
        match[1] !== holder.officeKey ||
        Number(match[2]) !== holder.ordinal ||
        work.personId === holder.personId ||
        work.startedAt > holder.startsAt
      )
        continue;
      const status = workStatusAt(next, work.id);
      if (!status || status.status === "ended") continue;
      if (
        recordsWithFieldValue(
          next.history.personDeaths,
          "personId",
          work.personId,
        ).length > 0
      )
        continue;
      next = recordWorkStatus(next, {
        stableKey: `${V}:${packId}:${work.id}:replaced-by-campaign-winner`,
        workRelationshipId: work.id,
        effectiveAt: addDays(termStart, -1),
        status: "ended",
        reason: "Someone else won the seat.",
        supersedesStatusId: status.id,
        provenance: { kind: "simulated-event", eventId: results.id },
      });
    }
  }
  // A seat a campaign decided: its winner holds it from the term start, and
  // the member there before them stops serving the day before.
  for (const tag of results.tags) {
    if (tag.startsWith("unfilled:")) {
      const [officeKey, ordinalText, startsOn] = tag
        .slice("unfilled:".length)
        .split("|");
      if (officeKey && ordinalText && startsOn === termStart)
        vacate(officeKey, Number(ordinalText), "no-living-candidate");
    }
    if (!tag.startsWith("campaign-seat:")) continue;
    const [officeKey, ordinalText, contestId, startsOn] = tag
      .slice("campaign-seat:".length)
      .split("|");
    if (!officeKey || !ordinalText || !contestId || startsOn !== termStart)
      continue;
    const ordinal = Number(ordinalText);
    const result = electionContestResult(next, contestId as EntityId);
    // No winner on record: the sitting member stays.
    if (!result) continue;
    const winner = result.winnerPersonId;
    const tenureKey = `${STATE_LEGISLATURE_KEYS.seat(officeKey, ordinal)}:tenure:${termStart}`;
    for (const work of next.history.workRelationships) {
      if (work.organizationId !== bodyId) continue;
      const match = seatTenureMatch(work.stableKey);
      if (!match || match[1] !== officeKey || Number(match[2]) !== ordinal)
        continue;
      if (work.personId === winner || work.startedAt >= termStart) continue;
      if (
        recordsWithFieldValue(
          next.history.personDeaths,
          "personId",
          work.personId,
        ).some((death) => death.diedAt <= addDays(termStart, -1))
      )
        continue;
      const status = workStatusAt(next, work.id);
      if (!status || status.status === "ended") continue;
      next = recordWorkStatus(next, {
        stableKey: `${tenureKey}:predecessor-ended`,
        workRelationshipId: work.id,
        effectiveAt: addDays(termStart, -1),
        status: "ended",
        reason: "Their term ended and someone else won the seat.",
        supersedesStatusId: status.id,
        provenance: { kind: "simulated-event", eventId: results.id },
      });
    }
    // The campaign seats its own winner where the term's law is on record;
    // elsewhere the winner takes the seat here.
    const seatedByCampaign = next.history.workRelationships.some(
      (work) =>
        work.organizationId === bodyId &&
        work.personId === winner &&
        work.kind === "employment:legislative-member" &&
        (work.startedAt === termStart ||
          (seatTenureMatch(work.stableKey) !== null &&
            workStatusAt(next, work.id)?.status === "active")),
    );
    if (
      seatedByCampaign ||
      hasStableKey(next.history.workRelationships, tenureKey) ||
      recordsWithFieldValue(next.history.personDeaths, "personId", winner)
        .length > 0
    )
      continue;
    seats.push({
      stableKey: tenureKey,
      personId: winner,
      organizationId: bodyId,
      startedAt: termStart,
      kind: "employment:legislative-member",
      compensation: "paid",
      authority: "shared",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "simulated-event", eventId: results.id },
      initialRole: {
        title:
          current.get(`${officeKey}|${ordinal}`)?.title ??
          "Member of the Legislature",
        occupationClassification: "service:elected-legislator",
        locationJurisdictionId: jurisdiction.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 10, maximumHours: 45 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: jurisdiction.id,
        },
      },
    });
  }
  if (seats.length) next = createWorkRelationships(next, seats);
  if (affiliations.length)
    next = createOrganizationParticipations(next, affiliations);
  return next;
}

/**
 * When an empty seat in this chamber is next filled: by a member already
 * elected who has not yet taken office, or at the next regular election.
 * Reads only; null where the pack is unknown.
 */
export function nextStateSeatFilling(
  world: World,
  packId: string,
  officeKey: string,
  ordinal: number,
): {
  readonly electedOn: IsoDate;
  readonly takesOfficeOn: IsoDate | null;
} | null {
  const pack = candidacyPackById(packId);
  if (!pack) return null;
  const today = world.currentDate;
  const rule = stateLegislativeElectionRule(
    pack.jurisdictionKey.replace(/^US-/, ""),
  );
  for (
    let year = Number(today.slice(0, 4)) - 1;
    year < Number(today.slice(0, 4)) + 8;
    year += 1
  ) {
    if (
      !isStateLegislativeSeatDue(
        pack.jurisdictionKey.replace(/^US-/, ""),
        officeKey,
        ordinal,
        year,
      )
    )
      continue;
    const electionDay = generalElectionDay(rule, year);
    const termStart =
      legislativeTermDates(officeKey, electionDay)?.startsAt ??
      makeIsoDate(`${year + 1}-01-01`);
    const results = recordByStableKey(
      world.history.events,
      resultsKey(packId, electionDay),
    );
    if (results && electionDay <= today && today < termStart) {
      // Only a living winner who has not yet taken this seat fills it.
      const alive = (personId: EntityId) =>
        !(
          recordsWithFieldValue(
            world.history.personDeaths,
            "personId",
            personId,
          ).length > 0
        );
      const drawn = results.participants.some((participant) => {
        const [key, seat, , kind] = (participant.detail ?? "").split("|");
        return (
          key === officeKey &&
          Number(seat) === ordinal &&
          kind === "new" &&
          alive(participant.personId)
        );
      });
      const campaign = results.tags.some((tag) => {
        const [key, seat, contestId] = tag
          .slice("campaign-seat:".length)
          .split("|");
        if (!tag.startsWith("campaign-seat:")) return false;
        if (key !== officeKey || Number(seat) !== ordinal || !contestId)
          return false;
        const result = electionContestResult(world, contestId as EntityId);
        return result !== null && alive(result.winnerPersonId);
      });
      if (drawn || campaign)
        return { electedOn: electionDay, takesOfficeOn: termStart };
    }
    if (electionDay > today)
      return { electedOn: electionDay, takesOfficeOn: null };
  }
  return null;
}

/**
 * Called whenever the canonical clock moves forward a day or more: holds each
 * seated legislature's regular election and seats its winners when the term
 * begins. Only dates actually crossed act.
 */
/** The nomination plan for a state's legislative seats in one year. */
function stateNominationPlan(
  world: World,
  jurisdictionKey: string,
  year: number,
) {
  const usps = jurisdictionKey.replace(/^US-/, "");
  const rule = stateLegislativeElectionRule(usps);
  return nominationPlan(world, {
    stateUsps: usps,
    family: "state-legislature",
    year,
    // The law in force when the year's filing opens governs the whole cycle.
    onDate: stateCandidateIntakeDay(year, 0),
    generalDay: generalElectionDay(rule, year),
  });
}

const STATE_SLATE_EVENT = "election.state-legislative-candidate-slate";

/**
 * The nomination stage for the legislative fields filed this year: each
 * state's primary on its own date, and any runoff it leaves open.
 */
function holdStateLegislativeNominations(before: IsoDate, world: World): World {
  const after = world.currentDate;
  let next = world;
  for (
    let year = Number(before.slice(0, 4));
    year <= Number(after.slice(0, 4));
    year += 1
  ) {
    // Primaries and runoffs fall between the first filing and November.
    if (after < `${year}-02-01` || before >= `${year}-11-30`) continue;
    const titles = new Map<string, Map<string, string>>();
    const titleOf = (packId: string, officeKey: string, ordinal: number) => {
      let byPack = titles.get(packId);
      if (!byPack) {
        byPack = new Map(
          stateLegislativeSeats(world, packId).map((seat) => [
            `${seat.officeKey}|${seat.ordinal}`,
            seat.title,
          ]),
        );
        titles.set(packId, byPack);
      }
      return byPack.get(`${officeKey}|${ordinal}`) ?? null;
    };
    next = holdFiledNominations(before, next, {
      fieldType: STATE_SLATE_EVENT,
      stableKeySuffix: `:${year}`,
      seatFor: (field) => {
        const seatKey = tagValue(field, "seat:");
        if (!seatKey || field.stableKey !== stateSlateKey(seatKey, year))
          return null;
        const [packId, officeKey, ordinalText] = seatKey.split("|");
        const pack = packId ? candidacyPackById(packId) : null;
        const ordinal = Number(ordinalText);
        const title = pack ? titleOf(packId!, officeKey!, ordinal) : null;
        const jurisdiction = pack
          ? stateJurisdictionForKey(pack.jurisdictionKey)
          : null;
        if (!pack || !title || !jurisdiction) return null;
        return {
          seatKey,
          title,
          jurisdictionId: jurisdiction.id,
          involvedEntityIds: [
            createStableId(
              "organization",
              `${world.id}:${STATE_LEGISLATURE_KEYS.body(packId!)}`,
            ),
          ],
          plan: () => stateNominationPlan(world, pack.jurisdictionKey, year),
          partyShare: (party) => {
            const share = stateSeatDemocraticShare(
              world,
              packId!,
              officeKey!,
              ordinal,
            );
            if (share === null) return null;
            return party === "democratic"
              ? share
              : party === "republican"
                ? 1 - share
                : null;
          },
          aliveOn: (personId, date) =>
            Boolean(world.people[personId]) &&
            !world.history.personDeaths.some(
              (death) => death.personId === personId && death.diedAt <= date,
            ),
        };
      },
    });
  }
  return next;
}

export function applyStateLegislatureTurnover(
  before: IsoDate,
  start: World,
): World {
  const after = start.currentDate;
  if (after <= before) return start;
  const world = holdStateLegislativeNominations(before, start);
  // Cheap window test before any history scan: the game-profile prospect
  // window, a regular election, or a term beginning is due.
  let crossesAny = false;
  for (
    let year = Number(before.slice(0, 4));
    year <= Number(after.slice(0, 4)) && !crossesAny;
    year += 1
  ) {
    const january = `${year}-01-01`;
    crossesAny =
      (before < january && january <= after) ||
      (before < `${year}-03-07` && `${year}-01-06` <= after) ||
      (before < `${year}-11-08` && `${year}-11-02` <= after);
  }
  if (!crossesAny) return world;
  const packs = seatedPacks(world);
  if (packs.length === 0) return world;
  let next = world;
  for (const packId of packs) {
    const pack = candidacyPackById(packId);
    if (!pack) continue;
    const usps = pack.jurisdictionKey.replace(/^US-/, "");
    const rule = stateLegislativeElectionRule(usps);
    const firstYear = Number(before.slice(0, 4)) - 4;
    const lastYear = Number(after.slice(0, 4));
    for (let year = firstYear; year <= lastYear; year += 1) {
      // Every reviewed seat cycle is a subset of the state's regular general
      // election years; this cheap check avoids a national seat scan each day.
      if (!isElectionYear(rule, year)) continue;
      const electionDay = generalElectionDay(rule, year);
      const due = stateLegislativeSeats(next, packId).flatMap((seat, index) => {
        if (
          !isStateLegislativeSeatDue(usps, seat.officeKey, seat.ordinal, year)
        )
          return [];
        const base = stateCandidateIntakeDay(year, index);
        // The field never files later than the game's own intake day.
        if (base <= before) return [];
        const intakeDate = fieldIntakeDay(
          base,
          stateNominationPlan(next, pack.jurisdictionKey, year),
          stateCandidateIntakeDay(year, 0),
        );
        return before < intakeDate && intakeDate <= after
          ? [{ officeKey: seat.officeKey, ordinal: seat.ordinal, intakeDate }]
          : [];
      });
      next = prepareStateIntake(next, packId, electionDay, due);
      if (before < electionDay && electionDay <= after)
        next = holdStateLegislativeElection(next, packId, electionDay);
      const results = recordByStableKey(
        next.history.events,
        resultsKey(packId, electionDay),
      );
      if (!results) continue;
      for (const tag of results.tags) {
        if (!tag.startsWith("term-start:")) continue;
        const termStart = tag.slice("term-start:".length);
        if (before < termStart && termStart <= after)
          next = seatStateLegislativeWinners(
            next,
            packId,
            results,
            makeIsoDate(termStart),
          );
      }
    }
  }
  return next;
}
