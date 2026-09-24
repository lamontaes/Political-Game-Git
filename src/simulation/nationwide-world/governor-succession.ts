import { eventById } from "../event-index";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { addDays, makeIsoDate } from "../dates";
import { enactedRuleChangeAt } from "../enacted-rule-changes";
import { drawCanonicalNamedIdentity, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { electedExecutiveTermForRelationship } from "../executive-work-context";
import { candidacyEligibility } from "../candidacy";
import { officeQualifications } from "../office-qualification-rules";
import { ensureJurisdiction } from "../national-election-geography";
import { searchLifePlaces } from "../life-places";
import {
  electionContestResult,
  scheduleElectionContest,
} from "../election-contests";
import { scheduleFutureDueItem } from "../future-transitions";
import { SeededRng } from "../rng";
import type {
  EntityId,
  ExecutiveSuccessionDuration,
  ExecutiveSuccessionEffect,
  ExecutiveSuccessionLine,
  ExecutiveSuccessionRuleSource,
  ElectionContestRecord,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  currentStateExecutiveHolders,
  STATE_EXECUTIVE_WRITER_VERSION,
  stateExecutiveOffice,
  stateExecutiveTenureKeyPrefix,
  stateExecutiveTermWindow,
} from "./state-executives";
import type { StateExecutiveOffice } from "./state-executives";
import { stateExecutiveIdentityForOfficeKey } from "./state-executive-candidacy-packs";
import { createExecutiveSuccessionWorldRuleStore } from "./executive-succession-world-rules";

/** The saved World rule and eligible fictional holder determine succession. */
export const GOVERNOR_SUCCESSION_PROFILE = {
  id: "ocd-governor-succession-runtime/v3",
} as const;

export const GOVERNOR_SUCCESSION_SPECIAL_ELECTION =
  "governing:governor-succession-special-election" as const;

export type GovernorSuccessionLine = ExecutiveSuccessionLine;
export type GovernorSuccessionEffect = ExecutiveSuccessionEffect;
export type GovernorActingDuration = ExecutiveSuccessionDuration;

const LINE_OFFICE: Readonly<Record<GovernorSuccessionLine, string>> = {
  "lieutenant-governor": "Lieutenant Governor",
  "senate-president": "President of the State Senate",
  "secretary-of-state": "Secretary of State",
};

/** Only the three office families approved for the shared succession route. */
export function governorSuccessionLineForTitle(
  officeTitle: string,
): GovernorSuccessionLine | null {
  const normalized = officeTitle
    .trim()
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (normalized === "lieutenant governor") return "lieutenant-governor";
  if (
    normalized === "president of the senate" ||
    normalized === "president pro tempore of the senate" ||
    normalized === "speaker of the senate" ||
    normalized === "senate president"
  )
    return "senate-president";
  if (normalized === "secretary of state") return "secretary-of-state";
  return null;
}

export interface ActiveGovernorSuccessionRule {
  readonly line: GovernorSuccessionLine;
  readonly lineOffice: string;
  readonly effect: GovernorSuccessionEffect;
  readonly duration: GovernorActingDuration | null;
  readonly durationOptions: readonly GovernorActingDuration[];
  readonly handoff: "regular-election" | "special-election";
  readonly handoffDate: IsoDate;
  readonly originalTermEnd: IsoDate | null;
  readonly lineEffectBasis: "source-backed" | "game-profile" | "enacted";
  readonly durationBasis: "source-backed" | "game-profile" | "enacted";
  readonly handoffBasis: "source-backed" | "game-profile";
  readonly gameProfileId: string;
  readonly source: ExecutiveSuccessionRuleSource | null;
}

/** Resolves only the rule saved for this World, plus explicit law changes. */
export function activeGovernorSuccessionRule(
  world: World,
  office: StateExecutiveOffice,
  onDate: IsoDate,
  termEnd: IsoDate | null,
): ActiveGovernorSuccessionRule | null {
  const savedRule = world.executiveSuccessionRules?.rules[office.stateUsps];
  if (!savedRule) return null;
  const lineChange = enactedRuleChangeAt(world, {
    stateUsps: office.stateUsps,
    officeKey: office.officeKey,
    field: "executive.succession.line",
    onDate,
  });
  const line =
    lineChange &&
    typeof lineChange.value === "string" &&
    Object.hasOwn(LINE_OFFICE, lineChange.value)
      ? (lineChange.value as GovernorSuccessionLine)
      : savedRule.line;
  const effectChange = enactedRuleChangeAt(world, {
    stateUsps: office.stateUsps,
    officeKey: office.officeKey,
    field: "executive.succession.effect",
    onDate,
  });
  const effect =
    effectChange?.value === "acting" || effectChange?.value === "permanent"
      ? effectChange.value
      : savedRule.effect;

  // This is a death vacancy, so return-to-incumbent is not available. Every
  // other option is present only when the saved World profile has that dated
  // transition.
  const durationOptions: GovernorActingDuration[] =
    effect === "acting" && termEnd !== null
      ? savedRule.handoff === "special-election"
        ? ["until-successor-takes-office"]
        : ["until-successor-takes-office", "at-term-end"]
      : [];
  const durationChange = enactedRuleChangeAt(world, {
    stateUsps: office.stateUsps,
    officeKey: office.officeKey,
    field: "executive.succession.duration",
    onDate,
  });
  const chosenDuration =
    typeof durationChange?.value === "string" &&
    durationOptions.includes(durationChange.value as GovernorActingDuration)
      ? (durationChange.value as GovernorActingDuration)
      : null;
  const duration =
    effect === "acting" ? (chosenDuration ?? savedRule.duration) : null;
  if (effect === "acting" && duration === null) return null;

  let handoff = savedRule.handoff;
  if (duration === "at-term-end") handoff = "regular-election";
  if (handoff === "regular-election" && termEnd === null) return null;
  const handoffAnchor = world.currentDate > onDate ? world.currentDate : onDate;
  const requestedHandoffDate =
    handoff === "special-election" && savedRule.handoffDelayDays !== null
      ? addDays(handoffAnchor, savedRule.handoffDelayDays)
      : termEnd;
  if (!requestedHandoffDate) return null;
  // A special election that would fall after the existing term boundary is
  // replaced by the already-scheduled regular election handoff.
  if (
    handoff === "special-election" &&
    termEnd !== null &&
    requestedHandoffDate >= termEnd
  ) {
    handoff = "regular-election";
  }
  const handoffDate =
    handoff === "regular-election" ? termEnd : requestedHandoffDate;
  if (!handoffDate || handoffDate <= onDate || handoffDate <= world.currentDate)
    return null;

  const lineEffectChanged = Boolean(lineChange || effectChange);

  return {
    line,
    lineOffice:
      !lineEffectChanged && savedRule.lineEffectBasis === "source-backed"
        ? savedRule.lineOffice
        : LINE_OFFICE[line],
    effect,
    duration,
    durationOptions,
    handoff,
    handoffDate,
    originalTermEnd: termEnd,
    lineEffectBasis: lineEffectChanged ? "enacted" : savedRule.lineEffectBasis,
    durationBasis: durationChange
      ? "enacted"
      : effect === "acting"
        ? savedRule.durationBasis
        : savedRule.lineEffectBasis,
    handoffBasis: savedRule.handoffBasis,
    gameProfileId: savedRule.gameProfileId,
    source:
      !lineEffectChanged && savedRule.lineEffectBasis === "source-backed"
        ? savedRule.source
        : null,
  };
}

export function governorSuccessionKey(
  office: StateExecutiveOffice,
  vacancyDate: IsoDate,
  formerHolderId: EntityId,
): string {
  return `${stateExecutiveTenureKeyPrefix(office)}succession-${vacancyDate}:${formerHolderId}`;
}

export function isGovernorSuccessionSpecialElectionContest(
  contest: ElectionContestRecord,
): boolean {
  return (
    contest.stableKey.endsWith(":special-election-contest") &&
    stateExecutiveOfficeForContest(contest) !== null
  );
}

function stateExecutiveOfficeForContest(
  contest: ElectionContestRecord,
): StateExecutiveOffice | null {
  const identity = stateExecutiveIdentityForOfficeKey(contest.office.officeKey);
  if (!identity) return null;
  const office = stateExecutiveOffice(identity.stateUsps);
  return office?.jurisdictionId === contest.jurisdictionId ? office : null;
}

export function eligibleGovernorSuccessionElectionCandidates(
  world: World,
  contest: ElectionContestRecord,
  onDate: IsoDate,
): readonly EntityId[] {
  if (!isGovernorSuccessionSpecialElectionContest(contest)) return [];
  const evaluationWorld =
    world.currentDate === onDate ? world : { ...world, currentDate: onDate };
  return contest.candidatePersonIds.filter((personId) => {
    if (!world.people[personId]) return false;
    if (
      world.history.personDeaths.some(
        (death) => death.personId === personId && death.diedAt <= onDate,
      )
    )
      return false;
    return candidacyEligibility(evaluationWorld, {
      personId,
      jurisdictionId: contest.jurisdictionId,
      officeKey: contest.office.officeKey,
      alreadyACandidate: false,
    }).eligible;
  });
}

/**
 * Seats the successor, once per vacancy. Returns the successor's id, or null
 * when the state's jurisdiction or office body is not in this World.
 */
export function seatGovernorSuccessor(
  world: World,
  office: StateExecutiveOffice,
  input: {
    readonly vacancyDate: IsoDate;
    readonly formerHolderId: EntityId;
    /** The dead holder's tenure event or elected work relationship. */
    readonly formerTermEvidenceId: EntityId | null;
  },
): {
  readonly world: World;
  readonly successorId: EntityId | null;
  readonly capacity: GovernorSuccessionEffect | null;
} {
  const stableKey = governorSuccessionKey(
    office,
    input.vacancyDate,
    input.formerHolderId,
  );
  const holderKey = `${stableKey}:holder`;
  const existing = world.history.events.find(
    (event) => event.stableKey === stableKey,
  );
  if (existing)
    return {
      world,
      successorId:
        existing.participants.find((row) => row.role === "focus:subject")
          ?.personId ?? null,
      capacity: existing.tags.includes("capacity:acting")
        ? "acting"
        : "permanent",
    };
  const profiledWorld = world.executiveSuccessionRules
    ? world
    : {
        ...world,
        executiveSuccessionRules: createExecutiveSuccessionWorldRuleStore(
          world.seed,
          world.startedAt,
        ),
      };
  const organization = profiledWorld.history.organizations.find(
    (candidate) => candidate.stableKey === office.organizationStableKey,
  );
  if (!organization)
    return { world: profiledWorld, successorId: null, capacity: null };
  // The profile describes the first vacancy line only. If that successor later
  // dies before an elected governor takes office, the required deeper tier is
  // not modeled here; do not reuse the first officeholder.
  const formerTenure = input.formerTermEvidenceId
    ? eventById(profiledWorld, input.formerTermEvidenceId)
    : null;
  if (formerTenure?.tags.includes("provenance:succession"))
    return { world: profiledWorld, successorId: null, capacity: null };
  const window = stateExecutiveTermWindow(office, input.vacancyDate);
  const termEnd =
    formerTermEnd(profiledWorld, input.formerTermEvidenceId) ??
    window.endExclusive;
  const activeRule = activeGovernorSuccessionRule(
    profiledWorld,
    office,
    input.vacancyDate,
    termEnd,
  );
  if (!activeRule)
    return { world: profiledWorld, successorId: null, capacity: null };
  const generated = generatedEligibleExecutivePerson(
    profiledWorld,
    office,
    holderKey,
    input.vacancyDate,
  );
  if (!generated)
    return { world: profiledWorld, successorId: null, capacity: null };
  const next = generated.world;
  const successorId = generated.personId;

  const former = next.people[input.formerHolderId];
  const successor = next.people[successorId]!;
  const endExclusive = activeRule.handoffDate;
  const disposition = activeRule.effect === "acting" ? "acts" : "succeeds";
  const summary =
    activeRule.effect === "acting"
      ? `${activeRule.lineOffice} ${personName(successor)} became Acting Governor after Governor ${former ? personName(former) : ""} died.`
      : `${activeRule.lineOffice} ${personName(successor)} became Governor after Governor ${former ? personName(former) : ""} died.`;
  const recorded = recordWorldEvent(next, {
    stableKey,
    type: "world.office-tenure",
    occurredAt: input.vacancyDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [successorId, organization.id, input.formerHolderId],
    participants: [
      {
        personId: successorId,
        role: "focus:subject",
        detail: office.displayName,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      STATE_EXECUTIVE_WRITER_VERSION,
      `office:${office.officeKey}`,
      `state:${office.stateUsps}`,
      "provenance:succession",
      `runtime:${GOVERNOR_SUCCESSION_PROFILE.id}`,
      `succession-profile:${activeRule.gameProfileId}`,
      `succession-line-effect-basis:${activeRule.lineEffectBasis}`,
      `succession-duration-basis:${activeRule.durationBasis}`,
      `succession-handoff-basis:${activeRule.handoffBasis}`,
      `succession-line:${activeRule.line}`,
      `successor-previous-office:${activeRule.lineOffice}`,
      `succession-disposition:${disposition}`,
      `capacity:${activeRule.effect}`,
      `succession-handoff:${activeRule.handoff}`,
      ...(activeRule.duration
        ? [`acting-duration:${activeRule.duration}`]
        : []),
      ...(activeRule.originalTermEnd
        ? [`succession-original-term-end:${activeRule.originalTermEnd}`]
        : ["succession-original-term-end:unknown"]),
      ...(activeRule.source
        ? [
            `succession-source:${activeRule.source.citation}`,
            `succession-source-url:${activeRule.source.url}`,
            `succession-source-pinpoint:${activeRule.source.pinpoint}`,
          ]
        : []),
      ...(window.ruleVersion ? [`term-rule:${window.ruleVersion}`] : []),
      `term-end:${endExclusive}`,
    ],
    summary: former
      ? summary
      : `${activeRule.lineOffice} ${personName(successor)} became governor.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const continued =
    activeRule.handoff === "special-election"
      ? scheduleGovernorSuccessionSpecialElection(
          recorded,
          office,
          activeRule,
          stableKey,
          recorded.history.events.at(-1)!,
          successorId,
          organization.id,
          input.vacancyDate,
        )
      : recorded;
  return { world: continued, successorId, capacity: activeRule.effect };
}

function birthDateForAgeOn(date: IsoDate, age: number): IsoDate {
  const year = Number(date.slice(0, 4)) - age;
  const month = date.slice(5, 7);
  const day = Number(date.slice(8, 10));
  const lastDay = new Date(Date.UTC(year, Number(month), 0)).getUTCDate();
  return makeIsoDate(
    `${year}-${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`,
  );
}

function generatedEligibleExecutivePerson(
  world: World,
  office: StateExecutiveOffice,
  stableKey: string,
  asOf: IsoDate,
): { readonly world: World; readonly personId: EntityId } | null {
  const homePlace = searchLifePlaces("", 1, {
    stateJurisdictionKey: office.jurisdictionKey,
    scope: "locality",
  })[0];
  if (!homePlace) return null;
  const worldWithHome = ensureJurisdiction(
    world,
    homePlace.context.jurisdiction,
  );
  const rng = new SeededRng(world.seed).fork(stableKey);
  const firstAge = rng.integer(40, 70);
  for (let attempt = 0; attempt < 31; attempt += 1) {
    const age = 40 + ((firstAge - 40 + attempt) % 31);
    const personKey = `${stableKey}:candidate:${attempt}`;
    const personRng = rng.fork(personKey);
    const birthDate = birthDateForAgeOn(asOf, age);
    const candidateWorld = createCharacterHistoryContextPeople(worldWithHome, [
      {
        stableKey: personKey,
        ...drawCanonicalNamedIdentity(
          personRng.fork("name"),
          generatePersonIdentity(personRng.fork("identity")),
        ),
        birthDate,
        birthplaceJurisdictionId: homePlace.context.jurisdiction.id,
        homeJurisdictionId: homePlace.context.jurisdiction.id,
        residenceSince: birthDate,
        citizenship: { countryCode: "US", since: birthDate },
        ...(officeQualifications(office.jurisdictionKey, "GOVERNOR", asOf).some(
          (row) =>
            row.field === "ELECTOR_REQUIREMENT" &&
            row.temporalApplicability.state === "SUPPORTED" &&
            row.sourceState === "KNOWN" &&
            row.value === "true",
        )
          ? {
              qualifiedElector: {
                jurisdictionId: office.jurisdictionId,
                since: addDays(asOf, -30),
              },
            }
          : {}),
      },
    ]);
    const personId = characterHistoryContextPersonId(candidateWorld, personKey);
    const eligibilityWorld =
      candidateWorld.currentDate === asOf
        ? candidateWorld
        : { ...candidateWorld, currentDate: asOf };
    const eligibility = candidacyEligibility(eligibilityWorld, {
      personId,
      jurisdictionId: office.jurisdictionId,
      officeKey: office.officeKey,
      alreadyACandidate: false,
    });
    if (eligibility.eligible) return { world: candidateWorld, personId };
  }
  return null;
}

function scheduleGovernorSuccessionSpecialElection(
  world: World,
  office: StateExecutiveOffice,
  activeRule: ActiveGovernorSuccessionRule,
  successionKey: string,
  successionEvent: (typeof world.history.events)[number],
  interimPersonId: EntityId,
  organizationId: EntityId,
  vacancyDate: IsoDate,
): World {
  const rival = generatedEligibleExecutivePerson(
    world,
    office,
    `${successionKey}:special-election-rival`,
    vacancyDate,
  );
  const candidateWorld = rival?.world ?? world;
  const candidatePersonIds = rival
    ? [interimPersonId, rival.personId]
    : [interimPersonId];
  const contestStableKey = `${successionKey}:special-election-contest`;
  const existingContest = candidateWorld.history.electionContests?.find(
    (contest) => contest.stableKey === contestStableKey,
  );
  const withContest = existingContest
    ? candidateWorld
    : scheduleElectionContest(candidateWorld, {
        stableKey: contestStableKey,
        jurisdictionId: office.jurisdictionId,
        office: {
          officeKey: office.officeKey,
          title: office.displayName,
          seatKey: null,
          occupationClassification: `service:${office.officeKey}`,
        },
        electionDate: activeRule.handoffDate,
        candidatePersonIds,
        provenance: {
          method: "simulated",
          sourceEntityIds: candidatePersonIds,
          note: `${activeRule.gameProfileId}: a dated special governor election selected when this World opened; its interval is a game profile.`,
        },
      });
  const contest = withContest.history.electionContests?.find(
    (candidate) => candidate.stableKey === contestStableKey,
  );
  if (!contest) return withContest;
  const dueStableKey = `governor-succession-special-handoff/v1:${successionEvent.id}`;
  if (
    withContest.history.futureDueItems.some(
      (dueItem) => dueItem.stableKey === dueStableKey,
    )
  )
    return withContest;
  return scheduleFutureDueItem(withContest, {
    stableKey: dueStableKey,
    dueAt: activeRule.handoffDate,
    transitionKey: GOVERNOR_SUCCESSION_SPECIAL_ELECTION,
    entityIds: [
      ...new Set([contest.id, interimPersonId, organizationId]),
    ].sort(),
    jurisdictionId: office.jurisdictionId,
    provenance: {
      kind: "simulated",
      sourceEntityIds: [contest.id],
    },
  });
}

function transitionResult(
  world: World,
  status: FutureTransitionHandlerResult["status"],
  context: string,
  outcomeEventId: EntityId | null = null,
): FutureTransitionHandlerResult {
  return {
    world,
    status,
    reasonKey: null,
    context,
    outcomeEventId,
  };
}

function continueActingAfterUnfilledSpecialElection(
  world: World,
  dueItem: FutureDueItem,
  contest: ElectionContestRecord,
  priorTenure: (typeof world.history.events)[number],
  office: StateExecutiveOffice,
  actingPersonId: EntityId,
  actingPersonName: string,
  continuationReason: string,
): FutureTransitionHandlerResult {
  const diedByElectionDay = world.history.personDeaths.some(
    (death) =>
      death.personId === actingPersonId && death.diedAt <= dueItem.dueAt,
  );
  if (diedByElectionDay)
    return transitionResult(
      world,
      "blocked",
      "The acting governor died before an eligible special-election winner could take office.",
    );
  const organization = world.history.organizations.find(
    (candidate) => candidate.stableKey === office.organizationStableKey,
  );
  if (!organization)
    return transitionResult(
      world,
      "blocked",
      "The governor's office organization is unavailable after the special election.",
    );
  const originalTermEndTag = priorTenure.tags.find((tag) =>
    tag.startsWith("succession-original-term-end:"),
  );
  const originalTermEnd = originalTermEndTag?.endsWith(":unknown")
    ? null
    : originalTermEndTag
      ? makeIsoDate(
          originalTermEndTag.slice("succession-original-term-end:".length),
        )
      : null;
  const plannedTermEnd =
    originalTermEnd ??
    stateExecutiveTermWindow(office, dueItem.dueAt).endExclusive;
  const continuedTermEnd =
    plannedTermEnd && plannedTermEnd > dueItem.dueAt ? plannedTermEnd : null;
  const stableKey = `${stateExecutiveTenureKeyPrefix(office)}succession-special-election-continuation:${contest.id}`;
  const existing = world.history.events.find(
    (event) => event.stableKey === stableKey,
  );
  if (existing)
    return transitionResult(
      world,
      "resolved",
      "Acting service after the unfilled special election was already recorded.",
      existing.id,
    );

  const continuation = recordWorldEvent(world, {
    stableKey,
    type: "world.office-tenure",
    occurredAt: dueItem.dueAt,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [actingPersonId, organization.id, contest.id],
    participants: [
      {
        personId: actingPersonId,
        role: "focus:subject",
        detail: "Acting Governor",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      STATE_EXECUTIVE_WRITER_VERSION,
      `office:${office.officeKey}`,
      `state:${office.stateUsps}`,
      "provenance:succession",
      "provenance:special-election-continuation",
      `succession-profile:${world.executiveSuccessionRules?.rules[office.stateUsps]?.gameProfileId ?? GOVERNOR_SUCCESSION_PROFILE.id}`,
      `special-election:${contest.id}`,
      "capacity:acting",
      "succession-handoff:special-election",
      "succession-handoff-basis:game-profile",
      ...(continuedTermEnd
        ? [`term-end:${continuedTermEnd}`]
        : ["term-end:unknown"]),
      ...(originalTermEnd
        ? [`succession-original-term-end:${originalTermEnd}`]
        : ["succession-original-term-end:unknown"]),
    ],
    summary: `Acting Governor ${actingPersonName} continued in office because ${continuationReason}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return transitionResult(
    continuation,
    "resolved",
    `The acting governor continued in office because ${continuationReason}.`,
    continuation.history.events.at(-1)?.id ?? null,
  );
}

/** Applies a previously scheduled simulated governor special election once. */
export function governorSuccessionSpecialElectionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  const contest = world.history.electionContests?.find((candidate) =>
    dueItem.entityIds.includes(candidate.id),
  );
  const priorTenure = world.history.events.find(
    (candidate) =>
      dueItem.stableKey.endsWith(`:${candidate.id}`) &&
      candidate.type === "world.office-tenure" &&
      candidate.tags.includes("provenance:succession"),
  );
  if (!contest || !priorTenure)
    return transitionResult(
      world,
      "blocked",
      "The saved special-election contest or succession tenure is unavailable.",
    );
  const stateUsps = priorTenure.tags
    .find((tag) => tag.startsWith("state:"))
    ?.slice("state:".length);
  const office = stateUsps ? stateExecutiveOffice(stateUsps) : null;
  if (!office || office.officeKey !== contest.office.officeKey)
    return transitionResult(
      world,
      "blocked",
      "The special-election contest does not match the saved governor's office.",
    );
  const stableKey = `${stateExecutiveTenureKeyPrefix(office)}succession-special-election-handoff:${contest.id}`;
  const existingHandoff = world.history.events.find(
    (event) => event.stableKey === stableKey,
  );
  if (existingHandoff)
    return transitionResult(
      world,
      "resolved",
      "The governor's special-election handoff was already recorded.",
      existingHandoff.id,
    );
  const priorPersonId = priorTenure.participants.find(
    (participant) => participant.role === "focus:subject",
  )?.personId;
  if (!priorPersonId)
    return transitionResult(
      world,
      "blocked",
      "The interim governor is not recorded on the succession tenure.",
    );
  const beforeHandoff: World = {
    ...world,
    currentDate: addDays(dueItem.dueAt, -1),
  };
  const current = currentStateExecutiveHolders(beforeHandoff).find(
    (holder) => holder.officeKey === office.officeKey,
  );
  if (!current || current.personId !== priorPersonId)
    return transitionResult(
      world,
      "blocked",
      "The interim governor's service ended before the saved special election.",
    );
  const result = electionContestResult(world, contest.id);
  if (!result) {
    if (
      isGovernorSuccessionSpecialElectionContest(contest) &&
      eligibleGovernorSuccessionElectionCandidates(
        world,
        contest,
        dueItem.dueAt,
      ).length === 0
    )
      return continueActingAfterUnfilledSpecialElection(
        world,
        dueItem,
        contest,
        priorTenure,
        office,
        priorPersonId,
        current.personName,
        "no eligible candidate could take office in the special election",
      );
    return transitionResult(
      world,
      "blocked",
      "The saved special-election contest has no resolved result.",
    );
  }
  const winner = world.people[result.winnerPersonId];
  const successorRule = world.executiveSuccessionRules?.rules[stateUsps!];
  const originalTermEndTag = priorTenure.tags.find((tag) =>
    tag.startsWith("succession-original-term-end:"),
  );
  const originalTermEnd = originalTermEndTag?.endsWith(":unknown")
    ? null
    : originalTermEndTag
      ? makeIsoDate(
          originalTermEndTag.slice("succession-original-term-end:".length),
        )
      : null;
  const termEnd =
    originalTermEnd ??
    stateExecutiveTermWindow(office, dueItem.dueAt).endExclusive;
  const organization = world.history.organizations.find(
    (candidate) => candidate.stableKey === office.organizationStableKey,
  );
  if (!winner || !termEnd || termEnd <= dueItem.dueAt || !organization)
    return transitionResult(
      world,
      "blocked",
      "The elected successor or the remainder of the term is not recorded.",
    );
  if (
    !eligibleGovernorSuccessionElectionCandidates(
      world,
      contest,
      dueItem.dueAt,
    ).includes(winner.id)
  )
    return continueActingAfterUnfilledSpecialElection(
      world,
      dueItem,
      contest,
      priorTenure,
      office,
      priorPersonId,
      current.personName,
      "the recorded special-election winner was not alive and eligible on election day",
    );

  const tenure = recordWorldEvent(world, {
    stableKey: `${stableKey}:tenure`,
    type: "world.office-tenure",
    occurredAt: dueItem.dueAt,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [
      ...new Set([winner.id, organization.id, priorPersonId]),
    ],
    participants: [
      { personId: winner.id, role: "focus:subject", detail: "Governor" },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      STATE_EXECUTIVE_WRITER_VERSION,
      `office:${office.officeKey}`,
      `state:${office.stateUsps}`,
      "provenance:special-election",
      `succession-profile:${successorRule?.gameProfileId ?? GOVERNOR_SUCCESSION_PROFILE.id}`,
      `election-contest:${contest.id}`,
      "capacity:permanent",
      `term-end:${termEnd}`,
    ],
    summary: `Governor ${personName(winner)} took office after the special election.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const handoff = recordWorldEvent(tenure, {
    stableKey,
    type: "world.office-handoff",
    occurredAt: dueItem.dueAt,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [
      ...new Set([priorPersonId, winner.id, organization.id]),
    ],
    participants:
      priorPersonId === winner.id
        ? [{ personId: winner.id, role: "focus:subject", detail: "Governor" }]
        : [
            {
              personId: priorPersonId,
              role: "focus:subject",
              detail: "Acting Governor",
            },
            { personId: winner.id, role: "focus:other", detail: "Governor" },
          ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      GOVERNOR_SUCCESSION_PROFILE.id,
      "provenance:governor-succession-handoff",
      `office:${office.officeKey}`,
      `state:${office.stateUsps}`,
      `acting-tenure:${priorTenure.id}`,
      `special-election:${contest.id}`,
      `elected-tenure:${tenure.history.events.at(-1)!.id}`,
    ],
    summary: `Acting Governor ${current.personName}'s service ended when Governor ${personName(winner)} took office.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return transitionResult(
    handoff,
    "resolved",
    "The special-election winner took office for the remainder of the recorded term.",
    handoff.history.events.at(-1)?.id ?? null,
  );
}

function formerTermEnd(
  world: World,
  evidenceId: EntityId | null,
): IsoDate | null {
  if (!evidenceId) return null;
  const tenure = eventById(world, evidenceId);
  const tag = tenure?.tags.find(
    (candidate) =>
      candidate.startsWith("term-end:") && candidate !== "term-end:unknown",
  );
  if (tag) return makeIsoDate(tag.slice("term-end:".length));
  const elected = electedExecutiveTermForRelationship(world, evidenceId);
  return elected ? makeIsoDate(elected.endsAt) : null;
}
