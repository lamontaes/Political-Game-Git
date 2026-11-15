import { appendFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
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
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import { familyFactsOf } from "../core2/modules/people";
import type { PersonId } from "../core2/types";
import { stakeOf } from "./family-stake";
import { raceMargin } from "./race-margin";
import type { TreeNode } from "./scene-talk";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";
import { expectUpToFourDifferent } from "./reply-set-check";

// The talk at home after a lost race (scenes-from-life, household-after-the-loss):
// staged only for a relative who put work or money into the race, and what the
// player says about running again is kept where the candidacy engine reads it
// for the next contest. The count is said once, in the narration (owner, Nov 14:
// people do not say the figure); a line that judges its size ("it was that
// close", the answer to "How close was it?" in the concession call) is placed by
// the one margin function the Journal reads (raceMargin), never asserted.
// Three named places on fixed seeds, found by scanning drawn seeds once: Pomeroy
// WA (a relative who worked it, a wide gap), Vineyard UT (relatives who gave
// money, $1,800 and $100, a middle gap) and Walled Lake MI (a gap of a point
// from the last seat, a small gift). The time is the game's own played season
// from filing to the count at each place (about 80, 290 and 200 seconds), plus
// the wording replay; measured 740 seconds for all three on one process, so the
// limit is twice that, and a relative's stake is made through the game's
// own enlistVolunteer and contributeOwnMoney calls; a shorter run has no count
// for either. Measured 402 seconds for both places on one process; the limit
// (800 seconds) is twice that.
const PLACES = [
  { key: "5355120", seed: "losscan:4" },
  { key: "4980420", seed: "losscan:1" },
  { key: "2683060", seed: "losscan:25" },
].map((row) => {
  const place = drawPlace(row.seed, "family-loss-stake-scene");
  if (place.key !== row.key)
    throw new Error(`${row.seed} no longer draws ${row.key}: ${place.key}`);
  return { ...place, drawSeed: row.seed };
});
const YEAR = 365;

/** Every line under a node, with the reply that led to it. */
function treeLines(node: TreeNode | null, path: string[], out: string[]): void {
  if (!node) return;
  for (const line of node.lines)
    out.push(`${path.join(" > ")} => ${line.text}`);
  if (node.end?.close)
    out.push(`${path.join(" > ")} => ${node.end.close.text}`);
  for (const reply of node.replies) {
    out.push(`${path.join(" > ")} ? ${reply.line.text}`);
    treeLines(reply.next, [...path, `"${reply.line.text}"`], out);
  }
}

const CLOSE_ANSWER = {
  close: "Close. A few more doors might have done it.",
  wide: "It wasn't close.",
} as const;

/** One drawn place: the loss scenes it showed, or why it could not. */
const run = (
  place: (typeof PLACES)[number],
): { done: boolean; note: string } => {
  const where = `${place.name} (${place.key}), seed ${place.drawSeed}`;
  const file = process.env.PLAYED_FILE;
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
      // Filing is a petition: the filer is on the ballot once the clerk
      // counts their signatures.
      if (["petitioning", "on-ballot"].includes(result.status ?? ""))
        filings.push(result.filing);
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
  // the second and third gave their own money, one a quarter of what the
  // household held and the other most of it).
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
  // The filer who was worked for is in the circle the world keeps private
  // records for, as the player is (a volunteer's shift is private).
  core.focusPersonIds.add(worked!.personId as PersonId);
  core.focusPersonIds.add(mateOf.id as PersonId);
  campaignFor(api, gave!.id);
  const giver = core.people.get(gave!.personId as PersonId)!;
  const given = contributeOwnMoney(
    api,
    gave!.id,
    Math.max(10000, giver.liquidMinor / 4),
  );
  if (!given) return { done: false, note: `${where}: nothing to give` };
  // The third filer puts most of what their household has into it: a gift
  // that reads large against the household's own year (the second filer's
  // quarter reads small or plain), so the .large statements are played.
  if (neither) {
    campaignFor(api, neither.id);
    const third = core.people.get(neither.personId as PersonId)!;
    contributeOwnMoney(api, neither.id, Math.floor(third.liquidMinor * 0.9));
  }
  // Each filer canvasses for signatures until the clerk's check.
  gatherSignatures(core, ...filings.map((f) => f.id));

  advanceCore(core, addDays(makeIsoDate(contest.electionDate), 2));
  const result = resultOf(api, contest.id);
  if (!result?.winnerId) return { done: false, note: `${where}: no winner` };
  // Someone the filer knows who walked doors (a relative, or anyone known by
  // name) is named in the filer's Journal, never "someone from my campaign"
  // (Storrs, Connecticut, storrs-1: a father).
  {
    const filer = worked!.personId as PersonId;
    const person = core.people.get(filer)!;
    const kin = familyFactsOf(person);
    const known = (pid: string) =>
      kin.has(pid as PersonId) || person.knownIds.has(pid as PersonId);
    const shifts = new Map(
      (director.ledger.people.get(filer)?.moments ?? [])
        .filter(
          (moment) =>
            moment.causeKind.startsWith("event:volunteer-shift") &&
            moment.counterpartIds.some(known),
        )
        .map((moment) => [moment.id, moment.counterpartIds.find(known)!]),
    );
    const told = composeJournal(core, director, filer)
      .flatMap((chapter) => chapter.lines)
      .filter((line) => line.momentIds.some((mid) => shifts.has(mid)));
    for (const line of told)
      expect(
        (line.plain ?? line.text).match(/^(Someone|A volunteer)\b/),
        `${where}: "${line.text}" for ${shifts.get(line.momentIds[0]!)}`,
      ).toBeNull();
    process.stdout.write(
      `VOLUNTEER LINES ${where}: ${told.length} lines for people ${filer} knows: ${told
        .slice(0, 2)
        .map((line) => `"${line.text}"`)
        .join(" ")}\n`,
    );
  }
  const causeId = `election-result:${contest.id}`;
  const lines: string[] = [];
  let promised = false;
  for (const filing of [worked, gave, neither]) {
    if (!filing) continue;
    const filer = filing.personId as PersonId;
    const here = `${where}: ${filing.id}`;
    if (result.winnerId === filer) continue;
    const now = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .get(filing.id) as unknown as FilingRow | undefined;
    // Off the general's ballot (withdrawn, short of signatures, or out in a
    // primary): the count names them nowhere.
    if (now?.status !== "on-ballot") continue;
    const outIds = JSON.parse(
      String(
        core.durableLog.get(`primary-result:${contest.id}`)?.facts?.outIds ??
          "[]",
      ),
    ) as string[];
    if (outIds.includes(filer)) continue;
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
    // The count is said once, in the narration; nothing the relative or the
    // player says repeats it, and no line asserts a size the count does not.
    const how = raceMargin(core, causeId, filer);
    expect(
      facts.some((row) => row.key === `race-${how}`),
      `${here}: the scene holds race-${how}`,
    ).toBe(true);
    expect(
      talk.narration.some((line) => line.text.includes(margin.text)),
      `${here}: the narration says the count`,
    ).toBe(true);
    const said: string[] = [];
    treeLines(talk.tree, [], said);
    for (const text of [talk.state.text, ...said])
      expect(text, `${here}: the count said again`).not.toContain(margin.text);
    for (const text of said)
      if (text.includes("that close"))
        expect(how, `${here}: "${text}"`).toBe("close");
    // What the count was, so a reader can judge "close": every candidate's
    // votes, the winner's lead as a share of the votes cast, and (for money)
    // what was given.
    const countFacts = (() => {
      const votes = Object.entries(
        JSON.parse(
          String(core.durableLog.get(causeId)?.facts?.totals ?? "{}"),
        ) as Record<string, number>,
      ).sort((a, b) => b[1] - a[1]);
      const cast = votes.reduce((sum, row) => sum + row[1], 0);
      const lead = votes.length > 1 ? (votes[0]![1] - votes[1]![1]) / cast : 0;
      const given = facts.find((row) => row.key === "given")?.text;
      return `votes ${votes.map((row) => row[1]).join(", ")} of ${cast} cast, lead ${(lead * 100).toFixed(1)} points${given ? `, given ${given}` : ""}`;
    })();
    // The wording the same record gets in other worlds: the English engine
    // picks among a move's pieces by world seed and moment, so the same lost
    // race composed under other world seeds shows the pieces this one did not
    // pick. Only the seed changes; the record, the facts and the count are the
    // played ones.
    const variants = new Map<string, string>();
    const statements = new Set<string>([talk.state.text]);
    const worldSeed = core.seed;
    try {
      for (let k = 1; k <= 120; k += 1) {
        (core as { seed: string }).seed = `${worldSeed}:wording-${k}`;
        const other = purposeScene(core, director, filer, entry!, {
          typeKey: "family-loss",
        });
        if (other?.kind !== "composed") continue;
        const lines: string[] = [];
        treeLines(other.scene.talk.tree, [], lines);
        for (const text of [other.scene.talk.state.text, ...lines])
          if (!variants.has(text)) variants.set(text, `seed ${k}`);
        statements.add(other.scene.talk.state.text);
        // A move has four statements at most: stop once all four have shown.
        if (statements.size >= 4) break;
      }
    } finally {
      (core as { seed: string }).seed = worldSeed;
    }
    if (file)
      appendFileSync(
        file,
        [
          `### Other wording for ${here}, ${part!.key}, same record, ${variants.size} lines under 120 other world seeds`,
          ...[...variants.keys()].map((text) => `- ${text}`),
          "",
          "",
        ].join("\n"),
      );
    if (file)
      appendFileSync(
        file,
        [
          `### ${where}: ${filing.id}, the count was ${how} (${countFacts})`,
          ...talk.narration.map((line) => `Narration: ${line.text}`),
          `They say: ${talk.state.text}`,
          ...said.map((text) => `- ${text}`),
          "",
          "",
        ].join("\n"),
      );
    if (filing === worked) {
      expect(part!.key, here).toBe("stake-worked");
      expect(askerId, here).toBe(mateOf.id);
    }
    // The strongest part at home speaks: a relative who also worked it on
    // their own (the campaign enlisted them) outranks the money given.
    expect(part!.key, here).toBe(
      `stake-${stakeOf(core, filer, causeId, askerId)!.kind}`,
    );
    // Up to four replies, all different stances (owner, Nov 10).
    const moves = talk.tree.replies.map((row) => row.line.move);
    expect(new Set(moves).size, `${here}: ${moves}`).toBe(moves.length);
    expect(
      new Set(talk.tree.replies.map((row) => row.line.text)).size,
      here,
    ).toBe(moves.length);
    expectUpToFourDifferent(
      talk.tree.replies.map((row) => row.line),
      here,
    );
    for (const move of moves)
      expect(["thank", "blame", "deflect", "promise"], here).toContain(move);
    lines.push(
      `${here} (${part!.key}, lost by ${margin.text}): ${core.people.get(askerId)!.givenName}: "${talk.state.text}" / ${talk.tree.replies.map((row) => `${row.line.move}: "${row.line.text}"`).join(" | ")}`,
    );

    // The concession call, from the same result: "How close was it?" is
    // answered by the count's own class, and the figure of speech nobody
    // could back ("closer than anybody expected") is gone.
    const callEntry = entry!;
    if (callEntry.bindings.some((row) => row.typeKey === "race-lost")) {
      const call = purposeScene(core, director, filer, callEntry, {
        typeKey: "race-lost",
      });
      if (call?.kind === "composed") {
        const heard: string[] = [];
        treeLines(call.scene.talk.tree, [], heard);
        for (const text of heard) {
          expect(text, `${here}: a line nothing records`).not.toContain(
            "Closer than anybody expected",
          );
          for (const [kind, line] of Object.entries(CLOSE_ANSWER))
            if (text.endsWith(`=> ${line}`))
              expect(kind, `${here}: "${text}"`).toBe(how);
          if (text.includes("It was close. I can live on that"))
            expect(how, `${here}: "${text}"`).toBe("close");
        }
        const asked = call.scene.talk.tree.replies.find(
          (row) => row.line.text === "How close was it?",
        );
        // A middle count has no answer on record that a line can back, so
        // the question is not offered then.
        if (how === "middle")
          expect(asked, `${here}: no question`).toBeUndefined();
        else if (asked)
          expect(
            asked.next?.lines[0]?.text,
            `${here}: the answer to how close`,
          ).toBe(CLOSE_ANSWER[how as keyof typeof CLOSE_ANSWER]);
        if (file)
          appendFileSync(
            file,
            [
              `### ${where}: the concession call, the count was ${how}`,
              `They say: ${call.scene.talk.state.text}`,
              ...heard.map((text) => `- ${text}`),
              "",
              "",
            ].join("\n"),
          );
      }
    }

    // Say you will run again: the relative's answer is kept for the next contest.
    const at = talk.tree.replies.findIndex(
      (row) => row.line.move === "promise",
    );
    const root = talk.tree.replies[at]!;
    const answer = root.next?.lines.find((row) => row.role === "asker");
    core.playerId = filer;
    const id = replyInScene(core, director, filer, entry!, [at], {
      typeKey: "family-loss",
    });
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

it("the talk after a lost race is for the relative who put in work or money, says the count once, places its size words by the count, and what is said about running again is read by the next contest", () => {
  const file = process.env.PLAYED_FILE;
  if (file)
    writeFileSync(
      file,
      `# After the loss, played (head ${process.env.PLAYED_SHA ?? "unknown"})\n\n`,
    );
  for (const place of PLACES) {
    const out = run(place);
    expect(out.done, out.note).toBe(true);
    process.stdout.write(`${out.note}\n`);
  }
}, 1_500_000);
