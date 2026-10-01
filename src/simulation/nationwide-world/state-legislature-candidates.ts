import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { addDays, ageOnDate, makeIsoDate } from "../dates";
import { legislativeTermDates } from "../legislative-office-terms";
import {
  electionProspectInput,
  recordProspectRunChoice,
} from "../election-candidate-prospect";
import {
  assessCandidateQualification,
  candidateQualificationRuleSet,
} from "../candidate-qualification";
import {
  districtResidenceSince,
  establishDistrictResidence,
} from "../district-residence";
import {
  createHousehold,
  createOrganizationParticipations,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../life";
import { stateJurisdictionForKey } from "../life-places";
import {
  LIVING_WORLD_KEYS,
  PARTY_AFFILIATION_KIND,
  livingWorldOrganizationId,
} from "../living-world/opening";
import { personName } from "../people";
import {
  officeFamilyForChamberKey,
  officeQualifications,
} from "../office-qualification-rules";
import { standInQualification } from "../office-qualification-profile";
import { activeOrganizationParticipationsAt } from "../life-queries";
import {
  canStandAgain,
  pastCandidatesBySeat,
  returningCandidate,
  type PastCandidate,
} from "../nominations/candidate-pool";
import { SeededRng } from "../rng";
import type {
  DistrictSeatBinding,
  EntityId,
  HistoricalEvent,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { createStableId } from "../ids";
import { stateResidenceSince } from "./residence-duration";
import {
  decideSelfStarterRun,
  drawsSelfStarter,
} from "../nominations/field-entry";
import type { NominationPlan } from "../nominations/nomination-rules";
import { generalCandidatesFromField } from "../nominations/party-nominations";
import { STATE_LEGISLATURE_KEYS } from "./state-legislature-opening";
import {
  recordByStableKey,
  withHistoryAppendTransaction,
} from "../history-index";

export const STATE_LEGISLATURE_CANDIDATE_VERSION =
  "state-legislature-candidates/v1";

// PLACEHOLDER(overnight): this staggered fictional prospect window and the
// opportunity threshold are not state filing, nomination, or primary law.
export const STATE_LEGISLATURE_CANDIDATE_PROFILE = {
  id: "ocd-state-legislature-candidates-game-profile/v1",
  intakeStartMonthDay: "01-06",
  intakeDays: 60,
  lowOpportunityShare: 0.18,
  unknownMinimumAge: 21,
} as const;

export interface StateCandidateSeatPlan {
  readonly packId: string;
  readonly jurisdictionKey: string;
  readonly officeKey: string;
  readonly ordinal: number;
  readonly title: string;
  readonly minimumAge: number;
  readonly usesGeneratedResidencyRule: boolean;
  readonly districtBinding: DistrictSeatBinding | null;
  readonly democraticShare: number | null;
  readonly incumbentPersonId: EntityId | null;
  readonly incumbentParty: string | null;
  readonly incumbentSeeking: boolean;
  readonly intakeDate: IsoDate;
  /** The nomination stage's plan under the law in force on the intake day. */
  readonly nomination?: NominationPlan;
}

export interface StateCandidate {
  readonly personId: EntityId;
  readonly party: string | null;
  readonly incumbent: boolean;
  /** Nobody recruited them: they came forward on their own. */
  readonly selfStarter?: boolean;
}

export const stateCandidateSeatKey = (
  packId: string,
  officeKey: string,
  ordinal: number,
) => `${packId}|${officeKey}|${ordinal}`;

export const stateSlateKey = (seatKey: string, year: number) =>
  `${STATE_LEGISLATURE_CANDIDATE_VERSION}:slate:${seatKey}:${year}`;

export function stateCandidateIntakeDay(year: number, index: number): IsoDate {
  return addDays(
    makeIsoDate(
      `${year}-${STATE_LEGISLATURE_CANDIDATE_PROFILE.intakeStartMonthDay}`,
    ),
    index % STATE_LEGISLATURE_CANDIDATE_PROFILE.intakeDays,
  );
}

export function stateCandidateSlate(
  world: World,
  seatKey: string,
  year: number,
): HistoricalEvent | null {
  return (
    recordByStableKey(world.history.events, stateSlateKey(seatKey, year)) ??
    null
  );
}

export function stateCandidates(
  world: World,
  seatKey: string,
  year: number,
): readonly StateCandidate[] {
  const slate = stateCandidateSlate(world, seatKey, year);
  if (!slate) return [];
  return slate.participants.flatMap((participant) => {
    if (!world.people[participant.personId]) return [];
    const [party, kind, how] = (participant.detail ?? "").split("|");
    if (!party) return [];
    return [
      {
        personId: participant.personId,
        party: party === "none" ? null : party,
        incumbent: kind === "incumbent",
        ...(how === "self-starter" ? { selfStarter: true } : {}),
      },
    ];
  });
}

/**
 * Who is on the general-election ballot for a seat: the nomination stage's
 * nominees once it has finished, otherwise one candidate per party.
 */
export function stateGeneralCandidates(
  world: World,
  seatKey: string,
  year: number,
): readonly StateCandidate[] {
  return generalCandidatesFromField(
    world,
    stateSlateKey(seatKey, year),
    stateCandidates(world, seatKey, year),
  );
}

function selfStarterKey(seatKey: string, year: number, party: string): string {
  return `${STATE_LEGISLATURE_CANDIDATE_VERSION}:${seatKey}:${year}:${party}:self-starter`;
}

function selfStarterParties(plan: StateCandidateSeatPlan): readonly string[] {
  if (!plan.nomination || plan.democraticShare === null) return [];
  const share = plan.democraticShare;
  return (["democratic", "republican"] as const).filter((party) =>
    drawsSelfStarter({
      plan: plan.nomination!,
      intakeDate: plan.intakeDate,
      party,
      incumbentParty: plan.incumbentParty,
      incumbentSeeking: plan.incumbentSeeking,
      partyShare: party === "democratic" ? share : 1 - share,
    }),
  );
}

/** A single save's seat view, recorded by the opening rather than redrawn. */
export function stateSeatDemocraticShare(
  world: World,
  packId: string,
  officeKey: string,
  ordinal: number,
): number | null {
  const opening = recordByStableKey(
    world.history.events,
    STATE_LEGISLATURE_KEYS.opening(packId),
  );
  const prefix = `seat-share:${officeKey}|${ordinal}|`;
  const text = opening?.tags
    .find((tag) => tag.startsWith(prefix))
    ?.slice(prefix.length);
  if (text === undefined) return null;
  const share = Number(text);
  return Number.isFinite(share) && share >= 0 && share <= 1 ? share : null;
}

function prospectKey(seatKey: string, year: number, party: string): string {
  return `${STATE_LEGISLATURE_CANDIDATE_VERSION}:${seatKey}:${year}:${party}:prospect`;
}

/**
 * PLACEHOLDER(overnight): a seeded fictional biography, recorded as dated
 * facts rather than inferred from birthplace. Some prospects lack the years
 * a known rule requires; they never enter the slate.
 */
function recordFictionalResidence(
  world: World,
  plan: StateCandidateSeatPlan,
  seatKey: string,
  year: number,
  party: string,
  personId: EntityId,
): World {
  const person = world.people[personId]!;
  const jurisdictionId = stateJurisdictionForKey(plan.jurisdictionKey)!.id;
  const rng = new SeededRng(world.seed).fork(
    `${prospectKey(seatKey, year, party)}:residence`,
  );
  const stateYears = rng.integer(1, 13);
  const districtYears = rng.integer(0, Math.min(stateYears, 6) + 1);
  const stateSince = addDays(plan.intakeDate, -365 * stateYears);
  const districtSince = addDays(plan.intakeDate, -365 * districtYears);
  const stateStart =
    stateSince < person.birthDate ? person.birthDate : stateSince;
  const districtStart = districtSince < stateStart ? stateStart : districtSince;
  const stateKey = `${prospectKey(seatKey, year, party)}:residence-background`;
  let next = recordWorldEvent(world, {
    stableKey: stateKey,
    type: "life.fictional-candidate-residence-background",
    occurredAt: plan.districtBinding ? districtStart : stateStart,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: "focus:subject", detail: "residence-background" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      STATE_LEGISLATURE_CANDIDATE_VERSION,
      STATE_LEGISLATURE_CANDIDATE_PROFILE.id,
      `state-residence-since:${stateStart}`,
      ...(plan.districtBinding
        ? [
            `district:${plan.districtBinding.recordId}`,
            `district-residence-since:${districtStart}`,
          ]
        : []),
    ],
    summary: `${personName(person)} has a simulated prior residence history for this candidacy.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const background = next.history.events.at(-1)!;
  const householdKey = `${stateKey}:household`;
  const householdId = createStableId("household", `${next.id}:${householdKey}`);
  const generated = {
    kind: "generated" as const,
    generatorKey: STATE_LEGISLATURE_CANDIDATE_PROFILE.id,
  };
  next = createHousehold(next, {
    stableKey: householdKey,
    formedAt: stateStart,
    label: `${personName(person)}'s recorded home`,
    provenance: generated,
  });
  next = recordHouseholdLocation(next, {
    stableKey: `${householdKey}:location`,
    householdId,
    effectiveAt: stateStart,
    jurisdictionId,
    label: "Fictional state home",
    kind: "residence:home",
    provenance: generated,
    supersedesLocationId: null,
  });
  next = startHouseholdMembership(next, {
    stableKey: `${householdKey}:membership`,
    personId,
    householdId,
    startedAt: stateStart,
    residenceRole: "primary",
    kind: "resident:member",
    provenance: generated,
  });
  if (plan.districtBinding === null) return next;
  const residence = establishDistrictResidence(next, {
    personId,
    binding: plan.districtBinding,
    startedOn: districtStart,
    provenance: {
      method: "simulated-event",
      sourceEventId: background.id,
      note: STATE_LEGISLATURE_CANDIDATE_PROFILE.id,
    },
  });
  if (residence.kind === "refused")
    throw new Error(
      `Fictional district residence was refused: ${residence.reason}`,
    );
  return residence.world;
}

function satisfiesKnownQualifications(
  world: World,
  plan: StateCandidateSeatPlan,
  personId: EntityId,
): boolean {
  const person = world.people[personId]!;
  const stateSince = stateResidenceSince(
    world,
    personId,
    plan.jurisdictionKey,
    plan.intakeDate,
  );
  const districtSince = plan.districtBinding
    ? districtResidenceSince(
        world,
        personId,
        plan.districtBinding,
        plan.intakeDate,
      )
    : null;
  const rules = candidateQualificationRuleSet(
    plan.packId,
    plan.officeKey,
    plan.intakeDate,
  );
  const assessment = rules
    ? assessCandidateQualification(rules, {
        birthDate: person.birthDate,
        onDate: plan.intakeDate,
        stateResidenceSince: stateSince,
        districtResidenceSince: districtSince,
      })
    : null;
  // Unknown legal fields remain unknown and do not become a positive legal
  // assertion. Only a known, measured refusal blocks this game-profile slate.
  if (
    assessment &&
    assessment.refusals.some((refusal) => refusal.kind !== "unresolved-rule")
  )
    return false;
  const chamberKey = plan.officeKey.split(":").at(-1) ?? "";
  const family = officeFamilyForChamberKey(chamberKey);
  if (!family) return true;
  const supported = officeQualifications(
    plan.jurisdictionKey,
    family,
    plan.intakeDate,
  ).filter(
    (row) =>
      row.temporalApplicability.state === "SUPPORTED" &&
      row.sourceState === "KNOWN" &&
      typeof row.value === "number",
  );
  for (const row of supported) {
    const years = row.value as number;
    if (
      row.field === "MINIMUM_AGE" &&
      ageOnDate(person.birthDate, plan.intakeDate) < years
    )
      return false;
    if (
      row.field === "STATE_RESIDENCE" &&
      (stateSince === null || ageOnDate(stateSince, plan.intakeDate) < years)
    )
      return false;
    if (
      row.field === "DISTRICT_RESIDENCE" &&
      (districtSince === null ||
        ageOnDate(districtSince, plan.intakeDate) < years)
    )
      return false;
  }
  // The profile's drawn state-residence value is also a game rule for an
  // unread state; background NPCs must meet it as player candidates do.
  if (plan.usesGeneratedResidencyRule) {
    const drawn = standInQualification(
      plan.jurisdictionKey,
      "STATE_RESIDENCE",
      family,
    );
    if (
      drawn &&
      (stateSince === null ||
        ageOnDate(stateSince, plan.intakeDate) < drawn.value)
    )
      return false;
  }
  return true;
}

function returningKey(
  seatKey: string,
  party: string,
  kind: PastCandidate["kind"],
): string {
  return `${seatKey}|${party}|${kind}`;
}

/**
 * The people each seat's parties ask first this cycle: someone an earlier
 * cycle already brought into the district, of the same party, who can still
 * stand and still meets the seat's known qualifications (a redrawn district
 * can leave them outside it). A new person is generated only where nobody can.
 */
function returningStateCandidates(
  world: World,
  year: number,
  plans: readonly StateCandidateSeatPlan[],
): ReadonlyMap<string, EntityId> {
  const pool = pastCandidatesBySeat(world, STATE_LEGISLATURE_CANDIDATE_VERSION);
  const chosen = new Map<string, EntityId>();
  if (pool.size === 0) return chosen;
  const asked = new Set<EntityId>();
  for (const plan of plans) {
    const seatKey = stateCandidateSeatKey(
      plan.packId,
      plan.officeKey,
      plan.ordinal,
    );
    const past = pool.get(seatKey);
    if (!past) continue;
    const canStand = (personId: EntityId): boolean =>
      !asked.has(personId) &&
      personId !== plan.incumbentPersonId &&
      canStandAgain(world, personId, plan.intakeDate) &&
      satisfiesKnownQualifications(world, plan, personId);
    const ask = (party: string, kind: PastCandidate["kind"]) => {
      const personId = returningCandidate(past, {
        party,
        year,
        prefer: kind,
        canStand,
      });
      if (!personId) return;
      asked.add(personId);
      chosen.set(returningKey(seatKey, party, kind), personId);
    };
    const parties =
      plan.democraticShare === null ? ["none"] : ["democratic", "republican"];
    for (const party of parties)
      if (!(plan.incumbentSeeking && plan.incumbentParty === party))
        ask(party, "prospect");
    for (const party of selfStarterParties(plan)) ask(party, "self-starter");
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

/** Materialize fictional, state-resident prospects and durable run choices. */
export function prepareStateCandidateSlates(
  world: World,
  year: number,
  plans: readonly StateCandidateSeatPlan[],
): World {
  const pending = plans.filter(
    (plan) =>
      !stateCandidateSlate(
        world,
        stateCandidateSeatKey(plan.packId, plan.officeKey, plan.ordinal),
        year,
      ),
  );
  if (pending.length === 0) return world;
  const returning = returningStateCandidates(world, year, pending);
  const prospective = pending.flatMap((plan) => {
    const seatKey = stateCandidateSeatKey(
      plan.packId,
      plan.officeKey,
      plan.ordinal,
    );
    const parties =
      plan.democraticShare === null ? ["none"] : ["democratic", "republican"];
    return parties
      .filter(
        (party) =>
          !(plan.incumbentSeeking && plan.incumbentParty === party) &&
          !returning.has(returningKey(seatKey, party, "prospect")),
      )
      .map((party) =>
        electionProspectInput({
          world,
          stableKey: prospectKey(seatKey, year, party),
          year,
          minimumAge: plan.minimumAge,
          homeJurisdictionId: stateJurisdictionForKey(plan.jurisdictionKey)!.id,
        }),
      )
      .concat(
        selfStarterParties(plan)
          .filter(
            (party) =>
              !returning.has(returningKey(seatKey, party, "self-starter")),
          )
          .map((party) =>
            electionProspectInput({
              world,
              stableKey: selfStarterKey(seatKey, year, party),
              year,
              minimumAge: plan.minimumAge,
              homeJurisdictionId: stateJurisdictionForKey(plan.jurisdictionKey)!
                .id,
            }),
          ),
      );
  });
  let next = createCharacterHistoryContextPeople(world, prospective);
  for (const plan of pending) {
    const seatKey = stateCandidateSeatKey(
      plan.packId,
      plan.officeKey,
      plan.ordinal,
    );
    const jurisdictionId = stateJurisdictionForKey(plan.jurisdictionKey)!.id;
    const bodyId = createStableId(
      "organization",
      `${next.id}:${STATE_LEGISLATURE_KEYS.body(plan.packId)}`,
    );
    const parties =
      plan.democraticShare === null ? ["none"] : ["democratic", "republican"];
    const candidates: StateCandidate[] =
      plan.incumbentSeeking && plan.incumbentPersonId
        ? [
            {
              personId: plan.incumbentPersonId,
              party: plan.incumbentParty,
              incumbent: true,
            },
          ]
        : [];
    for (const party of parties) {
      if (plan.incumbentSeeking && plan.incumbentParty === party) continue;
      const returningId = returning.get(
        returningKey(seatKey, party, "prospect"),
      );
      const personId =
        returningId ??
        characterHistoryContextPersonId(
          next,
          prospectKey(seatKey, year, party),
        );
      // A returning candidate already lives in the district on record.
      if (!returningId)
        next = recordFictionalResidence(
          next,
          plan,
          seatKey,
          year,
          party,
          personId,
        );
      if (!satisfiesKnownQualifications(next, plan, personId)) continue;
      const partyId =
        party === "none"
          ? null
          : livingWorldOrganizationId(
              next,
              LIVING_WORLD_KEYS.nationalParty(party),
            );
      const recruitmentKey = `${stateSlateKey(seatKey, year)}:recruit:${party}`;
      next = recordWorldEvent(next, {
        stableKey: recruitmentKey,
        type: "election.state-legislative-recruitment",
        occurredAt: plan.intakeDate,
        recordedAt: next.currentDate,
        jurisdictionId,
        involvedEntityIds: [personId, bodyId, ...(partyId ? [partyId] : [])],
        participants: [
          { personId, role: "focus:subject", detail: `prospect:${party}` },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: [STATE_LEGISLATURE_CANDIDATE_VERSION, `seat:${seatKey}`],
        summary:
          partyId === null
            ? `${personName(next.people[personId]!)} considered standing for ${plan.title}.`
            : `A party asked ${personName(next.people[personId]!)} to consider running for ${plan.title}.`,
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
      const opportunity =
        plan.democraticShare === null
          ? null
          : party === "democratic"
            ? plan.democraticShare
            : 1 - plan.democraticShare;
      const decision = recordProspectRunChoice({
        world: next,
        stableKey: `${stateSlateKey(seatKey, year)}:decision:${party}:${personId}`,
        decisionType: "election.consider-state-legislative-run",
        seatKey,
        personId,
        intakeDate: plan.intakeDate,
        recruitmentEventId: recruitment.id,
        opportunity,
        lowOpportunityShare:
          STATE_LEGISLATURE_CANDIDATE_PROFILE.lowOpportunityShare,
        termEnds:
          legislativeTermDates(plan.officeKey, makeIsoDate(`${year}-11-03`))
            ?.endsAt ?? makeIsoDate(`${year + 3}-01-01`),
        ...(partyId === null
          ? {
              recruitmentSourceType:
                "institution:community-recruitment" as const,
              recruitmentExplanation:
                "A local opportunity to stand for the seat became available.",
            }
          : {}),
      });
      next = decision.world;
      if (!decision.runs) continue;
      if (
        partyId !== null &&
        !affiliatedWith(next, personId, partyId, plan.intakeDate)
      )
        next = createOrganizationParticipations(next, [
          {
            stableKey: `${recruitmentKey}:affiliation`,
            personId,
            organizationId: partyId,
            startedAt: plan.intakeDate,
            initialStatus: "active",
            kind: PARTY_AFFILIATION_KIND,
            roleKind: "member:public-affiliation",
            context: "Public party affiliation",
            provenance: { kind: "simulated-event", eventId: recruitment.id },
          },
        ]);
      candidates.push({
        personId,
        party: partyId === null ? null : party,
        incumbent: false,
      });
    }
    for (const party of selfStarterParties(plan)) {
      const entryKey = `${stateSlateKey(seatKey, year)}:self-starter:${party}`;
      const returningId = returning.get(
        returningKey(seatKey, party, "self-starter"),
      );
      const personId =
        returningId ??
        characterHistoryContextPersonId(
          next,
          selfStarterKey(seatKey, year, party),
        );
      if (!returningId)
        next = recordFictionalResidence(
          next,
          plan,
          seatKey,
          year,
          `${party}:self-starter`,
          personId,
        );
      if (!satisfiesKnownQualifications(next, plan, personId)) continue;
      let decision!: ReturnType<typeof decideSelfStarterRun>;
      next = withHistoryAppendTransaction(
        next,
        ["personalityTendencies"],
        (prepared) => {
          decision = decideSelfStarterRun(prepared, {
            stableKey: `${entryKey}:${personId}`,
            decisionType: "election.consider-state-legislative-run",
            personId,
            seatKey,
            intakeDate: plan.intakeDate,
          });
          return decision.world;
        },
      );
      if (!decision.runs) continue;
      const partyId = livingWorldOrganizationId(
        next,
        LIVING_WORLD_KEYS.nationalParty(party),
      );
      next = recordWorldEvent(next, {
        stableKey: entryKey,
        type: "election.state-legislative-primary-entry",
        occurredAt: plan.intakeDate,
        recordedAt: next.currentDate,
        jurisdictionId,
        involvedEntityIds: [personId, bodyId, partyId],
        participants: [
          { personId, role: "focus:subject", detail: `self-starter:${party}` },
        ],
        personFactConstraints: [],
        visibility: "public",
        tags: [
          STATE_LEGISLATURE_CANDIDATE_VERSION,
          `seat:${seatKey}`,
          `party:${party}`,
          `decision-trace:${decision.decisionTraceId}`,
        ],
        summary: `${personName(next.people[personId]!)} entered the ${party === "democratic" ? "Democratic" : "Republican"} primary for ${plan.title}.`,
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
      if (!affiliatedWith(next, personId, partyId, plan.intakeDate))
        next = createOrganizationParticipations(next, [
          {
            stableKey: `${entryKey}:affiliation`,
            personId,
            organizationId: partyId,
            startedAt: plan.intakeDate,
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
      stableKey: stateSlateKey(seatKey, year),
      type: "election.state-legislative-candidate-slate",
      occurredAt: plan.intakeDate,
      recordedAt: next.currentDate,
      jurisdictionId,
      involvedEntityIds: [
        bodyId,
        ...candidates.map((candidate) => candidate.personId),
      ],
      participants: candidates.map((candidate) => ({
        personId: candidate.personId,
        role: "presence:candidate" as const,
        detail: `${candidate.party ?? "none"}|${candidate.incumbent ? "incumbent" : "new"}${candidate.selfStarter ? "|self-starter" : ""}`,
      })),
      personFactConstraints: [],
      visibility: "public",
      tags: [
        STATE_LEGISLATURE_CANDIDATE_VERSION,
        STATE_LEGISLATURE_CANDIDATE_PROFILE.id,
        `seat:${seatKey}`,
        `intake-date:${plan.intakeDate}`,
        ...(plan.nomination?.known &&
        plan.nomination.primaryDate > plan.intakeDate
          ? [`primary-date:${plan.nomination.primaryDate}`]
          : ["nomination:not-held"]),
        ...(candidates.some((candidate) => candidate.incumbent)
          ? ["incumbent-qualification:provisional-game-profile"]
          : []),
      ],
      summary: `${candidates.length} people entered the race for ${plan.title}.`,
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
