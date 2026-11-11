/**
 * What people say about someone (the approved You mock; docs/design/life-record.md): in a
 * drawn place after 60 days of play, each sentence the people closest to an adult say about
 * them stands on an event of the speaker's own life list (`lifeOf`) that names the subject, by
 * its record id, and a partnership is on both partners' lists. The place and seed are in every
 * message; replay with SAID_SEED and SAID_PLACE_KEY.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { lifeOf } from "../core2/modules/people";
import type { PersonId } from "../core2/types";
import { knownCard } from "./card";
import { buildBenchWorld } from "./world";

const seed = process.env.SAID_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(seed, "what-people-say");
const placeKey = process.env.SAID_PLACE_KEY ?? drawn.key;
/** The base of a record id kept once per person ("partnership_x:past:person_y" is "partnership_x"). */
const base = (id: string) => id.replace(/:past:person_[0-9a-f]+$/, "");

it("each thing said about a person stands on the speaker's own life record, naming them", () => {
  setBookkeeping(false);
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 60));
  const where = `${world.place.displayName} (${placeKey}), seed ${seed}`;
  const year = Number(world.core.date.slice(0, 4));
  // Adults of 35 or more with someone close (the done-when's player age), from the world's own people.
  const adults = [...world.core.people.values()].filter(
    (person) =>
      person.alive &&
      person.tier !== "husk" &&
      year - Number(person.birthDate.slice(0, 4)) >= 35,
  );
  let said = 0;
  let partners = 0;
  for (const subject of adults.slice(0, 20)) {
    const card = knownCard(world.core, subject.id, subject.id);
    for (const speaker of card.said) {
      const theirs = new Map(
        lifeOf(world.core, speaker.personId as PersonId).map((event) => [
          event.id,
          event,
        ]),
      );
      expect(speaker.said.length, where).toBeGreaterThan(0);
      for (const line of speaker.said) {
        said += 1;
        const event = theirs.get(line.recordId);
        expect(
          event,
          `${where}: ${line.recordId} on ${speaker.name}'s list`,
        ).toBeDefined();
        expect(
          event!.withIds,
          `${where}: ${line.recordId} names the subject`,
        ).toContain(subject.id);
        expect(line.text, where).toBeTruthy();
        // A partnership is the same record on both partners' lists.
        if (event!.life === "partner") {
          partners += 1;
          const own = lifeOf(world.core, subject.id).map((row) => base(row.id));
          expect(
            own,
            `${where}: ${line.recordId} on the subject's list`,
          ).toContain(base(line.recordId));
        }
      }
    }
  }
  expect(said, `${where}: something said about an adult`).toBeGreaterThan(0);
  console.log(`${where}: ${said} sentences, ${partners} on a partnership`);
}, 600_000);
