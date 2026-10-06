import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
  type CharacterHistoryContextPersonInput,
} from "../character-history";
import { candidateSlateSummary } from "../candidate-slate-summary";
import { addDays, makeIsoDate } from "../dates";
import {
  electionProspectInput,
  recordProspectRunChoice,
} from "../election-candidate-prospect";
import { createOrganizationParticipations } from "../life";
import { activeOrganizationParticipationsAt } from "../life-queries";
import {
  canStandAgain,
  pastCandidatesBySeat,
  returningCandidate,
  type PastCandidate,
} from "../nominations/candidate-pool";
import {
  generalElectionDay,
  nominationPlan,
  type NominationPlan,
} from "../nominations/nomination-rules";
import { generalCandidatesFromField } from "../nominations/party-nominations";
import {
  decideSelfStarterRun,
  drawsSelfStarter,
  fieldIntakeDay,
  filingWindowOpens,
} from "../nominations/field-entry";
import { stateJurisdictionForKey } from "../life-places";
import { personName } from "../people";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import { seatStartingCondition } from "../world-setup/conditions";
import type { CongressSeat } from "./congress-seats";
import { MINIMUM_AGE, seatTermWindow } from "./congress-seats";
import {
  LIVING_WORLD_KEYS,
  PARTY_AFFILIATION_KIND,
  congressSeatTitle,
  livingWorldOrganizationId,
} from "./opening";
import { recordByStableKey } from "../history-index";

export const CONGRESS_CANDIDATE_VERSION = "congress-candidates/v1";

// PLACEHOLDER(overnight): this staggered declaration window is a game timing
// rule for NPC readiness, not a sourced state filing deadline or primary date.
export const CONGRESS_CANDIDATE_PROFILE = {
  id: "ocd-congress-candidates-game-profile/v1",
  intakeStartMonthDay: "01-06",
  intakeDays: 60,
  // PLACEHOLDER(overnight): a recruited prospect may decline an especially
  // unfavorable district; no candidate-choice frequency is calibrated yet.
  lowOpportunityShare: 0.18,
} as const;

export interface CongressCandidateSeatPlan {
  readonly seat: CongressSeat;
  readonly incumbentPersonId: EntityId | null;
  readonly incumbentParty: string | null;
  readonly incumbentSeeking: boolean;
  readonly intakeDate: IsoDate;
}

export interface CongressCandidate {
  readonly personId: EntityId;
  readonly party: string;
  readonly incumbent: boolean;
  /** Nobody recruited them: they came forward on their own. */
  readonly selfStarter?: boolean;
}

const MAJOR_PARTIES = ["democratic", "republican"] as const;

/** The stable key of a seat's filed field for one year. */
export const slateKey = (seatKey: string, year: number) =>
  `${CONGRESS_CANDIDATE_VERSION}:slate:${seatKey}:${year}`;

/** The nomination plan for a Congress seat, under the law in force when its cycle's filing opens. */
export function congressNominationPlan(
  world: World,
  seat: CongressSeat,
  year: number,
): NominationPlan {
  return nominationPlan(world, {
    stateUsps: seat.stateUsps,
    family: seat.chamberKey,
    year,
    // The law in force when the cycle's filing opens governs the whole
    // cycle, so a law passed while fields are filing takes effect next time.
    onDate: filingWindowOpens(year),
    generalDay: generalElectionDay(year),
  });
}

/**
 * The day a seat's field files: the game's staggered intake day, but never
 * later than the state's filing deadline before its primary. `plan` is the
 * seat's nomination plan when the caller already has it.
 */
export function congressFieldIntakeDay(
  world: World,
  seat: CongressSeat,
  year: number,
  seatIndex: number,
  plan: NominationPlan = congressNominationPlan(world, seat, year),
): IsoDate {
  return fieldIntakeDay(
    congressCandidateIntakeDay(year, seatIndex),
    plan,
    year,
  );
}

export function congressCandidateIntakeDay(
  year: number,
  seatIndex: number,
): IsoDate {
  return addDays(
    makeIsoDate(`${year}-${CONGRESS_CANDIDATE_PROFILE.intakeStartMonthDay}`),
    seatIndex % CONGRESS_CANDIDATE_PROFILE.intakeDays,
  );
}

export function congressCandidateSlate(
  world: World,
  seatKey: string,
  year: number,
): HistoricalEvent | null {
  return (
    recordByStableKey(world.history.events, slateKey(seatKey, year)) ?? null
  );
}

export function congressCandidates(
  world: World,
  seatKey: string,
  year: number,
): readonly CongressCandidate[] {
  const slate = congressCandidateSlate(world, seatKey, year);
  if (!slate) return [];
  return slate.participants.flatMap((participant) => {
    const [party, kind, how] = (participant.detail ?? "").split("|");
    if (!party || !world.people[participant.personId]) return [];
    return [
      {
        personId: participant.personId,
        party,
        incumbent: kind === "incumbent",
        ...(how === "self-starter" ? { selfStarter: true } : {}),
      },
    ];
  });
}

/**
 * Who is on the general-election ballot for a seat: the nomination stage's
 * nominees, strongest primary finish first, once it has finished. A field
 * that never went through it (an older save, or a seat whose primary falls
 * on the general election day) or whose stage has not finished by election
 * day sends one candidate per party: the sitting member, else the one the
 * party recruited.
 */
export function congressGeneralCandidates(
  world: World,
  seatKey: string,
  year: number,
): readonly CongressCandidate[] {
  return generalCandidatesFromField(
    world,
    slateKey(seatKey, year),
    congressCandidates(world, seatKey, year),
  );
}

function prospectKey(seat: CongressSeat, year: number, party: string): string {
  return `${CONGRESS_CANDIDATE_VERSION}:${seat.seatKey}:${year}:${party}:prospect`;
}

function selfStarterKey(
  seat: CongressSeat,
  year: number,
  party: string,
): string {
  return `${CONGRESS_CANDIDATE_VERSION}:${seat.seatKey}:${year}:${party}:self-starter`;
}

function partyShareFor(
  world: World,
  seat: CongressSeat,
  party: string,
): number | null {
  const share = seatStartingCondition(world, seat.seatKey)?.generatedShare;
  if (share === null || share === undefined) return null;
  return party === "democratic"
    ? share
    : party === "republican"
      ? 1 - share
      : null;
}

/** The parties whose open nomination draws a self-starter this year. */
function selfStarterParties(
  world: World,
  plan: CongressCandidateSeatPlan,
  nomination: NominationPlan,
): readonly string[] {
  return MAJOR_PARTIES.filter((party) =>
    drawsSelfStarter({
      plan: nomination,
      intakeDate: plan.intakeDate,
      party,
      incumbentParty: plan.incumbentParty,
      incumbentSeeking: plan.incumbentSeeking,
      partyShare: partyShareFor(world, plan.seat, party),
    }),
  );
}

function prospectInput(
  world: World,
  seat: CongressSeat,
  year: number,
  party: string,
): CharacterHistoryContextPersonInput {
  const stableKey = prospectKey(seat, year, party);
  return electionProspectInput({
    world,
    stableKey,
    year,
    minimumAge: MINIMUM_AGE[seat.chamberKey],
    homeJurisdictionId: stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id,
  });
}

function prospectDecision(
  world: World,
  plan: CongressCandidateSeatPlan,
  year: number,
  personId: EntityId,
  party: string,
  recruitmentEventId: EntityId,
): { world: World; runs: boolean } {
  const condition = seatStartingCondition(world, plan.seat.seatKey);
  const opportunity =
    condition?.generatedShare === null ||
    condition?.generatedShare === undefined
      ? null
      : party === "democratic"
        ? condition.generatedShare
        : 1 - condition.generatedShare;
  return recordProspectRunChoice({
    world,
    stableKey: `${slateKey(plan.seat.seatKey, year)}:decision:${party}:${personId}`,
    decisionType: "election.consider-congress-run",
    seatKey: plan.seat.seatKey,
    personId,
    intakeDate: plan.intakeDate,
    recruitmentEventId,
    opportunity,
    lowOpportunityShare: CONGRESS_CANDIDATE_PROFILE.lowOpportunityShare,
    termEnds: seatTermWindow(plan.seat, makeIsoDate(`${year + 1}-01-03`))
      .endExclusive,
  });
}

function returningKey(
  seat: CongressSeat,
  party: string,
  kind: PastCandidate["kind"],
): string {
  return `${seat.seatKey}|${party}|${kind}`;
}

/**
 * The people each seat's parties ask first this year: someone an earlier
 * cycle already brought into the district, of the same party, who can still
 * stand. A new person is generated only where nobody can.
 */
function returningCandidates(
  world: World,
  year: number,
  plans: readonly CongressCandidateSeatPlan[],
  nominations: ReadonlyMap<string, NominationPlan>,
): ReadonlyMap<string, EntityId> {
  const pool = pastCandidatesBySeat(world, CONGRESS_CANDIDATE_VERSION);
  const chosen = new Map<string, EntityId>();
  if (pool.size === 0) return chosen;
  const asked = new Set<EntityId>();
  for (const plan of plans) {
    const past = pool.get(plan.seat.seatKey);
    if (!past) continue;
    const canStand = (personId: EntityId): boolean =>
      !asked.has(personId) &&
      personId !== plan.incumbentPersonId &&
      canStandAgain(world, personId, plan.intakeDate);
    const ask = (party: string, kind: PastCandidate["kind"]) => {
      const personId = returningCandidate(past, {
        party,
        year,
        prefer: kind,
        canStand,
      });
      if (!personId) return;
      asked.add(personId);
      chosen.set(returningKey(plan.seat, party, kind), personId);
    };
    for (const party of MAJOR_PARTIES)
      if (!(plan.incumbentSeeking && plan.incumbentParty === party))
        ask(party, "prospect");
    for (const party of selfStarterParties(
      world,
      plan,
      nominations.get(plan.seat.seatKey)!,
    ))
      ask(party, "self-starter");
  }
  return chosen;
}

/** Whether the person already belongs to the party on that day. */
function affiliatedWith(
  world: World,
  personId: EntityId,
  partyId: EntityId,
  onDate: IsoDate,
): boolean {
  return activeOrganizationParticipationsAt(world, personId, {
    asOfDate: onDate,
    historySequenceExclusive: world.history.nextSequence,
  }).some((row) => row.participation.organizationId === partyId);
}

/** Materialize candidates before the general election, in bounded daily batches. */
export function prepareCongressCandidateSlates(
  world: World,
  year: number,
  plans: readonly CongressCandidateSeatPlan[],
): World {
  const pending = plans.filter(
    (plan) => !congressCandidateSlate(world, plan.seat.seatKey, year),
  );
  if (pending.length === 0) return world;
  const nominations = new Map(
    pending.map((plan) => [
      plan.seat.seatKey,
      congressNominationPlan(world, plan.seat, year),
    ]),
  );
  const returning = returningCandidates(world, year, pending, nominations);
  const inputs = pending.flatMap((plan) => [
    ...MAJOR_PARTIES.filter(
      (party) =>
        !(plan.incumbentSeeking && plan.incumbentParty === party) &&
        !returning.has(returningKey(plan.seat, party, "prospect")),
    ).map((party) => prospectInput(world, plan.seat, year, party)),
    ...selfStarterParties(world, plan, nominations.get(plan.seat.seatKey)!)
      .filter(
        (party) =>
          !returning.has(returningKey(plan.seat, party, "self-starter")),
      )
      .map((party) =>
        electionProspectInput({
          world,
          stableKey: selfStarterKey(plan.seat, year, party),
          year,
          minimumAge: MINIMUM_AGE[plan.seat.chamberKey],
          homeJurisdictionId: stateJurisdictionForKey(
            `US-${plan.seat.stateUsps}`,
          )!.id,
        }),
      ),
  ]);
  let next = createCharacterHistoryContextPeople(world, inputs);
  for (const plan of pending) {
    const { seat, intakeDate } = plan;
    const chamberId = livingWorldOrganizationId(
      next,
      LIVING_WORLD_KEYS.chamber(seat.chamberKey),
    );
    const jurisdictionId = stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id;
    const candidates: CongressCandidate[] =
      plan.incumbentSeeking && plan.incumbentPersonId && plan.incumbentParty
        ? [
            {
              personId: plan.incumbentPersonId,
              party: plan.incumbentParty,
              incumbent: true,
            },
          ]
        : [];
    for (const party of MAJOR_PARTIES) {
      if (plan.incumbentSeeking && plan.incumbentParty === party) continue;
      const personId =
        returning.get(returningKey(seat, party, "prospect")) ??
        characterHistoryContextPersonId(next, prospectKey(seat, year, party));
      const partyId = livingWorldOrganizationId(
        next,
        LIVING_WORLD_KEYS.nationalParty(party),
      );
      const recruitmentKey = `${slateKey(seat.seatKey, year)}:recruit:${party}`;
      next = recordWorldEvent(next, {
        stableKey: recruitmentKey,
        type: "election.congress-recruitment",
        occurredAt: intakeDate,
        recordedAt: next.currentDate,
        jurisdictionId,
        involvedEntityIds: [personId, partyId, chamberId],
        participants: [
          { personId, role: "focus:subject", detail: `prospect:${party}` },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: [
          CONGRESS_CANDIDATE_VERSION,
          `seat:${seat.seatKey}`,
          `party:${party}`,
        ],
        summary: `A party asked ${personName(next.people[personId]!)} to consider running for ${congressSeatTitle(seat)}.`,
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const recruitment = next.history.events.at(-1)!;
      const decision = prospectDecision(
        next,
        plan,
        year,
        personId,
        party,
        recruitment.id,
      );
      next = decision.world;
      if (!decision.runs) continue;
      if (!affiliatedWith(next, personId, partyId, intakeDate))
        next = createOrganizationParticipations(next, [
          {
            stableKey: `${recruitmentKey}:affiliation`,
            personId,
            organizationId: partyId,
            startedAt: intakeDate,
            initialStatus: "active",
            kind: PARTY_AFFILIATION_KIND,
            roleKind: "member:public-affiliation",
            context: "Public party affiliation",
            provenance: { kind: "simulated-event", eventId: recruitment.id },
          },
        ]);
      candidates.push({ personId, party, incumbent: false });
    }
    const nomination = nominations.get(seat.seatKey)!;
    for (const party of selfStarterParties(next, plan, nomination)) {
      const personId =
        returning.get(returningKey(seat, party, "self-starter")) ??
        characterHistoryContextPersonId(
          next,
          selfStarterKey(seat, year, party),
        );
      const decision = decideSelfStarterRun(next, {
        stableKey: `${slateKey(seat.seatKey, year)}:self-starter:${party}:${personId}`,
        decisionType: "election.consider-congress-run",
        personId,
        seatKey: seat.seatKey,
        intakeDate,
      });
      next = decision.world;
      if (!decision.runs) continue;
      const partyId = livingWorldOrganizationId(
        next,
        LIVING_WORLD_KEYS.nationalParty(party),
      );
      next = recordWorldEvent(next, {
        stableKey: `${slateKey(seat.seatKey, year)}:self-starter:${party}`,
        type: "election.congress-primary-entry",
        occurredAt: intakeDate,
        recordedAt: next.currentDate,
        jurisdictionId,
        involvedEntityIds: [personId, partyId, chamberId],
        participants: [
          { personId, role: "focus:subject", detail: `self-starter:${party}` },
        ],
        personFactConstraints: [],
        visibility: "public",
        tags: [
          CONGRESS_CANDIDATE_VERSION,
          `seat:${seat.seatKey}`,
          `party:${party}`,
          `decision-trace:${decision.decisionTraceId}`,
        ],
        summary: `${personName(next.people[personId]!)} entered the ${party === "democratic" ? "Democratic" : "Republican"} primary for ${congressSeatTitle(seat)}.`,
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const entry = next.history.events.at(-1)!;
      if (!affiliatedWith(next, personId, partyId, intakeDate))
        next = createOrganizationParticipations(next, [
          {
            stableKey: `${slateKey(seat.seatKey, year)}:self-starter:${party}:affiliation`,
            personId,
            organizationId: partyId,
            startedAt: intakeDate,
            initialStatus: "active",
            kind: PARTY_AFFILIATION_KIND,
            roleKind: "member:public-affiliation",
            context: "Public party affiliation",
            provenance: { kind: "simulated-event", eventId: entry.id },
          },
        ]);
      candidates.push({ personId, party, incumbent: false, selfStarter: true });
    }
    next = recordWorldEvent(next, {
      stableKey: slateKey(seat.seatKey, year),
      type: "election.congress-candidate-slate",
      occurredAt: intakeDate,
      recordedAt: next.currentDate,
      jurisdictionId,
      involvedEntityIds: [chamberId, ...candidates.map((row) => row.personId)],
      participants: candidates.map((row) => ({
        personId: row.personId,
        role: "presence:candidate" as const,
        detail: `${row.party}|${row.incumbent ? "incumbent" : "new"}${row.selfStarter ? "|self-starter" : ""}`,
      })),
      personFactConstraints: [],
      visibility: "public",
      tags: [
        CONGRESS_CANDIDATE_VERSION,
        CONGRESS_CANDIDATE_PROFILE.id,
        `seat:${seat.seatKey}`,
        `intake-date:${intakeDate}`,
        ...(nomination.known && nomination.primaryDate > intakeDate
          ? [`primary-date:${nomination.primaryDate}`]
          : ["nomination:not-held"]),
      ],
      summary: candidateSlateSummary(
        candidates.length,
        congressSeatTitle(seat),
      ),
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
  return next;
}
