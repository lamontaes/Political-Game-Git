/**
 * An official's referral is read by the jobs engine (pool item
 * gov-stopgap-constituent-cases-missing-engine): in a random place from all
 * 56, the town as the player gets it. A resident looking for work is helped by
 * an official; the referral is on record, counts in the applicant's fit for as
 * long as it lasts, and fades to nothing.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { allCases, handleCase } from "./modules/constituent-cases";
import { referralStanding } from "./modules/jobs";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it("a referred job seeker carries the official's word to employers, and it fades", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "case-referral-read");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  let referred: ReturnType<typeof allCases>[number] | undefined;
  for (let week = 0; week < 20 && !referred; week += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    referred = allCases(api).find(
      (c) => c.problem === "looking-for-work" && c.status === "open",
    );
  }
  if (!referred) {
    console.log(`case-referral-read: no job-search case in ${where}`);
    return;
  }
  expect(referralStanding(api, referred.personId), where).toBe(0);
  const done = handleCase(api, referred.id, "help")!;
  expect(done.outcome, where).toBe("referred-to-workforce-office");
  // Counted in the applicant's fit the day it is given, and fading evenly.
  expect(referralStanding(api, referred.personId), where).toBe(1);
  advanceCore(core, addDays(makeIsoDate(core.date), 45));
  const half = referralStanding(api, referred.personId);
  expect(half, where).toBeGreaterThan(0);
  expect(half, where).toBeLessThan(1);
  advanceCore(core, addDays(makeIsoDate(core.date), 60));
  expect(referralStanding(api, referred.personId), where).toBe(0);
}, 600_000);
