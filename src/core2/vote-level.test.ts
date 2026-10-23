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
      expect(
        ["federal", "state", "county", "township", "city"],
        where,
      ).toContain(level);
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
        // A township board governs the town's own township: a local story.
        township: "town",
        city: "town",
      }[level as string];
      expect(item?.level, `${where}: ${event.id}`).toBe(filed);
    }
    const township = seen.find((event) => event.facts?.level === "township");
    process.stdout.write(
      `VOTE LEVEL ${where}: ${seen.length} votes and signatures${township ? `; a township board's ${township.id} filed as ${wireItem(api, township, town)?.level}` : ""}\n`,
    );
    // Five played months took 62 to 74 seconds alone on a 4-core container.
  }, 600000);

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
    const records: CoreEventInput[] = [];
    const emit = api.emit.bind(api);
    api.emit = (event: CoreEventInput) => {
      if (kinds.has(event.kind)) seen.push(event);
      if (event.publicRecord) records.push(event);
      return emit(event);
    };
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    expect(seen.length, where).toBeGreaterThan(0);
    const bills = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
    const committees = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("committees");
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
      // A hearing is wired as what its bill changes, and its story names the
      // committee whose record it is: the members on its roll call.
      if (event.kind === "committee-hearing" && billId) {
        const bill = bills.get(billId) as unknown as BillRow;
        const first = bill?.provisions[0];
        const topic = first
          ? (first.question ??
            (first.line ? `budget-line:${first.line}` : first.series))
          : undefined;
        const item = wireItem(api, event, town);
        expect(item?.topic, `${where}: ${event.id}`).toBe(topic ?? event.kind);
        const record = committees.get(event.id) as unknown as {
          memberIds?: readonly string[];
        };
        for (const memberId of record?.memberIds ?? [])
          if (api.state.people.has(memberId))
            expect(item?.subjectIds, `${where}: ${event.id}`).toContain(
              memberId,
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
    // A national outlet prints the nation's business by record id: a story
    // whose wire item is a federal public record its desk read. The demand
    // cannot rest on the four tracked kinds alone: a hearing with no town
    // witness and an out-of-town committee carries no people and no renown,
    // and on reader care alone it cannot outscore a state law that reaches
    // the outlet's own readers (place 0815330, seed dc4ca028…, the week of
    // Feb 17 2025: the House medicaid-work-requirement hearing scored its
    // nation proximity times 1 plus care, while the state laws ahead of it
    // scored 1.54 to 1.67 on a people term of 4.0). A federal law taking
    // effect reaches those same readers, so a national desk prints the
    // nation's business in every world, and that is the read asserted here.
    const everything = new Map(records.map((event) => [event.id, event]));
    const national = outletsHere(api).filter((o) => o.tier === "national");
    if (national.length) {
      const printed = national.flatMap((o) => storiesPrinted(api, o.id));
      expect(printed.length, where).toBeGreaterThan(0);
      expect(
        printed.some((story) => {
          const event = everything.get(story.wireId);
          return !!event && wireItem(api, event, town)?.level === "nation";
        }),
        where,
      ).toBe(true);
    }
  }, 600000);
});
