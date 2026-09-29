import { describe, expect, it } from "vitest";

import { passOrdinaryDays } from "../../src/presentation/ordinary-life";
import { addDays } from "../../src/simulation/dates";
import {
  enterLifePath,
  performLifePathSession,
  scheduleLifePathSession,
} from "../../src/simulation/life-paths2";
import { minimumHourlyAt } from "../../src/simulation/minimum-wage";
import { rentAndPayLawLines } from "../../src/presentation/law-exposure-lines";
import { projectWorld39Journal } from "../../src/presentation/world39-journal";
import type { World } from "../../src/simulation";

import { omahaWithRaiseBills } from "./omaha-minimum-wage-bills";

function shiftPays(world: World): number[] {
  return world.history.resourceTransferOutcomes
    .filter((outcome) =>
      outcome.note?.startsWith("Payment for the completed shift"),
    )
    .map((outcome) => outcome.transferredAmount.minorUnits);
}

function workShifts(start: World, count: number): World {
  let world = start;
  const workId = world.history.workRelationships.at(-1)!.id;
  for (let shift = 0; shift < count; shift += 1) {
    const scheduled = scheduleLifePathSession(world, workId);
    expect(scheduled.ok, scheduled.message).toBe(true);
    const activityId = scheduled.world.history.scheduledActivities.at(-1)!.id;
    const worked = performLifePathSession(scheduled.world, activityId);
    expect(worked.ok, worked.message).toBe(true);
    world = passOrdinaryDays(worked.world, 1);
  }
  return world;
}

describe(
  "a minimum wage law raises the pay of the player's own shifts",
  { timeout: 600_000 },
  () => {
    it("Omaha: a state law that sets the wage above the shop shift's $18.00 an hour raises what a shift pays, and names the law", () => {
      const { world: enacted, opened } = omahaWithRaiseBills([
        {
          key: "lb-900",
          designation: "LB 900, 2026",
          answer: "yes",
          cents: 2_000,
          effectiveInDays: 45,
        },
      ]);
      const entered = enterLifePath(enacted, "shop-assistant");
      expect(entered.ok, entered.message).toBe(true);
      const person =
        entered.world.people[
          entered.world.history.workRelationships.at(-1)!.personId
        ]!;
      const effectiveAt = addDays(opened, 45);
      // Before the law takes effect the shift pays its own $72.00.
      expect(entered.world.currentDate < effectiveAt).toBe(true);
      const before = workShifts(entered.world, 2);
      expect(shiftPays(before)).toEqual([7_200, 7_200]);
      // After it, a four-hour shift pays four hours at $20.00.
      const later = passOrdinaryDays(before, 50);
      expect(
        minimumHourlyAt(later, person.homeJurisdictionId, later.currentDate),
      ).toBe(20);
      const after = workShifts(later, 2);
      const pays = shiftPays(after);
      // Every shift before the law is $72.00, every one after is $80.00, and
      // there are shifts on both sides of it.
      expect(pays.slice(0, 2)).toEqual([7_200, 7_200]);
      expect(new Set(pays)).toEqual(new Set([7_200, 8_000]));
      expect(pays.slice(-3)).toEqual([8_000, 8_000, 8_000]);
      expect(pays).toEqual([...pays].sort((a, b) => a - b));
      const workId = entered.world.history.workRelationships.at(-1)!.id;
      const shiftFlow = after.history.resourceFlows.find(
        (flow) =>
          flow.basisReference.kind === "work" &&
          flow.basisReference.workRelationshipId === workId,
      );
      const raises = after.history.resourceFlowTerms.filter(
        (terms) =>
          terms.resourceFlowId === shiftFlow!.id &&
          terms.stableKey.includes(":minimum-wage:"),
      );
      expect(raises).toHaveLength(1);
      expect(raises[0]!.reason).toBe(
        "LB 900, 2026 raised the state minimum wage to $20.00 an hour.",
      );
      // The player reads the raise in their own Journal, naming the law.
      const line = rentAndPayLawLines(after, person.id).find((row) =>
        row.text.startsWith("Your pay rose from $72 to $80 a shift on "),
      );
      expect(line?.text).toMatch(
        /^Your pay rose from \$72 to \$80 a shift on .+\. LB 900, 2026 raised the state minimum wage to \$20\.00 an hour\.$/,
      );
      expect(
        projectWorld39Journal(after, person.id).entries.map((row) => row.text),
      ).toContain(line!.text);
      console.info(
        "Omaha player shifts: $72.00 before LB 900, $80.00 after; the law's floor was $20.00 an hour.",
      );
    });
  },
);
