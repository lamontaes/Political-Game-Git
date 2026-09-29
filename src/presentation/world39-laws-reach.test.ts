import { describe, expect, it } from "vitest";

import { createLegislativeScenario } from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  availableMeasureSteps,
  measurePosition,
} from "../simulation/legislation";
import { fileDraft } from "./legislation-docket";
import { applyLegislativeStep } from "./legislation-session";
import { lawsReachingResident } from "./world39-news";
import { publishLegislativeTransition } from "./publish-legislative-transition";

/**
 * The news page lists the enacted laws that apply where a resident lives,
 * with what each did in the world, and none from another state.
 */

function enactFromDocket(
  scenarioKey: "nebraska" | "alaska",
  draft: {
    readonly familyKey: string;
    readonly variantKey: string;
    readonly authorityKey?: string;
    readonly selectedProvisionKeys?: readonly string[];
  },
): { readonly world: World; readonly measureId: EntityId } {
  const scenario = createLegislativeScenario(scenarioKey);
  const filed = fileDraft(scenario.world, {
    scenarioKey,
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
    // The same boundary the game runs after every player legislative action.
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep(context, world, step).world,
    );
  }
  return { world, measureId };
}

describe("laws that reach a resident", () => {
  it("lists a state's enacted law for its residents and not for another state's", () => {
    const nebraska = enactFromDocket("nebraska", {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    const alaska = enactFromDocket("alaska", {
      familyKey: "appropriations",
      variantKey: "single-programme",
      authorityKey: "standing:school-facilities",
    });
    const home = (world: World, measureId: EntityId) =>
      world.history.legislativeMeasures!.find((row) => row.id === measureId)!
        .jurisdictionId;
    const nebraskaHome = home(nebraska.world, nebraska.measureId);
    const alaskaHome = home(alaska.world, alaska.measureId);

    const reach = lawsReachingResident(nebraska.world, nebraskaHome);
    const found = reach.find((law) => law.measureId === nebraska.measureId);
    expect(found).toBeDefined();
    expect(found!.level).toBe("state");
    expect(found!.actsInWorld).toBe(true);
    expect(found!.sentences.join(" ")).toMatch(/made \$12,000,000 available/);

    // A resident of Alaska is not reached by Nebraska's law.
    expect(nebraskaHome).not.toBe(alaskaHome);
    expect(
      lawsReachingResident(nebraska.world, alaskaHome).some(
        (law) => law.measureId === nebraska.measureId,
      ),
    ).toBe(false);
    // With no home place recorded, only national law can reach a resident.
    expect(
      lawsReachingResident(nebraska.world, null).some(
        (law) => law.level !== "federal",
      ),
    ).toBe(false);
  });
});
