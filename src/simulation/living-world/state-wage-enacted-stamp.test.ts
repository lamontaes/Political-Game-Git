import { describe, expect, it } from "vitest";
import { omahaWithRaiseBills } from "../../../tests/nationwide/omaha-minimum-wage-bills";
import { addDays, simulationMomentOnLocalDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { STATE_MINIMUM_WAGE_QUESTION_KEY } from "../minimum-wage";
import { serializeWorld, deserializeWorld } from "../serialization";
import { raiseTownPayToMinimum, TOWN_PAY_VERSION } from "./town-pay";
import { enterLifePath } from "../life-paths2";
import { recordWorkRole } from "../life";
import { lifePlaceByKey } from "../life-places";
import { createResourceFlow, money } from "../resources";
import { cancelFutureDueItem } from "../future-transitions";

// Uses the existing full legislative procedure fixture, not injected law rows.
// The filed $20 floor is an authored test control, not a researched new rate.
describe("an enacted state floor retains attribution in a valid saved world", () => {
  it("keeps the actual Nebraska law on revised town compensation after reopening", () => {
    const { world: enacted, opened } = omahaWithRaiseBills([
      {
        key: "stamp-lb-20",
        designation: "LB 20, 2026",
        answer: "yes",
        effectiveInDays: 45,
        cents: 2000,
      },
    ]);
    let employed = enterLifePath(enacted, "shop-assistant").world;
    const work = employed.history.workRelationships.at(-1)!;
    const role = employed.history.workRoles.at(-1)!;
    const town = lifePlaceByKey("3137000")!.context.jurisdiction.id;
    const provenance = {
      kind: "authored" as const,
      note: "Controlled prior-pay fixture, not an empirical wage.",
    };
    employed = recordWorkRole(employed, {
      stableKey: "fixture:enacted-floor-role",
      workRelationshipId: work.id,
      effectiveAt: employed.currentDate,
      title: role.title,
      occupationClassification: role.occupationClassification,
      locationJurisdictionId: town,
      timeDemand: role.timeDemand,
      provenance,
      supersedesRoleId: role.id,
    });
    employed = createResourceFlow(employed, {
      stableKey: `${TOWN_PAY_VERSION}:job-pay:enacted-fixture:${work.id}`,
      source: { kind: "organization", organizationId: work.organizationId! },
      recipient: { kind: "person", personId: work.personId },
      startsAt: employed.currentDate,
      amount: money(100, "USD"),
      cadenceKind: "schedule:town-weekly",
      basisKind: "compensation:work",
      basisReference: { kind: "work", workRelationshipId: work.id },
      restrictionKind: null,
      jurisdictionId: town,
      provenance,
    });
    const date = addDays(opened, 65);
    // This fixture sets a later legal context, rather than running 65 days.
    // Preserve earlier queue entries and record their cancellation through the
    // canonical writer; do not erase history or defer integrity checks.
    for (const due of employed.history.futureDueItems) {
      const status = employed.history.futureDueItemStates
        .filter((row) => row.dueItemId === due.id)
        .at(-1)?.status;
      if (status !== "scheduled" || due.dueAt >= date) continue;
      employed = cancelFutureDueItem(employed, {
        stableKey: `fixture:law-context:${due.id}`,
        dueItemId: due.id,
        effectiveAt: employed.currentDate,
        reasonKey: "fixture:later-law-context",
        context:
          "Controlled later-date attribution context; no ordinary calendar run claimed.",
      });
    }
    const world = {
      ...employed,
      currentDate: date,
      currentMoment: simulationMomentOnLocalDate(employed.currentMoment, date),
    };
    const raised = raiseTownPayToMinimum(world, null);
    const state = stateJurisdictionForKey("US-NE")!.id;
    const measure = raised.history.legislativeMeasures!.find(
      (row) => row.stableKey === "raise:stamp-lb-20:measure",
    )!;
    const rows = raised.history.resourceFlowTerms.filter((row) =>
      row.lawEffectStamps?.some(
        (stamp) =>
          stamp.governingLawKey === measure.id &&
          stamp.questionKey === STATE_MINIMUM_WAGE_QUESTION_KEY &&
          stamp.jurisdictionId === state,
      ),
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const stamp = row.lawEffectStamps!.find(
        (item) => item.governingLawKey === measure.id,
      )!;
      expect(stamp.effectKind).toBe("minimum-wage-compensation");
      expect(stamp.sourceRecordIds).toContain(row.resourceFlowId);
      expect(stamp.sourceRecordIds!.length).toBeGreaterThanOrEqual(3);
      expect(row.amount.minorUnits).toBeGreaterThan(0);
    }
    const reopened = deserializeWorld(serializeWorld(raised));
    for (const row of rows)
      expect(
        reopened.history.resourceFlowTerms.find((item) => item.id === row.id),
      ).toEqual(row);
    expect(reopened.history.legislativeEnactments).toEqual(
      raised.history.legislativeEnactments,
    );
  }, 120_000);
});
