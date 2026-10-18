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

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`campaign-day:${Date.now()}`).digest("hex");

function setup(attempt = 0) {
  const place = drawPlace(
    attempt ? `${runSeed}:${attempt}` : runSeed,
    "campaign-day",
  );
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
      if (filed.status !== "refused" && filed.filing.status === "on-ballot") {
        filing = filed.filing;
        break;
      }
    }
    if (filing) break;
  }
  return { core: core as CoreState, api, filing, where };
}

/** The first drawn place where the player can file; fails by name, listing the places passed over, when none can. */
function setupFiled() {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const world = setup(attempt);
    if (world.filing) return { ...world, filing: world.filing };
    tried.push(world.where);
  }
  throw new Error(`no drawn place let the player file: ${tried.join("; ")}`);
}

describe("a campaign day", () => {
  it("offers a handful of record-read choices and runs them through the engine", () => {
    const { core, api, filing, where } = setupFiled();
    expect(
      filing,
      `the player could file for nothing: ${where}`,
    ).not.toBeNull();
    const id = filing.id;

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

  it("offers an interview where an outlet has room, and the press desk records it", () => {
    const { api, filing, where } = setupFiled();
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
