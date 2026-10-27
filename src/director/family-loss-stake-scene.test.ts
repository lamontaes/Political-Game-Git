import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  campaignFor,
  contributeOwnMoney,
  enlistVolunteer,
} from "../core2/modules/campaigns";
import {
  CANDIDACY_MODULE_ID,
  candidacyReasons,
} from "../core2/modules/candidacy";
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
import { stakeOf } from "./family-stake";
import { purposeScene, replyInScene } from "./purpose-scene";

// The talk at home after a lost race (scenes-from-life, household-after-the-loss):
// staged only for a relative who put work or money into the race, opening on what
// they put in and how close the count was, and what the player says about running
// again is kept where the candidacy engine reads it for the next contest. Drawn
// places and a fresh seed each run; the place and seed are in every message.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 24;
const YEAR = 365;

/** One drawn place: the loss scenes it showed, or why it could not. */
const run = (drawSeed: string): { done: boolean; note: string } => {
  const place = drawPlace(drawSeed, "family-loss-stake-scene");
  const where = `${place.name} (${place.key}), seed ${drawSeed}`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  const end = addDays(makeIsoDate(core.date), YEAR);
  for (let day = 0; !openContests(api).length && day < YEAR; day += 7)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  let contest: ContestRow | undefined;
  const filings: FilingRow[] = [];
  for (const race of [...openContests(api)]
    .filter((row) => addDays(makeIsoDate(row.electionDate), 2) <= end)
    .sort((a, b) => a.id.localeCompare(b.id))) {
    const clerkId = filingClerkFor(api, race.id)?.personId;
    const town = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.id !== core.playerId &&
          p.id !== clerkId &&
          (core.households.get(p.householdId)?.memberIds ?? []).some(
            (id) =>
              id !== p.id &&
              core.people.get(id)?.alive &&
              core.people.get(id)!.birthDate < "2005-01-01",
          ),
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 40);
    const homes = new Set<string>();
    for (const person of town) {
      if (filings.length >= 3) break;
      // One filer to a household, so what one household put in is its own.
      if (homes.has(person.householdId)) continue;
      homes.add(person.householdId);
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
  if (!contest || filings.length < 2)
    return { done: false, note: `${where}: fewer than two filers` };
  advanceCore(core, addDays(makeIsoDate(core.date), 2));

  // The households' parts in the race, as the engines would have written them
  // (a hand-set fixture for the edge: the first filer's household worked it,
  // the second gave their own money, the rest did neither).
  const adultMate = (filer: PersonId) =>
    (core.households.get(core.people.get(filer)!.householdId)?.memberIds ?? [])
      .map((id) => core.people.get(id)!)
      .find((p) => p.id !== filer && p.alive && p.birthDate < "2005-01-01");
  const [worked, gave, neither] = filings;
  // Filers who live together share what is put in: pass the place over.
  const homeOf = (filing: FilingRow) =>
    core.people.get(filing.personId as PersonId)!.householdId;
  if (new Set(filings.map(homeOf)).size < filings.length)
    return { done: false, note: `${where}: filers share a household` };
  const mateOf = adultMate(worked!.personId as PersonId);
  if (!mateOf) return { done: false, note: `${where}: no adult at home` };
  campaignFor(api, worked!.id);
  expect(enlistVolunteer(api, worked!.id, mateOf.id), where).toBe(true);
  campaignFor(api, gave!.id);
  const giver = core.people.get(gave!.personId as PersonId)!;
  const given = contributeOwnMoney(
    api,
    gave!.id,
    Math.max(10000, giver.liquidMinor / 4),
  );
  if (!given) return { done: false, note: `${where}: nothing to give` };

  advanceCore(core, addDays(makeIsoDate(contest.electionDate), 2));
  const result = resultOf(api, contest.id);
  if (!result?.winnerId) return { done: false, note: `${where}: no winner` };
  const causeId = `election-result:${contest.id}`;
  const lines: string[] = [];
  let promised = false;
  for (const filing of [worked, gave, neither]) {
    if (!filing) continue;
    const filer = filing.personId as PersonId;
    const here = `${where}: ${filing.id}`;
    if (result.winnerId === filer) continue;
    const now = api
      .moduleState("core2-elections-v1")
      .table("filings")
      .get(filing.id) as unknown as FilingRow | undefined;
    if (now?.status === "withdrawn") continue;
    const entry = director.ledger.people
      .get(filer)!
      .schedule.find((row) =>
        row.momentId.includes(`election-result:${contest!.id}`),
      );
    expect(entry, `${here}: the count fired no moment`).toBeTruthy();
    const household =
      core.households.get(core.people.get(filer)!.householdId)?.memberIds ?? [];
    const parts = household.filter(
      (id) => stakeOf(core, filer, causeId, id) !== null,
    );
    const staged = entry!.bindings.find((row) => row.typeKey === "family-loss");
    // The record decides it: no part in the race, no scene.
    expect(!!staged, `${here}: parts ${parts.join(",")}`).toBe(
      parts.length > 0,
    );
    if (!staged) continue;
    const scene = purposeScene(core, director, filer, entry!, {
      typeKey: "family-loss",
    });
    expect(scene?.kind, `${here}: ${JSON.stringify(scene)}`).toBe("composed");
    if (scene?.kind !== "composed") continue;
    const { askerId, facts, talk, cause } = scene.scene;
    expect(parts, here).toContain(askerId);
    expect(cause.id, here).toBe(causeId);
    const part = facts.find(
      (row) => row.key === "stake-worked" || row.key === "stake-gave",
    );
    expect(part, `${here}: the scene names no part`).toBeTruthy();
    expect(part!.recordIds, here).toContain(causeId);
    // Worked it, or gave money: the relative says which.
    const margin = facts.find((row) => row.key === "margin")!;
    expect(talk.state.text, here).toContain(margin.text);
    if (filing === worked) {
      expect(part!.key, here).toBe("stake-worked");
      expect(askerId, here).toBe(mateOf.id);
    }
    if (filing === gave) expect(part!.key, here).toBe("stake-gave");
    // Four replies, four stances.
    const moves = talk.tree.replies.map((row) => row.line.move);
    expect(new Set(moves).size, `${here}: ${moves}`).toBe(moves.length);
    expect(
      new Set(talk.tree.replies.map((row) => row.line.text)).size,
      here,
    ).toBe(moves.length);
    expect(moves, here).toEqual(
      expect.arrayContaining(["thank", "blame", "deflect", "promise"]),
    );
    lines.push(
      `${here} (${part!.key}, lost by ${margin.text}): ${core.people.get(askerId)!.givenName}: "${talk.state.text}" / ${talk.tree.replies.map((row) => `${row.line.move}: "${row.line.text}"`).join(" | ")}`,
    );

    // Say you will run again: the relative's answer is kept for the next contest.
    const at = talk.tree.replies.findIndex(
      (row) => row.line.move === "promise",
    );
    const root = talk.tree.replies[at]!;
    const answer = root.next?.lines.find((row) => row.role === "asker");
    core.playerId = filer;
    const id = replyInScene(core, director, filer, entry!, [at]);
    expect(id, here).toBeTruthy();
    const backing = core.durableLog.get(id!)?.facts?.backing;
    const rows = api
      .moduleState(CANDIDACY_MODULE_ID)
      .table("backing")
      .query("byPerson", [filer]) as unknown as { stance: number }[];
    const person = core.people.get(filer)!;
    const next = {
      contestId: contest.id,
      officeName: contest.title,
      filingDeadline: contest.filingDeadline,
      sourceIds: [contest.id],
    };
    const reasons = candidacyReasons(api, person, next);
    if (backing) {
      expect(rows.length, `${here}: answer not kept`).toBe(1);
      expect(rows[0]!.stance, here).toBe(backing === "behind" ? 1 : -1);
      // The next contest's weighing reads it: pulled toward or away from running.
      expect(
        Math.sign(reasons.householdBacking ?? 0),
        `${here}: ${answer?.move} read as ${backing}`,
      ).toBe(rows[0]!.stance);
      promised = true;
      lines.push(
        `${here}: promised to run again; ${answer!.speaker} answered "${answer!.text}" (${backing}), kept as ${id}, householdBacking ${reasons.householdBacking}`,
      );
    } else expect(reasons.householdBacking, here).toBeUndefined();
  }
  return { done: promised, note: lines.join("\n") };
};

it(`the talk after a lost race is for the relative who put in work or money, and what is said about running again is read by the next contest (seed ${seed})`, () => {
  const skipped: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const out = run(`${seed}:${attempt}`);
    if (out.done) {
      console.log(out.note);
      return;
    }
    skipped.push(out.note);
  }
  throw new Error(`no drawn place showed the talk: ${skipped.join("; ")}`);
}, 3_600_000);
