import { expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  createOrganization,
  createWorkRelationship,
  createEducationEnrollment,
  recordEducationEnrollmentState,
} from "./life";
import {
  createWorkCompensation,
  createResourcePosition,
  recordResourceTransferOutcome,
  money,
} from "./resources";
import {
  recordedCredentialHourlyPay,
  startTownJobPay,
  townJobRate,
  townPayPercentile,
} from "./living-world/town-pay";
import { TOWN_EMPLOYMENT_VERSION } from "./living-world/town-employment";
import { serializeWorld, deserializeWorld } from "./serialization";
import { addDays } from "./dates";
import type { EntityId, World } from "./types";

const provenance = {
  kind: "authored" as const,
  note: "Controlled existing-record cohort fixture; compensation amounts use the existing sourced OEWS reader, not a credential premium.",
};
function fixture(
  options: {
    targetComplete?: boolean;
    peerComplete?: boolean;
    paid?: boolean;
    otherPlace?: boolean;
  } = {},
) {
  const game = smallWorld({
    place: "US-VA",
    date: "2026-03-02",
    people: 4,
    seed: "a40-recorded-credential-cohort",
  });
  let world = createOrganization(game.world, {
    stableKey: "a40:cohort-employer",
    formedAt: addDays(game.world.currentDate, -13),
    provenance,
    initialProfile: {
      name: "Controlled cohort employer",
      classification: "enterprise:retail",
      locationJurisdictionId: game.jurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  const workIds: EntityId[] = [];
  const amounts: number[] = [];
  for (const [i, personId] of world.personOrder.slice(0, 3).entries()) {
    world = createWorkRelationship(world, {
      stableKey: `${TOWN_EMPLOYMENT_VERSION}:a40:cohort:${i}`,
      personId,
      organizationId,
      startedAt: i < 2 ? addDays(world.currentDate, -13) : world.currentDate,
      kind: "employment:wage-labor",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Clerk",
        occupationClassification: "occupation:office-clerk",
        locationJurisdictionId:
          options.otherPlace && i < 2
            ? game.stateJurisdictionId
            : game.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 40 },
          attention: "high",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: game.jurisdictionId,
        },
      },
    });
    workIds.push(world.history.workRelationships.at(-1)!.id);
    world = createEducationEnrollment(world, {
      stableKey: `a40:education:${i}`,
      personId,
      organizationId,
      startedAt: world.currentDate,
      programKind: "postsecondary:bachelors-degree",
      contextKind: "program:life-paths2-v2",
      provenance,
    });
    if ((i === 2 ? options.targetComplete : options.peerComplete) !== false) {
      const enrollment = world.history.educationEnrollments.at(-1)!;
      const state = world.history.educationEnrollmentStates.at(-1)!;
      world = recordEducationEnrollmentState(world, {
        stableKey: `a40:completed:${i}`,
        enrollmentId: enrollment.id,
        effectiveAt: world.currentDate,
        status: "completed",
        contextKind: "program:life-paths2-v2",
        reason: "Controlled completed credential",
        supersedesStateId: state.id,
        provenance,
      });
    }
    if (i < 2) {
      const rate = townJobRate(
        "occupation:office-clerk",
        game.jurisdictionId,
        townPayPercentile(i === 0 ? 0 : 10),
      )!;
      expect(rate).not.toBeNull();
      const amount = (rate.hourlyMinor * 40 * 52) / 26;
      amounts.push(amount);
      world = createWorkCompensation(world, {
        stableKey: `a40:compensation:${i}`,
        workRelationshipId: workIds[i]!,
        startsAt: addDays(world.currentDate, -13),
        amount: money(amount, "USD"),
        cadenceKind: "schedule:town-biweekly-0",
        restrictionKind: null,
        jurisdictionId: null,
        provenance,
      });
    }
  }
  world = createResourcePosition(world, {
    stableKey: "a40:controlled-funded-books",
    owner: { kind: "organization", organizationId },
    openedAt: world.currentDate,
    openingBalance: money(
      amounts.reduce((a, b) => a + b, 0),
      "USD",
    ),
    provenance,
  });
  if (options.paid !== false) {
    for (const [i, amount] of amounts.entries()) {
      const flow = world.history.resourceFlows.find(
        (row) => row.stableKey === `a40:compensation:${i}`,
      )!;
      world = recordResourceTransferOutcome(world, {
        stableKey: `a40:paid:${i}`,
        resourceFlowId: flow.id,
        periodStartsAt: addDays(world.currentDate, -13),
        periodEndsAt: world.currentDate,
        occurredAt: world.currentDate,
        status: "completed",
        attemptedAmount: money(amount, "USD"),
        transferredAmount: money(amount, "USD"),
        reasonKind: null,
        note: null,
        provenance,
      });
    }
  }
  return { world, target: workIds[2]!, amounts };
}

it("uses completed credentials and actually paid peers, retaining contributor records", () => {
  const { world, target, amounts } = fixture();
  const quote = recordedCredentialHourlyPay(world, target, world.currentDate)!;
  expect(quote.hourlyMinor).toBe(
    Math.round(
      ((amounts.reduce((a, b) => a + b, 0) / amounts.length) * 26) / (52 * 40),
    ),
  );
  expect(quote.peerCount).toBe(2);
  for (const row of world.history.resourceTransferOutcomes)
    expect(quote.sourceRecordIds).toContain(row.id);
  for (const row of world.history.educationEnrollmentStates.filter(
    (row) => row.status === "completed",
  ))
    expect(quote.sourceRecordIds).toContain(row.id);
});
it.each([
  { targetComplete: false },
  { peerComplete: false },
  { paid: false },
  { otherPlace: true },
])(
  "does not infer a credential premium from missing eligible records: %j",
  (options) => {
    const { world, target } = fixture(options);
    expect(
      recordedCredentialHourlyPay(world, target, world.currentDate),
    ).toBeNull();
  },
);
it("does not read future pay or credentials", () => {
  const { world, target } = fixture();
  expect(
    recordedCredentialHourlyPay(world, target, addDays(world.currentDate, -1)),
  ).toBeNull();
});
it("writes the peer-derived offer through the existing pay writer once and survives reload", () => {
  const { world, target } = fixture();
  const quote = recordedCredentialHourlyPay(world, target, world.currentDate)!;
  const started = startTownJobPay(world, null, world.currentDate);
  const flow = started.history.resourceFlows.find(
    (row) =>
      row.basisReference.kind === "work" &&
      row.basisReference.workRelationshipId === target,
  )!;
  expect(flow).toBeDefined();
  const terms = started.history.resourceFlowTerms.find(
    (row) => row.resourceFlowId === flow.id,
  )!;
  // Whatever the existing employer cadence selects, its provenance reports the same source rate.
  expect(flow.provenance.kind).toBe("authored");
  if (flow.provenance.kind === "authored") {
    expect(flow.provenance.note).toContain(
      `$${(quote.hourlyMinor / 100).toFixed(2)} an hour`,
    );
    expect(flow.provenance.note).toContain("ESTIMATED FROM AVERAGE");
    for (const id of quote.sourceRecordIds)
      expect(flow.provenance.note).toContain(id);
  }
  expect(terms.amount.minorUnits).toBeGreaterThan(0);
  const reopened = deserializeWorld(serializeWorld(started));
  expect(
    startTownJobPay(reopened, null, reopened.currentDate).history.resourceFlows,
  ).toEqual(reopened.history.resourceFlows);
});

it("the same new job and tenure receives different offers only from recorded completion", () => {
  const completed = fixture();
  const enrolled = fixture({ targetComplete: false });
  const withCredential = startTownJobPay(
    completed.world,
    null,
    completed.world.currentDate,
  );
  const withoutCredential = startTownJobPay(
    enrolled.world,
    null,
    enrolled.world.currentDate,
  );
  function targetTerms(world: World, target: EntityId) {
    const flow = world.history.resourceFlows.find(
      (row) =>
        row.basisReference.kind === "work" &&
        row.basisReference.workRelationshipId === target,
    )!;
    return world.history.resourceFlowTerms.find(
      (row) => row.resourceFlowId === flow.id,
    )!;
  }
  const before = targetTerms(withoutCredential, enrolled.target);
  const after = targetTerms(withCredential, completed.target);
  expect(after.cadenceKind).toBe(before.cadenceKind);
  expect(after.amount.minorUnits).toBeGreaterThan(before.amount.minorUnits);
  const credentialQuote = recordedCredentialHourlyPay(
    completed.world,
    completed.target,
    completed.world.currentDate,
  )!;
  const period = /^schedule:town-(weekly|biweekly|semimonthly|monthly)/.exec(
    after.cadenceKind,
  )![1]!;
  const periods = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 }[
    period as "weekly" | "biweekly" | "semimonthly" | "monthly"
  ];
  expect(after.amount.minorUnits).toBe(
    Math.round((credentialQuote.hourlyMinor * 40 * 52) / periods),
  );
});
