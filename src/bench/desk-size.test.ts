/**
 * The paper weighs a business closing, a layoff and a national disaster by
 * the share of people it takes (pool item play-local-layoffs-on-screen).
 * Each test draws places from all 56, plays each month by month to a limit
 * until its case happens in the game's own days, and names every place it
 * passed over. Nothing is staged and no place or seed is pinned; set
 * GOLDEN_PATH_SEED to replay a draw.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld, NoPlayerHereError } from "./world";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { setBookkeeping } from "../core2/bookkeeping";
import { coreAPI } from "../core2/state";
import { PRESS_MODULE_ID } from "../core2/modules/press";
import type { DeskWeighing, PrintedStory } from "../core2/press-desk";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 4;
const MONTHS = 14;

interface Found {
  readonly where: string;
  readonly stories: PrintedStory[];
  readonly weighings: DeskWeighing[];
  readonly passed: string[];
}

/** Play drawn places month by month until `holds` is true of the weighings. */
function find(
  purpose: string,
  holds: (weighings: DeskWeighing[], stories: PrintedStory[]) => boolean,
): Found {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw++) {
    const place = drawPlace(draw === 0 ? seed : `${seed}:${draw}`, purpose);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    setBookkeeping(true);
    let world;
    try {
      world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
    } catch (error) {
      if (!(error instanceof NoPlayerHereError)) throw error;
      passed.push(`${where}: no player can live here`);
      continue;
    }
    const press = coreAPI(world.core).moduleState(PRESS_MODULE_ID);
    const start = gameStartDate();
    const seen = new Map<string, DeskWeighing>();
    for (let month = 1; month <= MONTHS; month++) {
      const y =
        Number(start.slice(0, 4)) +
        Math.floor((Number(start.slice(5, 7)) - 1 + month) / 12);
      const m = ((Number(start.slice(5, 7)) - 1 + month) % 12) + 1;
      advanceCore(world.core, `${y}-${String(m).padStart(2, "0")}-20` as never);
      // A weighing lasts only while its item is fresh: read each month.
      for (const w of press
        .table("weighings")
        .rows() as unknown as DeskWeighing[])
        seen.set(`${w.outletId}|${w.wireId}|${w.date}`, w);
      const weighings = [...seen.values()];
      const stories = press
        .table("stories")
        .rows() as unknown as PrintedStory[];
      if (holds(weighings, stories))
        return {
          where,
          weighings,
          stories: press.table("stories").rows() as unknown as PrintedStory[],
          passed,
        };
    }
    passed.push(
      `${where}: no such case in ${MONTHS} months (${world.core.date})`,
    );
  }
  throw new Error(
    `No drawn place had the case (${purpose}, seed ${seed}):\n${passed.join("\n")}`,
  );
}

const done = (f: Found, what: string) =>
  process.stdout.write(
    `${what} at ${f.where}; passed over: ${f.passed.join(" | ") || "none"}\n`,
  );

describe("the paper weighs a closing, a layoff and a disaster by size", () => {
  it("weighs a closing by the jobs it ended and prints it once, never beside the owner's twin", () => {
    const f = find(
      "desk-size-closing",
      (ws, stories) =>
        ws.some((w) => w.kind === "organization.closed" && w.reached > 0) &&
        stories.some((s) => s.kind === "organization.closed"),
    );
    done(f, "CLOSING weighed and printed");
    const closings = f.weighings.filter(
      (w) => w.kind === "organization.closed",
    );
    // A closing the desk dropped says why, by its week's stories or its level's room.
    for (const w of closings)
      expect(
        ["ran", "below-the-weeks-stories", "no-room-at-its-level"],
        `${f.where}: ${w.wireId}`,
      ).toContain(w.why);
    const printed = f.stories.filter((s) => s.kind === "organization.closed");
    expect(printed.length, `${f.where}: a closing was printed`).toBeGreaterThan(
      0,
    );
    expect(
      f.stories.filter((s) => s.wireId.startsWith("event:business.closed:")),
      `${f.where}: no twin story`,
    ).toHaveLength(0);
  }, 1_200_000);

  it("weighs a layoff by the share of the town's jobs it took", () => {
    const f = find("desk-size-layoff", (ws) =>
      ws.some((w) => w.kind === "business.staff-reduced" && w.reached > 0),
    );
    done(f, "LAYOFF weighed");
    const layoffs = f.weighings.filter(
      (w) => w.kind === "business.staff-reduced",
    );
    expect(layoffs.length, `${f.where}: layoff weighed`).toBeGreaterThan(0);
    expect(
      layoffs.every((w) => w.reached >= 0 && Number.isFinite(w.score)),
      `${f.where}: each layoff has a reach and a score`,
    ).toBe(true);
  }, 1_200_000);

  it("weighs a national disaster by the share of the nation's people it struck", () => {
    const f = find(
      "desk-size-disaster",
      (ws, stories) =>
        stories.some((s) => s.kind === "national.disaster") &&
        new Set(
          ws
            .filter((w) => w.kind === "national.disaster")
            .map((w) => Math.round(w.reached * 1000)),
        ).size > 1,
    );
    done(f, "DISASTERS weighed");
    expect(
      f.stories.some((s) => s.kind === "national.disaster"),
      `${f.where}: a disaster was printed`,
    ).toBe(true);
  }, 1_200_000);
});
