/**
 * An official's aide may be someone who is employed (pool item
 * gov-stopgap-staff-missing-engine): anyone the post pays more than they earn
 * now applies, and taking the post ends their job. A place is drawn from all
 * 56 on a named seed (f1a; STAFF_HIRE_SEED replays another); a year of the played
 * world runs and the books stay balanced. The test fails if no aide in 3
 * places came from a private job. A second test draws on until an aide from a
 * private job was dismissed and checks that post ended with the dismissal.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { departuresSeen, watchDepartures } from "./modules/moves";
import { STAFF_MODULE_ID, type StafferRow } from "./modules/staff";
import { coreAPI } from "./state";

// A named seed, so the test is never red by the draw (owner: never red by
// draw). STAFF_HIRE_SEED replays any other seed. An aide's post ends only by a
// dismissal or by the aide's own recorded move out of the place (a
// `person.moved-away` record on or before the day the post ends); the third
// test pins a place where aides leave, so that path is exercised.
const seed = process.env.STAFF_HIRE_SEED ?? "f1a";
// Dismissals are common (a few per place per 400 days), so a handful of draws suffices.
const MOST_DRAWS = 8;

/** The aide's own move out of the place is on record, on or after the hire and the day the post ends (a mover's job ends the day they leave). */
function leftBefore(
  core: Parameters<typeof departuresSeen>[0],
  row: StafferRow,
  endsAt: string,
): boolean {
  return departuresSeen(core).some(
    (departure) =>
      departure.withIds.includes(row.personId) &&
      departure.date >= row.hiredOn &&
      departure.date <= endsAt &&
      endsAt <= addDays(makeIsoDate(departure.date), 1),
  );
}

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
      watchDepartures(core);
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
        // An official may let an aide go for missing too much work (reviewAttendance), which ends the
        // post: a dismissed aide's post ended on the dismissal (the next day's calendar where they had
        // worked that day), and any other aide's post still runs.
        if (row.dismissed) {
          expect(post.endsAt, `${where}: ${row.id} dismissed`).toBeDefined();
          expect(
            post.endsAt! >= row.dismissed.on &&
              post.endsAt! <= addDays(makeIsoDate(row.dismissed.on), 1),
            `${where}: ${row.id} post ended ${post.endsAt}, dismissed ${row.dismissed.on}`,
          ).toBe(true);
          continue;
        }
        if (post.endsAt !== undefined) {
          expect(
            leftBefore(core, row, post.endsAt),
            `${where}: ${row.id} post ended ${post.endsAt} with no dismissal and no recorded move away`,
          ).toBe(true);
          continue;
        }
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

it("a dismissed aide from a private job has a post that ended with the dismissal", () => {
  setBookkeeping(false);
  const passedOver: string[] = [];
  try {
    for (let draw = 0; draw < MOST_DRAWS; draw += 1) {
      const place = drawPlace(
        `${seed}:dismissed:${draw}`,
        "staff-hire-employed",
      );
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
      const dismissed = staff.filter(
        (row) =>
          row.dismissed &&
          [...core.jobs.values()].some(
            (job) =>
              job.personId === row.personId &&
              job.endsAt === row.hiredOn &&
              !job.id.startsWith("job:public:"),
          ),
      );
      if (!dismissed.length) {
        passedOver.push(
          `${where}: ${staff.length} aides, none dismissed from a job`,
        );
        continue;
      }
      for (const row of dismissed) {
        const post = core.jobs.get(row.jobId!)!;
        expect(post.endsAt, `${where}: ${row.id} dismissed`).toBeDefined();
        expect(
          post.endsAt! >= row.dismissed!.on &&
            post.endsAt! <= addDays(makeIsoDate(row.dismissed!.on), 1),
          `${where}: ${row.id} post ended ${post.endsAt}, dismissed ${row.dismissed!.on}`,
        ).toBe(true);
      }
      process.stdout.write(
        `DISMISSED AIDE seed ${seed}: ${where}: ${dismissed.map((row) => `${row.id} dismissed ${row.dismissed!.on}, post ended ${core.jobs.get(row.jobId!)!.endsAt}`).join("; ")}; passed over ${passedOver.length}: ${passedOver.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `seed ${seed}: no drawn place had an aide dismissed from a private job in ${MOST_DRAWS} draws; passed over: ${passedOver.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

// The leaver path, in a place whose aides left (Agugulu, American Samoa, world
// seed 22f4e9bb...: two aides alive in the inactive tier whose posts ended on
// the day they moved away, with no dismissal).
it("an aide who moves away has a post that ended with a recorded move, not a dismissal", () => {
  setBookkeeping(false);
  const worldSeed =
    "22f4e9bb98e626eff75612873d97593542392255d3450825d036511aa10f1dbe";
  const where = `Agugulu, American Samoa (territory:AS:agugulu), seed ${worldSeed}`;
  try {
    const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
      twoLevel: true,
      placeKey: "territory:AS:agugulu",
    });
    watchDepartures(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 400));
    const staff = coreAPI(core)
      .moduleState(STAFF_MODULE_ID)
      .table("staff")
      .rows() as unknown as StafferRow[];
    const ended = staff.filter(
      (row) =>
        !row.dismissed && core.jobs.get(row.jobId!)?.endsAt !== undefined,
    );
    expect(ended.length, `${where}: aides whose post ended`).toBeGreaterThan(0);
    for (const row of ended)
      expect(
        leftBefore(core, row, core.jobs.get(row.jobId!)!.endsAt!),
        `${where}: ${row.id} post ended ${core.jobs.get(row.jobId!)!.endsAt} with no recorded move away`,
      ).toBe(true);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
