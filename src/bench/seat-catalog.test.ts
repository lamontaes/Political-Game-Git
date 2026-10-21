import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { debateAnswer } from "./campaign";
import { seatView } from "./legislature";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe(`a member's drafting menus (seed ${seed})`, () => {
  it("show each policy's amount in force and whether the body may act, from the bill catalog", () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "seat-catalog");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      const terms = api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .rows() as unknown as TermRow[];
      for (const term of terms.filter(
        (row) => row.status === "serving" && row.personId,
      )) {
        const view = seatView(world.core, term.personId!);
        const body = view.bodies[0];
        if (!body) continue;
        const items = body.menus.flatMap((menu) => menu.items);
        expect(
          items.length,
          `${place.name}; seed ${place.seed}`,
        ).toBeGreaterThan(0);
        // Every item says whether the body may act; an amount in force is a number or none.
        for (const item of items) {
          expect(typeof item.allowed).toBe("boolean");
          expect(
            item.inForce === null || typeof item.inForce === "number",
          ).toBe(true);
        }
        expect(items.some((item) => item.inForce !== null)).toBe(true);
        // No debate is waiting for a member who is in no race.
        expect(() =>
          debateAnswer(world.core, term.personId!, "debate:none", []),
        ).toThrow(/No debate is waiting/);
        return;
      }
    }
    throw new Error(`No member of a body in 8 draws; seed ${seed}`);
  }, 1_200_000);
});
