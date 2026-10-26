/**
 * An official's aide may be someone who is employed (pool item
 * gov-stopgap-staff-missing-engine): anyone the post pays more than they earn
 * now applies, and taking the post ends their job. A place is drawn from all
 * 56 on a seed nobody chose (STAFF_HIRE_SEED pins one); a year of the played
 * world runs and the books stay balanced. The test fails if no aide in 3
 * places came from a private job.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { STAFF_MODULE_ID, type StafferRow } from "./modules/staff";
import { coreAPI } from "./state";

const seed = process.env.STAFF_HIRE_SEED ?? randomBytes(8).toString("hex");

it("an aide can come from a private job, which the post's hire ends", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let draw = 0; draw < 3; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "staff-hire-employed");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 400));
      const staff = coreAPI(core)
        .moduleState(STAFF_MODULE_ID)
        .table("staff")
        .rows() as unknown as StafferRow[];
      const fromWork = staff.filter((row) =>
        [...core.jobs.values()].some(
          (job) =>
            job.personId === row.personId &&
            job.endsAt === row.hiredOn &&
            !job.id.startsWith("job:public:"),
        ),
      );
      tried.push(
        `${where}: ${staff.length} aides, ${fromWork.length} from a job`,
      );
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      if (!fromWork.length) continue;
      for (const row of fromWork) {
        expect(row.jobId, `${where}: ${row.id}`).toBeDefined();
        const post = core.jobs.get(row.jobId!)!;
        expect(post.endsAt, `${where}: ${row.id}`).toBeUndefined();
        expect(core.people.get(row.personId)?.jobId, where).toBe(row.jobId);
      }
      console.log(
        `${where}: aides from a job ${fromWork.map((row) => row.id).join(", ")}`,
      );
      return;
    }
    throw new Error(`no aide came from a job: ${tried.join("; ")}; ${seed}`);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
