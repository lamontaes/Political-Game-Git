import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { closenessBetween } from "../core2/closeness";
import { familyFactsOf } from "../core2/modules/people";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { CAMPAIGNS_MODULE_ID, campaignFor } from "../core2/modules/campaigns";
import {
  fileCandidacy,
  openContests,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { stakeOf } from "./family-stake";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// The talk at home after a filing (scenes-from-life, spouse-stake-after-filing):
// it is staged only for a household member the records give a stake in the run
// (savings against the length of the race, or a young child while the filer
// works), opens on that stake in their own words, and the player's reply is
// written where the campaign and the tie read it. Drawn places and a fresh seed
// each run; the place and seed are named in every message.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 24;
const YEAR = 365;

interface Found {
  where: string;
  core: CoreState;
  director: ReturnType<typeof buildBenchWorld>["director"];
  filings: { filing: FilingRow; entry: unknown }[];
}

/** One drawn place where residents filed: the filings, or why not. */
const play = (drawSeed: string): Found | string => {
  const place = drawPlace(drawSeed, "family-stake-scene");
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
  const filings: Found["filings"] = [];
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
            (id) => id !== p.id && core.people.get(id)?.alive,
          ),
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 12);
    for (const person of town) {
      if (filings.length >= 6) break;
      director.watch(core, person.id);
      const result = fileCandidacy(api, {
        personId: person.id,
        contestId: race.id,
        platform: [],
      });
      if (["petitioning", "on-ballot"].includes(result.status ?? ""))
        filings.push({ filing: result.filing, entry: undefined });
    }
    if (filings.length) break;
  }
  if (!filings.length) return `${where}: no race took a filing`;
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  return { where, core, director, filings };
};

const entryOf = (found: Found, filing: FilingRow) =>
  found.director.ledger.people
    .get(filing.personId as PersonId)!
    .schedule.find((row) =>
      row.momentId.includes(`candidate-filed:${filing.id}`),
    );

/** Every path of a tree: the replies chosen, the node it reaches. */
const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

it("stages the filing talk only for a relative with a stake, and records what the player says", () => {
  let sawScene = false;
  let sawEnlist = false;
  let sawPutOff = false;
  let sawStrain = false;
  const notes: string[] = [];
  for (
    let attempt = 0;
    attempt < ATTEMPTS && !(sawEnlist && sawPutOff);
    attempt += 1
  ) {
    const found = play(`${seed}-${attempt}`);
    if (typeof found === "string") continue;
    const { core, director, where } = found;
    for (const { filing } of found.filings) {
      const filer = filing.personId as PersonId;
      const here = `${where}: ${filing.id}`;
      const entry = entryOf(found, filing);
      expect(entry, `${here} fired no moment`).toBeTruthy();
      const household =
        core.households.get(core.people.get(filer)!.householdId)?.memberIds ??
        [];
      const stakeholders = household.filter(
        (id) =>
          stakeOf(core, filer, `candidate-filed:${filing.id}`, id) !== null,
      );
      const staged = entry!.bindings.find(
        (row) => row.typeKey === "family-filing",
      );
      // The trigger record and the stake decide it: no stake, no scene.
      expect(!!staged, `${here}: stakeholders ${stakeholders.join(",")}`).toBe(
        stakeholders.length > 0,
      );
      if (!staged) continue;
      const result = purposeScene(core, director, filer, entry!, {
        typeKey: "family-filing",
      });
      expect(result?.kind, `${here}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") continue;
      const { scene } = result;
      sawScene = true;
      // Cast by stake: the relative is a stakeholder, the strongest one.
      expect(stakeholders, here).toContain(scene.askerId);
      expect(scene.cause.id, here).toBe(`candidate-filed:${filing.id}`);
      const stakeFact = scene.facts.find((row) => row.key.startsWith("stake-"));
      expect(stakeFact, `${here}: the scene names no stake`).toBeTruthy();
      expect(stakeFact!.recordIds, here).toContain(scene.cause.id);
      // The child stance exists only where a child does: a money scene carries
      // no child, and a time scene names the child the household record holds.
      const childFact = scene.facts.find((row) => row.key === "child");
      if (stakeFact!.key === "stake-money")
        expect(childFact, here).toBeUndefined();
      else expect(childFact, here).toBeTruthy();
      // The opener says it, in her own words: money or time, from the record.
      const opener = scene.talk.state.text;
      if (stakeFact!.key === "stake-money")
        expect(opener, here).toMatch(/savings|saved|money/i);
      else
        expect(opener, here).toContain(
          core.people.get(
            scene.facts.find((row) => row.key === "child")!
              .recordIds[0] as PersonId,
          )!.givenName,
        );
      // Four replies, four stances: four different moves and four different lines.
      const moves = scene.talk.tree.replies.map((row) => row.line.move);
      expect(new Set(moves).size, `${here}: ${moves}`).toBe(moves.length);
      expect(
        new Set(scene.talk.tree.replies.map((row) => row.line.text)).size,
        here,
      ).toBe(moves.length);
      expect(moves, here).toEqual(
        expect.arrayContaining(["tell", "request", "comfort", "deflect"]),
      );
      // The player's replies name a body only where it is the office they
      // filed for, and claim no span of years the records do not hold.
      const office = (
        scene.facts.find((row) => row.key === "office")?.text ?? ""
      ).toLowerCase();
      for (const { line } of scene.talk.tree.replies) {
        for (const body of ["council", "board", "legislature", "commission"])
          if (new RegExp(`\\b${body}\\b`, "i").test(line.text))
            expect(office, `${here}: "${line.text}"`).toContain(body);
        expect(line.text, here).not.toMatch(
          /\b(?:\d+|two|three|five|ten|twenty) years\b/i,
        );
      }
      notes.push(
        `${here}: ${core.people.get(scene.askerId)!.givenName} (${stakeFact!.key}): "${opener}" / ${scene.talk.tree.replies
          .map((row) => `${row.line.move}: "${row.line.text}"`)
          .join(" | ")}`,
      );

      // What the player says is written where another engine reads it. The
      // filer plays as themselves, so the household sees the record.
      core.playerId = filer;
      for (const path of paths(scene.talk.tree)) {
        if (path.length !== 1) continue;
        const root = scene.talk.tree.replies[path[0]!]!;
        if (root.line.move === "request" && !sawEnlist) {
          const answered = root.next?.lines.find((row) => row.role === "asker");
          const before = core.modules.has(CAMPAIGNS_MODULE_ID)
            ? [...campaignFor(coreAPI(core), filing.id).volunteerIds]
            : [];
          const id = replyInScene(core, director, filer, entry!, path);
          expect(id, here).toBeTruthy();
          const after = [...campaignFor(coreAPI(core), filing.id).volunteerIds];
          if (answered?.move === "promise") {
            expect(before, here).not.toContain(scene.askerId);
            expect(after, `${here}: said yes, not counted`).toContain(
              scene.askerId,
            );
            expect(core.durableLog.get(id!)?.facts?.enlisted, here).toBe(
              filing.id,
            );
            sawEnlist = true;
            notes.push(
              `${here}: ${answered.speaker} answered "${answered.text}" and is counted a volunteer (${id})`,
            );
          } else {
            // Said no: not counted, and the record says why nobody was enlisted.
            expect(after, `${here}: said no, counted anyway`).not.toContain(
              scene.askerId,
            );
          }
        }
        // An ending that strains the tie is written back: the scene's record
        // keeps it, and closeness, the engine that owns the tie, drops.
        if (!sawStrain) {
          const ended = paths(scene.talk.tree).find((full) => {
            let node: TreeNode | null = scene.talk.tree;
            for (const i of full) node = node?.replies[i]?.next ?? null;
            return node?.end?.ending?.keeps === "relationship-strained";
          });
          if (ended && ended.length > 1) {
            const before = closenessBetween(core, scene.askedId, scene.askerId);
            const id = replyInScene(core, director, filer, entry!, ended);
            const facts = core.durableLog.get(id!)?.facts;
            expect(facts?.keeps, here).toBe("relationship-strained");
            expect(
              closenessBetween(core, scene.askedId, scene.askerId),
              `${here}: a strained ending left the tie as it was`,
            ).toBeLessThan(before);
            // The journal tells what the ending kept, from that record, of
            // someone the player can name (a relative, or someone they know).
            const told = composeJournal(core, director, filer)
              .flatMap((chapter) => chapter.lines)
              .find((line) => line.momentIds.includes(id!));
            const me = core.people.get(filer)!;
            if (
              familyFactsOf(me).has(scene.askerId) ||
              me.knownIds.has(scene.askerId)
            )
              expect(
                told?.sourceRecordIds ?? [],
                `${here}: no journal line`,
              ).toContain(id);
            sawStrain = true;
            notes.push(
              `${here}: ending ${String(facts?.ending)} kept (${id}); journal: "${told?.text}"`,
            );
          }
        }
        if (root.line.move === "deflect" && !sawPutOff) {
          const before = closenessBetween(core, scene.askedId, scene.askerId);
          const id = replyInScene(core, director, filer, entry!, path);
          expect(id, here).toBeTruthy();
          const after = closenessBetween(core, scene.askedId, scene.askerId);
          expect(
            after,
            `${here}: put off and the tie did not drop`,
          ).toBeLessThan(before);
          sawPutOff = true;
          notes.push(`${here}: put off, tie ${before} to ${after} (${id})`);
        }
      }
    }
  }
  console.log(notes.join("\n"));
  if (process.env.SCENE_LOG)
    writeFileSync(process.env.SCENE_LOG, notes.join("\n"));
  expect(sawScene, `no drawn place staged a stake scene, seed ${seed}`).toBe(
    true,
  );
  expect(sawPutOff, `no put-off path was played, seed ${seed}`).toBe(true);
  expect(sawStrain, `no strained ending was played, seed ${seed}`).toBe(true);
  expect(sawEnlist, `no relative said yes to helping, seed ${seed}`).toBe(true);
}, 1_800_000);
