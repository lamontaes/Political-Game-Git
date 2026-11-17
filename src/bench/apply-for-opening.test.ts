/**
 * The jobs sheet's Apply control (owner, Sept 22: "The player can apply or get
 * a job through someone they know"): pressing it records the player's
 * application; the sheet then shows it as applied and the employer's offer
 * that follows names that opening. In the played world in a drawn place from
 * all 56, seed printed (GOLDEN_PATH_SEED fixes it).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { JOBS_MODULE_ID, type JobOfferRow } from "../core2/modules/jobs";
import { applyForOpeningAs, openingsView } from "./openings";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

describe("the Apply control on the jobs sheet", { timeout: 900_000 }, () => {
  it("applying marks the opening applied and any offer follows an application", () => {
    setBookkeeping(false);
    const place = drawPlace(seed, "apply-for-opening");
    console.log(`apply-for-opening: place ${place.key}, seed ${seed}`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const playerId = core.playerId!;
    const applied = new Set<string>();
    for (let week = 0; week < 12; week += 1) {
      for (const o of openingsView(core, playerId).openings)
        if (!o.applied) {
          expect(applyForOpeningAs(core, o.recordId).applied).toBe(true);
          applied.add(o.recordId);
        }
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    }
    expect(
      applied.size,
      "openings listed in the player's town",
    ).toBeGreaterThan(0);
    const offers = (
      coreAPI(core)
        .moduleState(JOBS_MODULE_ID)
        .table("offers")
        .rows() as unknown as JobOfferRow[]
    ).filter((row) => row.personId === playerId);
    const player = core.people.get(playerId)!;
    console.log(
      `apply-for-opening: ${applied.size} applied, offers ${offers.map((o) => o.id).join(", ") || "none"}`,
    );
    for (const o of offers)
      expect(
        applied.has(o.positionId) ||
          player.knownIds.has(o.offeredBy) ||
          player.familyIds.has(o.offeredBy),
        `${o.id} follows no application and no known person`,
      ).toBe(true);
  });
});
