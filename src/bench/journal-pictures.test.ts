/**
 * A journal chapter shows the picture of the place its lines were written from
 * (pool item play-nov8-journal-chapter-has-no-picture): the workplace or school
 * of the record that names it, and no picture where no record does. Two places drawn from all
 * 56, named with the seed in every failure.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { composeJournal } from "../director/journal";
import { chapterPicture } from "./journal-pictures";

it("a chapter's picture comes from a record that is an organization, never from nothing", () => {
  const run = randomBytes(16).toString("hex");
  for (let draw = 0; draw < 2; draw += 1) {
    const place = drawPlace(`${run}:${draw}`, "journal-pictures");
    const where = `${place.name} (${place.key}), run seed ${run} draw ${draw}, world seed ${place.seed}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // Everyone with a job in the full town, whose journals tell their work.
    const people = [...core.people.values()]
      .filter((p) => p.alive && p.jobId)
      .slice(0, 40);
    for (const person of people) director.watch(core, person.id);
    let pictured = 0;
    let chapters = 0;
    for (const person of people) {
      for (const chapter of composeJournal(core, director, person.id, {})) {
        chapters += 1;
        const picture = chapterPicture(core, person.id, chapter);
        if (!picture) continue;
        pictured += 1;
        expect(picture.url, where).toMatch(/\.(png|jpe?g|webp)/);
        expect(
          core.organizations.has(picture.recordId),
          `${where}: ${picture.recordId} is no organization`,
        ).toBe(true);
      }
    }
    expect(chapters, `${where}: no chapters to read`).toBeGreaterThan(0);
    expect(
      pictured,
      `${where}: ${chapters} chapters, none pictured`,
    ).toBeGreaterThan(0);
  }
}, 900_000);
