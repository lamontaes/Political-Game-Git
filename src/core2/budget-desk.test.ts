import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
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
const place = drawPlace(seed, "budget-desk");

describe(`a budget at the executive's desk (${place.name}, seed ${seed})`, () => {
  it("records the president's signature or veto of the federal budget, and a national outlet prints it", () => {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
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
      `budget desk: ${place.name} (${place.key}), seed ${seed}; ${desk[0]!.vote} ${desk[0]!.memberId} on ${federal!.id}; stories ${printed.map((s) => `${s.id} (${s.outletId})`).join(", ")}\n`,
    );
  }, 900_000);
});
