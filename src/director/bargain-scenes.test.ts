import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { memberKey, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { purposeScene } from "./purpose-scene";

// A vote trade is a scene for both sides. When a sponsor gives a holdout a
// section for their vote, the
// legislature records it (bill-amendment, kind trade-amendment); the holdout
// is asked for their vote by the sponsor, and the sponsor bargains with the
// holdout over the section. Both are cast from the record and say its bill and
// section. Places are drawn in turn until one's legislators trade a vote.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 75;

it(`a vote trade is a vote ask for the holdout and a section bargain for the sponsor, from its record (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "bargain-scenes");
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // The town's, county's and state's legislators who are full people.
    for (const row of townSeats(api))
      if (["city", "county", "state"].includes(row.office.level))
        for (const term of members(api, row.office.id)) {
          const key = memberKey(term);
          if (core.people.get(key)?.alive) director.watch(core, key);
        }
    advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
    const trades = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "bill-amendment" &&
        row.facts?.kind === "trade-amendment" &&
        row.personIds.every((id) => director.ledger.people.has(id)),
    );
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    if (!trades.length) {
      tried.push(place.name);
      continue;
    }
    for (const trade of trades) {
      const holdout = trade.facts!.movedBy!;
      const sponsor = trade.personIds.find((id) => id !== holdout)!;
      const sceneFor = (personId: string, typeKey: string) => {
        const book = director.ledger.people.get(personId as never)!;
        const entry = book.schedule.find((row) =>
          row.momentId.includes(trade.id),
        );
        const binding = entry?.bindings.find((row) => row.typeKey === typeKey);
        return { entry, binding };
      };
      const ask = sceneFor(holdout, "vote-asked");
      expect(ask.binding, `${where}: ${trade.id}: no vote ask`).toBeTruthy();
      expect(
        ask.binding!.roles.find((row) => row.role === "colleague")!.personIds,
      ).toEqual([sponsor]);
      expect(ask.binding!.setting).toEqual({
        kind: "chamber",
        recordId: trade.facts!.chamber,
      });
      const bargain = sceneFor(sponsor, "section-bargain");
      expect(
        bargain.binding,
        `${where}: ${trade.id}: no section bargain`,
      ).toBeTruthy();
      expect(
        bargain.binding!.roles.find((row) => row.role === "member")!.personIds,
      ).toEqual([holdout]);
      // Both talk about the trade's own bill and section, citing the record.
      for (const [personId, entry] of [
        [holdout, ask.entry!],
        [sponsor, bargain.entry!],
      ] as const) {
        // The lines that play, as ordinary play says them.
        const result = purposeScene(core, director, personId as never, entry);
        expect(result?.kind, `${where}: ${personId}`).toBe("composed");
        if (result?.kind !== "composed") continue;
        const fact = (key: string) =>
          result.scene.facts.find((row) => row.key === key);
        expect(fact("bill")?.text).toBe(trade.facts!.number);
        expect(fact("bill")?.recordIds).toContain(trade.id);
        expect(fact("section")?.text).toBe(trade.facts!.section);
        expect(result.scene.cause.id).toBe(trade.id);
        expect(
          result.scene.talk.lines.some((line) =>
            line.text.includes(trade.facts!.number!),
          ),
          `${where}: ${personId}`,
        ).toBe(true);
        // The trade put the holdout's section in: nothing in the whole tree
        // says a section comes out.
        expect(fact("section-added")?.recordIds).toContain(trade.id);
        const tree = JSON.stringify(result.scene.talk);
        expect(tree, `${where}: ${personId}`).not.toMatch(
          /comes out|Drop section|Take out section|instead of dropping|cut half/,
        );
      }
      // The holdout asks the sponsor to put their amendment in.
      const asked = purposeScene(
        core,
        director,
        sponsor as never,
        bargain.entry!,
      );
      expect(
        asked?.kind === "composed" ? asked.scene.talk.state.text : "",
        `${where}: ${trade.id}`,
      ).toMatch(/amendment/);
    }
    return;
  }
  throw new Error(
    `no legislator traded a vote in ${DAYS} days in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
