/**
 * The jobs open in the player's town, listed from the position records
 * (pool item play-job-openings-on-screen). Two places drawn from all 56; every row names its
 * position record and matches it.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { JOBS_MODULE_ID, type PositionRow } from "../core2/modules/jobs";
import { coreAPI } from "../core2/state";
import { openingsView } from "./openings";
import { buildBenchWorld } from "./world";

it("the open positions in town are listed with their employer, pay and hours", () => {
  const run = randomBytes(16).toString("hex");
  for (let draw = 0; draw < 2; draw += 1) {
    const place = drawPlace(`${run}:${draw}`, "openings");
    const where = `${place.name} (${place.key}), run seed ${run} draw ${draw}, world seed ${place.seed}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const me = core.people.get(playerId!)!;
    const positions = coreAPI(core)
      .moduleState(JOBS_MODULE_ID)
      .table("positions")
      .rows() as unknown as PositionRow[];
    const here = positions.filter(
      (p) => p.status === "open" && p.placeId === me.placeId,
    );
    const { openings } = openingsView(core, me.id);
    expect(openings.length, `${where}: one row per open position`).toBe(
      here.length,
    );
    for (const row of openings) {
      const position = positions.find((p) => p.id === row.recordId);
      expect(position, `${where}: ${row.recordId}`).toBeDefined();
      expect(row.hourlyMinor, `${where}: ${row.recordId}`).toBe(
        position!.hourlyMinor,
      );
      expect(row.employer, `${where}: ${row.recordId} employer`).toBeTruthy();
    }
  }
}, 600_000);
