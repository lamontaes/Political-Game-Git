import { describe, expect, it } from "vitest";
import { daysBetween } from "../dates";
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import { stableHash } from "../ids";
import {
  enrollMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  referMeasure,
  requireMeasure,
  takeFloorVote,
} from "../legislation";
import {
  bodyForChamber,
  committeeMembers,
  createLegislativeScenario,
  dispositionsFromCounts,
  legislativeBlueprint,
} from "../legislation-scenarios";
import { lifePlaceStateIdentities } from "../life-places";
import { ensureStateExecutiveIncumbent } from "../nationwide-world/state-executives";
import { personName } from "../people";
import { deserializeWorld, serializeWorld } from "../serialization";
import { advanceWorld } from "../world";
import {
  governorDesk,
  governorOfficeForJurisdiction,
  governingMatters,
} from "./state-governing";

/** Actual recorded procedure with supplied votes; no executive is seated. */
function presentedWithoutGovernor() {
  const scenario = createLegislativeScenario("nebraska");
  const chamber = scenario.pack.chambers[0]!;
  const body = bodyForChamber(scenario, chamber.chamberKey);
  const committee = chamber.committees[0]!;
  const provenance = {
    method: "authored-fixture" as const,
    note: "Supplied votes isolate a bill presented to a vacant executive office.",
    sourceEntityIds: [scenario.world.id],
  };
  let world = referMeasure(scenario.world, {
    stableKey: "vacant-desk:referral",
    measureId: scenario.measureId,
    committeeKey: committee.committeeKey,
  });
  world = recordCommitteeDisposition(world, {
    stableKey: "vacant-desk:committee",
    measureId: scenario.measureId,
    recommendation: "favorable",
    dispositions: dispositionsFromCounts(
      committeeMembers(body, committee.appointedMembers),
      { yea: committee.appointedMembers },
    ),
    rationale: "Supplied committee approval for the vacant-desk test.",
    provenance,
  });
  world = placeMeasureOnCalendar(world, {
    stableKey: "vacant-desk:calendar",
    measureId: scenario.measureId,
  });
  for (const stage of chamber.floorStages) {
    const earliest = measurePosition(
      world,
      scenario.measureId,
    ).earliestNextFloorDate;
    if (earliest && earliest > world.currentDate)
      world = advanceWorld(
        world,
        daysBetween(world.currentDate, earliest),
        createFutureTransitionHandlerRegistry([]),
      );
    world = takeFloorVote(world, {
      stableKey: `vacant-desk:${stage.stageKey}`,
      measureId: scenario.measureId,
      dispositions: dispositionsFromCounts(body.members, {
        yea: body.members.length,
      }),
      presentMembers: body.members.length,
      electedMembers: body.members.length,
      provenance,
    });
  }
  world = enrollMeasure(world, {
    stableKey: "vacant-desk:enroll",
    measureId: scenario.measureId,
  });
  world = presentMeasureToExecutive(world, {
    stableKey: "vacant-desk:present",
    measureId: scenario.measureId,
  });
  return { world, measure: requireMeasure(world, scenario.measureId) };
}

describe("a vacant governor desk cannot supply a decision", () => {
  const fixture = presentedWithoutGovernor();
  it.each(["signed", "vetoed"] as const)(
    "does not turn the authored %s ending into an executive action",
    (governorAction) => {
      const blueprint = { ...legislativeBlueprint("nebraska"), governorAction };
      expect(
        governorOfficeForJurisdiction(
          fixture.world,
          blueprint.pack.jurisdictionKey,
        ),
      ).toBeNull();
      expect(measurePosition(fixture.world, fixture.measure.id).phase).toBe(
        "awaiting-executive",
      );
      const next = governorDesk(fixture.world, fixture.measure, blueprint);
      console.info(
        "vacant-desk receipt",
        JSON.stringify({
          worldId: fixture.world.id,
          measureId: fixture.measure.id,
          personId: fixture.world.personOrder[0],
          authoredAction: governorAction,
          date: next.currentDate,
          phase: measurePosition(next, fixture.measure.id).phase,
          dispositions: next.history.executiveDispositions,
        }),
      );
      expect(next === fixture.world).toBe(true);
      expect(next.history.executiveDispositions).toEqual(
        fixture.world.history.executiveDispositions,
      );
      expect(next.history.futureDueItems).toEqual(
        fixture.world.history.futureDueItems,
      );
      expect(governorDesk(next, fixture.measure, blueprint)).toBe(next);
      const restored = deserializeWorld(serializeWorld(next));
      expect(
        governorDesk(
          restored,
          requireMeasure(restored, fixture.measure.id),
          blueprint,
        ),
      ).toBe(restored);
      expect(measurePosition(restored, fixture.measure.id).phase).toBe(
        "awaiting-executive",
      );
    },
  );
  it("finds no actual governor in an unseated world for all 56 jurisdiction keys", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    for (const place of places)
      expect(
        governorOfficeForJurisdiction(fixture.world, place.jurisdictionKey),
      ).toBeNull();
  });
  it("keeps the seated governor's bound matter identical for either authored ending", () => {
    const seated = ensureStateExecutiveIncumbent(
      fixture.world,
      fixture.world.personOrder[0]!,
      "NE",
    );
    const blueprint = legislativeBlueprint("nebraska");
    const office = governorOfficeForJurisdiction(
      seated,
      blueprint.pack.jurisdictionKey,
    )!;
    expect(office).not.toBeNull();
    const signedEnding = governorDesk(seated, fixture.measure, {
      ...blueprint,
      governorAction: "signed",
    });
    const vetoedEnding = governorDesk(seated, fixture.measure, {
      ...blueprint,
      governorAction: "vetoed",
    });
    expect(serializeWorld(signedEnding)).toBe(serializeWorld(vetoedEnding));
    const matter = governingMatters(signedEnding, office.officeKey).find(
      (entry) => entry.measureId === fixture.measure.id,
    )!;
    expect(matter.holderPersonId).toBe(office.holderPersonId);
    expect(matter.status).toBe("open");
    console.info(
      "seated-desk receipt",
      JSON.stringify({
        holderPersonId: office.holderPersonId,
        holderName: personName(seated.people[office.holderPersonId]!),
        matterId: matter.id,
        worldHash: stableHash(serializeWorld(signedEnding)),
      }),
    );
    expect(signedEnding.history.executiveDispositions).toEqual(
      seated.history.executiveDispositions,
    );
    expect(governorDesk(signedEnding, fixture.measure, blueprint)).toBe(
      signedEnding,
    );
    const restored = deserializeWorld(serializeWorld(signedEnding));
    expect(
      governorDesk(
        restored,
        requireMeasure(restored, fixture.measure.id),
        blueprint,
      ),
    ).toBe(restored);
  });
});
