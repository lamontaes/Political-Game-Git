import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { jointAddress } from "../core2/office-day-federal-calendar";
import { ADDRESS_FACT } from "./opening-facts";
import { ADDRESS_KINDS } from "./address-kind";
import { OPENING_ADDRESS_EVENT } from "./opening-story";

// The President's address to Congress comes each year, on the day the federal
// calendar sets it (owner, Nov 8: "In a ten-year run no two addresses read
// alike"). One world drawn from all 56 places on a seed the builder did not
// choose is played to the first year's joint address; the address is recorded
// as the public event the opening is, with its text, kind and the President.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);
const place = drawPlace(`${seed}:0`, "yearly-address");
const where = `${place.name} (${place.key}), seed ${seed}:0`;
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core } = world;
const date = jointAddress(Number(core.date.slice(0, 4))).date;

describe("the President's address each year", () => {
  it("is recorded on the day the calendar sets it, as a public record the news carries", () => {
    expect(core.eventIds.has(`${OPENING_ADDRESS_EVENT}:${date}`), where).toBe(
      false,
    );
    advanceCore(core, date);
    const id = `${OPENING_ADDRESS_EVENT}:${date}`;
    expect(core.eventIds.has(id), where).toBe(true);
    const event = core.durableLog.get(id)!;
    expect(event.publicRecord, where).toBe(true);
    expect(event.news, where).toBe(true);
    expect(event.witnessIds, where).toContain(world.playerId);
    const facts = event.facts!;
    expect(facts[ADDRESS_FACT.kind], where).toBe("state-of-the-union");
    expect(String(facts[ADDRESS_FACT.text]).length, where).toBeGreaterThan(400);
    process.stdout.write(
      `YEARLY ADDRESS ${where}, ${date}\n  ${String(facts[ADDRESS_FACT.text])}\n`,
    );
    // The kind it took is on the record, for the scenes, news and journal that read it.
    expect(ADDRESS_KINDS, where).toContain(facts[ADDRESS_FACT.style]);
  });
});
