import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../src/bench/world";
import { billTitleOf } from "../../src/english/bill-names";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  billOf,
  draftBill,
  holdVote,
  votesOn,
} from "../../src/core2/modules/legislature";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
import { coreAPI } from "../../src/core2/state";
import type { GroundedEnglishPacket } from "../../src/english/grounded-english";
import { drawPlace } from "../core2-year/place";
import { composeBodyScene } from "./body-bank";

// A town body's table worded from the records of a bill the played world
// votes on: the motion is the bill's own title, the counts are its recorded
// votes and the result is its recorded status, each cited by record id. A
// random place from all 56.
const seed = process.env.BODY_WORLD_SEED ?? randomBytes(8).toString("hex");

describe(`a vote worded from a played world's records (seed ${seed})`, () => {
  it("names the bill, the recorded counts and the result, citing the bill's record", () => {
    // A state can rule a provision out for its places (the bill is blocked and
    // never voted on), so draw on from the seed until a place lets the bill be voted.
    let found:
      | {
          where: string;
          core: ReturnType<typeof buildBenchWorld>["core"];
          api: ReturnType<typeof coreAPI>;
          bill: ReturnType<typeof billOf>;
        }
      | undefined;
    for (let draw = 0; draw < 12 && !found; draw += 1) {
      const place = drawPlace(seed, `body-bank-world:${draw}`);
      const where = `${place.name}, ${place.state} (${place.key}), draw ${draw}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core } = world;
      const api = coreAPI(core);
      const body = (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .rows() as unknown as {
          id: string;
          kind: string;
          coversTown: boolean;
        }[]
      ).find(
        (o) =>
          o.coversTown &&
          /^(council|county-board|township-board)$/.test(o.kind),
      );
      if (!body) continue;
      const drafted = draftBill(api, {
        bodyOfficeId: body.id,
        sponsorId: world.playerId!,
        provisions: [{ kind: "budget-line", line: "parks", value: 50_000_000 }],
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      holdVote(api, drafted.id);
      const bill = billOf(api, drafted.id);
      if (bill.status !== "blocked" && votesOn(api, bill.id).length)
        found = { where, core, api, bill };
    }
    expect(
      found,
      `no place in 12 draws let a bill be voted (seed ${seed})`,
    ).toBeTruthy();
    const { where, core, api, bill } = found!;
    const votes = votesOn(api, bill.id);
    const title = billTitleOf(bill)?.title;
    expect(["passed", "failed", "enacted"], where).toContain(bill.status);
    expect(votes.length, where).toBeGreaterThan(0);
    const ayes = votes.filter((row) => row.vote === "yes").length;
    const nays = votes.filter((row) => row.vote === "no").length;
    const carried = bill.status !== "failed";
    const fact = (text: string) => ({
      text,
      sourceRecordIds: [bill.id],
    });
    const facts = {
      ...(title ? { motion: fact(title) } : {}),
      ayes: fact(String(ayes)),
      nays: fact(String(nays)),
      [carried ? "carried" : "failed"]: fact("yes"),
    };
    const packet = {
      surface: "dialogue",
      momentKey: bill.id,
      worldSeed: core.seed,
      bankVersion: "words-body-v1",
      stage: "adult",
      sourceRecordIds: [bill.id],
      facts,
      speaker: { personId: "chair", traits: {} },
      knowledge: Object.entries(facts).map(([factKey, row]) => ({
        personId: "chair",
        factKey,
        sourceRecordIds: row.sourceRecordIds,
      })),
    } as unknown as GroundedEnglishPacket;
    const lines = composeBodyScene(packet, "vote", { includeHeld: true });
    if (!title) {
      // No title on record: the chair cannot put the question, so nothing is worded.
      expect(lines, where).toBeNull();
      return;
    }
    expect(lines, where).not.toBeNull();
    const text = lines!.map((line) => line.text).join(" ");
    expect(text, where).toContain(title);
    // The result is worded with the recorded counts or without them, never with others.
    const counts = /The ayes are (\d+) and the nays are (\d+)\./.exec(text);
    if (counts)
      expect([counts[1], counts[2]], where).toEqual([
        String(ayes),
        String(nays),
      ]);
    expect(text, where).toContain(carried ? "carries" : "fails");
    for (const line of lines!)
      expect(line.sourceRecordIds, where).toContain(bill.id);
  }, 600_000);
});
