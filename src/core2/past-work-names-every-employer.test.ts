/**
 * Every past job names its employer (the person card tells a worked life,
 * "Later, in 1988 she held jobs at ..."): in played worlds in drawn places from
 * all 56, seed printed (EMPLOYER_SEED fixes it), every job spell of every
 * person with three or more has an employer id that the world's organizations
 * or the elsewhere naming can name. Before, a first job before the town's
 * oldest firm was written with no employer at all.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { ELSEWHERE_EMPLOYER } from "./places-elsewhere";
import { lifeOf } from "./modules/people";

const seed = process.env.EMPLOYER_SEED || randomBytes(8).toString("hex");

describe(`Past jobs name their employers (seed ${seed})`, () => {
  it(
    "every job-started record of a worker with three employers has a nameable employer",
    { timeout: 300_000 },
    () => {
      setBookkeeping(false);
      const seen: string[] = [];
      for (let at = 0; at < 3; at += 1) {
        const drawn = drawPlace(
          at ? `${seed}:${at}` : seed,
          "past-work-employer",
        );
        const where = `${drawn.name} (${drawn.key}), seed ${drawn.seed}`;
        const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: drawn.key,
        });
        let checked = 0;
        for (const person of core.people.values()) {
          const spells = lifeOf(core, person.id as never).filter(
            (event) => event.life === "work" && event.what === "job-started",
          );
          if (new Set(spells.map((e) => e.facts?.organizationId)).size < 3)
            continue;
          for (const event of spells) {
            const id = String(event.facts?.organizationId);
            checked += 1;
            expect(
              id !== "undefined" &&
                (core.organizations.has(id as never) ||
                  id.startsWith(ELSEWHERE_EMPLOYER)),
              `${where}: ${event.id} names no employer (${id})`,
            ).toBe(true);
          }
        }
        seen.push(`${where}: ${checked} job records checked`);
      }
      console.log(seen.join("\n"));
    },
  );
});
