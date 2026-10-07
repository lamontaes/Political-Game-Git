import { currentMeasureProvisions } from "../simulation/legislative-politics";
import { operativeDateInWorld } from "../simulation/governing/law-in-force";
import {
  playerRequiredWorkIds,
  releasePlayerRequiredWork,
} from "../simulation/time-work";
import { personName } from "../simulation/people";
import { ensureStateExecutiveIncumbent } from "../simulation/nationwide-world/state-executives";
import {
  governorOfficeForJurisdiction,
  governingMatters,
  decideGoverningMatter,
} from "../simulation/governing/state-governing";
import { BILL_SIGN } from "../simulation/governing/governor-bill-decision";
import { describe, expect, it } from "vitest";

import { createLegislativeScenario } from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { advanceWorld, recordWorldEvent } from "../simulation/world";
import { addDays } from "../simulation/dates";
import type { EntityId, World } from "../simulation";
import type { ProgramParameterValue } from "../simulation/legislation-content-contracts";
import {
  dutyReaches,
  ENACTED_DUTY_COMPLIANCE,
  enactedDutiesOf,
  enactedDutyComplianceHandler,
} from "../simulation/enacted-duties";
import {
  applyEnactedLawEffects,
  enactedLawEffects,
} from "../simulation/enacted-law-effects";
import {
  availableMeasureSteps,
  measurePosition,
} from "../simulation/legislation";
import { createOrganization, createWorkRelationship } from "../simulation/life";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import { lawEffectSentences } from "./law-effects-prose";
import {
  availableAuthorities,
  fileDraft,
  resolveAuthority,
} from "./legislation-docket";
import {
  programLastDay,
  programTermChangeOf,
} from "../simulation/enacted-program-terms";
import { applyLegislativeStep } from "./legislation-session";
import { publishLegislativeTransition } from "./publish-legislative-transition";

/**
 * Spec 3, the rule lever: a law that places a duty on a class of body records
 * that duty, and on the Act's own compliance date each body within its reach
 * is found to have met it or not. Nebraska, because the owner asked that tests
 * span places.
 */

function utility(world: World, key: string, name: string, at: EntityId) {
  const next = createOrganization(world, {
    stableKey: `duty-test:${key}`,
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: "Enacted duty fixture." },
    initialProfile: {
      name,
      classification: "enterprise:utility",
      locationJurisdictionId: at,
    },
  });
  return { world: next, id: next.history.organizations.at(-1)!.id };
}

function staff(world: World, personId: EntityId, organizationId: EntityId) {
  return createWorkRelationship(world, {
    stableKey: `duty-test:work:${organizationId}`,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:duty-test",
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: "Enacted duty fixture." },
    initialRole: {
      title: "Operator",
      occupationClassification: null,
      locationJurisdictionId: world.people[personId]!.homeJurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 40 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: world.people[personId]!.homeJurisdictionId,
      },
    },
  });
}

type Scenario = ReturnType<typeof createLegislativeScenario>;

/** Record the fixture's control change without rewriting pending work. */
function controlForFixture(
  world: World,
  personId: EntityId,
  stableKey: string,
): World {
  const previous =
    world.control.kind === "person" ? world.control.personId : null;
  if (previous === personId) return world;
  const handoff = recordWorldEvent(world, {
    stableKey,
    type: "test.control-moved",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      personId,
      ...(previous
        ? [previous, ...playerRequiredWorkIds(world, previous)]
        : []),
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary:
      "Controlled downstream fixture moves play to the actual actor for its next recorded action.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const released = previous
    ? releasePlayerRequiredWork(handoff, {
        personId: previous,
        stableKeyPrefix: `${stableKey}:released`,
        outcomeEventId: handoff.history.events.at(-1)!.id,
      })
    : handoff;
  return { ...released, control: { kind: "person", personId } };
}

/** A controlled actual-office signature for downstream law-effect fixtures. */
function signAtActualGovernorDesk(
  scenario: ReturnType<typeof createLegislativeScenario>,
  start: World,
  measureId: EntityId,
): World {
  let world = ensureStateExecutiveIncumbent(
    start,
    scenario.playerPersonId,
    scenario.pack.jurisdictionKey.slice(3),
  );
  const office = governorOfficeForJurisdiction(
    world,
    scenario.pack.jurisdictionKey,
  );
  expect(
    office,
    "A recorded governor is required for this controlled signature.",
  ).not.toBeNull();
  world = controlForFixture(
    world,
    office!.holderPersonId,
    `a80:governor-control:${measureId}`,
  );
  world = applyLegislativeStep(
    { ...scenario, measureId },
    world,
    "await-executive-decision",
  ).world;
  const matter = governingMatters(world, office!.officeKey).find(
    (row) => row.measureId === measureId && row.status === "open",
  );
  expect(
    matter,
    "The actual bill must reach its recorded governor's desk.",
  ).toBeDefined();
  const decision = decideGoverningMatter(world, matter!.id, BILL_SIGN);
  expect(decision.ok, decision.ok ? "" : decision.reason).toBe(true);
  const next = decision.world;
  expect(measurePosition(next, measureId).phase).toBe("awaiting-enactment");
  const recorded = next.history.events.find(
    (event) =>
      event.tags.includes(`matter:${matter!.id}`) &&
      event.tags.includes(`choice:${BILL_SIGN}`),
  );
  expect(
    recorded?.participants.some(
      (participant) =>
        participant.personId === office!.holderPersonId &&
        participant.role === "agency:decider",
    ),
  ).toBe(true);
  console.info(
    "A80 actual governor fixture",
    JSON.stringify({
      seed: next.seed,
      scenario: scenario.scenarioKey,
      measureId,
      matterId: matter!.id,
      governor: personName(next.people[office!.holderPersonId]!),
      governorId: office!.holderPersonId,
      decisionEventId: recorded!.id,
      choice: BILL_SIGN,
      phase: measurePosition(next, measureId).phase,
      controlledChoice: true,
    }),
  );
  return next;
}

/**
 * Files a controlled bill and signs it through the actual recorded governor
 * desk for downstream duty tests. The signing choice is supplied, not an
 * ordinary NPC decision. Production vacancy handling stays pending.
 */
function pass(
  scenario: Scenario,
  start: World,
  draft: {
    readonly familyKey: string;
    readonly variantKey: string;
    readonly authorityKey?: string;
    readonly parameterValues?: Readonly<Record<string, ProgramParameterValue>>;
  },
) {
  const controlledStart = controlForFixture(
    start,
    scenario.playerPersonId,
    `a80:filing-control:${start.history.nextSequence}`,
  );
  const filed = fileDraft(controlledStart, {
    scenarioKey: "nebraska",
    playerPersonId: scenario.playerPersonId,
    jurisdictionId:
      scenario.world.history.legislativeMeasures![0]!.jurisdictionId,
    ...draft,
  });
  const measureId = filed.bill.measureId;
  const context = { ...scenario, measureId };
  let world = filed.world;
  for (
    let guard = 0;
    guard < 40 && measurePosition(world, measureId).phase !== "enacted";
    guard++
  ) {
    const step = availableMeasureSteps(world, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step) break;
    if (step === "await-executive-decision") {
      world = publishLegislativeTransition(
        world,
        signAtActualGovernorDesk(scenario, world, measureId),
      );
      continue;
    }
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep(context, world, step).world,
    );
  }
  expect(measurePosition(world, measureId).outcome).toBe("enacted");
  const enactment = world.history.legislativeEnactments?.find(
    (row) => row.measureId === measureId,
  );
  console.info(
    "A80 fixture law records",
    JSON.stringify({
      file: "enacted-duties",
      measureId,
      currentDate: world.currentDate,
      lineages: world.history.legislativeDraftLineages?.filter(
        (row) => row.measureId === measureId,
      ),
      enactment: enactment ?? null,
      operative: enactment ? operativeDateInWorld(world, enactment) : null,
      appropriations:
        world.history.publicProgramRecords?.filter(
          (row) =>
            row.kind === "appropriation" && row.sourceMeasureId === measureId,
        ) ?? [],
      provisions: currentMeasureProvisions(world, measureId).map((row) => ({
        id: row.id,
        provisionKey: row.provisionKey,
        text: row.text,
        operativeEffect: row.operativeEffect ?? null,
      })),
    }),
  );
  return { world, measureId, docketKey: filed.bill.docketKey };
}

/** Two utilities in the state, one with someone working there, then the law. */
function enact(
  variantKey: string,
  familyKey: string,
  authorityKey?: string,
  parameterValues?: Readonly<Record<string, ProgramParameterValue>>,
) {
  const scenario = createLegislativeScenario("nebraska");
  const jurisdictionId =
    scenario.world.history.legislativeMeasures![0]!.jurisdictionId;
  const staffed = utility(
    scenario.world,
    "staffed",
    "Platte Electric",
    jurisdictionId,
  );
  const empty = utility(staffed.world, "empty", "Loup Water", jurisdictionId);
  const withStaff = staff(empty.world, scenario.playerPersonId, staffed.id);
  const { world, measureId } = pass(scenario, withStaff, {
    familyKey,
    variantKey,
    ...(authorityKey ? { authorityKey } : {}),
    ...(parameterValues ? { parameterValues } : {}),
  });
  return { world, measureId, staffedId: staffed.id, emptyId: empty.id };
}

/** Moves to the compliance date and runs the one due item the duty scheduled. */
function fallDue(world: World, measureId: EntityId): World {
  const entry = enactedDutiesOf(world, measureId)[0];
  expect(entry).toBeDefined();
  if (!entry)
    throw new Error("The fixture must record a duty before it falls due.");
  const { duty } = entry;
  const due = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === ENACTED_DUTY_COMPLIANCE &&
      item.entityIds.includes(duty.eventId),
  )!;
  expect(due.dueAt).toBe(duty.complyBy);
  // Ordinary time, with the handlers the game runs, up to the compliance date.
  const days = Math.round(
    (Date.parse(due.dueAt) - Date.parse(world.currentDate)) / 86_400_000,
  );
  return advanceWorld(world, days, createCampaignElectionTransitionRegistry());
}

describe("a law that places a duty on a class of body", () => {
  it("records the duty without mistaking workers for fulfillment", () => {
    const { world, measureId, staffedId, emptyId } = enact(
      "continuity-planning-duty",
      "critical-infrastructure",
    );
    const [entry, ...rest] = enactedDutiesOf(world, measureId);
    expect(rest).toHaveLength(0);
    const duty = entry!.duty;
    expect(duty.coverage.kind).toBe("classes");
    expect(duty.enforcerLabel).toBe("the department");
    // The Act states no penalty, so none is invented.
    expect(duty.penaltyLabel).toBeNull();
    // Its own "not later than" date, which is after the law took effect.
    expect(duty.complyBy > duty.operativeAt).toBe(true);
    expect(entry!.findings).toHaveLength(0);

    const before = enactedLawEffects(world, measureId)!;
    const line = before.lines.find((row) => row.kind === "duty");
    expect(line?.kind === "duty" && line.status).toBe("scheduled");
    // The rule section is no longer reported as a part nothing acts on.
    expect(
      before.lines.some(
        (row) => row.kind === "not-modeled" && row.heading === duty.heading,
      ),
    ).toBe(false);

    const after = fallDue(world, measureId);
    const findings = enactedDutiesOf(after, measureId)[0]!.findings;
    expect(
      Object.fromEntries(
        findings.map((row) => [row.organizationId, row.outcome]),
      ),
    ).toEqual({
      [staffedId]: "compliance-unknown",
      [emptyId]: "compliance-unknown",
    });
    // Neither a worker nor missing staffing proves performance or a breach.
    expect(findings.map((row) => row.basis).sort()).toEqual([
      "unknown",
      "unknown",
    ]);
    const read = enactedLawEffects(after, measureId)!.lines.find(
      (row) => row.kind === "duty",
    );
    expect(read).toMatchObject({
      status: "in-effect",
      complied: 0,
      complianceUnknown: 2,
    });
    expect(lawEffectSentences(after, measureId).join(" ")).toContain(
      "Of those on record, for 2, whether it was met is not known.",
    );
  });

  it("writes nothing twice", () => {
    const { world, measureId } = enact(
      "continuity-planning-duty",
      "critical-infrastructure",
    );
    expect(applyEnactedLawEffects(world, measureId)).toBe(world);
    const after = fallDue(world, measureId);
    const again = enactedDutyComplianceHandler(
      after,
      after.history.futureDueItems.find(
        (item) => item.transitionKey === ENACTED_DUTY_COMPLIANCE,
      )!,
    );
    expect(again.world).toBe(after);
  });

  it("records coverage as unknown where the Act turns on a size the world does not hold", () => {
    const { world, measureId } = enact(
      "restoration-standard",
      "utility-resilience",
    );
    const after = fallDue(world, measureId);
    const findings = enactedDutiesOf(after, measureId)[0]!.findings;
    expect(findings.map((row) => row.outcome)).toEqual([
      "coverage-unknown",
      "coverage-unknown",
    ]);
  });

  it("stands with no body under it when the Act reaches only bodies that act first", () => {
    const { world, measureId } = enact(
      "transition-referral-duty",
      "veteran-transition-referrals",
    );
    const entries = enactedDutiesOf(world, measureId);
    // Its operative duty and its safeguard are both rules.
    expect(entries.length).toBe(2);
    for (const { duty, findings } of entries) {
      expect(duty.coverage.kind).toBe("conditional");
      expect(findings).toHaveLength(0);
    }
    const lines = enactedLawEffects(world, measureId)!.lines.filter(
      (row) => row.kind === "duty",
    );
    expect(lines).toHaveLength(2);
    expect(lawEffectSentences(world, measureId).join(" ")).toContain(
      "None has come under it yet.",
    );
  });
});

describe("a law that says who it applies to", () => {
  const eligibility = (world: World, measureId: EntityId) =>
    enactedLawEffects(world, measureId)!.lines.filter(
      (row) => row.kind === "eligibility",
    );

  it("counts the bodies on record it names", () => {
    const { world, measureId } = enact(
      "continuity-planning-duty",
      "critical-infrastructure",
    );
    const [line, ...rest] = eligibility(world, measureId);
    expect(rest).toHaveLength(0);
    expect(line).toMatchObject({
      coverage: "classes",
      subject: "bodies",
      qualifying: 2,
      unknown: 0,
    });
    // Every section of this Act now does something the world reads.
    expect(
      enactedLawEffects(world, measureId)!.lines.filter(
        (row) => row.kind === "not-modeled",
      ),
    ).toEqual([]);
    expect(lawEffectSentences(world, measureId).join(" ")).toContain(
      "2 are on record here.",
    );
  });

  it("leaves the count unknown where the test turns on a size no record holds", () => {
    const { world, measureId } = enact(
      "restoration-standard",
      "utility-resilience",
    );
    expect(eligibility(world, measureId)[0]).toMatchObject({
      coverage: "unrecorded-test",
      qualifying: null,
      unknown: 2,
    });
  });

  it("names households it applies to without inventing how many there are", () => {
    const { world, measureId } = enact(
      "raise-income-limit",
      "assistance-eligibility",
      "standing:household-assistance",
    );
    const [line] = eligibility(world, measureId);
    expect(line).toMatchObject({
      subject: "households",
      coverage: "unknown",
      qualifying: null,
    });
    expect(lawEffectSentences(world, measureId).join(" ")).toContain(
      "Who meets that test is not known yet.",
    );
  });

  it("says whom it covers in the words the law was passed with", () => {
    const { world, measureId } = enact(
      "raise-income-limit",
      "assistance-eligibility",
      "standing:household-assistance",
      { "limit-share": { kind: "integer", value: 45 } },
    );
    const [line] = eligibility(world, measureId);
    expect(line?.kind === "eligibility" && line.coveredLabel).toContain("45");
    expect(line?.kind === "eligibility" && line.coveredLabel).not.toContain(
      "60",
    );
  });

  it("reaches local governments only when the law was passed to", () => {
    const { world, measureId } = enact(
      "classification-standard",
      "public-workforce",
      undefined,
      { "covered-bodies": { kind: "enumerated", value: "state-and-local" } },
    );
    const entry = enactedDutiesOf(world, measureId)[0];
    expect(entry).toBeDefined();
    if (!entry) throw new Error("The fixture must record its coverage duty.");
    const { duty } = entry;
    expect(
      duty.coverage.kind === "unrecorded-test" && duty.coverage.classifications,
    ).toContain("sector:local-government-office");
    // Whether an agency employs people in classified posts is not on record,
    // so none is counted as covered.
    expect(eligibility(world, measureId)[0]).toMatchObject({
      qualifying: null,
    });
  });

  it("reads a purpose section as the Act's reason, not as a part nothing acts on", () => {
    const { world, measureId } = enact(
      "inventory-and-plan",
      "water-service-lines",
    );
    const effects = enactedLawEffects(world, measureId)!;
    expect(
      effects.lines.some(
        (row) => row.kind === "not-modeled" && /purpose/i.test(row.heading),
      ),
    ).toBe(false);
    expect(eligibility(world, measureId)).toHaveLength(1);
  });
});

describe("a law's money sections", () => {
  it("turns a family's own appropriating section into money the state can spend", () => {
    const { world, measureId } = enact(
      "funded-replacement",
      "water-service-lines",
    );
    const fund = (world.history.legislativeProvisions ?? []).find(
      (row) =>
        row.measureId === measureId && row.provisionKey === "replacement-fund",
    )!;
    const authority = (world.history.publicProgramRecords ?? []).filter(
      (row) =>
        row.kind === "appropriation" && row.sourceMeasureId === measureId,
    );
    expect(authority).toHaveLength(1);
    expect(
      authority[0]!.kind === "appropriation" && authority[0]!.amount.minorUnits,
    ).toBe(fund.fiscalExposureMinorUnits);
    const effects = enactedLawEffects(world, measureId)!;
    expect(effects.lines.some((row) => row.kind === "appropriation")).toBe(
      true,
    );
    expect(
      effects.lines.some(
        (row) => row.kind === "not-modeled" && row.heading === fund.heading,
      ),
    ).toBe(false);
    // Idempotent: the same section is not made spendable twice.
    expect(applyEnactedLawEffects(world, measureId)).toBe(world);
  });

  it("keeps a pilot's money available for the pilot's own term", () => {
    const { world, measureId } = enact(
      "enrollment-fare-relief",
      "transit-access",
    );
    const pilot = (world.history.legislativeProvisions ?? []).find(
      (row) =>
        row.measureId === measureId &&
        row.provisionKey === "pilot-support-limit",
    )!;
    const years = /for the (\w+)-year pilot/.exec(pilot.text)?.[1];
    expect(years).toBeDefined();
    const record = (world.history.publicProgramRecords ?? []).find(
      (row) =>
        row.kind === "appropriation" && row.sourceMeasureId === measureId,
    );
    expect(record?.kind).toBe("appropriation");
    if (record?.kind !== "appropriation") return;
    // Longer than the one year an appropriation gets when it states no term.
    expect(record.availableThrough > addDays(record.availableFrom, 364)).toBe(
      true,
    );
  });

  it("reads an authorization as a ceiling that provides no money", () => {
    const { world, measureId } = enact(
      "hardening-grants",
      "utility-resilience",
    );
    expect(
      (world.history.publicProgramRecords ?? []).some(
        (row) =>
          row.kind === "appropriation" && row.sourceMeasureId === measureId,
      ),
    ).toBe(false);
    const line = enactedLawEffects(world, measureId)!.lines.find(
      (row) => row.kind === "authorization",
    );
    expect(line).toMatchObject({
      annual: false,
      appropriatedAgainstMinorUnits: 0,
    });
    expect(lawEffectSentences(world, measureId).join(" ")).toContain(
      "provides no money itself. No later law has provided any of it yet.",
    );
  });

  it("counts what a later law appropriates against the ceiling", () => {
    const scenario = createLegislativeScenario("nebraska");
    const first = pass(scenario, scenario.world, {
      familyKey: "utility-resilience",
      variantKey: "hardening-grants",
    });
    const second = pass(scenario, first.world, {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: `docket:${first.docketKey}`,
    });
    const provided = (second.world.history.publicProgramRecords ?? []).find(
      (row) =>
        row.kind === "appropriation" &&
        row.sourceMeasureId === second.measureId,
    );
    expect(provided).toBeDefined();
    const line = enactedLawEffects(second.world, first.measureId)!.lines.find(
      (row) => row.kind === "authorization",
    );
    expect(line).toMatchObject({
      appropriatedAgainstMinorUnits:
        provided?.kind === "appropriation" ? provided.amount.minorUnits : -1,
    });
  });

  it("reads a yearly salary cap as a cap", () => {
    const { world, measureId } = enact(
      "authorize-positions",
      "public-workforce",
    );
    const line = enactedLawEffects(world, measureId)!.lines.find(
      (row) => row.kind === "authorization",
    );
    expect(line).toMatchObject({ annual: true });
    expect(lawEffectSentences(world, measureId).join(" ")).toContain("a year.");
  });
});

describe("a law that ends, extends or repeals a program", () => {
  const TRANSIT = "standing:rural-transit-assistance";
  const input = (scenario: Scenario) => ({
    scenarioKey: "nebraska",
    playerPersonId: scenario.playerPersonId,
  });
  const transit = (scenario: Scenario) => ({
    authorityKey: TRANSIT,
    jurisdictionId:
      scenario.world.history.legislativeMeasures![0]!.jurisdictionId,
  });
  const daysUntilAfter = (world: World, lastDay: string) =>
    Math.max(
      1,
      Math.round(
        (Date.parse(lastDay) - Date.parse(world.currentDate)) / 86_400_000,
      ) + 1,
    );

  it("stops new spending under a repealed program once the repeal takes effect", () => {
    const scenario = createLegislativeScenario("nebraska");
    const repeal = pass(scenario, scenario.world, {
      familyKey: "program-sunset",
      variantKey: "repeal-outright",
      authorityKey: TRANSIT,
    });
    const line = enactedLawEffects(repeal.world, repeal.measureId)!.lines.find(
      (row) => row.kind === "program-term",
    );
    expect(line).toMatchObject({ change: "repeal", superseded: false });
    if (line?.kind !== "program-term") return;
    const authorityBefore = resolveAuthority(
      repeal.world,
      input(scenario),
      TRANSIT,
    );
    expect(authorityBefore?.kind).toBe("standing-statute");
    if (authorityBefore?.kind !== "standing-statute")
      throw new Error(
        "The fixture requires its recorded standing spending authority.",
      );
    expect(authorityBefore.authorizesSpending).toBe(
      repeal.world.currentDate <= line.lastDay,
    );

    const days = Math.round(
      (Date.parse(line.lastDay) - Date.parse(repeal.world.currentDate)) /
        86_400_000,
    );
    const after = advanceWorld(
      repeal.world,
      Math.max(1, days + 1),
      createCampaignElectionTransitionRegistry(),
    );
    const authorityAfter = resolveAuthority(after, input(scenario), TRANSIT);
    expect(authorityAfter?.kind).toBe("standing-statute");
    if (authorityAfter?.kind !== "standing-statute")
      throw new Error(
        "The fixture requires its recorded standing spending authority.",
      );
    expect(authorityAfter.authorizesSpending).toBe(false);
    expect(
      availableAuthorities(after, input(scenario)).find(
        (row) => row.authorityKey === TRANSIT,
      )?.note,
    ).toMatch(/^Ended by /);
    expect(lawEffectSentences(after, repeal.measureId).join(" ")).toContain(
      "No new spending can be written under it.",
    );
  });

  it("lets a later extension supersede an earlier end date", () => {
    const scenario = createLegislativeScenario("nebraska");
    const sunset = pass(scenario, scenario.world, {
      familyKey: "program-sunset",
      variantKey: "terminate-on-date",
      authorityKey: TRANSIT,
    });
    const extension = pass(scenario, sunset.world, {
      familyKey: "program-sunset",
      variantKey: "extend-authority",
      authorityKey: TRANSIT,
    });
    const now = programLastDay(extension.world, transit(scenario));
    expect(now?.measureId).toBe(extension.measureId);
    expect(now?.kind).toBe("extension");
    const earlier = enactedLawEffects(
      extension.world,
      sunset.measureId,
    )!.lines.find((row) => row.kind === "program-term");
    expect(earlier).toMatchObject({ superseded: true });
  });
  it("does not bring a repealed program back with a later extension", () => {
    const scenario = createLegislativeScenario("nebraska");
    const repeal = pass(scenario, scenario.world, {
      familyKey: "program-sunset",
      variantKey: "repeal-outright",
      authorityKey: TRANSIT,
    });
    const extension = pass(scenario, repeal.world, {
      familyKey: "program-sunset",
      variantKey: "extend-authority",
      authorityKey: TRANSIT,
    });
    const now = programLastDay(extension.world, transit(scenario));
    const repealed = programLastDay(repeal.world, transit(scenario));
    // The extension's own date is later than the repeal's, so "latest wins"
    // alone would revive the program.
    const extended = programTermChangeOf(extension.world, extension.measureId);
    expect(extended!.lastDay > repealed!.lastDay).toBe(true);
    expect(now?.measureId).toBe(repeal.measureId);
    expect(now?.lastDay).toBe(repealed!.lastDay);
  });

  it("leaves the same program in another jurisdiction untouched", () => {
    const scenario = createLegislativeScenario("nebraska");
    const sunset = pass(scenario, scenario.world, {
      familyKey: "program-sunset",
      variantKey: "terminate-on-date",
      authorityKey: TRANSIT,
    });
    expect(programLastDay(sunset.world, transit(scenario))).not.toBeNull();
    expect(
      programLastDay(sunset.world, {
        authorityKey: TRANSIT,
        jurisdictionId: stateJurisdictionForKey("US-IA")!.id,
      }),
    ).toBeNull();
  });

  it("says which law ended a program a bill set up", () => {
    const scenario = createLegislativeScenario("nebraska");
    const grants = pass(scenario, scenario.world, {
      familyKey: "utility-resilience",
      variantKey: "hardening-grants",
    });
    const sunset = pass(scenario, grants.world, {
      familyKey: "program-sunset",
      variantKey: "terminate-on-date",
      authorityKey: `docket:${grants.docketKey}`,
    });
    const term = programLastDay(sunset.world, { measureId: grants.measureId });
    expect(term?.measureId).toBe(sunset.measureId);
    const after = advanceWorld(
      sunset.world,
      daysUntilAfter(sunset.world, term!.lastDay),
      createCampaignElectionTransitionRegistry(),
    );
    const option = availableAuthorities(after, input(scenario)).find(
      (row) => row.authorityKey === `docket:${grants.docketKey}`,
    );
    expect(option?.authorizesSpending).toBe(false);
    expect(option?.note).toMatch(/^Ended by /);
  });
});

describe("the reach of a state law's duty", () => {
  const states = lifePlaceStateIdentities();
  const townOf = (key: string) =>
    searchLifePlaces("", 10, { stateJurisdictionKey: key }).find(
      (place) => place.scope !== "state",
    );

  it("covers all 50 states, D.C. and the five territories", () => {
    expect(states).toHaveLength(56);
  });

  it.each(
    states.map((state, index) => [state.jurisdictionKey, index] as const),
  )("%s reaches its own towns and no other place's", (key, index) => {
    const law = stateJurisdictionForKey(key)!;
    const world = { jurisdictions: { [law.id]: law } };
    const home = townOf(key)!;
    const away = townOf(states[(index + 1) % states.length]!.jurisdictionKey)!;
    expect(home).toBeDefined();
    expect(dutyReaches(world, law.id, home.context.jurisdiction.id)).toBe(true);
    expect(dutyReaches(world, law.id, away.context.jurisdiction.id)).toBe(
      false,
    );
    // A body whose place is not on record is unknown, not outside.
    expect(dutyReaches(world, law.id, null)).toBeNull();
  });

  it("reaches every place for a federal law", () => {
    const nation = {
      id: "jurisdiction_nation",
      slug: "us-federal",
      name: "United States",
      kind: "nation",
      parentName: null,
    } as never as World["jurisdictions"][string];
    const world = { jurisdictions: { [nation.id]: nation } };
    for (const state of states) {
      const home = townOf(state.jurisdictionKey)!;
      expect(dutyReaches(world, nation.id, home.context.jurisdiction.id)).toBe(
        true,
      );
    }
  });
});
