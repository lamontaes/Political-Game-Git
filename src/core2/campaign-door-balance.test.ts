import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import {
  fileCandidacy,
  openContests,
  openElections,
} from "./modules/elections";
import { knockDoors, openCampaigns } from "./modules/campaigns";
import { personLean, personStance, PLATFORM_QUESTIONS } from "./campaign-views";
import { drawPlace } from "../../scripts/core2-year/place";

// Field experiments find door-to-door persuasion near zero on average
// (Kalla and Broockman 2018; rapportWeight cites it). A month of knocking by a
// resident of average sociability whose platform sits at the town's median
// voter leaves no more voters cooler than warmer beyond the spread two
// standard errors of that many contacts allow. A shy canvasser cools everyone
// by design (traits decide a meeting), so the canvasser is the one nearest the
// town's mean sociability.
const seed = process.env.DOOR_SEED ?? randomBytes(8).toString("hex");
const SOCIABILITY = "people-mind-v1:sociability";

describe(`door knocking warmth balance (seed ${seed})`, () => {
  it("cools no more voters than it warms, in three drawn places", () => {
    const checked: string[] = [];
    for (let i = 0; i < 12 && checked.length < 3; i += 1) {
      const place = drawPlace(`${seed}:${i}`, "door-balance");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const full = buildPopulation({
        seed: place.seed,
        placeKey: place.key,
        startedAt: "2026-01-05",
        minimumPeople: 400,
      });
      const adults = [...full.people].filter(
        (p) =>
          2026 - Number(p.birthDate.slice(0, 4)) >= 30 && p.tier !== "husk",
      );
      const mean =
        adults.reduce((n, p) => n + (p.traits[SOCIABILITY] ?? 0), 0) /
        Math.max(1, adults.length);
      const player = [...adults].sort(
        (a, b) =>
          Math.abs((a.traits[SOCIABILITY] ?? 0) - mean) -
            Math.abs((b.traits[SOCIABILITY] ?? 0) - mean) ||
          a.id.localeCompare(b.id),
      )[0]!;
      const core = createLifeCore(
        collapseToTwoLevels({ ...full, playerId: player.id }),
      );
      openLaws(core);
      openOffices(core, place.seed);
      openElections(core);
      openCampaigns(core);
      const api = coreAPI(core);
      const leans = [...core.people.values()]
        .map((p) => personLean(core.people, p, 0))
        .sort((a, b) => a - b);
      const median = leans[Math.floor(leans.length / 2)]!;
      const platform = PLATFORM_QUESTIONS.slice(0, 4).map(
        (q) => `${q}=${personStance(median, q).toFixed(2)}`,
      );
      let filing = null as ReturnType<typeof fileCandidacy> extends infer R
        ? R extends { filing: infer F }
          ? F | null
          : null
        : null;
      for (const contest of openContests(api)) {
        const r = fileCandidacy(api, {
          personId: player.id,
          contestId: contest.id,
          platform,
          party: null,
        });
        if (r.status === "refused") continue;
        filing = r.filing;
        break;
      }
      if (!filing) continue;
      const met = knockDoors(api, {
        filingId: filing.id,
        canvasserId: player.id,
        hours: 12,
      });
      if (met.length < 30) continue;
      const warmer = met.filter((c) => c.warmthAfter > c.warmthBefore).length;
      const cooler = met.filter((c) => c.warmthAfter < c.warmthBefore).length;
      expect(
        cooler,
        `${where}: ${cooler} cooler and ${warmer} warmer of ${met.length} reached by ${player.id}`,
      ).toBeLessThanOrEqual(warmer + 2 * Math.sqrt(met.length));
      checked.push(
        `${where}: ${warmer} warmer, ${cooler} cooler of ${met.length}`,
      );
    }
    expect(checked.length, "places with enough doors").toBe(3);
  }, 900_000);
});
