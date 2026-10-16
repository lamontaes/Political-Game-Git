import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";

// A person who learns that a law changed their money has a scene whose
// opening belongs to whoever told them (owner, Oct 15: scenes fire from
// recorded causes). Learned from a news story, the teller is the head of the
// outlet that carried it (stopgap SG-DIRECTOR-owner-decision-law-teller); a
// notice from the probate court names no one, so that stays a journal line.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a law that reached someone is a scene only where someone told them (seed ${seed})`, () => {
  const tried: string[] = [];
  let sawNotice = false;
  for (let life = 0; life < 3; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "law-reached-scenes");
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    for (const person of core.people.values())
      if (person.alive) director.watch(core, person.id);
    advanceCore(core, addDays(makeIsoDate(core.date), 400));
    for (const [personId, book] of director.ledger.people)
      for (const row of book.schedule) {
        const moment = book.momentsById.get(row.momentId);
        if (moment?.label !== "cause:event:law.effect-learned") continue;
        const where = `${place.name}, seed ${seed}:${life}, ${personId}, ${moment.causeId}`;
        const binding = row.bindings.find(
          (bound) => bound.typeKey === "law-takes-effect",
        );
        if (binding) {
          const teller = binding.roles.find((r) => r.role === "teller");
          expect(teller?.personIds.length, where).toBe(1);
          expect(teller?.personIds[0], where).not.toBe(personId);
          return;
        }
        // No teller: the reason is the record's, a notice with no one in it.
        expect(row.coverage?.reason, where).toBe("role-unbound");
        expect(row.coverage?.detail, where).toContain("teller");
        sawNotice = true;
      }
    tried.push(place.name);
  }
  expect(
    sawNotice,
    `no law reached a watched person in a year in ${tried.join("; ")} (seed ${seed})`,
  ).toBe(true);
}, 3_600_000);
