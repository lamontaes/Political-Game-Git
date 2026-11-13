import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { billOf, committeeRecords } from "./modules/legislature";
import { coreAPI } from "./state";
import { applyCoreEvent } from "./state";

// A bill the committee holds without a hearing names its sponsor on the record, reaches the paper,
// and a chair who agrees in the sponsor's scene sets the hearing the hold denied. Places are drawn
// in turn until one's legislature holds a bill.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a held bill names its sponsor, is printed, and a chair's agreed reply sets the hearing (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "hold-record-sponsor");
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    const holds = [...core.durableLog.values()].filter(
      (row) => row.kind === "bill-held-in-committee",
    );
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    if (!holds.length) {
      tried.push(place.name);
      continue;
    }
    for (const hold of holds) {
      const bill = billOf(api, hold.facts!.billId!);
      expect(hold.facts!.sponsorId, `${where}: ${hold.id}`).toBe(
        bill.sponsorId,
      );
      expect(hold.news, `${where}: ${hold.id}`).toBe(true);
      if (core.people.has(bill.sponsorId as never))
        expect(hold.personIds, `${where}: ${hold.id}`).toContain(
          bill.sponsorId,
        );
    }
    // The paper prints at least one hold, by its record id.
    const stories = (
      api.moduleState("news").table("stories").rows() as unknown as {
        kind: string;
        facts: Record<string, unknown>;
      }[]
    ).filter((story) => story.kind === "press.printed");
    const printed = holds.filter((hold) =>
      stories.some((story) => story.facts.sourceRecordId === hold.id),
    );
    expect(
      printed.length,
      `${where}: none of ${holds.map((h) => h.id).join(", ")} printed`,
    ).toBeGreaterThan(0);

    // The chair agrees in the scene that follows a hold: the bill is heard.
    const hold = holds.find((row) => {
      const bill = billOf(api, row.facts!.billId!);
      return (
        bill.status === "failed" && core.people.has(row.facts!.chair as never)
      );
    });
    expect(
      hold,
      `${where}: no held bill with a chair who is a person`,
    ).toBeDefined();
    const bill = billOf(api, hold!.facts!.billId!);
    applyCoreEvent(core, {
      id: `scene-reply:${hold!.id}:bill-held-chair:0`,
      date: core.date,
      kind: "scene.reply",
      personIds: [hold!.facts!.chair as never, bill.sponsorId as never],
      placeId: core.people.get(hold!.facts!.chair as never)!.placeId,
      facts: {
        typeKey: "bill-held-chair",
        causeId: hold!.id,
        move: "agree",
        line: "agreed",
      },
      source: { tag: "SOURCED", citation: "test", asOf: core.date },
    });
    const records = committeeRecords(api, bill.id);
    expect(records.length, where).toBe(1);
    expect(records[0]!.heard, `${where}: ${bill.id}`).toBe(true);
    expect(records[0]!.chairReasons.agreedReplyId, where).toBe(
      `scene-reply:${hold!.id}:bill-held-chair:0`,
    );
    expect(core.durableLog.get(`${hold!.id}:after-hold`)?.kind, where).toBe(
      "committee-hearing",
    );
    expect(billOf(api, bill.id).status, where).not.toBe("failed");
    // A refusal leaves a hold standing.
    return;
  }
  throw new Error(`no place held a bill: ${tried.join(", ")}`);
}, 600_000);
