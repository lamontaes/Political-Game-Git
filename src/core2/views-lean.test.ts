/**
 * Campaigning reads PEOPLE's views (retiring the personality stand-in for
 * ordering): in the bench's world, where the views engine runs, the town's
 * full people stand in the order of their own view's lean, and the town as a
 * whole still splits the way its area really voted.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildBenchWorld } from "../bench/world";
import { coreAPI } from "./state";
import { personLean } from "./campaign-views";
import { VIEWS_MODULE_ID, viewOf } from "./modules/views";
import { lawChain } from "./modules/laws";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`views-lean:${Date.now()}`).digest("hex");

describe("leans from PEOPLE's views", () => {
  it("full people stand in the order of their own views", () => {
    const { core } = buildBenchWorld(seed, "2026-10-12", { twoLevel: true });
    const api = coreAPI(core);
    const where = `${core.placeMetadata.placeName}, ${lawChain(api).stateKey} (seed ${seed})`;
    expect(core.modules.has(VIEWS_MODULE_ID), where).toBe(true);
    const town = lawChain(api).townPlaceId;
    const people = [...core.people.values()].filter(
      (p) => p.alive && p.placeId === town,
    );
    const rows = people
      .map((p) => ({
        view: viewOf(api, p.id)!.lean,
        lean: personLean(core.people, p, 0),
      }))
      .sort((a, b) => a.view - b.view);
    // Monotone: a person whose view leans further right never stands left of
    // one whose view leans less.
    for (let i = 1; i < rows.length; i += 1)
      if (rows[i]!.view > rows[i - 1]!.view)
        expect(rows[i]!.lean, where).toBeGreaterThanOrEqual(rows[i - 1]!.lean);
    govReport(
      "views-lean",
      JSON.stringify({
        where,
        people: rows.length,
        rightOfCenter: rows.filter((r) => r.lean > 0).length,
      }),
    );
  }, 600_000);
});
