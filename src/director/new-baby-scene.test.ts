import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { purposeScene } from "./purpose-scene";

// A birth brings someone close to the new parent. The visit is a scene with a
// purpose only for a parent (the one asked how they are doing); a birth the
// watched person is not a parent in, a neighbor's or a cousin's, is not a visit
// to them, so no new-baby moment is cast around them (situation-types.json,
// `causeFacts` on the birth record's parents). A year of a drawn place is
// played with every person watched, and each new-baby moment is composed
// through the one purpose engine.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

it(`a new-baby visit plays only for a parent, with the child's name from the birth (seed ${seed})`, () => {
  const tried: string[] = [];
  let played = 0;
  for (let life = 0; life < 4 && played < 2; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "new-baby-scene");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    setBookkeeping(false);
    try {
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      for (const person of core.people.values())
        if (person.alive && person.id.startsWith("person_"))
          director.watch(core, person.id);
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      let strangers = 0;
      for (const [personId, book] of director.ledger.people)
        for (const entry of book.schedule) {
          if (!entry.bindings.some((b) => b.typeKey === "new-baby")) continue;
          const moment = book.momentsById.get(entry.momentId)!;
          const birth = core.durableLog.get(moment.causeId)!;
          const parent =
            birth.facts?.motherId === personId ||
            birth.facts?.otherParentId === personId;
          // Never a visit cast around someone who is not a parent.
          if (!parent) strangers += 1;
          if (!parent) continue;
          const result = purposeScene(core, director, personId, entry, {
            typeKey: "new-baby",
          });
          expect(
            result?.kind,
            `${where}: ${birth.id} ${JSON.stringify(result)}`,
          ).toBe("composed");
          if (result?.kind !== "composed") continue;
          const { scene } = result;
          expect(scene.purpose, where).toBe("new-baby");
          expect(scene.askedId, where).toBe(personId);
          // The visitor is not the baby or either parent.
          expect(birth.personIds, where).not.toContain(scene.askerId);
          const kid = scene.facts.find((row) => row.key === "kid");
          expect(kid?.text, where).toBe(
            core.people.get(String(birth.facts?.childId) as never)!.givenName,
          );
          expect(kid?.recordIds, where).toContain(birth.id);
          played += 1;
          process.stdout.write(
            `NEW BABY ${where}: ${birth.id}, ${personId} visited by ${scene.askerId}; ${scene.talk.narration.map((l) => l.text).join(" ")} | ${scene.talk.state.text}\n`,
          );
        }
      expect(strangers, `${where}: visits cast around non-parents`).toBe(0);
      if (!played) tried.push(`${where}: no parent had a visit`);
    } finally {
      setBookkeeping(true);
    }
  }
  expect(played, `seed ${seed}: ${tried.join("; ")}`).toBeGreaterThan(0);
}, 3_600_000);
