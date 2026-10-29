/**
 * A campaign day for the player: a handful of choices read from the records,
 * each run through the campaign engine's own act (owner ruling, Oct 14), in a
 * random place drawn from all 56.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import type { CoreState } from "./types";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openRecord } from "./modules/record";
import {
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  doorsKnockedOf,
  donorReason,
  giftOf,
  openCampaigns,
  reachablePeople,
} from "./modules/campaigns";
import { campaignParameter } from "./campaign-views";
import { openParties } from "./modules/parties";
import { openPress } from "./modules/press";
import { viewsModule } from "./modules/views";
import { campaignDayChoices, takeCampaignDayChoice } from "./campaign-day";
import { addDays, makeIsoDate } from "./kernel/dates";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`campaign-day:${Date.now()}`).digest("hex");

function setup() {
  const place = drawPlace(runSeed, "campaign-day");
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    }),
    { modules: [viewsModule] },
  );
  openLaws(core);
  openOffices(core, place.seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openRecord(core);
  openPress(core);
  const api = coreAPI(core);
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
  // The player is the wealthiest adult old enough to file for something.
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  let filing: FilingRow | null = null;
  for (const candidate of adults.slice(0, 5)) {
    core.playerId = candidate.id;
    for (const contest of openContests(api)) {
      const filed = fileCandidacy(api, {
        personId: candidate.id,
        contestId: contest.id,
        platform: [],
      });
      if (
        filed.status !== "refused" &&
        ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
      ) {
        filing = filed.filing;
        break;
      }
    }
    if (filing) break;
  }
  return { core: core as CoreState, api, filing, where };
}

describe("a campaign day", () => {
  it("offers a handful of record-read choices and runs them through the engine", () => {
    const { core, api, filing, where } = setup();
    expect(
      filing,
      `the player could file for nothing: ${where}`,
    ).not.toBeNull();
    const id = filing!.id;

    const choices = campaignDayChoices(api, id);
    expect(
      choices.map((c) => c.kind),
      where,
    ).toEqual(["canvass", "event", "interview", "raise-money", "rest"]);
    const by = (kind: string) => choices.find((c) => c.kind === kind)!;
    expect(by("rest").available, where).toBe(true);
    expect(by("canvass").available, `doors left: ${where}`).toBe(true);

    // An event needs the venue's price in the campaign's account.
    const event = by("event");
    if (event.kind !== "event") throw new Error("event first");
    expect(event.facts.cashMinor, where).toBe(0);
    expect(event.available, `event without money: ${where}`).toBe(false);
    expect(() => takeCampaignDayChoice(api, id, "event"), where).toThrow();

    // Canvass: doors knocked and people reached.
    const canvass = by("canvass");
    if (canvass.kind !== "canvass") throw new Error("canvass first");
    const result = takeCampaignDayChoice(api, id, "canvass");
    expect(result.doorsKnocked, `doors knocked: ${where}`).toBeGreaterThan(0);
    expect(doorsKnockedOf(api, id).length, where).toBe(result.doorsKnocked);
    expect(campaignFor(api, id).doorsKnockedCount, where).toBe(
      result.doorsKnocked,
    );
    expect(result.causeIds.length, `people reached: ${where}`).toBeGreaterThan(
      0,
    );
    const after = campaignDayChoices(api, id).find(
      (c) => c.kind === "canvass",
    )!;
    if (after.kind !== "canvass") throw new Error("canvass first");
    expect(after.facts.doorsKnocked, where).toBe(result.doorsKnocked);
    expect(after.facts.doorsLeft, where).toBeLessThan(canvass.facts.doorsLeft);

    // Raise money: gifts land on the journal through the engine.
    const raised: string[] = [];
    let total = 0;
    for (let session = 0; session < 6; session += 1) {
      const ask = campaignDayChoices(api, id).find(
        (c) => c.kind === "raise-money",
      )!;
      if (!ask.available) break;
      const got = takeCampaignDayChoice(api, id, "raise-money");
      raised.push(...got.giftIds);
      total += got.raisedMinor;
      // More people meet the candidate; they become reachable.
      if (total > 0) break;
      if (canvassLeft(api, id)) takeCampaignDayChoice(api, id, "canvass");
    }
    // A reachable adult who has money beyond their cushion of living costs
    // can give; where nobody does, the asks rightly raise nothing and the
    // rest of this day (which needs the committee's cash) has nothing to run.
    const cushion = campaignParameter("caseCushionMonths") * 30;
    const canGive = reachablePeople(api, campaignFor(api, id)).filter((pid) => {
      const p = core.people.get(pid);
      return (
        !!p?.alive &&
        p.tier !== "husk" &&
        Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 18 &&
        p.liquidMinor - cushion * p.livingCostDailyMinor > 0 &&
        // Giving is the donor's own choice: only someone whose reasons for
        // this candidate are above zero would give.
        donorReason(api, id, pid) > 0
      );
    });
    if (!canGive.length) {
      expect(
        total,
        `nobody reachable has money beyond their cushion: ${where}`,
      ).toBe(0);
      return;
    }
    expect(
      total,
      `money raised from reachable people (${canGive.length} could give): ${where}`,
    ).toBeGreaterThan(0);
    const campaign = campaignFor(api, id);
    expect(campaign.raisedMinor, where).toBe(total);
    for (const giftId of raised) {
      const donor = giftId.split("|")[1]!;
      expect(giftOf(api, id, donor)?.totalMinor ?? 0, where).toBeGreaterThan(0);
    }
    // Each gift is a journal source record, and the committee's cash holds it.
    const donations = (
      api.moduleState(CAMPAIGNS_MODULE_ID).table("money").rows() as unknown as {
        kind: string;
      }[]
    ).filter((r) => r.kind === "campaigns:donation");
    expect(donations.length, `donations on the journal: ${where}`).toBe(
      raised.length,
    );
    expect(
      core.organizations.get(campaign.organizationId)?.liquidMinor,
      where,
    ).toBe(total);

    // With the venue paid for, the event is offered and runs.
    const cash =
      core.organizations.get(campaign.organizationId)?.liquidMinor ?? 0;
    const eventNow = campaignDayChoices(api, id).find(
      (c) => c.kind === "event",
    )!;
    if (eventNow.kind !== "event") throw new Error("event first");
    expect(eventNow.facts.cashMinor, where).toBe(cash);
    if (eventNow.available) {
      const held = takeCampaignDayChoice(api, id, "event");
      expect(held.eventMoneyId, where).not.toBeNull();
      expect(campaignFor(api, id).spentMinor, where).toBe(
        eventNow.facts.venuePriceMinor,
      );
    }

    // Rest is always there and writes nothing.
    const rest = takeCampaignDayChoice(api, id, "rest");
    expect(rest.causeIds.length + rest.giftIds.length, where).toBe(0);
  });

  it("goes round again once every door in town is knocked, and every knock counts", () => {
    const { api, filing, where } = setup();
    expect(
      filing,
      `the player could file for nothing: ${where}`,
    ).not.toBeNull();
    const id = filing!.id;
    const canvass = () => {
      const choice = campaignDayChoices(api, id).find(
        (c) => c.kind === "canvass",
      )!;
      if (choice.kind !== "canvass") throw new Error("canvass first");
      return choice;
    };
    // The first pass: every household in town, a shift at a time.
    for (let shift = 0; canvass().facts.doorsLeft > 0; shift += 1) {
      expect(shift, `the first pass ends: ${where}`).toBeLessThan(10_000);
      takeCampaignDayChoice(api, id, "canvass");
    }
    const households = doorsKnockedOf(api, id).length;
    const before = campaignFor(api, id).doorsKnockedCount ?? 0;
    // The last shift of the first pass may already start the second.
    expect(before, where).toBeGreaterThanOrEqual(households);
    // With every door knocked the canvass is still offered, and the next
    // shift knocks again, the doors knocked longest ago first.
    expect(canvass().available, `canvass after every door: ${where}`).toBe(
      true,
    );
    const again = takeCampaignDayChoice(api, id, "canvass");
    expect(again.doorsKnocked, `second-pass doors: ${where}`).toBeGreaterThan(
      0,
    );
    expect(campaignFor(api, id).doorsKnockedCount, where).toBe(
      before + again.doorsKnocked,
    );
    expect(canvass().facts.doorsKnocked, where).toBe(
      before + again.doorsKnocked,
    );
    // Still one row a household, and its knocks add up to the count.
    const rows = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("doors")
      .query("byCampaign", [id]) as unknown as { knocks?: number }[];
    expect(rows.length, where).toBe(households);
    expect(
      rows.reduce((sum, row) => sum + (row.knocks ?? 1), 0),
      where,
    ).toBe(before + again.doorsKnocked);
    expect(
      rows.some((row) => (row.knocks ?? 1) > 1),
      where,
    ).toBe(true);
  });

  it("reaches someone every week it knocks, filing to election day, at the field contact rate", () => {
    const { core, api, filing, where } = setup();
    expect(
      filing,
      `the player could file for nothing: ${where}`,
    ).not.toBeNull();
    const id = filing!.id;
    let weeks = 0;
    let knocked = 0;
    let reached = 0;
    // A shift a week up to a year, until the election closes the campaign:
    // the oldest households first, then round again, a week apart.
    while (
      weeks < 52 &&
      campaignDayChoices(api, id).some(
        (c) => c.kind === "canvass" && c.available,
      )
    ) {
      const shift = takeCampaignDayChoice(api, id, "canvass");
      expect(
        shift.doorsKnocked,
        `week ${weeks} doors: ${where}`,
      ).toBeGreaterThan(0);
      // A street of reluctant homes still opens a few doors.
      expect(
        shift.causeIds.length,
        `week ${weeks} reached: ${where}`,
      ).toBeGreaterThan(0);
      knocked += shift.doorsKnocked;
      reached += shift.causeIds.length;
      weeks += 1;
      core.date = addDays(makeIsoDate(core.date), 7);
    }
    expect(weeks, `weeks of knocking: ${where}`).toBeGreaterThan(20);
    // The field contact rate, a quarter to a third of doors (Green and
    // Gerber 2019; Arceneaux 2005), with room for a small town's ages.
    expect(reached / knocked, `contact rate: ${where}`).toBeGreaterThanOrEqual(
      0.15,
    );
    expect(reached / knocked, `contact rate: ${where}`).toBeLessThan(0.45);
  });

  it("offers an interview where an outlet has room, and the press desk records it", () => {
    const { api, filing, where } = setup();
    if (!filing) return;
    const interview = campaignDayChoices(api, filing.id).find(
      (c) => c.kind === "interview",
    )!;
    if (interview.kind !== "interview") throw new Error("interview first");
    if (!interview.available) {
      expect(interview.facts.outlets, where).toHaveLength(0);
      return;
    }
    const got = takeCampaignDayChoice(api, filing.id, "interview");
    expect(got.interview?.filingId, where).toBe(filing.id);
  });
});

function canvassLeft(api: ReturnType<typeof coreAPI>, id: string): boolean {
  return !!campaignDayChoices(api, id).find((c) => c.kind === "canvass")
    ?.available;
}
