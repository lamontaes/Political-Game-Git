/**
 * Pool item drives-counted-job-loss-unanswered: a layoff of a job that lived
 * in the counted books used to name its worker only as the event's counted
 * subject, even when the worker had been filled in since the hire. The
 * drives engine answers a counted subject only while they are counted, and a
 * full person only when the event names them (so they learn of it), so such
 * a worker's job loss drew no response at all. The layoff now names a full
 * worker as a person.
 *
 * The case is found the way the engines keep it (Nov 12, 2026): filling a
 * worker in moves their counted job into the full books under the same id
 * (src/core2/state.ts, the fill-in), so a filled-in worker's counted job is a
 * job lost by a full person whose id was once in the counted books (the
 * residents engine's `jobs`). The event id no longer marks it: no layoff
 * carried `:counted:` in 740 job losses over two years in Steamboat Springs,
 * Colorado. The case is rare (in six months there, 0 of about 70 filled-in
 * workers lost a job), so the first test waits for it a month at a time and
 * then draws places, naming every place it passed over.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { drivesReport, type FormationTrace } from "./modules/drives";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

/** The labeled first place: the M1-11 runner draw where eleven such job losses on January 1, 2026 once went unanswered. */
const PLACE = {
  seed: "2fed679e253cf36aec36b937cf2d408b729b11e382abb5ea7600a670f788f4d7",
  key: "0873825",
};
/** How long a place is waited on for the case, a month at a time. */
const WAIT_UNTIL = "2026-01-02";
/** Places drawn after the labeled one when it does not hold the case. */
const DRAWS = 3;
const MONTH_DAYS = 30;

interface Loss {
  id: string;
  personId: string;
  filledIn: boolean;
}

/**
 * Plays one place a month at a time to `until`, stopping early once `stop`
 * says so. Keeps every job loss, whether its worker was filled in and lost a
 * job from the counted books, and every response the drives engine records.
 */
function play(
  seed: string,
  placeKey: string,
  until: string,
  stop: (losses: readonly Loss[]) => boolean,
) {
  setBookkeeping(false);
  const { core, place } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const where = `${place.displayName} (${place.key}) seed ${seed}`;
  const rt = residentsRuntime(core)!;
  // Every job id the counted books have held, read at the opening and at
  // each month's step (a fill-in moves the job to the full books).
  const countedOnce = new Set<string>();
  const readBooks = () => {
    for (const id of rt.jobs.keys()) countedOnce.add(id);
  };
  readBooks();
  // The engine makes its list when it first answers anyone: watch the live
  // list from the moment it exists.
  const answers: FormationTrace[] = [];
  let watched: FormationTrace[] | undefined;
  const watch = (held: boolean) => {
    const report = drivesReport(core);
    if (report.perceived === undefined || report.decisions === watched) return;
    const kept = report.decisions;
    if (held) answers.push(...kept);
    const push = kept.push.bind(kept);
    kept.push = (...rows: FormationTrace[]) => {
      answers.push(...rows);
      return push(...rows);
    };
    watched = kept;
  };
  watch(false);
  const losses: Loss[] = [];
  coreAPI(core).subscribeEvents(
    "filled-in-job-loss",
    ["work.job-lost"],
    (_api, event) => {
      watch(true);
      const personId = event.personIds[0] ?? event.facts?.["counted-subject"];
      if (!personId) return;
      const jobId = /^job-change:\d{4}-\d{2}-\d{2}:(.+):layoff$/.exec(
        String(event.facts?.jobChangeId ?? ""),
      )?.[1];
      losses.push({
        id: event.id,
        personId,
        filledIn:
          core.people.has(personId as never) &&
          jobId !== undefined &&
          countedOnce.has(jobId),
      });
    },
  );
  while (core.date < until && !stop(losses)) {
    const next = addDays(makeIsoDate(core.date), MONTH_DAYS);
    advanceCore(core, next < until ? next : until);
    readBooks();
  }
  watch(true);
  return { where, reached: core.date, losses, answers };
}

/** Each job loss draws its worker's response exactly once. */
function answeredOnce(
  where: string,
  losses: readonly Loss[],
  answers: readonly FormationTrace[],
) {
  for (const row of losses) {
    const theirs = answers.filter(
      (a) =>
        a.eventId === row.id &&
        a.personId === row.personId &&
        a.role === "subject",
    );
    expect(theirs.length, `${where}: ${row.id} (${row.personId})`).toBe(1);
  }
  return answers;
}

it("every job loss draws its worker's response once, a filled-in worker's counted job included", () => {
  const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
  const passedOver: string[] = [];
  for (let n = 0; n <= DRAWS; n++) {
    const drawn = n ? drawPlace(`${base}:${n}`, "filled-in-job-loss") : null;
    const run = play(
      drawn ? drawn.seed : PLACE.seed,
      drawn ? drawn.key : PLACE.key,
      WAIT_UNTIL,
      (losses) => losses.some((row) => row.filledIn),
    );
    const found = run.losses.filter((row) => row.filledIn);
    if (!found.length) {
      passedOver.push(
        `${run.where}: to ${run.reached}, ${run.losses.length} job losses, none a filled-in worker's counted job`,
      );
      continue;
    }
    expect(
      found.length,
      `${run.where}: no filled-in worker lost a counted job`,
    ).toBeGreaterThan(0);
    answeredOnce(run.where, run.losses, run.answers);
    process.stdout.write(
      `FILLED-IN JOB LOSS ${run.where}: ${found[0]!.id} (${found[0]!.personId}) by ${run.reached}; passed over: ${passedOver.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `no filled-in worker lost a counted job in any place: ${passedOver.join("; ")}`,
  );
}, 3_600_000);

// The same rule in places drawn from all 56: the runner's place when it set
// one, else fresh draws. Every job loss in each of three places must draw its
// worker's response once, a filled-in worker's counted job included whenever
// the place has one; the drawn places do not require one (the test above
// waits for its witness), and a witness found here is only logged.
it("in drawn places, a filled-in worker who loses a counted job answers it", () => {
  const runner = process.env.GOLDEN_PATH_SEED;
  const base = runner ?? randomBytes(16).toString("hex");
  const tried: string[] = [];
  let witness: string | undefined;
  for (let n = 0; n < 3; n++) {
    const drawn = drawPlace(n ? `${base}:${n}` : base, "filled-in-job-loss");
    const placeKey =
      n === 0 && runner && process.env.GOLDEN_PATH_PLACE_KEY
        ? process.env.GOLDEN_PATH_PLACE_KEY
        : drawn.key;
    const seed = n === 0 && runner ? runner : drawn.seed;
    const run = play(seed, placeKey, "2026-01-02", () => false);
    tried.push(run.where);
    answeredOnce(run.where, run.losses, run.answers);
    const row = run.losses.find((loss) => loss.filledIn);
    if (row && !witness) witness = `${run.where}: ${row.id} (${row.personId})`;
  }
  process.stdout.write(
    `filled-in-job-loss drawn: ${JSON.stringify({ tried, witness })}\n`,
  );
  expect(tried.length, "three places drawn and checked").toBe(3);
}, 2_400_000);
