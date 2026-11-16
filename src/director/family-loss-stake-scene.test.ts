import { appendFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { campaignFor } from "../core2/modules/campaigns";
import { campaignAct } from "../bench/campaign";
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
// Three named places on fixed seeds, found by scanning drawn seeds once with
// the same presses (the report names the picks and what it passed over): Pomeroy
// WA (a wide gap, a filer who put own money in), Poplar Plains CT (a close gap,
// a household member who volunteered) and Lincoln NH (a middle gap, a
// household member who volunteered). Each is about a minute, the game's own
// season from filing to the count. Every part a household has comes from the
// filers' own presses on the campaign page (campaignAct) and the world's
// answers; nothing is written for anyone else.
const PLACES = [
  { key: "5355120", seed: "losscan:4" },
  { key: "0961555", seed: "losscan:34" },
  { key: "3341780", seed: "losscan:28" },
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

  // The households' parts in the race come from what a player presses on the
  // campaign page (campaignAct, the bench's own handler): each filer asks
  // everyone they know to volunteer and the world answers; the second puts a
  // quarter of their cash in and the third a hundred dollars, amounts a player
  // could choose there. Nothing is written for anyone else.
  const [first, second, third] = filings;
  const homeOf = (filing: FilingRow) =>
    core.people.get(filing.personId as PersonId)!.householdId;
  if (new Set(filings.map(homeOf)).size < filings.length)
    return { done: false, note: `${where}: filers share a household` };
  for (const filing of filings) {
    campaignFor(api, filing.id);
    campaignAct(core, filing.personId, {
      filingId: filing.id,
      kind: "volunteer",
    });
  }
  const giver = core.people.get(second!.personId as PersonId)!;
  campaignAct(core, second!.personId, {
    filingId: second!.id,
    kind: "contribute",
    amountMinor: Math.max(10000, Math.floor(giver.liquidMinor / 4)),
  });
  if (third)
    campaignAct(core, third.personId, {
      filingId: third.id,
      kind: "contribute",
      amountMinor: 10000,
    });
  // The filers are in the circle the world keeps private records for, as
  // the player is (a volunteer's shift is private).
  for (const filing of filings) {
    core.focusPersonIds.add(filing.personId as PersonId);
    for (const id of core.households.get(homeOf(filing))?.memberIds ?? [])
      core.focusPersonIds.add(id as PersonId);
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
    const filer = first!.personId as PersonId;
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
  for (const filing of [first, second, third]) {
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
    // A seat of an at-large race that the count gave them is no loss: the
    // count names them nowhere among those who missed, and no lost-race
    // moment fires for them (the played file says so where it happens).
    const missed = JSON.parse(
      String(core.durableLog.get(causeId)?.facts?.outIds ?? "[]"),
    ) as string[];
    const entry = director.ledger.people
      .get(filer)!
      .schedule.find((row) =>
        row.momentId.includes(`election-result:${contest!.id}`),
      );
    if (!missed.includes(filer)) {
      expect(
        entry?.bindings.find((row) => row.typeKey === "family-loss"),
        `${here}: a seated candidate is told they lost`,
      ).toBeUndefined();
      if (file)
        appendFileSync(
          file,
          `### ${here}: the count seated this candidate; no lost-race scene fires for them\n\n`,
        );
      continue;
    }
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
      const given = facts.find((row) => row.key === "given")?.text;
      const seats =
        Number(core.durableLog.get(causeId)?.facts?.seats ?? 1) || 1;
      const own = Object.fromEntries(votes)[filer] ?? 0;
      const last = votes[Math.min(seats, votes.length) - 1]?.[1] ?? own;
      return `votes ${votes.map((row) => row[1]).join(", ")} of ${cast} cast, ${seats} seat${seats === 1 ? "" : "s"}, this candidate got ${own} and the last winning seat got ${last}, so ${Math.max(0, last - own)} short${given ? `, given ${given}` : ""}`;
    })();
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
    const began = Date.now();
    const out = run(place);
    expect(out.done, out.note).toBe(true);
    process.stdout.write(
      `${out.note}\n${place.name}: ${Math.round((Date.now() - began) / 1000)} s\n`,
    );
  }
}, 600_000);
