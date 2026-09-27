import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
  type CharacterHistoryContextPersonInput,
} from "../character-history";
import { addDays, makeIsoDate } from "../dates";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { createOrganizationParticipations } from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { drawCanonicalNamedIdentity, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import { seatStartingCondition } from "../world-setup/conditions";
import type { CongressSeat } from "./congress-seats";
import { MINIMUM_AGE } from "./congress-seats";
import {
  LIVING_WORLD_KEYS,
  PARTY_AFFILIATION_KIND,
  congressSeatTitle,
  livingWorldOrganizationId,
} from "./opening";

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
}

const MAJOR_PARTIES = ["democratic", "republican"] as const;

const slateKey = (seatKey: string, year: number) =>
  `${CONGRESS_CANDIDATE_VERSION}:slate:${seatKey}:${year}`;

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
    world.history.events.find(
      (event) => event.stableKey === slateKey(seatKey, year),
    ) ?? null
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
    const [party, kind] = (participant.detail ?? "").split("|");
    if (!party || !world.people[participant.personId]) return [];
    return [
      {
        personId: participant.personId,
        party,
        incumbent: kind === "incumbent",
      },
    ];
  });
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function prospectKey(seat: CongressSeat, year: number, party: string): string {
  return `${CONGRESS_CANDIDATE_VERSION}:${seat.seatKey}:${year}:${party}:prospect`;
}

function prospectInput(
  world: World,
  seat: CongressSeat,
  year: number,
  party: string,
): CharacterHistoryContextPersonInput {
  const stableKey = prospectKey(seat, year, party);
  const rng = new SeededRng(world.seed).fork(stableKey);
  const age = rng.integer(MINIMUM_AGE[seat.chamberKey] + 3, 71);
  return {
    stableKey,
    ...drawCanonicalNamedIdentity(
      rng.fork("name"),
      generatePersonIdentity(rng.fork("identity")),
    ),
    birthDate: makeIsoDate(
      `${year - age}-${pad(rng.integer(1, 13))}-${pad(rng.integer(1, 29))}`,
    ),
    homeJurisdictionId: stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id,
  };
}

function prospectDecision(
  world: World,
  plan: CongressCandidateSeatPlan,
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
  const key = `${slateKey(plan.seat.seatKey, Number(plan.intakeDate.slice(0, 4)))}:decision:${party}:${personId}`;
  const evaluation = evaluateDecision(world, {
    stableKey: key,
    decisionType: "election.consider-congress-run",
    actorPersonId: personId,
    cutoff: {
      asOfDate: plan.intakeDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:life", key: plan.seat.seatKey, entityId: null },
    options: [
      { key: "run", label: "Run", description: "Enter the race." },
      { key: "decline", label: "Decline", description: "Do not enter." },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: `${key}:recruited`,
        optionKey: "run",
        sourceType: "institution:party-recruitment",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation: "A party asked this person to stand for this seat.",
        sourceRefs: [{ kind: "historical-event", eventId: recruitmentEventId }],
      },
      ...(opportunity !== null &&
      opportunity < CONGRESS_CANDIDATE_PROFILE.lowOpportunityShare
        ? [
            {
              stableKey: `${key}:district-view`,
              optionKey: "decline" as const,
              sourceType: "context:district-view" as const,
              direction: "supports" as const,
              importance: "decisive" as const,
              confidence: "high" as const,
              explanation:
                "This party starts with little support in the district.",
              sourceRefs: [],
            },
          ]
        : []),
    ],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  return {
    world: recordDurableDecisionTrace(world, evaluation),
    runs: evaluation.selectedOptionKey === "run",
  };
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
  const inputs = pending.flatMap((plan) =>
    MAJOR_PARTIES.filter(
      (party) => !(plan.incumbentSeeking && plan.incumbentParty === party),
    ).map((party) => prospectInput(world, plan.seat, year, party)),
  );
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
      const personId = characterHistoryContextPersonId(
        next,
        prospectKey(seat, year, party),
      );
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
        personId,
        party,
        recruitment.id,
      );
      next = decision.world;
      if (!decision.runs) continue;
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
        detail: `${row.party}|${row.incumbent ? "incumbent" : "new"}`,
      })),
      personFactConstraints: [],
      visibility: "public",
      tags: [
        CONGRESS_CANDIDATE_VERSION,
        CONGRESS_CANDIDATE_PROFILE.id,
        `seat:${seat.seatKey}`,
        `intake-date:${intakeDate}`,
      ],
      summary: `${candidates.length} people entered the race for ${congressSeatTitle(seat)}.`,
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
