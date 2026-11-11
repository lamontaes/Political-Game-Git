/**
 * What the town thinks of the questions a race turns on (pool item play-issue-stances-on-screen):
 * for the questions of a candidate's platform, the adults of the town leaning for, against and
 * between, read from every full person's current view. Two places drawn from all 56, named with
 * the seed in every failure.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import type { FilingRow } from "../core2/modules/elections";
import { issueLeans } from "./campaign";
import { buildBenchWorld } from "./world";

it("the town's lean on a race's questions is counted from its people's views", () => {
  const run = randomBytes(16).toString("hex");
  for (let draw = 0; draw < 2; draw += 1) {
    const place = drawPlace(`${run}:${draw}`, "issue-leans");
    const where = `${place.name} (${place.key}), run seed ${run} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const filing = {
      platform: PLATFORM_QUESTIONS.slice(0, 4).map((q) => `${q}=1`),
    } as unknown as FilingRow;
    const lines = issueLeans(core, filing);
    expect(lines.length, `${where}: the race shows its questions`).toBe(3);
    let someone = 0;
    for (const line of lines) {
      expect(line.people, where).toBeGreaterThan(0);
      expect(line.toward + line.against + line.between, where).toBe(
        line.people,
      );
      someone += line.toward + line.against;
    }
    expect(someone, `${where}: nobody leans on any question`).toBeGreaterThan(
      0,
    );
  }
}, 600_000);
