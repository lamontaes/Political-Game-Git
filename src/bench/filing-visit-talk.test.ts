/**
 * The clerk's counter as the owner played it (Nov 1, Northampton,
 * Massachusetts): the first visit is to ask for the papers, not to arrive
 * with them; the clerk answers in connected sentences, naming the place's own
 * council or board; the player's reply is what they say, and the transcript
 * never shows a line they did not choose; a return with the petition is told
 * from the filing's record.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import {
  checkEligibility,
  filingOfficeFor,
  playerContests,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import controls from "./data/controls.json" with { type: "json" };
import { chooseAtCounter, openBenchFilingVisit } from "./filing";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

/**
 * What the talk box shows on a reply's button: the control's own label where
 * the controls give one (`replies` in play.mjs), else the reply itself.
 */
const shown = (choice: { control: string; text: string }) =>
  (controls as { filing?: Record<string, unknown> }).filing?.[
    choice.control
  ] === undefined
    ? choice.text
    : String(
        (controls as { filing: Record<string, unknown> }).filing[
          choice.control
        ],
      );
const ATTEMPTS = 3;

it(`a first visit asks for the papers, the player says only what they chose, and a return brings the petition (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `filing-visit-talk:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // A grown resident of the player's town, old enough for a local office.
    const town = core.people.get(playerId!)?.placeId;
    const grown = [...core.people.values()]
      .filter(
        (row) =>
          row.alive && row.placeId === town && row.birthDate < "1990-01-01",
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const pair = grown
      .map((person) => ({
        person,
        contest: playerContests(api).find(
          (row) =>
            row.level !== "federal" &&
            row.level !== "state" &&
            checkEligibility(api, person.id, row.id).every(
              (check) => check.met,
            ),
        ),
      }))
      .find((row) => row.contest);
    if (!pair) {
      tried.push(`${where}: no local race a grown resident may file for`);
      continue;
    }
    const me = pair.person.id as PersonId;
    core.playerId = me;
    const filedWith = filingOfficeFor(api, pair.contest!.id).filedWith;
    let state = openBenchFilingVisit(core, me, filedWith, 10 * 60);
    if (!state.visit.clerkId) {
      tried.push(`${where}: ${filedWith} has no clerk`);
      continue;
    }
    // The first visit: no folder of forms, no petition yet.
    const intro = state.intro.map((line) => line.text).join(" ");
    process.stdout.write(`${where} ${filedWith} first visit: ${intro}\n`);
    expect(intro, where).not.toMatch(/folder|petition/);
    // Every reply the player is shown, as the talk box labels it, and every
    // line the player says.
    const offered = new Set(state.visit.choices.map(shown));
    const pick = `pick:${pair.contest!.id}`;
    const picked = state.visit.choices.find((row) => row.key === pick)!;
    state = chooseAtCounter(core, state, pick);
    for (const row of state.visit.choices) offered.add(shown(row));
    const contest = state.visit.contests.find(
      (row) => row.id === pair.contest!.id,
    )!;
    // The clerk answers the office in one turn of connected sentences.
    const at = state.visit.lines.findIndex((line) => line.text === picked.text);
    const answer = state.visit.lines[at + 1]!;
    process.stdout.write(`${where} clerk: ${answer.text}\n`);
    expect(answer.speaker, where).toBe("clerk");
    expect(answer.text.split(/(?<=[.?!]) /).length, where).toBeGreaterThan(1);
    if (contest.body && /^municipalOffice/.test(contest.kind ?? ""))
      expect(answer.text, where).toContain(contest.body.name);
    const file = state.visit.choices.find((row) => row.control === "file");
    expect(file, `${where}: a way to file`).toBeTruthy();
    process.stdout.write(`${where} the player's reply: ${file!.text}\n`);
    expect(file!.text, where).not.toMatch(/^(I see|Okay|Got it|All right)\.$/);
    state = chooseAtCounter(core, state, file!.key, {
      platform: [`${PLATFORM_QUESTIONS[0]}=1`],
    });
    // The transcript holds only lines the player chose.
    const said = state.visit.lines.filter((line) => line.speaker === "player");
    expect(said.length, where).toBeGreaterThan(0);
    for (const line of said)
      expect(offered.has(line.text), `${where}: "${line.text}"`).toBe(true);
    expect(said.at(-1)!.text, where).toBe(file!.text);
    const filing = (state.result as { filing?: { id: string; status: string } })
      .filing;
    expect(filing, where).toBeTruthy();
    // Back at the counter: with the petition while it gathers signatures,
    // with nothing to bring once the name is on the ballot (a race with no
    // petition, as in Laramie, Wyoming at seed 7d9f1b3a5c0e2468), never as a
    // first visit; told from the filing's record.
    const back = openBenchFilingVisit(core, me, filedWith, 10 * 60);
    const told = back.intro.map((line) => line.text).join(" ");
    process.stdout.write(`${where} return (${filing!.status}): ${told}\n`);
    expect(told, where).toMatch(
      filing!.status === "petitioning" ? /petition/ : /ballot|nothing left/,
    );
    expect(told, where).not.toMatch(
      /ask (?:about|for the papers)|pick up the papers/,
    );
    expect(
      back.intro.some((line) => line.sourceRecordIds.includes(filing!.id)),
      where,
    ).toBe(true);
    return;
  }
  expect.fail(`no filing in ${tried.join("; ")}`);
}, 900_000);
