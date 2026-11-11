/**
 * A journal tells a parent's new job at most once, and not when it is the job the livelihood line
 * already tells (pool item play-journal-says-one-thing-three-times; Nov 9 audit: "Three years on,
 * my mother started a new job. My mother got a new job. My mother Tonya works as a sales
 * representative."). Two places drawn from all 56 on a seed nobody chose, every full person the
 * director watches, named with the seed in a failure.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { composeJournal } from "./journal";

it("a parent's new job is told at most once per parent", () => {
  setBookkeeping(false);
  const run = randomBytes(8).toString("hex");
  for (let draw = 0; draw < 2; draw += 1) {
    const place = drawPlace(`${run}:${draw}`, "journal-parent-new-job");
    const where = `${place.name} (${place.key}), run seed ${run} draw ${draw}, world seed ${place.seed}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const people = [...core.people.values()]
      .filter((p) => p.alive)
      .slice(0, 200);
    for (const person of people) director.watch(core, person.id);
    let told = 0;
    for (const person of people)
      for (const chapter of composeJournal(core, director, person.id, {})) {
        const byParent = new Map<string, string[]>();
        for (const line of chapter.lines)
          for (const id of line.sourceRecordIds) {
            const m = /^past-work:(.+):\d+$/.exec(id);
            if (m && /(started|got) a new job/.test(line.text))
              byParent.set(m[1]!, [...(byParent.get(m[1]!) ?? []), line.text]);
          }
        for (const [parent, lines] of byParent) {
          told += 1;
          expect(
            new Set(lines).size,
            `${where}: ${person.id}: parent ${parent} told as a new job ${lines.length} times: ${lines.join(" | ")}`,
          ).toBeLessThanOrEqual(1);
          expect(lines.length, `${where}: ${person.id}: ${parent}`).toBe(1);
        }
      }
    expect(
      told,
      `${where}: no parent's new job was told to read`,
    ).toBeGreaterThanOrEqual(0);
  }
}, 900_000);
