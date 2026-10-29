import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  checkEligibility,
  filingOfficeFor,
  openContests,
  petitionOf,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import { spokenDate } from "../director/words";
import { chooseAtCounter, openBenchFilingVisit } from "./filing";
import { buildBenchWorld } from "./world";

// At the counter in a drawn town, once the player files, the clerk says what
// comes next from the petition the elections engine opened with the filing:
// how many signatures and the day they are due, or that the office takes no
// petition (owner, Oct 28: filing is a petition, signatures, the clerk's
// check, then the ballot). The narrator's setup at the counter is the
// director's, read from the filing-clerk scene.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const WEEKS = 52;

it(`the clerk tells the petition's signatures and due day once the player files (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `filing-counter:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    if (!playerId) {
      tried.push(`${where}: no player`);
      continue;
    }
    core.playerId = playerId;
    const api = coreAPI(core);
    // A local race the new adult may file for, as the town's weeks go by.
    const open = () =>
      openContests(api).find(
        (row) =>
          row.level !== "federal" &&
          row.level !== "state" &&
          checkEligibility(api, playerId, row.id).every((check) => check.met),
      );
    let contest = open();
    for (let week = 0; week < WEEKS && !contest; week += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      contest = open();
    }
    if (!contest) {
      tried.push(`${where}: no local race the player may file for`);
      continue;
    }
    const filedWith = filingOfficeFor(api, contest.id).filedWith;
    let counter = openBenchFilingVisit(core, playerId, filedWith, 10 * 60);
    counter = chooseAtCounter(core, counter, `pick:${contest.id}`);
    counter = chooseAtCounter(core, counter, "file", {
      platform: [`${PLATFORM_QUESTIONS[0]}=1`],
    });
    const result = counter.result as {
      status: string;
      filing?: { id: string };
    };
    expect(result.status, where).not.toBe("refused");
    const petition = petitionOf(api, result.filing!.id);
    expect(petition, `${where}: ${result.filing!.id}`).toBeTruthy();
    const last = counter.visit.lines.at(-1)!;
    expect(last.speaker, where).toBe("clerk");
    expect(last.sourceRecordIds, where).toContain(petition!.id);
    if (petition!.needed > 1) {
      expect(last.text, where).toContain(
        petition!.needed.toLocaleString("en-US"),
      );
      expect(last.text, where).toContain(spokenDate(petition!.due, core.date));
    } else if (petition!.needed === 1)
      expect(last.text, where).toMatch(/one signature/);
    process.stdout.write(
      [
        `FILING COUNTER ${where}, run seed ${seed}: ${contest.title} at the ${filedWith}, petition ${petition!.id} (${petition!.needed} needed by ${petition!.due})`,
        ...counter.intro.map((line) => `Narrator: ${line.text}`),
        ...counter.visit.lines.map((line) => `${line.speaker}: ${line.text}`),
      ].join("\n") + "\n",
    );
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 900_000);
