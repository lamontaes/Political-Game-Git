import research from "../../data/research/laws/lobbying-cooling-off.json" with { type: "json" };
import populations from "../../data/research/laws/immigration-admissions.json" with { type: "json" };
import {
  departedOffices,
  officeState,
  lobbyingBar,
  LOBBYING_EMPLOYER,
  COOLING_OFF_QUESTION,
} from "./lobbying-cooling-off";
import { principledLeaning } from "./governing/officeholder-principles";
import { organizationProfileAt } from "./life-queries";
import { activeWorkRelationshipsAt } from "./life-queries";
import { lifePlaceByKey } from "./life-places";
import { ensureJurisdiction } from "./national-election-geography";
import { createOrganization } from "./life";
import { createStableId } from "./ids";
import { money, createResourcePosition } from "./resources";
import { createOpeningLobbyistPay } from "./law-outcome-calibration";
import { SeededRng } from "./rng";
import { addDays, daysBetween } from "./dates";
import { scheduleFutureDueItem } from "./future-transitions";
import { recordWorldEvent, writeWithWorldIntegrityOnce } from "./world";
import {
  openWeeklyListings,
  openJobListings,
  recordJobOpening,
  residentApplicationBlocked,
  applyForJobAsResident,
  advanceApplications,
  applicationsFor,
  latestApplicationStep,
  answerJobOfferAsResident,
  expectedStart,
  startJobAsResident,
  settleJobPay,
} from "./job-market";
import type {
  EntityId,
  World,
  FutureDueItem,
  FutureTransitionHandlerResult,
} from "./types";
export const POST_OFFICE_CAREER_KEY = "employment:post-office-career";

/** One concrete researched-capacity employer enters a capital when a former official searches there. */
export function ensureCapitalLobbyingOpening(
  world: World,
  stateKey: string,
): World {
  return ensureCapitalEmployer(
    ensureCapitalEmployer(world, stateKey, true),
    stateKey,
    false,
  );
}
/** All 56 capital employer markets exist at opening; materialization remains bounded by the researched inventory. */
export function ensureCapitalEmployers(world: World): World {
  return writeWithWorldIntegrityOnce(world, () => {
    let next = world;
    for (const state of Object.keys(research.capitals))
      next = ensureCapitalLobbyingOpening(next, `US-${state}`);
    return next;
  });
}
function ensureCapitalEmployer(
  world: World,
  stateKey: string,
  lobbying: boolean,
): World {
  const capital = (
    research.capitals as Record<string, { name: string; placeKey: string }>
  )[stateKey.slice(3)];
  const place = capital ? lifePlaceByKey(capital.placeKey) : null;
  if (!capital || !place) throw Error(`No recorded capital for ${stateKey}`);
  let next = ensureJurisdiction(world, place.context.jurisdiction);
  // Old saves migrate this absent opening estimate once, without replacing an
  // existing employer's posted pay or any completed compensation.
  if (!next.openingLobbyistAnnualPayCents)
    next = {
      ...next,
      openingLobbyistAnnualPayCents: createOpeningLobbyistPay(next.seed),
    };
  const spread =
    0.75 +
    new SeededRng(world.seed).fork(`lobbying-employers:${stateKey}`).next() *
      0.5;
  const pop = (populations.places as Record<string, { population: number }>)[
    stateKey
  ]!.population;
  const firms = Math.max(
    1,
    Math.round(
      (lobbying
        ? (research.registeredFirmsPA2024 * pop) / research.populationPA2024
        : (research.publicRelationsEstablishmentsUS2023 * pop) /
          Object.values(populations.places).reduce(
            (sum, p) => sum + p.population,
            0,
          )) * spread,
    ),
  );
  const prefix = `capital-${lobbying ? "lobbying" : "public-relations"}-firm:${stateKey}`;
  const filled = (org: EntityId) =>
    (next.history.jobApplications ?? []).some(
      (a) =>
        (next.history.jobOpenings ?? []).some(
          (o) => o.organizationId === org && o.id === a.openingId,
        ) && latestApplicationStep(next, a.id)?.kind === "started",
    );
  let ordinal = 1;
  while (
    ordinal <= firms &&
    filled(createStableId("organization", `${world.id}:${prefix}:${ordinal}`))
  )
    ordinal += 1;
  if (ordinal > firms) return next;
  const key = `${prefix}:${ordinal}`;
  const org = createStableId("organization", `${world.id}:${key}`);
  if (!next.history.organizations.some((o) => o.id === org)) {
    next = createOrganization(next, {
      stableKey: key,
      formedAt: next.currentDate,
      provenance: {
        kind: "generated",
        generatorKey: "capital-lobbying-employers-v1",
      },
      initialProfile: {
        name: `${capital.name} ${lobbying ? "Government Relations" : "Community Communications"} ${ordinal}`,
        classification: lobbying
          ? LOBBYING_EMPLOYER
          : "enterprise:public-relations-agency",
        locationJurisdictionId: place.context.jurisdiction.id,
      },
    });
    next = createResourcePosition(next, {
      stableKey: `${key}:working-capital`,
      owner: { kind: "organization", organizationId: org },
      openedAt: next.currentDate,
      openingBalance: money(
        Math.round(((research.annualRevenuePerFirmMean * 100) / 12) * spread),
        "USD",
      ),
      provenance: {
        kind: "authored",
        note: `Capital ${lobbying ? "government-relations" : "communications"} employer ${ordinal}.`,
      },
    });
  }
  if (
    (next.history.jobOpenings ?? []).some(
      (o) => o.organizationId === org && o.closesAt >= next.currentDate,
    )
  )
    return next;
  // A filled vacancy stays filled: no weekly copy creates another employee slot.
  if (
    (next.history.jobApplications ?? []).some(
      (a) =>
        (next.history.jobOpenings ?? []).some(
          (o) => o.organizationId === org && o.id === a.openingId,
        ) && latestApplicationStep(next, a.id)?.kind === "started",
    )
  )
    return next;
  return recordJobOpening(next, {
    stableKey: `${key}:vacancy:${next.currentDate}`,
    organizationId: org,
    jurisdictionId: place.context.jurisdiction.id,
    title: lobbying
      ? "Government relations specialist"
      : "Public communications specialist",
    occupationClassification: "occupation:public-relations-specialist",
    pay: {
      basis: "annual-salary",
      amount: money(
        lobbying
          ? next.openingLobbyistAnnualPayCents![stateKey]!
          : Math.round(research.annualNonLobbyPayMedian * 100 * spread),
        "USD",
      ),
    },
    weeklyHours: { minimumHours: 40, maximumHours: 40 },
    schedule: "Weekdays, 9 a.m. to 5 p.m.",
    qualifications: lobbying
      ? "Public-office experience; applicable lobbying eligibility."
      : "Public communication and institutional experience.",
    earliestStartAt: null,
    opensAt: next.currentDate,
    closesAt: addDays(next.currentDate, 28),
    provenance: {
      kind: "authored",
      note: "Capital employer’s advertised vacancy.",
    },
  });
}
function scheduleReview(world: World, personId: EntityId, days = 1): World {
  const nextDay = addDays(world.currentDate, days);
  const key = `post-office-career:${personId}:${nextDay}`;
  if (world.history.futureDueItems.some((d) => d.stableKey === key))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey: key,
    transitionKey: POST_OFFICE_CAREER_KEY,
    dueAt: nextDay,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    entityIds: [personId],
    provenance: { kind: "simulated", sourceEntityIds: [personId] },
  });
}
/** All departing officials use the ordinary application, employer-offer, hiring and compensation writers. */
export function reviewPostOfficeCareer(
  world: World,
  personId: EntityId,
): World {
  if (world.control.kind === "person" && world.control.personId === personId)
    return world;
  const departed = departedOffices(world, personId).at(-1);
  if (!departed) return world;
  let next = settleJobPay(world, personId);
  const held = activeWorkRelationshipsAt(next, personId);
  if (held.length > 0) {
    const ids = new Set(held.map((w) => w.relationship.id));
    const due = next.history.resourceFlows
      .filter(
        (f) =>
          f.basisReference.kind === "work" &&
          ids.has(f.basisReference.workRelationshipId) &&
          f.stableKey.startsWith("job-pay:"),
      )
      .map((f) =>
        addDays(
          f.startsAt,
          (Math.floor(daysBetween(f.startsAt, next.currentDate) / 7) + 1) * 7,
        ),
      )
      .sort()[0];
    return due
      ? scheduleReview(next, personId, daysBetween(next.currentDate, due))
      : next;
  }
  next = advanceApplications(next, personId);
  const pending = applicationsFor(next, personId).find((a) => {
    const step = latestApplicationStep(next, a.id);
    return !step || ["offered", "accepted", "followed-up"].includes(step.kind);
  });
  if (pending) {
    const step = latestApplicationStep(next, pending.id);
    if (step?.kind === "offered")
      next = answerJobOfferAsResident(next, pending.id, true).world;
    const startsAt = expectedStart(next, pending.id);
    if (startsAt && startsAt <= next.currentDate)
      next = startJobAsResident(next, pending.id).world;
    return scheduleReview(next, personId);
  }
  const stateKey = officeState(next, departed);
  if (!stateKey) return next;
  next = openWeeklyListings(
    ensureCapitalLobbyingOpening(next, stateKey),
    personId,
  );
  const capital = (research.capitals as Record<string, { placeKey: string }>)[
    stateKey.slice(3)
  ]!;
  const capitalId = lifePlaceByKey(capital.placeKey)!.context.jurisdiction.id;
  const listings = [
    ...openJobListings(next, personId),
    ...(next.history.jobOpenings ?? []).filter(
      (o) =>
        o.jurisdictionId === capitalId &&
        o.opensAt <= next.currentDate &&
        o.closesAt >= next.currentDate,
    ),
  ].filter((o, i, all) => all.findIndex((other) => other.id === o.id) === i);
  const annual = (o: (typeof listings)[number]) =>
    o.pay.amount.minorUnits *
    (o.pay.basis === "annual-salary"
      ? 1
      : o.pay.basis === "hourly"
        ? ((o.weeklyHours.minimumHours + o.weeklyHours.maximumHours) / 2) * 52
        : 260);
  listings.sort((a, b) => annual(b) - annual(a) || a.id.localeCompare(b.id));
  const question = Object.values(next.policyCatalog.propositions).find(
    (p) => p.stableKey === COOLING_OFF_QUESTION,
  );
  const ownView = question
    ? principledLeaning(next, personId, question.id)
    : { score: 0, recordIds: [] };
  const voluntarilyDeclines = (o: (typeof listings)[number]) =>
    ownView.score > 0 &&
    organizationProfileAt(next, o.organizationId)?.classification ===
      LOBBYING_EMPLOYER;
  const eligible = listings.find(
    (o) =>
      !residentApplicationBlocked(next, personId, o.id) &&
      !voluntarilyDeclines(o),
  );
  if (!eligible) return next;
  const barred = listings.filter((o) =>
    lobbyingBar(next, personId, o.organizationId),
  );
  const key = `post-office-choice:${departed.id}:${eligible.id}`;
  if (!next.history.events.some((e) => e.stableKey === key))
    next = recordWorldEvent(next, {
      stableKey: key,
      type: "employment.post-office-choice",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: next.people[personId]!.homeJurisdictionId,
      involvedEntityIds: [personId, departed.id, eligible.id],
      participants: [
        {
          personId,
          role: "focus:subject",
          detail: "Former official seeking their next job",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        `opening:${eligible.id}`,
        `barred-lobbying-openings:${barred.length}`,
      ],
      summary: `The former official applied for ${eligible.title}; ${barred.length} lobbying openings were unavailable under the cooling-off law.`,
      context: {
        location: null,
        socialContext: null,
        pressure:
          "The public-office job has ended, and the former official has no other active job.",
        choice: `Apply for ${eligible.title}, paying $${(annual(eligible) / 100).toFixed(2)} a year.`,
        motivation: [
          "Find work to replace the lost earnings.",
          ...(ownView.score > 0
            ? [
                "The former official supports a waiting period before taking lobbying work and chooses to observe one.",
              ]
            : []),
          ...barred.map((o) => lobbyingBar(next, personId, o.organizationId)),
        ].join(" "),
        immediateReaction: null,
      },
    });
  const result = applyForJobAsResident(next, personId, eligible.id);
  return result.ok ? scheduleReview(result.world, personId) : next;
}
export function reviewPostOfficeCareers(world: World): World {
  return writeWithWorldIntegrityOnce(world, () => {
    let next = world;
    for (const personId of new Set(
      departedOffices(world).map((w) => w.personId),
    ))
      next = reviewPostOfficeCareer(next, personId);
    return next;
  });
}
export function postOfficeCareerHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const personId = due.entityIds[0];
  const next =
    personId && world.people[personId]
      ? reviewPostOfficeCareer(world, personId)
      : world;
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: "Reviewed the former official's real application and pay records.",
    outcomeEventId: null,
  };
}
