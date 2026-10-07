import { expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { addDays } from "../dates";
import { createOrganization, createWorkRelationship } from "../life";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  scheduleFutureDueItem,
} from "../future-transitions";
import { currentLifeCutoff } from "../life-queries";
import { lifePlaceStateIdentities } from "../life-places";
import { initializeAllOfficeSalaryFlows } from "../office-salary";
import { resourceFlowTermsAt } from "../resource-queries";
import { createResourcePosition, money } from "../resources";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { advanceWorld } from "../world";
import {
  ensurePaydaySchedule,
  nextRecordedPaydayDate,
  nextPaydayDate,
  PAYDAY_TRANSITION_KEY,
} from "./town-pay";

const rng = new SeededRng("a5:saved-office-pay-calendar");
const pool = [...lifePlaceStateIdentities()];
const places = Array.from(
  { length: 2 },
  () => pool.splice(rng.integer(0, pool.length - 1), 1)[0]!.jurisdictionKey,
);

it.each(places)(
  "executes an off-calendar saved office week once through Save/Continue in %s",
  (place) => {
    const small = smallWorld({
      place,
      date: "2026-01-05",
      seed: `a5:office:${place}`,
    });
    let world = ensureNationalElectionJurisdiction(small.world);
    const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
    const provenance = {
      kind: "authored" as const,
      note: "Existing A37 controlled congressional-office pattern for the shared clock; not an actual appointment.",
    };
    world = createOrganization(world, {
      stableKey: `a5:office-employer:${place}`,
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: "Review congressional office",
        classification: "sector:government",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const organizationId = world.history.organizations.at(-1)!.id;
    world = createWorkRelationship(world, {
      stableKey: `a5:office-work:${place}`,
      personId: small.personId,
      organizationId,
      startedAt: world.currentDate,
      kind: "employment:congress-member",
      compensation: "paid",
      authority: "directs-others",
      dependency: "independent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Review member of Congress",
        occupationClassification: "service:us-congress",
        locationJurisdictionId: jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 35, maximumHours: 45 },
          attention: "high",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: jurisdictionId,
        },
      },
    });
    world = initializeAllOfficeSalaryFlows(world);
    const flow = world.history.resourceFlows.find((row) =>
      row.stableKey.startsWith("office-salary:"),
    )!;
    expect(flow).toBeDefined();
    const amount = resourceFlowTermsAt(world, flow.id)!.amount;
    world = createResourcePosition(world, {
      stableKey: `a5:funded-office:${flow.id}`,
      owner: flow.source,
      openedAt: world.currentDate,
      openingBalance: money(amount.minorUnits * 2, amount.currency),
      provenance: {
        kind: "authored",
        note: "Recorded fixture funding for two office weeks; not an inferred treasury.",
      },
    });
    world = ensurePaydaySchedule(world);
    world = advanceWorld(world, 4);
    const pendingOffice = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === PAYDAY_TRANSITION_KEY &&
        futureDueItemStateAt(world, item.id, currentLifeCutoff(world))
          ?.status === "scheduled",
    )!;
    world = cancelFutureDueItem(world, {
      stableKey: `a5:replace-calendar-control:${place}`,
      dueItemId: pendingOffice.id,
      effectiveAt: world.currentDate,
      reasonKey: "fixture:calendar-only-payday",
      context: null,
    });
    // A saved legacy calendar item must move forward to the earlier recorded office due.
    world = scheduleFutureDueItem(world, {
      stableKey: `town-pay-v2:payday:${world.currentDate}`,
      dueAt: nextPaydayDate(world.currentDate),
      transitionKey: PAYDAY_TRANSITION_KEY,
      entityIds: [world.id],
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: "Legacy calendar-only item to verify append-only office-due refresh.",
      },
    });
    const legacy = world.history.futureDueItems.at(-1)!;
    world = ensurePaydaySchedule(world);
    expect(
      futureDueItemStateAt(world, legacy.id, currentLifeCutoff(world))!.status,
    ).toBe("cancelled");
    expect(world.history.futureDueItems.at(-1)!.dueAt).toBe(
      addDays(flow.startsAt, 7),
    );
    const beforeDue = advanceWorld(world, 2);
    expect(nextRecordedPaydayDate(beforeDue)).toBe(addDays(flow.startsAt, 7));
    const outcomes = (value: typeof world) =>
      value.history.resourceTransferOutcomes.filter(
        (row) => row.resourceFlowId === flow.id,
      );
    expect(outcomes(beforeDue)).toHaveLength(0);
    const due = advanceWorld(beforeDue, 1);
    const continued = advanceWorld(
      deserializeWorld(serializeWorld(beforeDue)),
      1,
    );
    expect(outcomes(due)).toHaveLength(1);
    expect(outcomes(due)[0]!.occurredAt).toBe(addDays(flow.startsAt, 7));
    expect(outcomes(due)[0]!.status).toBe("completed");
    expect(serializeWorld(continued)).toBe(serializeWorld(due));
    expect(ensurePaydaySchedule(due)).toBe(due);
  },
);

it("replaces a cancelled same-day clock append-only without reusing its key", () => {
  let world = ensurePaydaySchedule(
    smallWorld({
      place: places[0]!,
      date: "2026-01-05",
      seed: "a5:cancelled-payday",
    }).world,
  );
  const prior = world.history.futureDueItems.find(
    (row) => row.transitionKey === PAYDAY_TRANSITION_KEY,
  )!;
  world = cancelFutureDueItem(world, {
    stableKey: "a5:cancel-payday",
    dueItemId: prior.id,
    effectiveAt: world.currentDate,
    reasonKey: "fixture:cancelled-payday",
    context: null,
  });
  const refreshed = ensurePaydaySchedule(world);
  const next = refreshed.history.futureDueItems
    .filter((row) => row.transitionKey === PAYDAY_TRANSITION_KEY)
    .at(-1)!;
  expect(next.stableKey).not.toBe(prior.stableKey);
  expect(next.dueAt).toBe(prior.dueAt);
  expect(
    futureDueItemStateAt(refreshed, prior.id, currentLifeCutoff(refreshed))!
      .status,
  ).toBe("cancelled");
  expect(
    futureDueItemStateAt(refreshed, next.id, currentLifeCutoff(refreshed))!
      .status,
  ).toBe("scheduled");
  expect(
    ensurePaydaySchedule(deserializeWorld(serializeWorld(refreshed))),
  ).toEqual(refreshed);
});
