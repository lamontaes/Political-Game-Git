import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld, NoPlayerHereError } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { LEGISLATURE_MODULE_ID } from "./modules/legislature";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

// The executive signs or vetoes everywhere (owner, Oct 14, 2026): a budget
// both chambers pass goes to the executive's desk like any bill, and the
// signature is a public record the press prints. The bench world, a place
// drawn from all 56 on a seed nobody chose, past the federal budget's October
// 1 vote.
const seed =
  process.env.BUDGET_DESK_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");
// A place whose every adult lives in group quarters opens no game, so no
// player can be picked there (Evergreen Colony, South Dakota, seed
// 4c82f37580c4e301c7394ca5ff3da32c7e74488e3f3c31d1a164865330ae2e66): the test
// names each such place it passes over, draws the next, and fails by name when
// no draw can open (drawn-place-tests, steps 4 and 5).
const DRAWS = 8;

describe(`a budget at the executive's desk (seed ${seed})`, () => {
  it("records the president's signature or veto of the federal budget, and a national outlet prints it", () => {
    const passedOver: string[] = [];
    let opened: {
      place: ReturnType<typeof drawPlace>;
      world: ReturnType<typeof buildBenchWorld>;
    } | null = null;
    for (let draw = 0; draw < DRAWS && !opened; draw++) {
      // The first draw is the one the seed always named; later draws vary it.
      const place = drawPlace(
        draw === 0 ? seed : `${seed}:${draw}`,
        "budget-desk",
      );
      try {
        opened = {
          place,
          world: buildBenchWorld(place.seed, gameStartDate(), {
            twoLevel: true,
            placeKey: place.key,
          }),
        };
      } catch (error) {
        if (!(error instanceof NoPlayerHereError)) throw error;
        passedOver.push(`${place.name} (${place.key}): ${error.message}`);
      }
    }
    if (!opened)
      throw new Error(
        `no drawn place opened a world in ${DRAWS} draws, seed ${seed}; passed over: ${passedOver.join("; ")}`,
      );
    const { place, world } = opened;
    const core = world.core as unknown as CoreState;
    advanceCore(core, addDays(makeIsoDate(core.date), 330));
    const api = coreAPI(core);
    const bills = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as {
      id: string;
      kind: string;
      bodyOfficeId: string;
    }[];
    const votes = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("votes")
      .rows() as unknown as {
      billId: string;
      memberId: string;
      vote: string;
    }[];
    const federal = bills.find(
      (b) => b.kind === "budget" && b.bodyOfficeId.startsWith("federal:"),
    );
    expect(federal, `${place.name}: a federal budget in the year`).toBeTruthy();
    const desk = votes.filter(
      (v) =>
        v.billId === federal!.id && (v.vote === "sign" || v.vote === "veto"),
    );
    expect(desk.length, federal!.id).toBe(1);
    expect(desk[0]!.memberId).toContain(":president:");
    const printed = (
      api.moduleState("core2-press-v1").table("stories").rows() as unknown as {
        id: string;
        outletId: string;
        wireId: string;
      }[]
    ).filter((s) => s.wireId === `executive-action:${federal!.id}`);
    expect(printed.length, "stories on the president's act").toBeGreaterThan(0);
    expect(
      printed.some((s) => s.outletId.includes(":national")),
      "a national outlet",
    ).toBe(true);
    process.stdout.write(
      `budget desk: ${place.name} (${place.key}), seed ${seed}; passed over: ${passedOver.length ? passedOver.join(" | ") : "none"}; ${desk[0]!.vote} ${desk[0]!.memberId} on ${federal!.id}; stories ${printed.map((s) => `${s.id} (${s.outletId})`).join(", ")}\n`,
    );
  }, 900_000);
});
