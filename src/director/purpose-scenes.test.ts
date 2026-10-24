import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { storyScene } from "../bench/story";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// Scenes with a purpose fire in play from their cause records, in the lines
// that play (no grading view). In the played world, on a fresh seed and places
// drawn from all 56, residents file for a race counted within the year: the
// filing's own record fires the household's reaction, which plays as an
// exchange on the play screen, worded by the English engine and naming the
// record and every fact it says. The year plays out in full, and the count's
// result record fires the win or the loss at home for every filer.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const YEAR = 365;

/** One drawn place: why it could not show both scenes, or null once it has. */
const run = (drawSeed: string): string | null => {
  const place = drawPlace(drawSeed, "purpose-scenes");
  const where = `${place.name} (${place.key}), seed ${drawSeed}`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  const start = makeIsoDate(core.date);
  const end = addDays(start, YEAR);
  // Residents with someone at home to react: adults who live with others.
  const town = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.id !== core.playerId &&
        (core.households.get(p.householdId)?.memberIds ?? []).some(
          (id) => id !== p.id && core.people.get(id)?.alive,
        ),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  // The races open for filing and counted (with two days to report) within
  // the year, the soonest first; the first that takes a resident's filing is
  // the race.
  const open = () =>
    [...openContests(api)]
      .filter((race) => addDays(makeIsoDate(race.electionDate), 2) <= end)
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      );
  for (let day = 0; !open().length && day < 120; day += 7)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  let contest: ContestRow | undefined;
  const filings: FilingRow[] = [];
  for (const race of open()) {
    const clerkId = filingClerkFor(api, race.id)?.personId;
    // The director watches someone before they file, so it sees the filing.
    const tried = town.filter((p) => p.id !== clerkId).slice(0, 12);
    for (const person of tried) {
      if (filings.length >= 3) break;
      director.watch(core, person.id);
      const result = fileCandidacy(api, {
        personId: person.id,
        contestId: race.id,
        platform: [],
      });
      if (result.status === "on-ballot") filings.push(result.filing);
    }
    if (filings.length) {
      contest = race;
      break;
    }
  }
  if (!contest)
    return `${where}: no race counted within the year took a filing`;
  advanceCore(core, addDays(makeIsoDate(core.date), 2));

  const told: string[] = [];
  for (const filing of filings) {
    const filer = filing.personId as PersonId;
    const here = `${where}: ${filing.id}`;
    const entry = director.ledger.people
      .get(filer)!
      .schedule.find((row) =>
        row.momentId.includes(`candidate-filed:${filing.id}`),
      );
    expect(entry, `${here} fired no scene`).toBeTruthy();
    expect(
      entry!.bindings.map((row) => row.typeKey),
      here,
    ).toContain("family-filing");
    // Filing is a record of the filer's own life: it stops the day at home.
    expect(entry!.outcome, here).toBe("scene-now");
    // The lines that play, as ordinary play says them.
    const result = purposeScene(core, director, filer, entry!);
    expect(result?.kind, `${here}: ${JSON.stringify(result)}`).toBe("composed");
    if (result?.kind !== "composed") continue;
    const { scene } = result;
    // Fired by the filing's own record, about the office it names.
    expect(scene.cause.id, here).toBe(`candidate-filed:${filing.id}`);
    expect(scene.cause.facts.office, here).toBe(contest.title);
    const office = scene.facts.find((row) => row.key === "office")!;
    expect(office.text, here).toBe(contest.title);
    expect(office.recordIds, here).toContain(scene.cause.id);
    // The one who reacts lives with the filer, on record.
    expect(core.people.get(scene.askerId)!.householdId, here).toBe(
      core.people.get(filer)!.householdId,
    );
    expect(scene.askedId, here).toBe(filer);
    // The player taps through it: a statement, then replies with branches.
    expect(scene.talk.state.text.length, here).toBeGreaterThan(0);
    expect(scene.talk.tree.replies.length, here).toBeGreaterThan(1);
    // The play screen's story, outside the grading view, carries the same
    // exchange and why it happened.
    const story = storyScene(core, director, filer, entry!.momentId, 18 * 60);
    expect(story.talk?.typeKey, here).toBe("family-filing");
    expect(story.talk?.why.cause.id, here).toBe(scene.cause.id);
    expect(story.talk?.tree.replies.length, here).toBe(
      scene.talk.tree.replies.length,
    );
    told.push(
      `${scene.cause.id}: ${core.people.get(scene.askerId)!.givenName} to ${core.people.get(filer)!.givenName}: "${scene.talk.state.text}" / replies: ${scene.talk.tree.replies.map((row) => `"${row.line.text}"`).join(" ")}`,
    );
  }

  // The whole year plays out, the count among it; its result record fires
  // the win or the loss for every filer.
  advanceCore(core, end);
  const result = resultOf(api, contest.id);
  expect(
    result?.winnerId,
    `${where}: ${contest.id} has no winner`,
  ).toBeTruthy();
  let counted = 0;
  for (const filing of filings) {
    const filer = filing.personId as PersonId;
    const here = `${where}: ${filing.id}`;
    const entry = director.ledger.people
      .get(filer)!
      .schedule.find((row) =>
        row.momentId.includes(`election-result:${contest.id}`),
      );
    expect(entry, `${here}: the count fired no scene`).toBeTruthy();
    const won = result!.winnerId === filer;
    expect(
      entry!.bindings.map((row) => row.typeKey),
      here,
    ).toContain(won ? "family-win" : "family-loss");
    const scene = purposeScene(core, director, filer, entry!);
    expect(scene?.kind, here).toBe("composed");
    if (scene?.kind !== "composed") continue;
    expect(scene.scene.cause.id, here).toBe(`election-result:${contest.id}`);
    if (!won)
      expect(
        scene.scene.facts.find((row) => row.key === "opponent")?.recordIds,
        here,
      ).toContain(result!.winnerId);
    counted += 1;
    told.push(
      `${scene.scene.cause.id} (${won ? "won" : "lost"}): "${scene.scene.talk.state.text}"`,
    );
  }
  expect(counted, `${where}: result scenes`).toBe(filings.length);
  console.log(`PURPOSE SCENES ${where}\n${told.join("\n")}`);
  return null;
};

it(`a filing and a count fire the household's scenes in the lines that play, over a full year (seed ${seed})`, () => {
  const skipped: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const why = run(`${seed}:${attempt}`);
    if (!why) return;
    skipped.push(why);
  }
  throw new Error(`no drawn place filed and counted: ${skipped.join("; ")}`);
}, 1_800_000);
