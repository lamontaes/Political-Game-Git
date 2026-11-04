import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  filingDeadlineFor,
  filingOfficeFor,
  openContests,
  playerContests,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import { spokenDate } from "../director/words";
import { chooseAtCounter, openBenchFilingVisit } from "./filing";
import { buildBenchWorld } from "./world";

// One deadline per contest (filing-clerk-deadline-differs-from-rules): at
// every counter in a drawn town, for every race it offers, the clerk's
// deadline line, the panel's deadline and the panel's deadline rule name the
// same day, the one `filingDeadlineFor` gives (Goulding, Florida, once told
// April 24, 2026 at the counter and June 12, 2026 on the panel).
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`one-deadline:${Date.now()}`).digest("hex");
const ATTEMPTS = 4;

it(`the clerk and the panel give one deadline for every race at every counter (seed ${runSeed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(runSeed, `one-deadline:${attempt}`);
    const where = `${place.name} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const me = core.playerId!;
    // The weeks go by until a counter offers a race (filing opens on the
    // place's own calendar).
    for (let week = 0; week < 104 && !playerContests(api).length; week += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const offered = playerContests(api);
    if (!offered.length) {
      tried.push(`${where}: no race offered in two years`);
      continue;
    }
    const counters = new Set(
      offered.map((row) => filingOfficeFor(api, row.id).filedWith),
    );
    let walked = 0;
    for (const filedWith of counters) {
      const picks = openBenchFilingVisit(
        core,
        me,
        filedWith,
        10 * 60,
      ).visit.choices.filter((row) => row.action.kind === "pick");
      for (const choice of picks) {
        const contestId = (choice.action as { contestId: string }).contestId;
        const contest = openContests(api).find((row) => row.id === contestId)!;
        const deadline = filingDeadlineFor(api, contest, "party");
        const said = spokenDate(deadline, core.date);
        // A fresh visit for each race: picking one tells that race only.
        const visit = chooseAtCounter(
          core,
          openBenchFilingVisit(core, me, filedWith, 10 * 60),
          choice.key,
        );
        const at = `${contestId} at ${filedWith} in ${where} on ${core.date}`;
        expect(
          visit.visit.lines.some(
            (line) => line.speaker === "clerk" && line.text.includes(said),
          ),
          `${at}: the clerk does not say ${said}: ${JSON.stringify(visit.visit.lines.map((l) => l.text))}`,
        ).toBe(true);
        expect(visit.overlay!.filingDeadline, at).toBe(deadline);
        const rule = visit.overlay!.checks.find(
          (row) => row.rule === "filing-deadline",
        );
        expect(rule, at).toBeTruthy();
        expect(
          rule!.required.endsWith(deadline),
          `${at}: ${rule!.required}`,
        ).toBe(true);
        walked += 1;
      }
    }
    expect(walked, `no race walked in ${where}`).toBeGreaterThan(0);
    process.stdout.write(
      `ONE DEADLINE ${where} on ${core.date}: ${walked} races at ${counters.size} counters, one date each${tried.length ? `; passed over: ${tried.join("; ")}` : ""}\n`,
    );
    return;
  }
  expect.fail(tried.join("; "));
}, 900_000);
