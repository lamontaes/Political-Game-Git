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
import type { PersonId } from "../core2/types";
import { purposeScene } from "../director/purpose-scene";
import { spokenDate } from "../director/words";
import { chooseAtCounter, openBenchFilingVisit } from "./filing";
import { buildBenchWorld } from "./world";

// At the counter in a drawn town the player picks the office and files;
// then the clerk says what comes next from the petition the elections engine
// opened with the filing: how many signatures and the day they are due, or
// that the office takes no petition (owner, Oct 28: filing is a petition,
// signatures, the clerk's check, then the ballot). The clerk says it once,
// in the director's `filing` scene staged from the filing's record (the
// CTO, Nov 1: the clerk speaks once, through the one scene engine), not at
// the counter as well. The player lives alone, the case where the scene
// once waited with nothing it could say.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const WEEKS = 52;

it(`the clerk tells the petition's signatures and due day once, in the scene after filing (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `filing-counter:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const town = core.people.get(core.playerId!)?.placeId;
    // A grown resident who lives alone, so no household talk leads the scene.
    const player = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.placeId === town &&
          row.birthDate < "2000-01-01" &&
          core.households.get(row.householdId)?.memberIds.length === 1,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!player) {
      tried.push(`${where}: nobody grown lives alone`);
      continue;
    }
    const playerId = player.id as PersonId;
    core.playerId = playerId;
    director.watch(core, playerId);
    // A local race the player may file for, as the town's weeks go by.
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
    // A counter the records staff with no one has no clerk to cast in the
    // scene (North Amityville, New York files with its county board of
    // elections and has no town clerk, seed 96f34b32a90f7079):
    // gov-filing-counter-clerk-at-county-board.
    if (!counter.visit.clerkId) {
      tried.push(`${where}: ${filedWith} has no clerk`);
      continue;
    }
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
    // The counter ends on the player's filing: the clerk's petition talk is
    // the scene's, not said at the counter too.
    expect(counter.visit.lines.at(-1)!.speaker, where).toBe("player");
    expect(
      counter.visit.lines.some((line) =>
        line.sourceRecordIds.includes(petition!.id),
      ),
      where,
    ).toBe(false);

    // The director stages the clerk's scene from the filing's record.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const book = director.ledger.people.get(playerId)!;
    const entry = book.schedule.find(
      (row) =>
        row.momentId.includes(`candidate-filed:${result.filing!.id}`) &&
        row.bindings.some((binding) => binding.typeKey === "filing"),
    );
    expect(entry, `${where}: no filing scene staged`).toBeTruthy();
    const scene = purposeScene(core, director, playerId, entry!, {
      typeKey: "filing",
    });
    expect(scene?.kind, `${where}: ${JSON.stringify(scene)}`).toBe("composed");
    if (scene?.kind !== "composed") return;
    const { talk } = scene.scene;
    expect(scene.scene.purpose, where).toBe("filing-petition");
    expect(talk.narration.length, where).toBeGreaterThan(0);
    // The statement is the petition, cited to its record.
    expect(talk.state.slotRecordIds, where).toContain(petition!.id);
    if (petition!.needed > 1) {
      expect(talk.state.text, where).toContain(
        petition!.needed.toLocaleString("en-US"),
      );
      expect(talk.state.text, where).toContain(
        spokenDate(petition!.due, core.date),
      );
    } else if (petition!.needed === 1)
      expect(talk.state.text, where).toMatch(/one signature/);
    else expect(talk.state.text, where).toMatch(/petition|signatures/);
    expect(talk.rounds[0]!.replies.length, where).toBeGreaterThanOrEqual(3);
    process.stdout.write(
      [
        `FILING COUNTER ${where}, run seed ${seed}: ${contest.title} at the ${filedWith}, petition ${petition!.id} (${petition!.needed} needed by ${petition!.due}); scene ${entry!.momentId}`,
        ...counter.intro.map((line) => `Narrator: ${line.text}`),
        ...counter.visit.lines.map((line) => `${line.speaker}: ${line.text}`),
        "-- the clerk's scene --",
        ...talk.lines.map(
          (line) =>
            `${line.role === "narrator" ? "Narrator" : line.speaker}: ${line.text}`,
        ),
      ].join("\n") + "\n",
    );
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 900_000);
