import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { hearingScript } from "./hearing-script";

// The hearing the director staged for a resident who spoke is worded from the
// bill's record and the speaker's remark (pool item
// words-budget-hearing-speakers). Places are drawn in turn until a year of one
// has a watched speaker with a hearing scene, as the scene test does.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a staged public hearing is worded from its bill and speaker records (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let life = 0; life < 4; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "hearing-script");
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    for (const person of core.people.values())
      if (person.alive && person.id.startsWith("person_"))
        director.watch(core, person.id);
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    for (const [personId, book] of director.ledger.people) {
      const entry = book.schedule.find(
        (row) =>
          row.momentId.includes("public-comment:") &&
          row.bindings.some((bound) => bound.typeKey === "public-hearing"),
      );
      if (!entry) continue;
      const lines = hearingScript(core, director, personId, entry.momentId);
      if (!lines) continue;
      const moment = book.momentsById.get(entry.momentId)!;
      const where = `${place.name}, seed ${seed}:${life}, ${personId}, ${moment.causeId}`;
      const speaker = core.people.get(personId)!;
      const text = lines.map((line) => line.text).join(" ");
      expect(text, where).toContain(
        `${speaker.givenName} ${speaker.familyName}`,
      );
      const billId = core.durableLog.get(moment.causeId)!.facts!.billId!;
      for (const line of lines) {
        expect(line.sourceRecordIds, where).toContain(billId);
        expect(line.text, where).not.toMatch(/\{|undefined/);
      }
      expect(
        lines.some((line) =>
          line.sourceRecordIds.includes(`remark:${billId}:${personId}`),
        ),
        where,
      ).toBe(true);
      return;
    }
    tried.push(place.name);
  }
  throw new Error(
    `no watched resident had a worded public hearing in a year in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
