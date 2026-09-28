import { describe, expect, it } from "vitest";

import { createLegislativeScenario } from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { advanceWorld } from "../simulation/world";
import type { EntityId, World } from "../simulation";
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
import { fileDraft } from "./legislation-docket";
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

/** Two utilities in the state, one with someone working there, then the law. */
function enact(variantKey: string, familyKey: string) {
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
  const filed = fileDraft(withStaff, {
    scenarioKey: "nebraska",
    playerPersonId: scenario.playerPersonId,
    jurisdictionId,
    familyKey,
    variantKey,
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
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep(context, world, step).world,
    );
  }
  expect(measurePosition(world, measureId).outcome).toBe("enacted");
  return { world, measureId, staffedId: staffed.id, emptyId: empty.id };
}

/** Moves to the compliance date and runs the one due item the duty scheduled. */
function fallDue(world: World, measureId: EntityId): World {
  const [{ duty }] = enactedDutiesOf(world, measureId);
  const due = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === ENACTED_DUTY_COMPLIANCE &&
      item.entityIds.includes(duty!.eventId),
  )!;
  expect(due.dueAt).toBe(duty!.complyBy);
  // Ordinary time, with the handlers the game runs, up to the compliance date.
  const days = Math.round(
    (Date.parse(due.dueAt) - Date.parse(world.currentDate)) / 86_400_000,
  );
  return advanceWorld(world, days, createCampaignElectionTransitionRegistry());
}

describe("a law that places a duty on a class of body", () => {
  it("records the duty, and on its date finds who complied and who did not", () => {
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
    ).toEqual({ [staffedId]: "complied", [emptyId]: "compliance-unknown" });
    // The provisional rule is marked as one on the record, and an unstaffed
    // body is unknown, never a breach.
    expect(findings.map((row) => row.basis).sort()).toEqual([
      "game-profile",
      "unknown",
    ]);
    const read = enactedLawEffects(after, measureId)!.lines.find(
      (row) => row.kind === "duty",
    );
    expect(read).toMatchObject({
      status: "in-effect",
      complied: 1,
      complianceUnknown: 1,
    });
    expect(lawEffectSentences(after, measureId).join(" ")).toContain(
      "Of those on record, 1 of 2 met it; for 1, whether it was met is not known.",
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
