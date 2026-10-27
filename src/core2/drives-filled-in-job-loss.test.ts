/**
 * Pool item drives-counted-job-loss-unanswered: a layoff of a job that lives
 * in the counted books used to name its worker only as the event's counted
 * subject, even when the worker had been filled in since the hire. The
 * drives engine answers a counted subject only while they are counted, and a
 * full person only when the event names them (so they learn of it), so such
 * a worker's job loss drew no response at all. The layoff now names a full
 * worker as a person. Steamboat Springs, Colorado, the M1-11 runner draw
 * where eleven such job losses on January 1, 2026 went unanswered.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { drivesReport, type FormationTrace } from "./modules/drives";
import { coreAPI } from "./state";

const PLACE = {
  seed: "2fed679e253cf36aec36b937cf2d408b729b11e382abb5ea7600a670f788f4d7",
  key: "0873825",
  name: "Steamboat Springs, Colorado",
};
const REPORTED =
  "event:work.job-lost:2026-01-01:job:position:organization_b0eef0bdf7979a4c:2025-11-01:4:person_ba5ccd780f702e60:counted:2026-01-01";

it("every job loss draws its worker's response once, a filled-in worker's counted job included", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const where = `${PLACE.name} (${PLACE.key}) seed ${PLACE.seed}`;
  // Every response the engine records, kept whole (its own list is bounded).
  const answers: FormationTrace[] = [];
  const kept = drivesReport(core).decisions;
  const push = kept.push.bind(kept);
  kept.push = (...rows: FormationTrace[]) => {
    answers.push(...rows);
    return push(...rows);
  };
  // Each job loss's worker, as the event names them, and whether they were
  // full while the job they lost lived in the counted books.
  const losses: { id: string; personId: string; filledIn: boolean }[] = [];
  coreAPI(core).subscribeEvents(
    "filled-in-job-loss",
    ["work.job-lost"],
    (_api, event) => {
      const personId = event.personIds[0] ?? event.facts?.["counted-subject"];
      if (!personId) return;
      losses.push({
        id: event.id,
        personId,
        filledIn:
          core.people.has(personId as never) && event.id.includes(":counted:"),
      });
    },
  );
  advanceCore(core, "2026-01-02");
  expect(
    losses.some((row) => row.filledIn),
    `${where}: no filled-in worker lost a counted job`,
  ).toBe(true);
  expect(losses.map((row) => row.id)).toContain(REPORTED);
  for (const row of losses) {
    const theirs = answers.filter(
      (a) =>
        a.eventId === row.id &&
        a.personId === row.personId &&
        a.role === "subject",
    );
    expect(theirs.length, `${where}: ${row.id} (${row.personId})`).toBe(1);
  }
}, 900_000);

// The same rule in places drawn from all 56: the runner's place when it set
// one, else fresh draws. A place where no filled-in worker lost a counted job
// in a year has nothing to show and is redrawn, up to three places; one of
// them must show it, and every job loss in each must draw its worker's
// response once.
it("in drawn places, a filled-in worker who loses a counted job answers it", () => {
  setBookkeeping(false);
  const runner = process.env.GOLDEN_PATH_SEED;
  const base = runner ?? randomBytes(16).toString("hex");
  const tried: string[] = [];
  let witness: { where: string; event: string; response: string } | undefined;
  for (let n = 0; n < 3 && !witness; n++) {
    const drawn = drawPlace(n ? `${base}:${n}` : base, "filled-in-job-loss");
    const placeKey =
      n === 0 && runner && process.env.GOLDEN_PATH_PLACE_KEY
        ? process.env.GOLDEN_PATH_PLACE_KEY
        : drawn.key;
    const seed = n === 0 && runner ? runner : drawn.seed;
    const { core, place } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey,
    });
    const where = `${place.displayName} (${place.key}) seed ${seed}`;
    // The engine makes its list when it first answers anyone: watch the live
    // list from the moment it exists.
    const answers: FormationTrace[] = [];
    let watched: FormationTrace[] | undefined;
    const watch = (held: boolean) => {
      const report = drivesReport(core);
      if (report.perceived === undefined || report.decisions === watched)
        return;
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
    const losses: { id: string; personId: string; filledIn: boolean }[] = [];
    coreAPI(core).subscribeEvents(
      "filled-in-job-loss-drawn",
      ["work.job-lost"],
      (_api, event) => {
        watch(true);
        const personId = event.personIds[0] ?? event.facts?.["counted-subject"];
        if (!personId) return;
        losses.push({
          id: event.id,
          personId,
          filledIn:
            core.people.has(personId as never) &&
            event.id.includes(":counted:"),
        });
      },
    );
    advanceCore(core, "2026-01-02");
    watch(true);
    tried.push(where);
    for (const row of losses) {
      const theirs = answers.filter(
        (a) =>
          a.eventId === row.id &&
          a.personId === row.personId &&
          a.role === "subject",
      );
      expect(theirs.length, `${where}: ${row.id} (${row.personId})`).toBe(1);
      if (row.filledIn && !witness)
        witness = {
          where,
          event: row.id,
          response: `${theirs[0]!.personId} ${theirs[0]!.chosen.responseId}`,
        };
    }
  }
  console.log(
    `filled-in-job-loss drawn: ${JSON.stringify({ tried, witness })}`,
  );
  expect(
    witness,
    `no filled-in worker lost a counted job in ${tried.join("; ")}`,
  ).toBeDefined();
}, 2_400_000);
