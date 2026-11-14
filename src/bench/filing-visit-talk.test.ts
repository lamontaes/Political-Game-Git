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
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
  filingOfficeFor,
  playerContests,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { spokenOffice } from "../director/filing-visit";
import { spoken } from "../director/words";
import { expectUpToFourDifferent } from "../director/reply-set-check";
import { seatSaid } from "../english/journal-words";
import type { PersonId } from "../core2/types";
import controls from "./data/controls.json" with { type: "json" };
import {
  NothingAtCounter,
  chooseAtCounter,
  openBenchFilingVisit,
} from "./filing";
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
    // A resident already running in a race is not offered it at the counter
    // (P1, Commack, New York), so the visit starts with one they have not
    // filed for (seed 8b7056d0cf1a2f624d37 drew a resident already running).
    const filedIn = (id: string) =>
      new Set(
        (
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("filings")
            .query("byPerson", [id]) as unknown as {
            contestId: string;
            status: string;
          }[]
        )
          .filter(
            (row) => row.status === "petitioning" || row.status === "on-ballot",
          )
          .map((row) => row.contestId),
      );
    // The races are the resident's own (their district's), read with them
    // as the player, as the counter reads them (Groom, Texas, seed
    // 8b7056d0cf1a2f624d37: a race from the first player's list was not on
    // the resident's).
    const findPair = () => {
      const first = core.playerId;
      for (const person of grown) {
        if (
          !playerContests(api).some((row) =>
            checkEligibility(api, person.id, row.id).every((c) => c.met),
          )
        )
          continue;
        core.playerId = person.id as PersonId;
        const contest = playerContests(api).find(
          (row) =>
            row.level !== "federal" &&
            row.level !== "state" &&
            !filedIn(person.id).has(row.id) &&
            checkEligibility(api, person.id, row.id).every(
              (check) => check.met,
            ),
        );
        core.playerId = first;
        if (contest) return { person, contest };
      }
      return undefined;
    };
    // Filing opens on the place's own days: the weeks go by until a local
    // race is open to a grown resident (at most two years), read from the
    // calendar's records, never skipped.
    let pair = findPair();
    for (let week = 0; week < 104 && !pair; week += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      pair = findPair();
    }
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
    // The clerk greets the player by the town they run in, or the office.
    const townName = spoken(
      corePlaceByJurisdictionId(core.people.get(me)!.placeId as never)!,
    );
    const greeting = state.visit.lines[0]!.text;
    process.stdout.write(`${where} greeting: ${greeting}\n`);
    expect(
      greeting.includes(townName) ||
        greeting.toLowerCase().includes(spokenOffice(filedWith).toLowerCase()),
      `${where}: ${greeting}`,
    ).toBe(true);
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
    // Up to four replies, each a different move about the race: the clerk's
    // scene offers file (agree), ask, a rival (confront) and leave.
    expectUpToFourDifferent(
      state.visit.choices.map((row) => ({ move: row.move!, text: row.text })),
      where,
    );
    // Filing names the office; no other reply names it again (one screen
    // names a thing once).
    for (const row of state.visit.choices)
      if (row.control === "file")
        expect(row.text, where).toContain(
          seatSaid(contest.seat!, { first: false }),
        );
      else
        expect(row.text, where).not.toContain(
          seatSaid(contest.seat!, { first: false }),
        );
    // An office is said the way people say it, never a form's title with
    // its parenthesis or a member word after "run for", "file for", "sign
    // for" or "give" (Fable B, Nov 11).
    for (const line of [...state.visit.lines, ...state.visit.choices])
      expect(line.text, where).not.toMatch(
        /\((?:District|[^)]*election)[^)]*\)|(?:run|file|sign) for (?:the )?[A-Za-z ]*\bmember\b|give [a-z ]*member/i,
      );
    // Who else has filed, from the filings: named when there is someone.
    const asking = state.visit.choices.find((row) => row.move === "ask");
    expect(asking, `${where}: a way to ask who filed`).toBeTruthy();
    state = chooseAtCounter(core, state, asking!.key);
    for (const row of state.visit.choices) offered.add(shown(row));
    const whoFiled = state.visit.lines.at(-1)!;
    process.stdout.write(
      `${where} filed so far ${contest.filed?.count ?? 0}: ${whoFiled.text}\n`,
    );
    expect(whoFiled.speaker, where).toBe("clerk");
    if (contest.filed?.first)
      expect(whoFiled.text, where).toContain(contest.filed.first.name);
    else expect(whoFiled.text, where).toMatch(/nobody|first|not a soul/i);
    // A question asked is not offered again.
    expect(
      state.visit.choices.some((row) => row.move === "ask"),
      where,
    ).toBe(false);
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
    // Back at the counter (P1, Commack, New York): the race already filed in
    // is never offered again; with nothing else to file for there is no scene
    // (rule 19), a petition still gathering signatures included: the clerk
    // never says how many are in (owner, Nov 14).
    let back: ReturnType<typeof openBenchFilingVisit> | null = null;
    try {
      back = openBenchFilingVisit(core, me, filedWith, 10 * 60);
    } catch (error) {
      expect(error, where).toBeInstanceOf(NothingAtCounter);
    }
    if (back) {
      expect(
        back.visit.choices.some((row) => row.key === pick),
        `${where}: the filed race is offered again`,
      ).toBe(false);
      expect(back.visit.contests.length, where).toBeGreaterThan(0);
    }
    return;
  }
  expect.fail(`no filing in ${tried.join("; ")}`);
}, 900_000);
