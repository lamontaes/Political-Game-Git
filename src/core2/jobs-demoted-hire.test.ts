/**
 * A person returned to the counts is hired as a counted worker, in the world
 * the owner plays: the bench world on a fixed place and seed (named so a
 * regression is found here), played for a year. A resident the player had
 * lost touch with goes back to the counts and keeps a record on the inactive
 * tier; the jobs engine used to hire such a person with a full job, and the
 * press's next staff refresh then failed to fill them in with "Invalid
 * relocation: one living household, no job held." (DeWitt, New York, January
 * 12, 2026). Now no person in the counts holds a full job.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { isDemoted } from "./counted-groups";
import { advanceCore } from "./life";
import { drawPlace } from "../../scripts/core2-year/place";
import type { CoreState } from "./types";

const seed = "5b37bfc175";
const place = drawPlace(seed, "year-scan");

describe(`hiring a demoted person (${place.name}, seed ${seed})`, () => {
  it("runs the year, and no one in the counts holds a full job", () => {
    const opening = gameStartDate();
    const world = buildBenchWorld(seed, opening, {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core as CoreState;
    const end = new Date(`${opening}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 365);
    let at = new Date(`${opening}T00:00:00Z`);
    while (at < end) {
      at = new Date(Math.min(end.getTime(), at.getTime() + 30 * 86_400_000));
      advanceCore(core, at.toISOString().slice(0, 10));
    }
    for (const person of core.people.values()) {
      if (!isDemoted(person) || person.jobId === undefined) continue;
      const job = core.jobs.get(person.jobId);
      expect(
        job === undefined || job.endsAt !== undefined,
        `${person.id} holds ${person.jobId}`,
      ).toBe(true);
    }
  }, 900_000);
});
