/**
 * A world campaign's doors meet unwatched full people as hearer groups
 * (owner's level of detail, Nov 9; CTO, Nov 9 4:40 p.m.), in a random place.
 *
 * Each member of a group met in an evening takes the group's reading of the
 * platform and visit, so on a first knock the group's result times the
 * members met equals the sum of the members' own warmth reads; the player's
 * circle is met as themselves.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { campaignParameter, PLATFORM_QUESTIONS } from "./campaign-data";
import { hearerGroupOf, hearsAsPerson } from "./hearer-groups";
import { advanceCore, createLifeCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";
import { impressionOf, knockDoors, openCampaigns } from "./modules/campaigns";
import {
  fileCandidacy,
  openContests,
  openElections,
  petitionCirculating,
  petitionOf,
  type FilingRow,
} from "./modules/elections";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openParties } from "./modules/parties";
import { openVoting } from "./modules/voting";
import { viewsModule } from "./modules/views";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`door-groups:${Date.now()}`).digest("hex");

function filedRace(placeKey: string) {
  const core = createLifeCore(
    buildPopulation({ seed, placeKey, startedAt: START, minimumPeople: 300 }),
    { modules: [viewsModule] },
  );
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  const api = coreAPI(core);
  const adults = [...core.people.values()]
    .filter(
      (p) => Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  const platform = PLATFORM_QUESTIONS.slice(0, 3).map((q) => `${q}=1`);
  for (const open of openContests(api).filter((c) => c.level !== "federal")) {
    const result = fileCandidacy(api, {
      personId: adults[0]!.id,
      contestId: open.id,
      platform,
    });
    if (result.status === "refused") continue;
    if (["petitioning", "on-ballot"].includes(result.filing.status ?? ""))
      return { core, api, contest: open, filing: result.filing, adults };
  }
  return undefined;
}

describe("a world campaign's doors meet unwatched people as hearer groups", () => {
  it("gives every member met in an evening the group's reading, so the group's result times its count is the sum of its members' reads", () => {
    let world: ReturnType<typeof filedRace>;
    let name = "";
    for (let n = 0; n < 8 && !world; n++) {
      const place = drawPlace(`${seed}:${n}`, "door-groups");
      name = `${place.name} (key ${place.key})`;
      world = filedRace(place.key);
    }
    expect(world, `no race a resident could file for`).toBeDefined();
    const { core, api, contest, filing, adults } = world!;
    console.log(`door groups: playing ${name}, seed ${seed}`);
    openVoting(core);
    // The player is someone else in town; their circle is watched.
    core.playerId = adults.at(-1)!.id;
    const petitions = [filing as FilingRow]
      .filter((f) => petitionCirculating(api, f.id))
      .map((f) => petitionOf(api, f.id)!.due);
    if (petitions.length)
      advanceCore(core, addDays(makeIsoDate(petitions[0]!), 1));
    expect(core.date < contest.electionDate).toBe(true);
    const met = knockDoors(api, {
      filingId: filing.id,
      canvasserId: filing.personId,
      hours: 12,
      fillCounted: false,
    });
    const weight = campaignParameter("doorContactWeight");
    const byGroup = new Map<string, typeof met>();
    for (const cause of met) {
      if (hearsAsPerson(api, cause.voterId)) continue;
      const group = hearerGroupOf(api, cause.voterId)!;
      byGroup.set(group, [...(byGroup.get(group) ?? []), cause]);
    }
    const shared = [...byGroup.values()].filter((c) => c.length > 1);
    expect(
      shared.length,
      `${name} (seed ${seed}): no group met twice in ${met.length} doors`,
    ).toBeGreaterThan(0);
    for (const causes of shared) {
      const first = causes[0]!;
      // Every member read the platform and the visit as the group did.
      for (const cause of causes) {
        expect(cause.agreement).toBe(first.agreement);
        expect(cause.rapport).toBe(first.rapport);
        expect(cause.weight).toBe(weight);
      }
      // A first knock: each started cold, so the group's result times its
      // count is the sum of its members' own reads.
      const fresh = causes.filter((c) => c.warmthBefore === 0);
      const groupShift = first.warmthBefore === 0 ? first.warmthAfter : null;
      if (groupShift === null || fresh.length < 2) continue;
      const sum = fresh.reduce(
        (n, c) =>
          n + (impressionOf(api, c.voterId, filing.personId)?.warmth ?? 0),
        0,
      );
      expect(sum).toBeCloseTo(groupShift * fresh.length, 9);
    }
  });
});
