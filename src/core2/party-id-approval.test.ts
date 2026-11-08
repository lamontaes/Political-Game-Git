/**
 * Party identification follows the country's mood (Nation, Nov 8): when the
 * country's approval of the president is low, the people the town's party
 * meeting ties choose the president's party less and the other party more
 * than when it is high, while the share who identify with a party stays the
 * sourced 2024 share. The mood is entered by hand (an edge case: a large
 * push on the opinion table) in two worlds of the same place and seed; the
 * reader is the monthly party meeting. Played in a place drawn from all 56
 * on a seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { presidentSide } from "./electorate-inputs";
import { pushOpinion, latestApproval } from "./modules/national-opinion";
import { PARTIES_MODULE_ID, partiesHere, type TieRow } from "./modules/parties";
import { coreAPI } from "./state";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");

function play(points: number) {
  const place = drawPlace(seed, "party-id");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  pushOpinion(api, {
    points,
    halfLifeMonths: 240,
    kind: "test-mood",
    sourceId: `party-id:${points}`,
  });
  let day = makeIsoDate(world.core.date);
  const end = addDays(day, 75);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(world.core, day);
  }
  const parties = partiesHere(api);
  const president = presidentSide(api);
  const ties = api
    .moduleState(PARTIES_MODULE_ID)
    .table("ties")
    .rows() as unknown as TieRow[];
  const onSide = (side: number) =>
    ties.filter(
      (t) =>
        t.tie === "party" &&
        parties.find((p) => p.id === t.partyId)?.side === side,
    ).length;
  return {
    place,
    president,
    approval: latestApproval(api)!,
    withPresidentsParty: onSide(president),
    withOtherParty: onSide(-president),
    identifiers: ties.filter((t) => t.tie === "party").length,
  };
}

it("a low approval leaves fewer people with the president's party than a high one", () => {
  const low = play(-25);
  const high = play(25);
  const where = `${low.place.name}, seed ${seed}`;
  expect(low.president, where).not.toBe(0);
  expect(low.approval.pct, where).toBeLessThan(high.approval.pct);
  expect(low.withPresidentsParty, `${where}: ${low.approval.id}`).toBeLessThan(
    high.withPresidentsParty,
  );
  expect(low.withOtherParty).toBeGreaterThan(high.withOtherParty);
  process.stdout.write(
    `nation proof: party id: ${where}; approval ${low.approval.pct.toFixed(1)} against ${high.approval.pct.toFixed(1)} (${low.approval.id}); with the president's party ${low.withPresidentsParty} against ${high.withPresidentsParty}\n`,
  );
}, 1800000);
