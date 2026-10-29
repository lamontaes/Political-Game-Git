import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { storyScene } from "../bench/story";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { stakeOf } from "./family-stake";
import { purposeScene } from "./purpose-scene";

// Scenes with a purpose fire in play from their cause records, in the lines
// that play (no grading view). In the played world, on a fresh seed and places
// drawn from all 56, residents file for a race counted within the year: the
// filing's own record fires the household's reaction, which plays as an
// exchange on the play screen, worded by the English engine and naming the
// record and every fact it says. The count's result record fires the win or
// the loss at home for every filer on the night it plays; for one a top-two
// or top-four primary put out, the primary's record fires the loss that
// night. The year plays out in full. Many places elect their seats only in even years: a place with
// no race counted within the year is passed over the day it is built. Most
// drawn places are (eight in a row in one CI run), so up to 32 are drawn.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 32;
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
  // The elections engine holds each seat's next contest from the start.
  const contests = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];
  if (
    !contests.some(
      (race) =>
        race.filingDeadline >= core.date &&
        addDays(makeIsoDate(race.electionDate), 2) <= end,
    )
  )
    return `${where}: no race is counted within the year`;
  for (let day = 0; !open().length && day < YEAR; day += 7)
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
      if (["petitioning", "on-ballot"].includes(result.status ?? ""))
        filings.push(result.filing);
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
    // The household reacts only where a relative has a stake in the run, on
    // the records (family-stake.ts); the others hear of it in the journal.
    const mates =
      core.households.get(core.people.get(filer)!.householdId)?.memberIds ?? [];
    const stake = mates.some(
      (id) => stakeOf(core, filer, `candidate-filed:${filing.id}`, id) !== null,
    );
    expect(
      entry!.bindings.some((row) => row.typeKey === "family-filing"),
      `${here}: stake ${stake}`,
    ).toBe(stake);
    if (!stake) continue;
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

  // Filing is a petition: each filer canvasses for signatures until the
  // clerk's check, the morning after the deadline.
  gatherSignatures(core, ...filings.map((f) => f.id));

  // Whether the filer still lives with someone to meet them at home.
  const livesWithSomeone = (filer: PersonId) =>
    (
      core.households.get(core.people.get(filer)!.householdId)?.memberIds ?? []
    ).some((id) => id !== filer && core.people.get(id)?.alive);
  // A top-two or top-four primary sends only its top finishers on. Its record
  // names everyone it put out and fires their loss on the night it plays: at
  // home with the household, or the race's own scene for one who lives alone.
  // They are not on the general's count.
  const outInPrimary = new Set<string>();
  if (contest.primaryDate && contest.primaryDate >= core.date) {
    advanceCore(core, addDays(makeIsoDate(contest.primaryDate), 2));
    const primary = core.durableLog.get(`primary-result:${contest.id}`);
    const out = JSON.parse(String(primary?.facts?.outIds ?? "[]")) as string[];
    for (const filing of filings) {
      const filer = filing.personId as PersonId;
      if (!out.includes(filer)) continue;
      outInPrimary.add(filer);
      const here = `${where}: ${filing.id}`;
      const entry = director.ledger.people
        .get(filer)!
        .schedule.find((row) => row.momentId.includes(primary!.id));
      expect(entry, `${here}: the primary fired no scene`).toBeTruthy();
      const home = livesWithSomeone(filer);
      expect(
        entry!.bindings.map((row) => row.typeKey),
        here,
      ).toContain(home ? "family-loss" : "race-lost");
      const scene = purposeScene(core, director, filer, entry!);
      expect(scene?.kind, here).toBe("composed");
      if (scene?.kind !== "composed") continue;
      expect(scene.scene.cause.id, here).toBe(primary!.id);
      expect(
        scene.scene.facts.find((row) => row.key === "office")?.recordIds,
        here,
      ).toContain(primary!.id);
      told.push(
        `${scene.scene.cause.id} (out in the primary): "${scene.scene.talk.state.text}"`,
      );
    }
  }

  // The count, with its two days to report: its result record fires the win
  // or the loss for every filer, read on the night it plays. A watched
  // resident's older moments later fold into the director's summaries (its
  // memory window; the player keeps all of theirs), so the scene is checked on
  // its day, not at the end of the year.
  advanceCore(core, addDays(makeIsoDate(contest.electionDate), 2));
  const result = resultOf(api, contest.id);
  // A tied count names no winner: the elections engine sends the race to a
  // second round, so the place is passed over (three filers with 0, 1 and 1
  // votes in a small town, one CI run).
  const tally = core.durableLog.get(`election-result:${contest.id}`);
  const totals = Object.values(
    JSON.parse(String(tally?.facts?.totals ?? "{}")) as Record<string, number>,
  ).sort((a, b) => b - a);
  if (!result?.winnerId && totals.length > 1 && totals[0] === totals[1])
    return `${where}: the count of ${contest.id} was tied`;
  expect(
    result?.winnerId,
    `${where}: ${contest.id} has no winner`,
  ).toBeTruthy();
  let counted = 0;
  let alone = 0;
  for (const filing of filings) {
    const filer = filing.personId as PersonId;
    const here = `${where}: ${filing.id}`;
    if (outInPrimary.has(filer)) continue;
    const entry = director.ledger.people
      .get(filer)!
      .schedule.find((row) =>
        row.momentId.includes(`election-result:${contest.id}`),
      );
    expect(entry, `${here}: the count fired no scene`).toBeTruthy();
    const won = result!.winnerId === filer;
    // One sitting covers a day for the same people (scheduling.ts): a filer
    // who lost two races that day, or two who live together and both lost,
    // hear it in one sitting, which takes the other moments in.
    const sitting = (typeKey: string) => {
      if (entry!.bindings.some((row) => row.typeKey === typeKey))
        return { personId: filer, entry: entry! };
      for (const [personId, book] of director.ledger.people)
        for (const row of book.schedule)
          if (
            row.date === entry!.date &&
            row.bindings.some(
              (binding) =>
                binding.typeKey === typeKey &&
                binding.roles.some((role) => role.personIds.includes(filer)) &&
                (binding.joined ?? []).some(
                  (joined) => joined.momentId === entry!.momentId,
                ),
            )
          )
            return { personId, entry: row };
      return undefined;
    };
    // A filer who lives alone by the count (their household moved out or
    // died) has the race's own scene: nobody is at home to meet them.
    if (!livesWithSomeone(filer)) {
      expect(
        sitting(won ? "race-won" : "race-lost"),
        `${here}: no ${won ? "race-won" : "race-lost"} scene`,
      ).toBeTruthy();
      alone += 1;
      continue;
    }
    const staged = sitting(won ? "family-win" : "family-loss");
    expect(
      staged,
      `${here}: no ${won ? "family-win" : "family-loss"} scene`,
    ).toBeTruthy();
    const scene = purposeScene(
      core,
      director,
      staged!.personId,
      staged!.entry,
      {
        typeKey: won ? "family-win" : "family-loss",
      },
    );
    expect(scene?.kind, here).toBe("composed");
    if (scene?.kind !== "composed") continue;
    const causeId = `election-result:${contest.id}`;
    if (staged!.entry === entry) {
      expect(scene.scene.cause.id, here).toBe(causeId);
      if (!won)
        expect(
          scene.scene.facts.find((row) => row.key === "opponent")?.recordIds,
          here,
        ).toContain(result!.winnerId);
    } else
      // Taken into the day's sitting about another count: the sitting names
      // this filer's count among its records.
      expect(
        staged!.entry.bindings
          .flatMap((row) => row.joined ?? [])
          .map((row) => row.causeId),
        here,
      ).toContain(causeId);
    counted += 1;
    told.push(
      `${scene.scene.cause.id} (${won ? "won" : "lost"}): "${scene.scene.talk.state.text}"`,
    );
  }
  // Every filer on the count has its scene: the household's for each who
  // still lives with someone, and there is at least one.
  expect(counted + alone + outInPrimary.size, `${where}: result scenes`).toBe(
    filings.length,
  );
  if (!counted)
    return `${where}: no filer on the count lived with someone (${alone} alone, ${outInPrimary.size} out in the primary)`;
  // The rest of the year plays out.
  advanceCore(core, end);
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
}, 3_600_000);
