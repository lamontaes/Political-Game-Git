import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./world";
import { openingFrames } from "./opening";
import { orgPlace } from "./scene";

// A cutaway of the opening shows the town's own people, never an empty room
// (owner, Oct 26: "cutaway offices are empty"). Each person in a cutaway holds
// a job at an organization of the player's town whose own picture it is, or is
// an adult of the town with no job. Places are drawn from all 56 (a seed is
// pinned with GOLDEN_PATH_SEED).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "opening-cutaway-cast");
console.log(`opening cutaways: seed ${seed}, ${place.name} (${place.key})`);

it(`no cutaway of the opening is an empty room (${place.name}, seed ${seed})`, () => {
  const world = buildBenchWorld(place.seed, "2025-01-20", {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const story = director.ledger.opening!;
  const { frames } = openingFrames(core, world.playerId!, story);
  const stagePlaces = new Set(
    frames.filter((frame) => frame.pointOut.length).map((frame) => frame.place),
  );
  const cutaways = frames.filter(
    (frame) =>
      !stagePlaces.has(frame.place) &&
      !frame.pointOut.length &&
      frame.cast.length,
  );
  const workPlaces = new Map<string, Set<string>>();
  for (const job of core.jobs.values())
    if (!job.endsAt)
      workPlaces.set(
        job.personId,
        (workPlaces.get(job.personId) ?? new Set()).add(
          orgPlace(core, job.organizationId) ?? "",
        ),
      );
  for (const frame of cutaways)
    for (const row of frame.cast) {
      // An officeholder is there by their term record.
      const person = core.people.get(row.id);
      if (!person || row.id.startsWith("official:")) continue;
      const works = workPlaces.get(row.id)?.has(frame.place);
      expect(
        works || !person.jobId,
        `${row.name} (${row.id}) stands in ${frame.place} with no job there and a job elsewhere`,
      ).toBe(true);
    }
  // Every frame the address plays over shows somebody, or no picture at all.
  for (const frame of frames)
    if (frame.lines.length)
      expect(
        frame.people.length + frame.cast.length,
        `${frame.stage} frame at ${frame.place} is empty`,
      ).toBeGreaterThan(0);
}, 300000);
