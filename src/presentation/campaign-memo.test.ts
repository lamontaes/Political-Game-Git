import { describe, expect, it } from "vitest";
import { namedSeatForFixture } from "../../tests/fixtures/campaign-fixture";

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
    world: fileForOffice(
      world,
      personId,
      namedSeatForFixture(world, personId, office.officeKey),
      office.officeKey,
    ),
    personId,
  };
}

/** The signed move a change line states, or 0 when it states none. */
function statedMove(change: string | null): number {
  const match = change?.match(/^(Up|Down) (\d+) points? since/);
  if (!match) return 0;
  return (match[1] === "Up" ? 1 : -1) * Number(match[2]);
}

/** The whole number a memo prints ("somewhere around 63 percent"). */
function printed(summary: string): number {
  return Number(summary.match(/around (\d+) percent/)![1]);
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
  it.each([
    ["Seattle", "memo-move-seattle", "5363000"],
    ["Houston", "memo-move-houston", "4835000"],
  ])(
    "measures a condensed %s week against the count the player last saw",
    (_city, seed, placeKey) => {
      const filed = filedLife(seed, placeKey);
      const personId = filed.personId;
      let world = spendAnAfternoon(filed.world, personId, "fundraising");
      let shown = projectCampaign(world, personId).reading!;
      let falls = 0;
      let stated = 0;
      for (let week = 0; week < 12; week += 1) {
        world = condensedWeek(passOrdinaryDays(world, 7), personId);
        const reading = projectCampaign(world, personId).reading!;
        // A condensed week takes several counts, some on one day; the screen
        // shows the last, and says how far it is from the one on the screen
        // before the week, in the whole points both memos print.
        expect(reading.on > shown.on).toBe(true);
        const moved = printed(reading.summary) - printed(shown.summary);
        expect(statedMove(reading.change)).toBe(moved);
        if (moved === 0) {
          expect(reading.change).toBeNull();
        } else {
          stated += 1;
          // Dated with the earlier count's own day, never the memo's.
          expect(
            reading.change!.endsWith(
              ` since the count on ${proseDate(shown.on)}.`,
            ),
          ).toBe(true);
          expect(reading.change).not.toContain(proseDate(reading.on));
        }
        if (moved < 0) {
          falls += 1;
          expect(reading.change).toMatch(/^Down /);
        }
        shown = reading;
      }
      // A series with no fall in it would not test the sign.
      expect(falls).toBeGreaterThan(0);
      expect(stated).toBeGreaterThan(0);
    },
    120_000,
  );
});

describe("several counts in one day", () => {
  it("never dates a Houston move with the memo's own day", () => {
    const filed = filedLife("memo-same-day-houston", "4835000");
    const personId = filed.personId;
    let world = filed.world;
    // Afternoon after afternoon on the filing day: each takes a count.
    for (let session = 0; session < 3; session += 1) {
      world = spendAnAfternoon(world, personId, "outreach");
      const reading = projectCampaign(world, personId).reading!;
      expect(reading.on).toBe(world.currentDate);
      // Nothing was counted on an earlier day, so there is no move to state.
      expect(reading.change).toBeNull();
    }
    const lastOfDay = projectCampaign(world, personId).reading!;

    world = passOrdinaryDays(world, 1);
    world = spendAnAfternoon(world, personId, "outreach");
    world = spendAnAfternoon(world, personId, "outreach");
    const next = projectCampaign(world, personId).reading!;
    expect(next.on > lastOfDay.on).toBe(true);
    const moved = printed(next.summary) - printed(lastOfDay.summary);
    expect(statedMove(next.change)).toBe(moved);
    if (moved !== 0) {
      expect(
        next.change!.endsWith(
          ` since the count on ${proseDate(lastOfDay.on)}.`,
        ),
      ).toBe(true);
    }
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
