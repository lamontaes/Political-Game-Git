import research from "../../data/research/laws/voter-photo-identification.json" with { type: "json" };
import { createScheduledActivity, cancelScheduledActivity } from "./time-work";
import { addDays, ageOnDate, simulationMomentAtLocalTime } from "./dates";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
  stateKeyForJurisdiction,
} from "./life-places";
import { lawInForce } from "./governing/law-in-force";
import { policyTermsInForce } from "./governing/policy-bill-terms";
import { principledLeaning } from "./governing/officeholder-principles";
import { recordedAnnualPayCents } from "./student-debt-relief-law";
import { resourcePositionAt, resourceFlowTermsAt } from "./resource-queries";
import {
  activeWorkRelationshipsAt,
  workRoleAt,
  organizationProfileAt,
} from "./life-queries";
import { money } from "./resources";
import { SeededRng } from "./rng";
import { recordWorldEvent, writeWithWorldIntegrityOnce } from "./world";
import type { World, EntityId, IsoDate, CandidateTally } from "./types";
import type { VoterIdentificationRecord } from "./voter-identification-types";
export const PHOTO_ID_QUESTION =
  "us-policy-positions:government-operations.require-photo-id-to-vote";
function startingCureDays(stateKey: string, electionDate: IsoDate): number {
  const rule: { kind: string; days?: number; weekday?: number } =
    (
      research.startingCureRules as Record<
        string,
        { kind: string; days?: number; weekday?: number }
      >
    )[stateKey] ?? research.startingCureFallback;
  if (rule.kind === "next-weekday")
    return (
      (7 +
        (rule.weekday ?? 1) -
        new Date(`${electionDate}T00:00:00Z`).getUTCDay()) %
        7 || 7
    );
  if (rule.kind === "business-days") {
    let days = 0,
      business = 0;
    while (business < (rule.days ?? 3)) {
      days += 1;
      const day = new Date(
        `${addDays(electionDate, days)}T00:00:00Z`,
      ).getUTCDay();
      if (day !== 0 && day !== 6) business += 1;
    }
    return days;
  }
  return rule.days ?? research.startingCureFallback.days;
}

/** Counting follows the ID cure window; the election date itself never changes. */
export function photoIdCanvassDate(
  world: World,
  jurisdictionId: EntityId,
  electionDate: IsoDate,
): IsoDate {
  const stateKey =
    lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey ??
    (world.jurisdictions[jurisdictionId]
      ? stateKeyForJurisdiction(world.jurisdictions[jurisdictionId]!)
      : null);
  if (!stateKey || photoIdLaw(world, stateKey, electionDate)?.answer !== "yes")
    return electionDate;
  const days =
    policyTermsInForce(
      world,
      stateJurisdictionForKey(stateKey)!.id,
      PHOTO_ID_QUESTION,
      electionDate,
    )?.terms?.values.cureDays ?? startingCureDays(stateKey, electionDate);
  return addDays(electionDate, days + 1);
}
function stateOf(world: World, personId: EntityId): string | null {
  const home = world.people[personId]?.homeJurisdictionId;
  return home
    ? (lifePlaceByJurisdictionId(home)?.stateJurisdictionKey ?? null)
    : null;
}
export function photoIdLaw(
  world: World,
  stateKey: string,
  on: IsoDate = world.currentDate,
) {
  const jurisdiction = stateJurisdictionForKey(stateKey);
  const question = Object.values(world.policyCatalog.propositions).find(
    (p) => p.stableKey === PHOTO_ID_QUESTION,
  );
  return jurisdiction && question
    ? lawInForce(world, jurisdiction.id, question.id, on)
    : null;
}
/** A descriptive estimate, saved once; recorded earnings, wealth and age rank unread ID availability, never actions. Unrecorded licenses and cars are not asserted absent. */
export function ensureVoterIdentification(world: World): World {
  const existing = world.voterIdentification?.people ?? {};
  const adults = world.personOrder.filter(
    (id) =>
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18 &&
      stateOf(world, id) !== null &&
      !(world.immigrationAdmissions ?? []).some((r) =>
        r.personIds.includes(id),
      ),
  );
  const missing = adults.filter((id) => !existing[id]);
  if (!missing.length) return world;
  const spread =
    new SeededRng(world.seed).fork("voter-id-opening-availability").next() *
      0.04 -
    0.02;
  const ranks = new Map(
    adults.map((id) => {
      const earnings = recordedAnnualPayCents(world, id);
      const age = ageOnDate(world.people[id]!.birthDate, world.currentDate);
      const cash =
        resourcePositionAt(
          world,
          { kind: "person", personId: id },
          money(0, "USD").currency,
        )?.liquidBalance.minorUnits ?? null;
      return [
        id,
        Math.log1p(
          Math.max(0, earnings ?? research.unreadAnnualEarningsCents) /
            research.unreadAnnualEarningsCents,
        ) +
          Math.log1p(
            Math.max(0, cash ?? research.unreadLiquidBalanceCents) /
              research.unreadLiquidBalanceCents,
          ) +
          Math.min(age, 65) / 20 -
          Math.max(0, age - 75) / 10,
      ] as const;
    }),
  );
  const ordered = [...adults].sort(
    (a, b) => ranks.get(b)! - ranks.get(a)! || a.localeCompare(b),
  );
  const have = new Set(
    ordered.slice(
      0,
      Math.round(ordered.length * (research.adultIdOwnershipMean + spread)),
    ),
  );
  const people: Record<string, VoterIdentificationRecord> = { ...existing };
  for (const personId of missing)
    people[personId] = {
      personId,
      estimatedCurrentId: have.has(personId),
      acquiredOn: null,
      stateKey: stateOf(world, personId)!,
      basis: "Photo identification is checked when a resident votes.",
    };
  return {
    ...world,
    voterIdentification: {
      people,
      trips: world.voterIdentification?.trips ?? [],
      ballots: world.voterIdentification?.ballots ?? [],
    },
  };
}
/** Existing civic behavior and their own principles supply a recorded reason to obtain a card. */
export function voterIdentificationIntent(
  world: World,
  personId: EntityId,
): string | null {
  const civic = world.history.events.find(
    (e) =>
      [
        "life.contacted-official",
        "life.attended-public-meeting",
        "election.voted",
      ].includes(e.type) && e.participants.some((p) => p.personId === personId),
  );
  if (civic) return "Obtain identification before the next election.";
  const question = Object.values(world.policyCatalog.propositions).find(
    (p) => p.stableKey === PHOTO_ID_QUESTION,
  );
  const lean = question
    ? principledLeaning(world, personId, question.id)
    : null;
  return lean && lean.recordIds.length && lean.score !== 0
    ? "The resident wants to be able to vote under the identification law."
    : null;
}
/** Intent books one actual weekday appointment; a future completion confirms the card and cost. */
export function applyVoterIdentification(world: World): World {
  let next = ensureVoterIdentification(world);
  return writeWithWorldIntegrityOnce(next, () => {
    for (const record of Object.values(next.voterIdentification!.people)) {
      const prefix = `voter-id-service:${record.personId}`;
      const pending = next.history.scheduledActivities
        .filter((a) => a.stableKey.startsWith(prefix))
        .filter(
          (a) =>
            next.history.scheduledActivityStates
              .filter((v) => v.activityId === a.id)
              .at(-1)?.status === "scheduled",
        );
      if (photoIdLaw(next, record.stateKey)?.answer === "no") {
        for (const appointment of pending)
          next = cancelScheduledActivity(next, appointment.id);
        continue;
      }
      const key = `${prefix}:${next.currentDate}:${next.history.nextSequence}`;
      if (
        record.estimatedCurrentId ||
        record.acquiredOn !== null ||
        photoIdLaw(next, record.stateKey)?.answer !== "yes" ||
        (next.control.kind === "person" &&
          next.control.personId === record.personId) ||
        pending.length > 0
      )
        continue;
      const reason = voterIdentificationIntent(next, record.personId);
      if (!reason) continue;
      let serviceDate = addDays(next.currentDate, 1);
      while ([0, 6].includes(new Date(`${serviceDate}T00:00:00Z`).getUTCDay()))
        serviceDate = addDays(serviceDate, 1);
      const minutes = Math.round(
        research.tripMinutesMean *
          (0.75 +
            new SeededRng(next.seed)
              .fork(`voter-id-service:${record.stateKey}`)
              .next() *
              0.5),
      );
      const at = (minuteOfDay: number) =>
        simulationMomentAtLocalTime({
          date: serviceDate,
          minuteOfDay,
          timeZone: next.currentMoment.timeZone,
          preferredUtcOffsetMinutes: next.currentMoment.utcOffsetMinutes,
        });
      // Honor existing non-work commitments before changing any recorded shift.
      for (;;) {
        const blocked = next.history.scheduledActivities.some((a) => {
          if (!a.participantPersonIds.includes(record.personId)) return false;
          const slot = next.history.scheduledActivityStates
            .filter((s) => s.activityId === a.id)
            .at(-1);
          return (
            slot?.status === "scheduled" &&
            slot.start.date <= serviceDate &&
            slot.end.date >= serviceDate &&
            (slot.start.date < serviceDate ||
              slot.start.minuteOfDay < 600 + minutes) &&
            (slot.end.date > serviceDate || slot.end.minuteOfDay > 600) &&
            !next.history.workRelationships.some(
              (w) =>
                w.personId === record.personId &&
                a.sourceEntityIds.includes(w.id),
            )
          );
        });
        if (!blocked) break;
        serviceDate = addDays(serviceDate, 1);
        while (
          [0, 6].includes(new Date(`${serviceDate}T00:00:00Z`).getUTCDay())
        )
          serviceDate = addDays(serviceDate, 1);
      }
      for (const { relationship: work } of activeWorkRelationshipsAt(
        next,
        record.personId,
      )) {
        const flow = next.history.resourceFlows.find(
          (f) =>
            f.basisReference.kind === "work" &&
            f.basisReference.workRelationshipId === work.id,
        );
        if (!flow || resourceFlowTermsAt(next, flow.id)?.status !== "active")
          continue;
        const hiring = (next.history.jobApplicationSteps ?? []).find(
          (step) => step.workRelationshipId === work.id,
        );
        const application = hiring
          ? (next.history.jobApplications ?? []).find(
              (a) => a.id === hiring.applicationId,
            )
          : null;
        const opening = application
          ? (next.history.jobOpenings ?? []).find(
              (o) => o.id === application.openingId,
            )
          : null;
        const hourly = opening
          ? opening.pay.basis === "hourly"
          : "note" in flow.provenance &&
            flow.provenance.note.includes("an hour");
        if (!hourly) continue;
        const role = workRoleAt(next, work.id);
        if (!role) continue;
        const recorded = next.history.scheduledActivities.some(
          (a) =>
            a.participantPersonIds.includes(record.personId) &&
            a.sourceEntityIds.includes(work.id) &&
            next.history.scheduledActivityStates.some(
              (slot) =>
                slot.activityId === a.id && slot.start.date === serviceDate,
            ),
        );
        if (recorded) continue;
        const startMinute =
          research.estimatedShiftStartMinuteMean +
          Math.round(
            (new SeededRng(next.seed).fork("unread-hourly-shift-start").next() -
              0.5) *
              60,
          );
        const duration = Math.round(
          (((role.timeDemand.expectedWeekly.minimumHours +
            role.timeDemand.expectedWeekly.maximumHours) /
            2) *
            60) /
            5,
        );
        if (duration <= 0 || startMinute + duration > 1440) continue;
        const conflicts = next.history.scheduledActivities.some(
          (a) =>
            a.participantPersonIds.includes(record.personId) &&
            next.history.scheduledActivityStates
              .filter((slot) => slot.activityId === a.id)
              .at(-1)?.status === "scheduled" &&
            next.history.scheduledActivityStates
              .filter((slot) => slot.activityId === a.id)
              .at(-1)?.start.date === serviceDate &&
            next.history.scheduledActivityStates
              .filter((slot) => slot.activityId === a.id)
              .at(-1)!.start.minuteOfDay <
              startMinute + duration &&
            next.history.scheduledActivityStates
              .filter((slot) => slot.activityId === a.id)
              .at(-1)!.end.minuteOfDay > startMinute,
        );
        if (conflicts) continue;
        next = createScheduledActivity(next, {
          stableKey: `voter-id-estimated-work:${work.id}:${serviceDate}`,
          title: role.title,
          summary: `Work at ${role.title}.`,
          kind: "confirmed",
          backgroundCompletion: true,
          start: at(startMinute),
          end: at(startMinute + duration),
          participantPersonIds: [record.personId],
          responsiblePersonId: record.personId,
          location: {
            locationKey: `work:${work.id}`,
            label: work.organizationId
              ? (organizationProfileAt(next, work.organizationId)?.name ??
                role.title)
              : role.title,
            jurisdictionId: role.locationJurisdictionId,
          },
          sourceEntityIds: [work.id, record.personId],
          flexibility: { kind: "fixed" },
          access: { kind: "private", personIds: [record.personId] },
        });
      }
      const missedShiftIds: EntityId[] = [];
      const missedWorkIds: EntityId[] = [];
      for (const shift of [...next.history.scheduledActivities]) {
        if (!shift.participantPersonIds.includes(record.personId)) continue;
        const slot = next.history.scheduledActivityStates
          .filter((s) => s.activityId === shift.id)
          .at(-1);
        if (
          !slot ||
          slot.status !== "scheduled" ||
          slot.start.date !== serviceDate ||
          slot.end.date !== serviceDate ||
          slot.start.minuteOfDay >= 600 + minutes ||
          slot.end.minuteOfDay <= 600
        )
          continue;
        const work = next.history.workRelationships.find(
          (w) =>
            w.personId === record.personId &&
            shift.sourceEntityIds.includes(w.id),
        );
        if (!work) continue;
        next = cancelScheduledActivity(next, shift.id);
        const peers = shift.participantPersonIds.filter(
          (id) => id !== record.personId,
        );
        if (peers.length)
          next = createScheduledActivity(next, {
            stableKey: `voter-id-work:${key}:${shift.id}:peers`,
            title: shift.title,
            summary: shift.summary,
            kind: shift.kind,
            start: slot.start,
            end: slot.end,
            participantPersonIds: peers,
            responsiblePersonId:
              shift.responsiblePersonId === record.personId
                ? peers[0]!
                : shift.responsiblePersonId,
            ...(shift.backgroundCompletion
              ? { backgroundCompletion: true }
              : {}),
            location: shift.location,
            sourceEntityIds: [...shift.sourceEntityIds, shift.id],
            flexibility: { kind: "fixed" },
            access: shift.access,
          });
        missedShiftIds.push(shift.id);
        missedWorkIds.push(work.id);
        for (const [part, from, until] of [
          [
            "before",
            slot.start.minuteOfDay,
            Math.min(600, slot.end.minuteOfDay),
          ],
          [
            "after",
            Math.max(600 + minutes, slot.start.minuteOfDay),
            slot.end.minuteOfDay,
          ],
        ] as const) {
          if (until <= from) continue;
          next = createScheduledActivity(next, {
            stableKey: `voter-id-work:${key}:${shift.id}:${part}`,
            title: shift.title,
            summary: `Work outside the identification appointment. ${shift.summary}`,
            kind: shift.kind,
            start: at(from),
            end: at(until),
            participantPersonIds: [record.personId],
            responsiblePersonId: record.personId,
            ...(shift.backgroundCompletion
              ? { backgroundCompletion: true }
              : {}),
            location: shift.location,
            sourceEntityIds: [...shift.sourceEntityIds, shift.id],
            flexibility: { kind: "fixed" },
            access: shift.access,
          });
        }
      }
      next = createScheduledActivity(next, {
        stableKey: key,
        title: "Free voter identification visit",
        summary: reason,
        kind: "confirmed",
        backgroundCompletion: true,
        start: at(600),
        end: at(600 + minutes),
        participantPersonIds: [record.personId],
        responsiblePersonId: record.personId,
        location: {
          locationKey: `voter-id-office:${record.stateKey}`,
          label: "Voter identification service",
          jurisdictionId: next.people[record.personId]!.homeJurisdictionId,
        },
        sourceEntityIds: [record.personId, ...missedShiftIds, ...missedWorkIds],
        flexibility: { kind: "fixed" },
        access: { kind: "private", personIds: [record.personId] },
      });
    }
    return next;
  });
}
export function completePhotoIdentification(
  world: World,
  activityId: EntityId,
): World {
  const activity = world.history.scheduledActivities.find(
    (a) => a.id === activityId,
  );
  if (!activity?.stableKey.startsWith("voter-id-service:")) return world;
  const personId = activity.responsiblePersonId!;
  const record = world.voterIdentification?.people[personId];
  const activityState = world.history.scheduledActivityStates
    .filter((a) => a.activityId === activityId)
    .at(-1);
  if (
    !record ||
    !activity ||
    !activityState ||
    activityState.status !== "completed" ||
    record.acquiredOn ||
    photoIdLaw(world, record.stateKey)?.answer !== "yes"
  )
    return world;
  const serviceDate = activityState.start.date;
  const reason = activity.summary;
  let next = world;
  const state = stateJurisdictionForKey(record.stateKey)!;
  const terms = policyTermsInForce(
    next,
    state.id,
    PHOTO_ID_QUESTION,
    next.currentDate,
  )?.terms?.values;
  const spread =
    0.75 +
    new SeededRng(next.seed)
      .fork(`voter-id-service:${record.stateKey}`)
      .next() *
      0.5;
  const costCents = Math.round(
    (terms?.idProductionCostCents ?? research.idCostCents) * spread,
  );
  const key = `voter-id-trip:${record.personId}`;
  const missedWork: { workRelationshipId: EntityId; minutes: number }[] = [];
  for (const shift of next.history.scheduledActivities.filter(
    (a) =>
      a.participantPersonIds.includes(record.personId) &&
      activity.sourceEntityIds.includes(a.id),
  )) {
    const slot = next.history.scheduledActivityStates
      .filter((s) => s.activityId === shift.id)
      .at(-1);
    if (
      !slot ||
      slot.status !== "cancelled" ||
      slot.start.date !== serviceDate ||
      slot.end.date !== serviceDate
    )
      continue;
    const work = next.history.workRelationships.find(
      (w) =>
        w.personId === record.personId && shift.sourceEntityIds.includes(w.id),
    );
    if (!work) continue;
    const minutes = Math.max(
      0,
      Math.min(
        slot.end.minuteOfDay,
        600 + Math.round(research.tripMinutesMean * spread),
      ) - Math.max(slot.start.minuteOfDay, 600),
    );
    if (minutes > 0) missedWork.push({ workRelationshipId: work.id, minutes });
  }
  const trip = {
    key,
    personId: record.personId,
    stateKey: record.stateKey,
    on: serviceDate,
    costCents,
    missedWork,
    reason,
  };
  next = {
    ...next,
    voterIdentification: {
      ...next.voterIdentification!,
      people: {
        ...next.voterIdentification!.people,
        [record.personId]: { ...record, acquiredOn: serviceDate },
      },
      trips: [...next.voterIdentification!.trips, trip],
    },
  };
  next = recordWorldEvent(next, {
    stableKey: key,
    type: "election.photo-id-obtained",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: world.people[record.personId]!.homeJurisdictionId,
    involvedEntityIds: [record.personId, activityId],
    participants: [
      {
        personId: record.personId,
        role: "focus:subject",
        detail: "Obtained a free voter photo ID",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [`state:${record.stateKey}`, `state-expense-cents:${costCents}`],
    summary:
      "A resident made the identification trip and obtained a free voter photo ID.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: "Obtain identification for the next election.",
      motivation: reason,
      immediateReaction: null,
    },
  });

  return next;
}
export function voterIdExpenseDollars(
  world: World,
  stateKey: string,
  month: IsoDate,
  population: number,
): number {
  const ids =
    (world.voterIdentification?.trips ?? [])
      .filter(
        (r) =>
          r.stateKey === stateKey && r.on.slice(0, 7) === month.slice(0, 7),
      )
      .reduce((n, r) => n + r.costCents, 0) / 100;
  const law = photoIdLaw(world, stateKey, month);
  if (law?.answer !== "yes") return Math.round(ids);
  const terms = policyTermsInForce(
    world,
    stateJurisdictionForKey(stateKey)!.id,
    PHOTO_ID_QUESTION,
    month,
  )?.terms?.values;
  return Math.round(
    ids +
      (population *
        research.adultPopulationShare *
        (terms?.annualOutreachPerAdultCents ??
          research.annualOutreachPerAdultCents)) /
        100 /
        12,
  );
}
/** The election record distinguishes a provisional ballot and an actual cure, retaining existing state's fail-safe rules. */
export function photoIdBallot(
  world: World,
  personId: EntityId,
  on: IsoDate,
): "regular" | "provisional" | "unknown" {
  const record = world.voterIdentification?.people[personId];
  if (!record) return "unknown";
  const law = photoIdLaw(world, record.stateKey, on);
  if (!law) return "unknown";
  if (
    law.answer !== "yes" ||
    record.estimatedCurrentId ||
    (record.acquiredOn && record.acquiredOn <= on)
  )
    return "regular";
  return "provisional";
}

/** Explicit eligible voter and their stated choice; neither identity availability nor turnout supplies a vote. */
export function castIdentifiedBallot(
  world: World,
  input: {
    contestId: EntityId;
    personId: EntityId;
    candidatePersonId: EntityId;
    presentedPhotoId: boolean;
    eligibilityReason: string;
    choiceReason: string;
    verifiedException?: {
      kind:
        | "affidavit"
        | "signature-match"
        | "poll-worker-identification"
        | "reasonable-impediment";
      reason: string;
    };
  },
): World {
  const contest = world.history.electionContests?.find(
    (c) => c.id === input.contestId,
  );
  if (
    world.history.electionContestResults?.some(
      (r) => r.contestId === input.contestId,
    )
  )
    throw Error("An election already counted cannot accept another ballot.");
  if (
    !contest ||
    contest.electionDate !== world.currentDate ||
    !contest.candidatePersonIds.includes(input.candidatePersonId) ||
    !world.people[input.personId] ||
    ageOnDate(world.people[input.personId]!.birthDate, world.currentDate) <
      18 ||
    !input.eligibilityReason.trim() ||
    !input.choiceReason.trim()
  )
    throw Error(
      "A ballot needs an actual election-day voter, candidate, eligibility and choice record.",
    );
  let next = ensureVoterIdentification(world);
  const stateKey = stateOf(next, input.personId);
  if (!stateKey) throw Error("The voter's state is not recorded.");
  const law = photoIdLaw(next, stateKey);
  if (!law) throw Error("No recorded photo-ID law resolves this ballot.");
  const key = `identified-ballot:${contest.id}:${input.personId}`;
  if (next.voterIdentification!.ballots?.some((b) => b.key === key))
    throw Error("This voter has already cast a ballot in the contest.");
  const terms = policyTermsInForce(
    next,
    stateJurisdictionForKey(stateKey)!.id,
    PHOTO_ID_QUESTION,
    next.currentDate,
  )?.terms?.values;
  const permitted =
    (research.startingExceptionKinds as Record<string, string[]>)[stateKey] ??
    [];
  const exception = input.verifiedException;
  const verified =
    !!exception?.reason.trim() &&
    permitted.includes(exception.kind) &&
    terms?.requiresReturnOnly !== 1;
  if (exception && !verified)
    throw Error("This photo-ID law does not permit the supplied exception.");
  const defaultCureDays = startingCureDays(stateKey, next.currentDate);
  const kind =
    law.answer === "yes" && !input.presentedPhotoId ? "provisional" : "regular";
  const ballot = {
    key,
    contestId: contest.id,
    personId: input.personId,
    candidatePersonId: input.candidatePersonId,
    castOn: next.currentDate,
    kind: kind as "regular" | "provisional",
    cureBy:
      kind === "provisional"
        ? addDays(next.currentDate, terms?.cureDays ?? defaultCureDays)
        : null,
    curedOn: verified && kind === "provisional" ? next.currentDate : null,
    eligibilityReason:
      input.eligibilityReason +
      (verified ? ` Verified ${exception!.kind}: ${exception!.reason}` : ""),
    choiceReason: input.choiceReason,
  };
  next = {
    ...next,
    voterIdentification: {
      ...next.voterIdentification!,
      ballots: [...(next.voterIdentification!.ballots ?? []), ballot],
    },
  };
  return recordWorldEvent(next, {
    stableKey: key,
    type: "election.voted",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: contest.jurisdictionId,
    involvedEntityIds: [input.personId, contest.id],
    participants: [
      {
        personId: input.personId,
        role: "focus:subject",
        detail: `Cast a ${kind} ballot`,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [`ballot:${kind}`],
    summary: `An eligible resident cast a ${kind} ballot.`,
    context: {
      location: null,
      socialContext: null,
      pressure:
        kind === "provisional"
          ? "Return with photo identification before the filed deadline for this ballot to count."
          : null,
      choice: input.choiceReason,
      motivation: input.eligibilityReason,
      immediateReaction: null,
    },
  });
}
/** Returning is a recorded action, never a cure-rate draw. */
export function cureIdentifiedBallot(
  world: World,
  key: string,
  evidence: { presentedPhotoId: boolean; reason: string },
): World {
  const b = world.voterIdentification?.ballots?.find((r) => r.key === key);
  if (
    !b ||
    b.kind !== "provisional" ||
    b.curedOn ||
    !b.cureBy ||
    world.currentDate > b.cureBy ||
    !evidence.presentedPhotoId ||
    !evidence.reason.trim()
  )
    throw Error("This provisional ballot has no timely recorded ID return.");
  if (
    world.history.electionContestResults?.some(
      (r) => r.contestId === b.contestId,
    )
  )
    throw Error("A certified result cannot be rewritten by a late cure.");
  const next: World = {
    ...world,
    voterIdentification: {
      ...world.voterIdentification!,
      ballots: world.voterIdentification!.ballots!.map((r) =>
        r.key === key
          ? { ...r, curedOn: world.currentDate, cureReason: evidence.reason }
          : r,
      ),
    },
  };
  return recordWorldEvent(next, {
    stableKey: `${key}:cured`,
    type: "election.provisional-ballot-cured",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[b.personId]!.homeJurisdictionId,
    involvedEntityIds: [b.personId, b.contestId],
    participants: [
      {
        personId: b.personId,
        role: "focus:subject",
        detail: "Returned with identification",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [`ballot:${key}`],
    summary:
      "The resident returned with identification before the provisional-ballot deadline.",
    context: {
      location: null,
      socialContext: null,
      pressure: `Cure before ${b.cureBy}.`,
      choice: "Return with identification.",
      motivation: evidence.reason,
      immediateReaction: "The ballot can be included in the count.",
    },
  });
}
/** Estimated aggregate tallies cover the unrepresented electorate; dated individual ballots are added only when regular or actually cured. */
export function identifiedBallotTallies(
  world: World,
  contestId: EntityId,
  aggregate: readonly CandidateTally[],
) {
  const ballots = (world.voterIdentification?.ballots ?? []).filter(
    (b) =>
      b.contestId === contestId && (b.kind === "regular" || b.curedOn !== null),
  );
  if (!ballots.length) return aggregate;
  const votes = aggregate.map((t) => ({
    ...t,
    votes:
      t.votes +
      ballots.filter((b) => b.candidatePersonId === t.candidatePersonId).length,
  }));
  const total = votes.reduce((n, t) => n + t.votes, 0);
  return votes
    .map((t) => ({ ...t, voteShare: total ? t.votes / total : 0 }))
    .sort(
      (a, b) =>
        b.votes - a.votes ||
        a.candidatePersonId.localeCompare(b.candidatePersonId),
    );
}
