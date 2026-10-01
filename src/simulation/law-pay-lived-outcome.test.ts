import { describe, expect, it } from "vitest";
import { currentGovernorOf } from "./crisis/offices";
import { smallWorld } from "../../tests/fixtures/small-world";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import { addDays, daysBetween } from "./dates";
import { stableHash } from "./ids";
import { lifePlaceStateIdentities } from "./life-places";
import { legislatureForState } from "./legislature-game-profile";
import { requireFormalSeatCount } from "./legislature-rules";
import { introduceMeasure } from "./legislation";
import {
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
} from "./legislation-scenarios";
import {
  fileRuleChangeProvision,
  laborLawOfficeKey,
} from "./enacted-rule-changes";
import { createOrganization, createWorkRelationship } from "./life";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
  resolveWorkCompensationPeriod,
} from "./resources";
import { resourceFlowTermsAt } from "./resource-queries";
import { advanceWorld, assertWorldIntegrityFully } from "./world";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { raiseTownPayToMinimum } from "./living-world/town-pay";
import {
  noticeLawPayChanges,
  recordedLawPayChanges,
} from "./law-effects-noticed";
import { livedOutcomesOf } from "./living-world/lived-outcomes";
import { officialsBehind } from "./living-world/official-views";
import { officialViewReflectionKey } from "./law-exposure";
import { viewOfOfficial } from "./official-view-reads";
import { recordRelationshipInteraction } from "./records";
import { serializeWorld, deserializeWorld } from "./serialization";
import type { World } from "./types";

const SEED = "overflow3:paid-law-voters:1";
const states = lifePlaceStateIdentities();
const state =
  states[parseInt(stableHash(SEED).slice(0, 8), 16) % states.length]!;
const provenance = {
  kind: "authored",
  note: "Small-world played-law compensation fixture.",
} as const;

function move(world: World, days: number): World {
  return advanceWorld(world, days, createCampaignElectionTransitionRegistry());
}

function fixture() {
  const small = smallWorld({
    place: state.usps,
    seed: SEED,
    offices: ["governor"],
  });
  let world = small.world;
  const worker = world.personOrder[1]!;
  const forId = world.personOrder[2]!;
  const againstId = world.personOrder[3]!;
  world = createOrganization(world, {
    stableKey: "pay-law:employer",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Fixture shop",
      classification: "enterprise:shop",
      locationJurisdictionId: small.jurisdictionId,
    },
  });
  const employer = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "pay-law:job",
    personId: worker,
    organizationId: employer,
    startedAt: world.currentDate,
    kind: "employment:fixture",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Shop worker",
      occupationClassification: "custom:fixture",
      locationJurisdictionId: small.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "flexible",
        interruptibility: "interruptible",
        locationJurisdictionId: small.jurisdictionId,
      },
    },
  });
  const job = world.history.workRelationships.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "pay-law:cash",
    owner: { kind: "person", personId: worker },
    openedAt: world.currentDate,
    openingBalance: money(0, "USD"),
    provenance,
  });
  world = createWorkCompensation(world, {
    stableKey: `town-pay-v2:job-pay:${job}`,
    workRelationshipId: job,
    startsAt: world.currentDate,
    amount: money(40_000, "USD"),
    cadenceKind: "schedule:town-weekly",
    restrictionKind: null,
    jurisdictionId: small.jurisdictionId,
    provenance,
  });
  const flow = world.history.resourceFlows.at(-1)!.id;
  const baselineStart = world.currentDate;
  world = move(world, 6);
  world = resolveWorkCompensationPeriod(world, {
    stableKey: "pay-law:before",
    workRelationshipId: job,
    periodStartsAt: baselineStart,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    reasonKind: null,
    note: "Actual baseline pay",
    provenance,
  });
  const beforeId = world.history.resourceTransferOutcomes.at(-1)!.id;
  for (const official of [forId, againstId])
    world = recordRelationshipInteraction(world, {
      stableKey: `pay-law:known:${official}`,
      personIds: [worker, official],
      occurredAt: world.currentDate,
      kind: "contact:conversation",
      change: "formed",
      significance: "meaningful",
      summary: "The worker knows this legislator.",
      tags: [],
      eventId: null,
    });
  const pack = legislatureForState(state.jurisdictionKey)!;
  expect(pack, state.name).not.toBeNull();
  world = introduceMeasure(world, {
    stableKey: "pay-law:measure",
    jurisdictionId: small.stateJurisdictionId,
    rulePackId: pack.packId,
    designation: "HB Pay",
    shortTitle: "Recorded wage raise",
    summary: "An authored numeric minimum-wage bill",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: forId,
  });
  const measure = world.history.legislativeMeasures!.at(-1)!.id;
  world = fileRuleChangeProvision(world, {
    stableKey: "pay-law:floor",
    measureId: measure,
    officeKey: laborLawOfficeKey(state.usps),
    field: "labor.minimumWage.hourlyCents",
    value: 3000,
  });
  const votePlan: Record<string, { yea: number; nay: number }> = {};
  const bodies = pack.chambers.map((chamber) => {
    const seats = requireFormalSeatCount(chamber);
    const seated = seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      seats,
      [{ personId: forId, name: "Recorded supporter" }],
      false,
    );
    const members = seated.members.map((row, index) =>
      index === seats - 1 ? { ...row, personId: againstId } : row,
    );
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers,
        nay: 0,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: seats - 1,
        nay: 1,
      };
    return { ...seated, members };
  });
  const context: LegislativeProcedureContext = {
    pack,
    measureId: measure,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed",
    governorRationale:
      "The controlled fixture governor signs the enacted wage bill.",
  };
  world = {
    ...world,
    control: {
      kind: "person",
      personId: currentGovernorOf(world, state.usps)!.personId,
    },
  };
  world = enactThroughDesk(world, measure, {
    context,
    effectiveAt: addDays(world.currentDate, 1),
  });
  const enacted = world;
  world = move(world, 14);
  world = raiseTownPayToMinimum(world, null);
  const raised = resourceFlowTermsAt(world, flow)!;
  expect(raised.amount.minorUnits).toBe(120_000);
  const promised = world;
  expect(
    noticeLawPayChanges(promised, baselineStart).history.lawExposures ?? [],
  ).toHaveLength(0);
  const start = raised.effectiveAt;
  if (world.currentDate < addDays(start, 6))
    world = move(world, daysBetween(world.currentDate, addDays(start, 6)));
  world = resolveWorkCompensationPeriod(world, {
    stableKey: "pay-law:after",
    workRelationshipId: job,
    periodStartsAt: start,
    periodEndsAt: addDays(start, 6),
    occurredAt: world.currentDate,
    status: "completed",
    reasonKind: null,
    note: "Actual pay after enacted wage floor",
    provenance,
  });
  return {
    world,
    promised,
    enacted,
    worker,
    forId,
    againstId,
    measure,
    beforeId,
    since: baselineStart,
  };
}

describe(`law-paid change and recorded voters in ${state.name} (seed ${SEED})`, () => {
  it("the actual wage raise reaches the worker once, then forms views of the recorded voters", () => {
    expect(states).toHaveLength(56);
    const f = fixture();
    const changes = recordedLawPayChanges(f.world, f.since);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.amount.minorUnits).toBe(80_000);
    expect(changes[0]!.previousOutcomeId).toBe(f.beforeId);
    const reached = noticeLawPayChanges(f.world, f.since);
    const exposure = reached.history.lawExposures!.find(
      (row) => row.personId === f.worker && row.relation === "own",
    )!;
    expect(exposure.sourceRecordId).toBe(changes[0]!.sourceRecordId);
    expect(exposure.amount?.minorUnits).toBe(80_000);
    const outcome = livedOutcomesOf(reached, f.worker).find(
      (row) => row.kind === "pay-changed-by-law",
    )!;
    expect(outcome.sourceRecordId).toBe(exposure.sourceRecordId);
    expect(outcome.lawExposureId).toBe(exposure.id);
    expect(officialsBehind(reached, f.measure)).toEqual(
      expect.arrayContaining([
        { officialId: f.forId, act: "voted-for", executive: false },
        { officialId: f.againstId, act: "voted-against", executive: false },
      ]),
    );
    const after = move(reached, 4);
    for (const [official, side] of [
      [f.forId, "support"],
      [f.againstId, "opposition"],
    ] as const) {
      const belief = viewOfOfficial(after, f.worker, official).belief;
      expect(belief).not.toBeNull();
      const trace = after.history.decisionTraces.find(
        (row) => row.id === belief!.formation.decisionTraceIds[0],
      )!;
      expect(
        trace.context.considerations.some(
          (row) =>
            row.stableKey === `factor:law-exposure:${exposure.id}` &&
            row.optionKey === side,
        ),
      ).toBe(true);
    }
    expect(noticeLawPayChanges(after, f.since)).toBe(after);
    const saved = deserializeWorld(serializeWorld(after));
    expect(livedOutcomesOf(saved, f.worker)).toEqual(
      livedOutcomesOf(after, f.worker),
    );
    assertWorldIntegrityFully(saved);
    const due = saved.history.futureDueItems.find(
      (row) => row.stableKey === officialViewReflectionKey(exposure),
    )!;
    expect(
      saved.history.futureDueItemStates
        .filter((row) => row.dueItemId === due.id)
        .at(-1)?.status,
    ).toBe("resolved");
    expect(move(saved, 1).history.privateBeliefs).toEqual(
      saved.history.privateBeliefs,
    );
  });
  it("requires a completed comparable baseline and an enacted attribution", () => {
    const f = fixture();
    const changes = recordedLawPayChanges(f.world, f.since);
    expect(changes).toHaveLength(1);
    const withoutBaseline = {
      ...f.world,
      history: {
        ...f.world.history,
        resourceTransferOutcomes:
          f.world.history.resourceTransferOutcomes.filter(
            (row) => row.id !== f.beforeId,
          ),
      },
    };
    expect(recordedLawPayChanges(withoutBaseline, f.since)).toEqual([]);
    const partial = {
      ...f.world,
      history: {
        ...f.world.history,
        resourceTransferOutcomes: f.world.history.resourceTransferOutcomes.map(
          (row) =>
            row.id === changes[0]!.sourceRecordId
              ? { ...row, transferredAmount: money(90_000, "USD") }
              : row,
        ),
      },
    };
    expect(recordedLawPayChanges(partial, f.since)).toEqual([]);
    const noEnactment = {
      ...f.world,
      history: { ...f.world.history, legislativeEnactments: [] },
    };
    expect(recordedLawPayChanges(noEnactment, f.since)).toEqual([]);
  });
  it.todo(
    "a statutory-tax raise or cut has an actual saved before/after amount and source attribution before it becomes a pay factor",
  );
});
