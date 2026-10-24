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

// Scenes with a purpose fire in play from their cause records (owner, Oct 24:
// "start getting the grades and the scenes wired ... them triggering based
// on" the records). In the played world, on a fresh seed and a place drawn
// from all 56, residents file for an office: the filing's own record fires
// the household's reaction, which plays as an exchange the player taps
// through, worded by the English engine and naming the record and every fact
// it says. The count's result record then fires the win or the loss at home.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "purpose-scenes");

it(`a filing and a count fire the household's scenes, played as exchanges, in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
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
  // The races open for filing, the soonest count first; the first that
  // takes a resident's filing is the race.
  const open = () =>
    [...openContests(api)].sort(
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
  expect(filings.length, "residents who can file").toBeGreaterThan(0);
  advanceCore(core, addDays(makeIsoDate(core.date), 2));

  const told: string[] = [];
  for (const filing of filings) {
    const filer = filing.personId as PersonId;
    const entry = director.ledger.people
      .get(filer)!
      .schedule.find((row) =>
        row.momentId.includes(`candidate-filed:${filing.id}`),
      );
    expect(entry, `${filing.id} fired no scene`).toBeTruthy();
    expect(entry!.bindings.map((row) => row.typeKey)).toContain(
      "family-filing",
    );
    // Filing is a record of the filer's own life: it stops the day at home.
    expect(entry!.outcome).toBe("scene-now");
    const result = purposeScene(core, director, filer, entry!, {
      includeHeld: true,
    });
    expect(result?.kind, `${filing.id}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") continue;
    const { scene } = result;
    // Fired by the filing's own record, about the office it names.
    expect(scene.cause.id).toBe(`candidate-filed:${filing.id}`);
    expect(scene.cause.facts.office).toBe(contest!.title);
    const office = scene.facts.find((row) => row.key === "office")!;
    expect(office.text).toBe(contest!.title);
    expect(office.recordIds).toContain(scene.cause.id);
    // The one who reacts lives with the filer, on record.
    expect(core.people.get(scene.askerId)!.householdId).toBe(
      core.people.get(filer)!.householdId,
    );
    expect(scene.askedId).toBe(filer);
    // The player taps through it: a statement, then replies with branches.
    expect(scene.talk.state.text.length).toBeGreaterThan(0);
    expect(scene.talk.tree.replies.length).toBeGreaterThan(1);
    // The play screen's story carries the same exchange and why it happened.
    const story = storyScene(core, director, filer, entry!.momentId, 18 * 60, {
      held: true,
    });
    expect(story.talk?.typeKey).toBe("family-filing");
    expect(story.talk?.why.cause.id).toBe(scene.cause.id);
    expect(story.talk?.tree.replies.length).toBe(
      scene.talk.tree.replies.length,
    );
    told.push(
      `${scene.cause.id}: ${core.people.get(scene.askerId)!.givenName} to ${core.people.get(filer)!.givenName}: "${scene.talk.state.text}" / replies: ${scene.talk.tree.replies.map((row) => `"${row.line.text}"`).join(" ")}`,
    );
  }

  // The campaign runs to the count, within the year; the result record fires
  // the win or the loss.
  const inYear = contest!.electionDate <= addDays(makeIsoDate(core.date), 365);
  if (inYear) advanceCore(core, addDays(makeIsoDate(contest!.electionDate), 2));
  const result = inYear ? resultOf(api, contest!.id) : undefined;
  if (result?.winnerId)
    for (const filing of filings) {
      const filer = filing.personId as PersonId;
      const entry = director.ledger.people
        .get(filer)!
        .schedule.find((row) =>
          row.momentId.includes(`election-result:${contest!.id}`),
        );
      if (!entry) continue;
      const won = result.winnerId === filer;
      expect(entry.bindings.map((row) => row.typeKey)).toContain(
        won ? "family-win" : "family-loss",
      );
      const scene = purposeScene(core, director, filer, entry, {
        includeHeld: true,
      });
      expect(scene?.kind).toBe("composed");
      if (scene?.kind !== "composed") continue;
      expect(scene.scene.cause.id).toBe(`election-result:${contest!.id}`);
      if (!won)
        expect(
          scene.scene.facts.find((row) => row.key === "opponent")?.recordIds,
        ).toContain(result.winnerId);
      told.push(
        `${scene.scene.cause.id} (${won ? "won" : "lost"}): "${scene.scene.talk.state.text}"`,
      );
    }
  console.log(`PURPOSE SCENES ${place.name} ${seed}\n${told.join("\n")}`);
}, 900_000);
