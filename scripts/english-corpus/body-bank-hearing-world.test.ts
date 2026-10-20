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
import { remarksOn, signUpToSpeak } from "../../src/core2/modules/meetings";
import { corePlaceByJurisdictionId } from "../../src/core2/place-lookup";
import { composeBudgetHearing } from "../../src/director/mined/body-bank";

// A town body's table worded from the records of a bill the played world
// votes on: the motion is the bill's own title, the counts are its recorded
// votes and the result is its recorded status, each cited by record id. A
// random place from all 56.
const seed = process.env.BODY_HEARING_SEED ?? randomBytes(8).toString("hex");

describe(`a budget hearing worded from a played world's records (seed ${seed})`, () => {
  it("calls the recorded public-comment speakers by name and words the recorded vote, citing each record", () => {
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
      const place = drawPlace(seed, `body-bank-hearing:${draw}`);
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
      // The player signs up to speak for the bill, so the hearing always has a recorded speaker; residents who stand up join them.
      signUpToSpeak(api, {
        billId: drafted.id,
        personId: world.playerId!,
        position: 1,
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      holdVote(api, drafted.id);
      const bill = billOf(api, drafted.id);
      if (
        bill.status !== "blocked" &&
        votesOn(api, bill.id).length &&
        remarksOn(api, bill.id).length
      )
        found = { where, core, api, bill };
    }
    expect(
      found,
      `no place in 12 draws had a voted bill with public comment (seed ${seed})`,
    ).toBeTruthy();
    const { where, core, api, bill } = found!;
    const votes = votesOn(api, bill.id);
    const title = billTitleOf(bill)?.title;
    const ayes = votes.filter((row) => row.vote === "yes").length;
    const nays = votes.filter((row) => row.vote === "no").length;
    const carried = bill.status !== "failed";
    const fact = (text: string) => ({ text, sourceRecordIds: [bill.id] });
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
    const remarks = remarksOn(api, bill.id).slice(0, 3);
    const speakers = remarks.map((remark) => {
      const person = core.people.get(remark.personId)!;
      return {
        remarkId: remark.id,
        name: `${person.givenName} ${person.familyName}`,
        place:
          corePlaceByJurisdictionId(person.placeId as never)?.displayName ??
          "town",
        position: remark.position,
      };
    });
    const lines = composeBudgetHearing(packet, speakers, bill.id);
    if (!title) {
      expect(lines, where).toBeNull();
      return;
    }
    expect(lines, where).not.toBeNull();
    const text = lines!.map((line) => line.text).join(" ");
    expect(text, where).toContain(title);
    for (const speaker of speakers) {
      expect(text, where).toContain(speaker.name);
      const mine = lines!.filter((line) =>
        line.sourceRecordIds.includes(speaker.remarkId),
      );
      expect(mine.length, where).toBeGreaterThan(1);
      for (const line of mine)
        expect(line.sourceRecordIds, where).toContain(bill.id);
    }
    // Only a speaker for the bill urges support.
    for (const speaker of speakers.filter((row) => row.position <= 0))
      expect(
        lines!
          .filter((line) => line.sourceRecordIds.includes(speaker.remarkId))
          .some((line) => /urge you to support/.test(line.text)),
        where,
      ).toBe(false);
    for (const line of lines!)
      expect(line.text, where).not.toMatch(/\{|undefined/);
  }, 600_000);
});
