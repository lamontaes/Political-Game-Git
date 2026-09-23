/*
 * A territory life saved before territories had a Governor is caught up the
 * first time it moves forward.
 */
import { describe, expect, it } from "vitest";

import { residentIn } from "../../tests/fixtures/state-executive-entry";
import {
  currentStateExecutiveHolders,
  deserializeWorld,
  serializeWorld,
  stateExecutiveOffice,
} from "../simulation";
import { catchUpTerritoryGovernor } from "../simulation/nationwide-world/territory-governor-catch-up";
import type { World } from "../simulation";
import { passOrdinaryDays } from "./ordinary-life";
import { projectGovernmentBrowser } from "./politics-government";

/** A played resident with no chief executive seated: the pre-#599 shape. */
function legacyTerritoryLife(usps: string, seed: string) {
  const { world, personId } = residentIn(usps, seed);
  const played: World = {
    ...world,
    control: { kind: "person", personId },
  } as World;
  expect(
    currentStateExecutiveHolders(played).filter((h) => h.stateUsps === usps),
  ).toEqual([]);
  return { world: played, personId };
}

const reload = (world: World) => deserializeWorld(serializeWorld(world));

describe("a territory life saved before territories had a Governor", () => {
  it.each([
    ["GU", "Governor of Guam"],
    ["PR", "Governor of Puerto Rico"],
    ["AS", "Governor of American Samoa"],
  ])(
    "%s: seats the territory's Governor the first time the save moves forward",
    (usps, title) => {
      const { world, personId } = legacyTerritoryLife(
        usps,
        `territory-catch-up-${usps}`,
      );
      const moved = passOrdinaryDays(reload(world), 1);
      const holders = currentStateExecutiveHolders(moved).filter(
        (holder) => holder.stateUsps === usps,
      );
      expect(holders).toHaveLength(1);
      expect(holders[0]!.title).toBe(title);
      expect(holders[0]!.personId).not.toBe(personId);
      // Nothing earlier is written: the term is the one in progress, and no
      // past holder appears.
      expect(holders[0]!.startedAt! <= moved.currentDate).toBe(true);
      // The government screen now names the office holder.
      const executive = projectGovernmentBrowser(moved, personId, {
        scope: "state",
      }).branches.find((branch) => branch.branch === "executive")!;
      expect(executive.entries[0]!.holderName).toBe(holders[0]!.personName);

      // Caught up once and not again, after a save and reload.
      const again = reload(moved);
      expect(serializeWorld(catchUpTerritoryGovernor(again))).toBe(
        serializeWorld(again),
      );
    },
  );

  it("leaves a state life alone", () => {
    const { world } = legacyTerritoryLife("NV", "territory-catch-up-nv");
    expect(catchUpTerritoryGovernor(world)).toBe(world);
    expect(stateExecutiveOffice("NV")).not.toBeNull();
  });
});
