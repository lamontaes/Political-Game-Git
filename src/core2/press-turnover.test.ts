import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { PRESS_MODULE_ID } from "./modules/press";
import { coreAPI } from "./state";

// A reporter who leaves is replaced through the jobs engine and the hire
// appears on the masthead (pool item gov-stopgap-press-faked-mechanic, the
// staff-turnover half): in the played world, in places drawn from all 56 on a
// seed nobody chose (PRESS_TURNOVER_SEED pins one), over a year.
const seed = process.env.PRESS_TURNOVER_SEED ?? randomBytes(8).toString("hex");
const maxPlaces = 4;

interface Staff {
  id: string;
  outletId: string;
  role: string;
  jobId: string | null;
  hiredOn: string;
  leftOn?: string;
  leftBecause?: string;
}
interface Position {
  id: string;
  organizationId: string;
  status: string;
  openedAt: string;
  replacesPersonId?: string;
  filledBy?: string;
}

describe("press staff turnover", () => {
  it("replaces a reporter who left through a jobs hire that reaches the masthead", () => {
    setBookkeeping(false);
    const proof: string[] = [];
    let replaced = 0;
    for (let i = 0; i < maxPlaces; i += 1) {
      const place = drawPlace(i ? `${seed}:${i}` : seed, "press-turnover");
      const world = buildBenchWorld(place.seed, "2026-10-12", {
        twoLevel: true,
        placeKey: place.key,
      });
      for (let day = 0; day < 365; day += 1)
        advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
      const api = coreAPI(world.core);
      const staff = api
        .moduleState(PRESS_MODULE_ID)
        .table("staff")
        .rows() as unknown as Staff[];
      const positions = api
        .moduleState("jobs")
        .table("positions")
        .rows() as unknown as Position[];
      // Every opening the jobs engine filled at a press outlet puts the hire
      // on a masthead (a person who moves on to another outlet later is on
      // that one), as a reporter or editor.
      for (const opening of positions.filter(
        (row) =>
          row.organizationId.startsWith("organization:press:") &&
          row.status === "filled" &&
          row.filledBy,
      )) {
        const hire = staff.find(
          (row) => row.id === opening.filledBy && row.jobId !== null,
        );
        expect(
          hire,
          `the hire ${opening.filledBy} for ${opening.id} on the masthead in ${place.name} (${place.key})`,
        ).toBeTruthy();
        replaced += 1;
        const gone = staff.find((row) => row.id === opening.replacesPersonId);
        proof.push(
          `${place.name} (${place.key}): ${opening.id} replaces ${opening.replacesPersonId}${gone?.leftOn ? ` (left ${gone.leftOn}, ${gone.leftBecause})` : ""}, filled by ${opening.filledBy}, hired ${hire!.hiredOn}`,
        );
      }
      if (replaced > 0) break;
    }
    console.log(`press turnover: seed ${seed}; ${proof.join(" | ")}`);
    expect(
      replaced,
      `a press opening filled in ${maxPlaces} places (seed ${seed})`,
    ).toBeGreaterThan(0);
  }, 1_800_000);
});
