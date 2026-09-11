import { expect, it } from "vitest";
import {
  createLegislativeScenario,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import { fileDraft } from "./legislation-docket";
import {
  selectedDocketKey,
  selectDocketBill,
} from "./legislation-docket-selection";

it("saves explicit working-bill selection without changing either bill and reads without writes", () => {
  const scenario = createLegislativeScenario("kentucky");
  const input = {
    scenarioKey: "kentucky",
    playerPersonId: scenario.playerPersonId,
    jurisdictionId:
      scenario.world.history.legislativeMeasures![0]!.jurisdictionId,
    familyKey: "transit-access",
    variantKey: "enrollment-fare-relief",
  };
  const first = fileDraft(scenario.world, input);
  const second = fileDraft(first.world, {
    ...input,
    familyKey: "broadband-access",
    variantKey: "adoption-support",
  });
  const world = selectDocketBill(
    second.world,
    input.scenarioKey,
    input.playerPersonId,
    first.bill.docketKey,
  );
  expect(world.history.legislativeMeasures).toEqual(
    second.world.history.legislativeMeasures,
  );
  expect(world.history.legislativeProvisions).toEqual(
    second.world.history.legislativeProvisions,
  );
  const saved = serializeWorld(world);
  const loaded = deserializeWorld(saved);
  expect(
    selectedDocketKey(loaded, input.scenarioKey, input.playerPersonId),
  ).toBe(first.bill.docketKey);
  expect(
    selectDocketBill(
      loaded,
      input.scenarioKey,
      input.playerPersonId,
      first.bill.docketKey,
    ),
  ).toBe(loaded);
  expect(serializeWorld(loaded)).toBe(saved);
  expect(() =>
    selectDocketBill(
      loaded,
      input.scenarioKey,
      input.playerPersonId,
      "missing",
    ),
  ).toThrow();
  expect(serializeWorld(loaded)).toBe(saved);
});
