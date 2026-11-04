/**
 * The first time a player files, the clerk asks whether they have run a
 * campaign before, and a no walks them through it from the place's records:
 * the petition's signatures and due day, and the town's own paper, whose ad
 * time a campaign buys and whose reporters cover the race (owner, Nov 1:
 * "do you know how to run a campaign? ... That's how the tutorials should
 * work in the game"). A yes skips it, and a second filing is not asked again.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
  filingOfficeFor,
  petitionOf,
  playerContests,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { townOutlet } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "../director/purpose-scene";
import { chooseAtCounter, openBenchFilingVisit } from "./filing";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 4;
const ASKS = /run a campaign|campaign before|done this before/;

it(`the first filing asks about running a campaign and walks a no through it; a second filing does not ask (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `filing-walkthrough:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const town = core.people.get(core.playerId!)?.placeId;
    // A grown resident who lives alone, so no household talk leads the scene,
    // with two races they may file for.
    const player = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.placeId === town &&
          row.birthDate < "1990-01-01" &&
          core.households.get(row.householdId)?.memberIds.length === 1 &&
          // Who has never filed: the question is for a life's first filing.
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("filings")
            .query("byPerson", [row.id]).length === 0,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!player) {
      tried.push(`${where}: nobody grown lives alone`);
      continue;
    }
    const playerId = player.id as PersonId;
    core.playerId = playerId;
    director.watch(core, playerId);
    // Races whose counter names someone: the director casts the clerk from
    // the records and never invents one, so a race filed where no record
    // names a clerk has no clerk's scene (a county board with no staff on
    // record, gov-filing-counter-clerk-at-county-board; Trucksville,
    // Pennsylvania at seed d17e9b4a9dc4455a).
    const races = () =>
      playerContests(api).filter(
        (row) =>
          checkEligibility(api, playerId, row.id).every((check) => check.met) &&
          filingClerkFor(api, row.id) !== null,
      );
    // Filing opens on a set day (elections-filing-window-opens): the weeks go
    // by until two races the player may file for are open.
    for (let week = 0; week < 104 && races().length < 2; week += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    if (races().length < 2) {
      tried.push(
        `${where}: fewer than two races to file for with a clerk on record`,
      );
      continue;
    }
    // File, then the clerk's scene the next day.
    const fileAndHear = (contestId: string) => {
      const filedWith = filingOfficeFor(api, contestId).filedWith;
      let counter = openBenchFilingVisit(core, playerId, filedWith, 10 * 60);
      counter = chooseAtCounter(core, counter, `pick:${contestId}`);
      counter = chooseAtCounter(core, counter, "file", {
        platform: [`${PLATFORM_QUESTIONS[0]}=1`],
      });
      const filing = (counter.result as { filing: { id: string } }).filing;
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const entry = director.ledger.people
        .get(playerId)!
        .schedule.find((row) =>
          row.momentId.includes(`candidate-filed:${filing.id}`),
        );
      expect(entry, `${where}: no moment for ${filing.id}`).toBeTruthy();
      // The clerk's scene, where the director staged one for this filing.
      if (!entry!.bindings.some((binding) => binding.typeKey === "filing"))
        return { filing, talk: null };
      const scene = purposeScene(core, director, playerId, entry!, {
        typeKey: "filing",
      });
      expect(scene?.kind, `${where}: ${JSON.stringify(scene)}`).toBe(
        "composed",
      );
      if (scene?.kind !== "composed") throw new Error("not composed");
      return { filing, talk: scene.scene.talk };
    };
    const heard = fileAndHear(races()[0]!.id);
    expect(heard.talk, `${where}: the first filing's scene`).toBeTruthy();
    const first = { filing: heard.filing, talk: heard.talk! };
    const petition = petitionOf(api, first.filing.id)!;
    process.stdout.write(
      `${where} first filing, the clerk: ${first.talk.state.text}\n`,
    );
    // The question, with the petition the filing opened.
    expect(first.talk.state.text, where).toMatch(ASKS);
    expect(first.talk.state.slotRecordIds, where).toContain(petition.id);
    // A no walks the player through it from the records; a yes skips it.
    const no = first.talk.tree.replies.find((row) => row.line.move === "ask");
    const yes = first.talk.tree.replies.find(
      (row) => row.line.move === "agree",
    );
    expect(no, `${where}: a reply asking for help`).toBeTruthy();
    expect(yes, `${where}: a reply that knows how`).toBeTruthy();
    const walk = no!.next!.lines.find((line) => line.role !== "narrator")!;
    process.stdout.write(
      `${where} the player: ${no!.line.text}\n${where} the clerk: ${walk.text}\n${where} or the player: ${yes!.line.text} / the clerk: ${yes!.next?.lines[0]?.text ?? ""}\n`,
    );
    expect(walk.text, where).toMatch(/doors/i);
    expect(walk.text, where).toMatch(/money/);
    // The town's own paper, where the town has one, by its record.
    const local = townOutlet(api);
    const outlet = local?.kind === "newspaper" ? local : null;
    const paper = outlet
      ? core.organizations
          .get(outlet.organizationId)
          ?.name?.replace(/^The /, "")
      : undefined;
    if (outlet && paper) {
      expect(walk.text, where).toContain(paper);
      expect(walk.slotRecordIds, where).toContain(outlet.id);
    }
    // The statement named the petition's count and due day, by its record.
    if (petition.needed > 1)
      expect(first.talk.state.text, where).toContain(
        petition.needed.toLocaleString("en-US"),
      );
    expect(
      yes!.next?.lines.map((line) => line.text).join(" ") ?? "",
      where,
    ).not.toMatch(/doors/i);
    // A second filing in the same life is not asked again.
    // The first race is filed, so it is no longer offered.
    const next = races()[0];
    if (!next) {
      tried.push(`${where}: no second race after the first filing`);
      continue;
    }
    // The director stages the clerk's scene once a life, so a second filing
    // usually has none; where it has one, it does not ask again.
    const second = fileAndHear(next.id);
    process.stdout.write(
      `${where} second filing, the clerk: ${second.talk?.state.text ?? "(no scene)"}\n`,
    );
    expect(second.talk?.state.text ?? "", where).not.toMatch(ASKS);
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 900_000);
