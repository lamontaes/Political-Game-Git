import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { RENEWAL_MODULE_ID } from "../core2/modules/renewal";
import { coreAPI } from "../core2/state";
import { composeScene } from "./scene";

// A birth in the household is a gathering scene for each parent (owner, Oct
// 15: scenes fire from recorded causes). The cause is the birth record the
// renewal engine wrote, and that record names the plan the couple made, so the
// scene can answer why the child came. Places are drawn in turn until a year
// of one has a birth to a couple the director watches.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a birth is a gathering scene for each parent, citing the birth and the plan behind it (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let life = 0; life < 6; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "birth-scenes");
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
      // A parent's own scene: relatives and friends are watched too, and their
      // gatherings cite a birth they are not in.
      const entry = book.schedule.find(
        (row) =>
          row.momentId.endsWith(":birth") &&
          row.bindings.some((bound) => bound.typeKey === "celebration") &&
          core.durableLog
            .get(book.momentsById.get(row.momentId)!.causeId)
            ?.personIds.includes(personId),
      );
      if (!entry) continue;
      const binding = entry.bindings.find(
        (bound) => bound.typeKey === "celebration",
      )!;
      const moment = book.momentsById.get(entry.momentId)!;
      const where = `${place.name}, seed ${seed}:${life}, ${personId}, ${moment.causeId}`;
      // The cause is the birth record, and the parent is in it.
      const birth = core.durableLog.get(moment.causeId);
      expect(birth?.kind, where).toBe("person-birth");
      expect(birth?.personIds, where).toContain(personId);
      // The parent is the one honored; others are in the room.
      expect(
        binding.roles.find((r) => r.role === "honoree")?.personIds,
        where,
      ).toContain(personId);
      expect(binding.presentIds.length, where).toBeGreaterThan(1);
      // The birth names the plan both parents made, which the renewal engine kept.
      const planId = String(birth?.facts?.planId);
      const plan = coreAPI(core)
        .moduleState(RENEWAL_MODULE_ID)
        .table("plans")
        .get(planId);
      expect(plan?.agreed, `${where} plan ${planId}`).toBe(true);
      // The scene opens with why everyone is there: a sentence about the
      // birth, citing the birth record; the child is the counterpart, so it names the child.
      const scene = composeScene(core, director, personId, entry)!;
      const text = scene.narration.map((line) => line.text).join(" ");
      expect(text, `${where}: ${text}`).toMatch(
        /new baby|has been born|was born/,
      );
      expect(
        scene.narration.flatMap((line) => line.sourceRecordIds),
        where,
      ).toContain(moment.causeId);
      console.log(`${where}: ${text}`);
      return;
    }
    tried.push(place.name);
  }
  throw new Error(
    `no watched couple had a child in a year in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
