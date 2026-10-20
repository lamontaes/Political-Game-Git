import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { composeScene } from "./scene";

// A resident who stands up to speak at a public meeting has a hearing scene
// (owner, Oct 15: scenes fire from recorded causes). The cause is the town's
// public-comment record; the speaker is in it. Places are drawn in turn until
// a year of one has a speaker the director watches, and every full resident
// is watched so the speakers are seen.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a public comment is a hearing scene for the speaker, citing the comment record (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let life = 0; life < 4; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "hearing-scenes");
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
      const binding = entry.bindings.find(
        (bound) => bound.typeKey === "public-hearing",
      )!;
      const moment = book.momentsById.get(entry.momentId)!;
      const where = `${place.name}, seed ${seed}:${life}, ${personId}, ${moment.causeId}`;
      const comment = core.durableLog.get(moment.causeId);
      expect(comment?.kind, where).toBe("public-comment");
      expect(comment?.personIds, where).toContain(personId);
      // The room is filled from records: the speaker, the chair and members.
      expect(
        binding.roles.find((r) => r.role === "speaker")?.personIds,
        where,
      ).toContain(personId);
      expect(binding.presentIds.length, where).toBeGreaterThan(1);
      // The speaker says their piece, in public-comment words from the
      // remark the record holds for them, citing that remark.
      const scene = composeScene(core, director, personId, entry);
      expect(scene?.speech, where).toBeDefined();
      expect(scene!.speech!.text.length, where).toBeGreaterThan(3);
      expect(scene!.speech!.speakerId, where).toBe(
        binding.roles.find((r) => r.role === "speaker")!.personIds[0],
      );
      expect(
        scene!.speech!.sourceRecordIds.some(
          (id) => id.startsWith("remark:") || id.includes("remark"),
        ),
        `${where}: ${scene!.speech!.sourceRecordIds.join(",")}`,
      ).toBe(true);
      return;
    }
    tried.push(place.name);
  }
  throw new Error(
    `no watched resident spoke at a public meeting in a year in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
