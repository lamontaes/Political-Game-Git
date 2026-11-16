/**
 * A household's medical bill goes to a seller in its own town whichever of the
 * town's jurisdictions it lives in. Danville, Pennsylvania (4218136, seed
 * ilt-danville): 13,068 households live in three jurisdictions and the one
 * clinic is in one; before, the other two's bills were paid to the outside
 * account. Each bill row says where it went and why. Pinned place and seed,
 * never drawn.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { traceNode } from "../bench/dev-trace";
import { gameStartDate } from "./game-start";
import { setBookkeeping } from "./bookkeeping";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import { COVERAGE_MODULE_ID } from "./modules/coverage";
import type { MedicalBillRow } from "./medical-bills";

describe("bills go to the town's sellers", { timeout: 100_000 }, () => {
  it("Danville: no household's bill goes to the outside account, and each row says why", () => {
    setBookkeeping(false);
    const world = buildBenchWorld("ilt-danville", gameStartDate(), {
      twoLevel: true,
      placeKey: "4218136",
    });
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 40));
    const rows = coreAPI(world.core)
      .moduleState(COVERAGE_MODULE_ID)
      .table("medicalBills")
      .rows() as unknown as MedicalBillRow[];
    const why = new Map<string, number>();
    for (const row of rows)
      why.set(row.sellerWhy, (why.get(row.sellerWhy) ?? 0) + 1);
    expect(rows.length).toBeGreaterThan(10_000);
    // Households in the clinic's own jurisdiction and in the others both reach it.
    expect(why.get("own-jurisdiction") ?? 0).toBeGreaterThan(0);
    expect(why.get("same-county") ?? 0).toBeGreaterThan(0);
    expect(why.get("outside") ?? 0).toBe(0);
    expect(rows.every((row) => row.sellerId?.startsWith("organization_"))).toBe(
      true,
    );
    // Dev mode's trace opens a bill by its id and shows where it went.
    const far = rows.find((row) => row.sellerWhy === "same-county")!;
    const node = traceNode(world.core, world.director, far.id);
    expect((node.record as MedicalBillRow).sellerWhy).toBe("same-county");
  });
});
