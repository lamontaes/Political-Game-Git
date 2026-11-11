/**
 * An official takes on no aide the town pays nothing (pool item gov-staff-review-hires-unpaid-aide):
 * the monthly review reads the money the staff line actually has, so every serving aide has a paid
 * post (a job on the payroll). Played worlds of places drawn from all 56, and the item's named small
 * town, a labeled case.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { STAFF_MODULE_ID, type StafferRow } from "./modules/staff";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const cases = [
  { label: "drawn a", place: drawPlace(`${base}-a`, "staff-no-unpaid") },
  { label: "drawn b", place: drawPlace(`${base}-b`, "staff-no-unpaid") },
  {
    label: "the item's small town",
    place: {
      key: "3708140",
      name: "Brookford, North Carolina",
      seed: "brookford-1",
    },
  },
];

for (const { label, place } of cases)
  it(
    `every serving aide is on the payroll: ${label}, ${place.name} [${place.key}], seed ${place.seed}`,
    { timeout: 900_000 },
    () => {
      setBookkeeping(false);
      const where = `${place.name} [${place.key}], seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 400));
      const staff = (
        coreAPI(core)
          .moduleState(STAFF_MODULE_ID)
          .table("staff")
          .rows() as unknown as StafferRow[]
      ).filter((row) => !row.dismissed);
      for (const row of staff) {
        expect(row.jobId, `${where}: ${row.id} has no paid post`).toBeDefined();
        expect(core.jobs.get(row.jobId!), `${where}: ${row.id}`).toBeTruthy();
      }
    },
  );
