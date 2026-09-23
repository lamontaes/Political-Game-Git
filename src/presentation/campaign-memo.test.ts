import { describe, expect, it } from "vitest";

import {
  candidacyPackForJurisdiction,
  projectCampaignWeek,
  requireLifePlace,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { commitWeek, runWeekCondensed } from "./campaign-life-actions";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "./campaign-projection";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { buildProductionWorld } from "./production-world";
import { proseDate } from "./prose-dates";

function filedLife(seed: string, placeKey: string) {
  const built = buildProductionWorld({
    seed,
    place: requireLifePlace(placeKey),
    age: 40,
    givenName: null,
    familyName: null,
    startingLife: "ordinary-life",
    household: "lives-alone",
    depth: "summarize-earlier-life",
  });
  const personId = built.playerPersonId;
  const world = openOrdinaryLife(built.world, personId);
  const office = candidacyPackForJurisdiction(
    world.people[personId]!.homeJurisdictionId,
  )!.offices[0]!;
  // Filed on the office's own calendar, as play files.
  return {
    world: fileForOffice(world, personId, null, office.officeKey),
    personId,
  };
}

/** The signed move a change line states, or 0 when it states none. */
function statedMove(change: string | null): number {
  const match = change?.match(/^(Up|Down) (\d+\.\d) points since/);
  if (!match) return 0;
  return (match[1] === "Up" ? 1 : -1) * Number(match[2]);
}

/** One week of field work planned and then done in one sitting. */
function condensedWeek(world: World, personId: EntityId): World {
  const view = projectCampaignWeek(world, personId)!;
  const committed = commitWeek(world, personId, {
    campaignId: view.campaignId,
    weekStart: view.weekStart,
    proposerPersonId: view.proposerPersonId,
    revision: view.revision,
    emphasis: "communications",
    allocation: { fieldShifts: 3, fundraisingSessions: 1, advertisingBuys: 0 },
    advertising: null,
  });
  const plan = projectCampaignWeek(committed, personId)!.committed!;
  return runWeekCondensed(committed, personId, plan.planId);
}

describe("the field memo's move, week to week", () => {
  it("measures a condensed week against the count the player last saw", () => {
    const filed = filedLife("memo-move-seattle", "5363000");
    const personId = filed.personId;
    let world = filed.world;
    world = spendAnAfternoon(world, personId, "fundraising");
    let shown = projectCampaign(world, personId).reading!;
    let falls = 0;
    for (let week = 0; week < 12; week += 1) {
      world = condensedWeek(passOrdinaryDays(world, 7), personId);
      const reading = projectCampaign(world, personId).reading!;
      // A condensed week takes several counts; the screen shows the last and
      // says how far it is from the one on the screen before the week.
      expect(reading.on).not.toBe(shown.on);
      const moved = Math.round((reading.percent - shown.percent) * 10) / 10;
      expect(statedMove(reading.change)).toBe(moved);
      if (moved !== 0) {
        expect(reading.change).toContain(
          `since the count on ${proseDate(shown.on)}.`,
        );
      }
      if (moved < 0) {
        falls += 1;
        expect(reading.change).toMatch(/^Down /);
      }
      shown = reading;
    }
    // A series with no fall in it would not test the sign.
    expect(falls).toBeGreaterThan(0);
  }, 120_000);
});

describe("the field memo's date", () => {
  it("says when a Detroit count was taken and that nobody has counted since", () => {
    const filed = filedLife("memo-date-detroit", "2622000");
    const personId = filed.personId;
    let world = filed.world;
    world = spendAnAfternoon(world, personId, "outreach");
    const fresh = projectCampaign(world, personId).reading!;
    expect(fresh.dated).toBe(`Counted today, ${proseDate(fresh.on)}.`);

    world = passOrdinaryDays(world, 1);
    expect(projectCampaign(world, personId).reading!.dated).toBe(
      `Counted yesterday, ${proseDate(fresh.on)}.`,
    );

    // Weeks with no campaign work take no new count.
    world = passOrdinaryDays(world, 19);
    const before = serializeWorld(world);
    const stale = projectCampaign(world, personId).reading!;
    expect(stale.on).toBe(fresh.on);
    expect(stale.summary).toBe(fresh.summary);
    expect(stale.dated).toBe(
      `Counted ${proseDate(fresh.on)}, 20 days ago. Nobody has counted since.`,
    );
    // Reading the memo writes nothing.
    expect(serializeWorld(world)).toBe(before);
  }, 120_000);
});
