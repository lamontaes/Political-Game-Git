/**
 * A vote or a signature is public record at the government it happened in
 * (gov-president-not-newsworthy), in a random place from all 56: the town as
 * the player gets it (buildBenchWorld, two-level, every module), run for
 * five months. Every roll call and every signature or veto carries the level
 * of the body the bill was before, so the press files a governor's act as a
 * state story and a president's as a national one, which a national outlet's
 * beat reads. Seed and place from GOLDEN_PATH_SEED (random when unset).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { lawChain } from "./modules/laws";
import { wireItem } from "./press-topics";
import { LEGISLATURE_MODULE_ID, type BillRow } from "./modules/legislature";
import { outletsHere, storiesPrinted } from "./modules/press";
import type { CoreEventInput } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

describe("a vote or signature is filed at its own government's level", () => {
  it("roll calls and signatures carry the level of the bill's body, and the wire reads it", () => {
    setBookkeeping(false);
    const place = drawPlace(seed, "vote-level");
    const where = `place ${place.key}, seed ${seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const seen: CoreEventInput[] = [];
    const emit = api.emit.bind(api);
    api.emit = (event: CoreEventInput) => {
      if (
        event.kind === "legislative-vote" ||
        event.kind === "executive-action"
      )
        seen.push(event);
      return emit(event);
    };
    advanceCore(core, addDays(makeIsoDate(core.date), 150));
    expect(seen.length, where).toBeGreaterThan(0);
    const bills = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
    const chain = lawChain(api);
    const town = { placeId: chain.townPlaceId, stateKey: chain.stateKey };
    for (const event of seen) {
      const level = event.facts?.level;
      expect(["federal", "state", "county", "city"], where).toContain(level);
      const bill = bills.get(event.facts!.billId!) as unknown as BillRow;
      if (bill.bodyOfficeId.startsWith("federal:"))
        expect(level, `${where}: ${event.id}`).toBe("federal");
      // The wire files it where it happened: a state's act is a state
      // story, Congress's and the president's a national one.
      const item = wireItem(api, event, town);
      const filed = {
        federal: "nation",
        state: "state",
        county: "county",
        city: "town",
      }[level as string];
      expect(item?.level, `${where}: ${event.id}`).toBe(filed);
    }
  });

  it("a chamber organizing and a committee hearing are filed at their own government's level", () => {
    setBookkeeping(false);
    const place = drawPlace(seed, "hearing-level");
    const where = `place ${place.key}, seed ${seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const kinds = new Set([
      "chamber-organized",
      "committee-hearing",
      "public-comment",
      "bill-amendment",
    ]);
    const seen: CoreEventInput[] = [];
    const emit = api.emit.bind(api);
    api.emit = (event: CoreEventInput) => {
      if (kinds.has(event.kind)) seen.push(event);
      return emit(event);
    };
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    expect(seen.length, where).toBeGreaterThan(0);
    const bills = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
    const chain = lawChain(api);
    const town = { placeId: chain.townPlaceId, stateKey: chain.stateKey };
    const federal = new Set<string>();
    for (const event of seen) {
      const level = event.facts?.level;
      expect(
        ["federal", "state", "county", "city"],
        `${where}: ${event.id}`,
      ).toContain(level);
      const billId = event.facts?.billId;
      if (billId) {
        const bill = bills.get(billId) as unknown as BillRow;
        if (bill.bodyOfficeId.startsWith("federal:"))
          expect(level, `${where}: ${event.id}`).toBe("federal");
      } else if (event.id.startsWith("chamber-organized:federal:"))
        expect(level, `${where}: ${event.id}`).toBe("federal");
      if (level === "federal") {
        federal.add(event.id);
        expect(wireItem(api, event, town)?.level, `${where}: ${event.id}`).toBe(
          "nation",
        );
      }
    }
    // A chamber organized before the test's hook was set is Congress's too.
    const isFederal = (id: string) =>
      federal.has(id) || id.startsWith("chamber-organized:federal:");
    // No town outlet printed Congress's business as the town's.
    for (const outlet of outletsHere(api))
      for (const story of storiesPrinted(api, outlet.id))
        if (outlet.tier !== "national")
          expect(isFederal(story.wireId), `${where}: ${story.wireId}`).toBe(
            false,
          );
    // Where a national outlet exists, it prints one of them by record id.
    const national = outletsHere(api).filter((o) => o.tier === "national");
    if (national.length && federal.size)
      expect(
        national
          .flatMap((o) => storiesPrinted(api, o.id))
          .some((story) => isFederal(story.wireId)),
        where,
      ).toBe(true);
  }, 600000);
});
