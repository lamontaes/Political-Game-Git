import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { pressConflict } from "./press-conflict";
import { coreAPI } from "./state";
import { ELECTIONS_MODULE_ID, type FilingRow } from "./modules/elections";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { EXECUTIVE_MODULE_ID, type AppointmentRow } from "./modules/executive";
import { PRESS_MODULE_ID, type OutletRow } from "./modules/press";

// Owner ruling, Oct 14, 2026: a working reporter, an outlet's head or its
// owner may not hold office, appoint or run while working for or owning the
// outlet. Played world: the bench world on a seed nobody chose, run a year.
const seed = process.env.PRESS_SEED ?? randomBytes(8).toString("hex");
console.log(`press-conflict seed ${seed}`);
const opening = "2026-10-12";
const world = buildBenchWorld(seed, opening, { twoLevel: true });
const api = coreAPI(world.core);
const outlets = () =>
  api
    .moduleState(PRESS_MODULE_ID)
    .table("outlets")
    .rows() as unknown as OutletRow[];
const rows = <T>(module: string, name: string) =>
  api.moduleState(module).table(name).rows() as unknown as T[];

describe("press-employment conflict", () => {
  it("names every outlet's owner, head and reporters", () => {
    expect(outlets().length).toBeGreaterThan(0);
    for (const outlet of outlets()) {
      if (outlet.ownerId)
        expect(pressConflict(api, outlet.ownerId)?.role).toBe("owner");
      if (outlet.headId)
        expect(["head", "owner"]).toContain(
          pressConflict(api, outlet.headId)?.role,
        );
      for (const id of outlet.reporterIds)
        expect(pressConflict(api, id)).not.toBeNull();
    }
    const staff = new Set(
      outlets().flatMap((o) => [o.ownerId, o.headId, ...o.reporterIds]),
    );
    const outsider = [...api.state.people.keys()].find((id) => !staff.has(id));
    expect(outsider).toBeDefined();
    expect(pressConflict(api, outsider!)).toBeNull();
  });

  describe("after a year of play", () => {
    const yearEnd = `${Number(opening.slice(0, 4)) + 1}${opening.slice(4)}`;
    let date = opening;
    while (date < yearEnd) {
      date = new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
        .toISOString()
        .slice(0, 10);
      advanceCore(world.core, date);
    }
    const where = `seed ${seed}, ${world.core.placeMetadata.placeName}`;

    it("no appointment's holder works for or owns an outlet", () => {
      for (const row of rows<AppointmentRow>(
        EXECUTIVE_MODULE_ID,
        "appointments",
      ))
        expect(
          pressConflict(api, row.holderId),
          `${row.id} ${where}`,
        ).toBeNull();
    });

    it("WIRING-DEPENDENT (offices.ts suitedResidents): no term's holder is press staff", () => {
      for (const term of rows<TermRow>(OFFICES_MODULE_ID, "terms"))
        if (term.personId)
          expect(
            pressConflict(api, term.personId),
            `${term.id} ${where}`,
          ).toBeNull();
    });

    it("WIRING-DEPENDENT (elections.ts checkEligibility): no on-ballot filing is by press staff", () => {
      for (const filing of rows<FilingRow>(ELECTIONS_MODULE_ID, "filings"))
        if (filing.status === "on-ballot")
          expect(
            pressConflict(api, filing.personId),
            `${filing.id} ${where}`,
          ).toBeNull();
    });
  });
});
