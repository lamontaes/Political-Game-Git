import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  checkEligibility,
  contestOf,
  fileCandidacy,
  filingOfficeFor,
  filingsOfPerson,
  playerContests,
  racesOpenTo,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { buildBenchWorld } from "./world";

// The elections door's "races open to a person": the filing counter's choices
// are the races the player-offices rule offers, less the races the player
// already stands in, and a race filed in is never offered again (P1, Commack,
// New York: the clerk offered the race the player was in). The test files in
// a drawn place and reads the door before and after.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const WEEKS = 52;

it(`a race the player stands in is no longer a race open to them (seed ${seed})`, () => {
  setBookkeeping(false);
  const passedOver: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `races-open-to:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const me = playerId as PersonId;
    const fileable = () =>
      racesOpenTo(api, me).find(
        (row) =>
          row.level !== "federal" &&
          row.level !== "state" &&
          checkEligibility(api, me, row.id).every((check) => check.met),
      );
    let contest = fileable();
    for (let week = 0; week < WEEKS && !contest; week += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      contest = fileable();
    }
    if (!contest) {
      passedOver.push(
        `${where}: no local race open to the player by ${core.date}`,
      );
      continue;
    }
    // With no filing the door offers what the player-offices rule offers.
    expect(
      filingsOfPerson(api, me).filter((f) => f.status !== "withdrawn"),
      where,
    ).toEqual([]);
    expect(
      racesOpenTo(api, me).map((row) => row.id),
      where,
    ).toEqual(playerContests(api).map((row) => row.id));
    // The door answers by the office that takes the filing.
    const filedWith = filingOfficeFor(api, contest.id).filedWith;
    const here = racesOpenTo(api, me, filedWith);
    expect(
      here.map((row) => row.id),
      where,
    ).toContain(contest.id);
    for (const row of here)
      expect(filingOfficeFor(api, row.id).filedWith, where).toBe(filedWith);
    expect(contestOf(api, contest.id)?.id, where).toBe(contest.id);

    const filed = fileCandidacy(api, {
      personId: me,
      contestId: contest.id,
      platform: [`${PLATFORM_QUESTIONS[0]}=1`],
    });
    expect(filed.status, where).not.toBe("refused");
    expect(
      filingsOfPerson(api, me).map((f) => f.contestId),
      where,
    ).toContain(contest.id);
    // Filed in: still a race the rule offers, no longer one open to this person.
    expect(
      playerContests(api).map((row) => row.id),
      where,
    ).toContain(contest.id);
    expect(
      racesOpenTo(api, me).map((row) => row.id),
      where,
    ).not.toContain(contest.id);
    expect(
      racesOpenTo(api, me, filedWith).map((row) => row.id),
      where,
    ).not.toContain(contest.id);
    process.stdout.write(
      `races-open-to: ${where}, ${contest.id}; passed over: ${passedOver.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `no place offered a race to file for in ${ATTEMPTS} draws: ${passedOver.join("; ")}`,
  );
}, 1_800_000);
