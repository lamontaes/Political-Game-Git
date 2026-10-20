import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { buildBenchWorld } from "./world";
import { storyScene } from "./story";

// The bench's staged story for a public hearing carries what the people there
// say, worded from the records (pool item words-budget-hearing-speakers).
// Places are drawn in turn until a year of one has a watched speaker with a
// hearing scene.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`the staged story of a public hearing has the worded talk, each line citing its records (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let life = 0; life < 4; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "story-hearing");
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
      const story = storyScene(core, director, personId, entry.momentId, 1140);
      if (!story.talk.length) continue;
      const where = `${place.name}, seed ${seed}:${life}, ${personId}, ${entry.momentId}`;
      const speaker = core.people.get(personId)!;
      expect(story.talk.map((line) => line.text).join(" "), where).toContain(
        `${speaker.givenName} ${speaker.familyName}`,
      );
      for (const line of story.talk)
        expect(line.sourceRecordIds.length, where).toBeGreaterThan(0);
      return;
    }
    tried.push(place.name);
  }
  throw new Error(
    `no watched resident had a worded public hearing story in a year in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
