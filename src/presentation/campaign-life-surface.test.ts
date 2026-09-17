import { describe, expect, it } from "vitest";

import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  commitCampaignWeek,
  homePartyChapters,
  projectCampaignWeek,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { attendPartyWork, requestPartyWork } from "./campaign-life-actions";
import {
  dollars,
  parseDollars,
  projectCampaignWeekPanel,
  projectOpponentActivityPanel,
  projectPartyAndCommunityWork,
  readableDatesIn,
} from "./campaign-life-surface";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";

function adultLife(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      placeKey: "kentucky",
    }),
  ).game!;
  return {
    world: game.world,
    personId: game.playerPersonId,
    chapterId: homePartyChapters(game.world)[0]!.organizationId,
  };
}

const METER_WORDS = /chance of winning|probability|win odds|\d+\s*\/\s*\d+/i;

function allText(value: unknown): string {
  return JSON.stringify(value);
}

describe("campaign life display strings", () => {
  it("writes money and dates the way a person reads them", () => {
    expect(dollars({ minorUnits: 123_450, currency: "USD" as never })).toBe(
      "$1,234.50",
    );
    expect(dollars({ minorUnits: 0, currency: "USD" as never })).toBe("$0.00");
    expect(parseDollars("50")).toBe(5_000);
    expect(parseDollars("$1,250.5")).toBe(125_050);
    expect(parseDollars("0")).toBeNull();
    expect(parseDollars("-4")).toBeNull();
    expect(parseDollars("ten")).toBeNull();
    expect(readableDatesIn("dated 2026-02-02.")).toBe(
      "dated February 2, 2026.",
    );
  });
});

describe(
  "CRUNCH46 party work, week and opponent panels",
  { timeout: 900_000 },
  () => {
    const life = adultLife("life-surface-a");
    const player: EntityId = life.personId;

    it("lists party work with readable times, travel, and what can be asked for", () => {
      const empty = projectPartyAndCommunityWork(life.world, player);
      expect(empty.rows).toEqual([]);
      const forms = empty.requestable
        .filter((option) => option.hostOrganizationId === life.chapterId)
        .map((option) => option.form);
      expect(forms).toEqual([
        "organization-meeting",
        "door-canvass",
        "phone-shift",
        "candidate-guidance",
        "town-hall",
      ]);
      // Campaign-only forms wait for a campaign.
      expect(forms).not.toContain("fundraiser");

      const before = serializeWorld(life.world);
      const requested = requestPartyWork(
        life.world,
        player,
        "candidate-guidance",
        life.chapterId,
      );
      expect(serializeWorld(life.world)).toBe(before);
      const view = projectPartyAndCommunityWork(requested, player);
      const row = view.rows[0]!;
      expect(row.state).toBe("accepted");
      expect(row.actions).toEqual(["attend", "attend-condensed"]);
      expect(row.when).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}, 6:30 PM$/);
      expect(row.travelNote).toMatch(/20-minute local journey/);
      expect(row.travelNote).toMatch(/no fare will be charged/);
      expect(row.hostName.length).toBeGreaterThan(0);
      // The same request is not offered twice while it is on the calendar.
      expect(
        view.requestable.some(
          (option) =>
            option.form === "candidate-guidance" &&
            option.hostOrganizationId === life.chapterId,
        ),
      ).toBe(false);

      const done = attendPartyWork(
        requested,
        player,
        row.lifeActivityId,
        "condensed",
      );
      const after = projectPartyAndCommunityWork(done, player).rows[0]!;
      expect(after.state).toBe("completed");
      expect(after.actions).toEqual([]);
      expect(after.outcomeLines[0]).toMatch(
        /went over what is known about running for office here/,
      );
      expect(after.outcomeLines.join(" ")).toMatch(/You met /);
      expect(after.outcomeLines.join(" ")).toMatch(/less of the evening shown/);
      expect(after.guidanceFacts.join(" ")).toMatch(
        /not established by this game's sourced rules/,
      );
      expect(allText(after)).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
      expect(allText(after)).not.toMatch(METER_WORDS);
    });

    it("the week panel plans without staff, in dollars, and never shows odds", () => {
      expect(projectCampaignWeekPanel(life.world, player)).toBeNull();
      const filed: World = fileForOffice(life.world, player);
      const panel = projectCampaignWeekPanel(filed, player)!;
      expect(panel.attribution).toBe("Planning without campaign staff.");
      expect(panel.proposal).toBeNull();
      expect(panel.treasuryLabel).toBe("Your committee has $0.00.");
      expect(panel.cards.map((card) => card.emphasis)).toEqual([
        "field",
        "relationships",
      ]);
      expect(panel.cards.every((card) => !card.proposed)).toBe(true);
      expect(panel.channels.every((channel) => !channel.affordable)).toBe(true);
      expect(panel.channels[0]!.limitLabel).toBe(
        "Up to 3 buys a week; the smallest buy is $50.00.",
      );
      expect(panel.reachNote).toMatch(/is not modeled/);
      expect(allText(panel.cards)).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
      expect(allText(panel)).not.toMatch(/USD \d/);
      expect(allText(panel)).not.toMatch(METER_WORDS);

      // Party work now offers the campaign-only forms at the chapter.
      expect(
        projectPartyAndCommunityWork(filed, player)
          .requestable.filter((o) => o.hostOrganizationId === life.chapterId)
          .map((o) => o.form),
      ).toContain("support-request");

      const week = projectCampaignWeek(filed, player)!;
      const refused = commitCampaignWeek(filed, player, {
        campaignId: week.campaignId,
        weekStart: week.weekStart,
        proposerPersonId: null,
        revision: week.revision,
        emphasis: "field",
        allocation: {
          fieldShifts: 0,
          fundraisingSessions: 0,
          advertisingBuys: 1,
        },
        advertising: {
          channel: "digital",
          geographyKey: week.geographyChoices[0]!.key,
          amount: { minorUnits: 5_000, currency: week.treasury.currency },
        },
      });
      const refusal = projectCampaignWeekPanel(refused, player)!.refusal!;
      expect(refusal.explanation).toMatch(/did not have enough money/);
      expect(refusal.moneyNote).toMatch(
        /had \$0\.00; that money was not touched/,
      );

      const again = projectCampaignWeek(refused, player)!;
      const committed = commitCampaignWeek(refused, player, {
        campaignId: again.campaignId,
        weekStart: again.weekStart,
        proposerPersonId: null,
        revision: again.revision,
        emphasis: "field",
        allocation: {
          fieldShifts: 1,
          fundraisingSessions: 1,
          advertisingBuys: 0,
        },
        advertising: null,
      });
      const plan = projectCampaignWeekPanel(committed, player)!;
      expect(plan.refusal).toBeNull();
      expect(plan.committed!.summary).toBe(
        "You committed to a field week: 1 field shift, 1 call session and 0 advertising buys.",
      );
      expect(plan.committed!.sessions).toHaveLength(2);
      expect(plan.committed!.sessions.filter((s) => s.canDo)).toHaveLength(1);
      expect(plan.committed!.sessions.every((s) => s.canLetGo)).toBe(true);
      expect(plan.committed!.anyLeft).toBe(true);
    });

    it("opponent rows appear only once the player has heard of them", () => {
      let world: World = fileForOffice(life.world, player);
      expect(projectOpponentActivityPanel(world, player)).toEqual([]);
      for (let day = 0; day < 15; day += 1) {
        world = passOrdinaryDays(world, 1);
        if (projectOpponentActivityPanel(world, player).length > 0) break;
      }
      const rows = projectOpponentActivityPanel(world, player);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.opponentName.length).toBeGreaterThan(0);
        expect(row.dateLabel).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
        expect(row.summary).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
      }
      expect(allText(rows)).not.toMatch(/emphasis|treasury|minorUnits/);
    });
  },
);
