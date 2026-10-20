/**
 * Buildings under way at the opening, in the world the owner plays: the
 * bench world in places drawn from all 56 on a seed nobody chose, played for
 * a year. Building takes months (an apartment building about nineteen), so a
 * town whose builders only start work on day one would show no new rental
 * before the second year. Instead the buildings a town's builders were
 * partway through at the opening are on the books from day one, started in
 * the months before it at the opening's rates. Some finish in the year, and
 * households move into the finished units for the rent they save.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";

const seed =
  process.env.HOUSING_PIPELINE_SEED || randomBytes(8).toString("hex");

interface Project {
  id: string;
  kind: "single" | "multi";
  units: number;
  startedAt: string;
  completesAt: string;
  open: boolean;
}
interface Move {
  id: string;
  projectId: string;
  date: string;
  oldRentMinor?: number;
  rentMinor: number;
  reasonKey: string;
}

describe(`new homes in a played year (seed ${seed})`, () => {
  it("starts buildings before the opening and moves households into the ones that finish", () => {
    const opening = gameStartDate();
    const seen: string[] = [];
    let moved: { place: string; move: Move; project: Project } | null = null;
    let anyEarly = false;
    for (let draw = 0; draw < 12 && !(moved && anyEarly); draw++) {
      const place = drawPlace(`${seed}:${draw}`, "housing-pipeline");
      const world = buildBenchWorld(`${seed}:${draw}`, opening, {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      advanceCore(world.core, addDays(makeIsoDate(opening), 365));
      const table = (name: string) =>
        api.moduleState("housing").table(name).rows() as unknown as never[];
      const projects = table("projects") as unknown as Project[];
      const moves = table("moves") as unknown as Move[];
      seen.push(
        `${place.name} (${place.key}): ${projects.length} projects, ${moves.length} moves`,
      );
      // Work under way at the opening was started before it. A small town may
      // have none under way (its builders start after the opening), so the
      // check is across the places drawn.
      const early = projects.filter((p) => p.startedAt < opening);
      if (early.length) anyEarly = true;
      for (const move of moves) {
        const project = projects.find((p) => p.id === move.projectId)!;
        // A household moves only into a finished building; one that was
        // already renting moves for less rent.
        expect(project.open).toBe(false);
        expect(project.completesAt <= move.date).toBe(true);
        if (move.oldRentMinor !== undefined)
          expect(move.rentMinor).toBeLessThan(move.oldRentMinor);
        moved ??= { place: place.name, move, project };
      }
    }
    console.log(`housing-pipeline: ${seen.join("; ")}`);
    expect(
      anyEarly,
      `no building was under way at the opening in: ${seen.join("; ")}`,
    ).toBe(true);
    expect(
      moved,
      `no household moved into a new rental in: ${seen.join("; ")}`,
    ).not.toBeNull();
  }, 4_800_000);
});
