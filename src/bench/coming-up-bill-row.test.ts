import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { DevMode } from "./dev-mode";
import { governmentBodies } from "./government-bodies";
import { BenchPlayer } from "./player";

// A bill on a body's Coming up list is worded as a row a player can read: the
// number said with its form's word ("Ordinance 2025-11", never bare) and a name
// (the bill's title, or the law it changes), never a label with an empty slot
// (pool item play-coming-up-lists-a-bill-with-no-name). A bill dev mode
// introduces carries one bare amount section no title is composed for.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a drafted bill's Coming up row has a spoken number and a name (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const draw = drawPlace(`${seed}:${i}`, "coming-up-bill-row");
    const where = `${draw.name} (${draw.key}), place seed ${draw.seed}`;
    const world = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const player = new BenchPlayer(world.core, world.director);
    const dev = new DevMode(world.core, world.director, player, world.placeId);
    const body = dev
      .lawmakingBodies()
      .find((b) => b.level !== "state" && b.level !== "federal");
    if (!body) {
      tried.push(`${where}: no local body`);
      continue;
    }
    try {
      const { bill } = dev.introduce({
        bodyOfficeId: body.id,
        sponsorId: body.members[0]!.key,
        series: "sales-tax",
        value: 2,
        schedule: true,
      });
      if (bill.status === "blocked") {
        tried.push(`${where}: the body may not set it`);
        continue;
      }
    } catch (error) {
      tried.push(`${where}: ${(error as Error).message}`);
      continue;
    }
    const api = coreAPI(world.core);
    void api;
    const bodies = governmentBodies(
      world.core,
      world.core.playerId ?? [...world.core.people.keys()][0]!,
      "local",
    ) as unknown as {
      legislative: {
        comingUp: {
          kind: string;
          number?: string;
          title: string | null;
          law?: string;
        }[];
      }[];
    };
    const rows = bodies.legislative
      .flatMap((b) => b.comingUp)
      .filter((row) => row.kind === "bill");
    if (!rows.length) {
      tried.push(`${where}: the bill is on no Coming up list`);
      continue;
    }
    for (const row of rows) {
      expect(row.number, `${where}: bare number`).not.toMatch(/^[\d-]+$/);
      expect(row.number ?? "", `${where}: empty number`).not.toBe("");
      expect(
        Boolean(row.title) || Boolean(row.law),
        `${where}: ${row.number} names nothing`,
      ).toBe(true);
    }
    process.stdout.write(
      `coming-up-bill-row: ${where}: ${JSON.stringify(rows)}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place showed a drafted bill on Coming up (seed ${seed}): ${tried.join("; ")}`,
  );
}, 900_000);
