import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { beginSeriousIllness } from "../core2/modules/health";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { illnessFacts } from "./illness-facts";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// The player is the one seriously ill, and a relative comes to see them and
// offers something or asks whether to tell someone (owner, Nov 9: a purpose
// for every scene kind that lacks one; the stopgap
// SG-WORDS-visit-ill-no-purpose). The cause is the health engine's own
// `health.serious-illness` record and the visitor is the closest kin the
// player's tie threads name; the facts are read from the record, the
// household, the job row and the witnesses and cited by id.
//
// HAND-STAGED: the player's illness is begun through the health engine's own
// `beginSeriousIllness`, since a serious illness for the player is rare in a
// played year; the onset, the record, the director's cast and the scene are
// the engines'.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 6;

const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );
const endsKeeping = (tree: TreeNode, keeps: string) =>
  paths(tree).filter((full) => {
    let node: TreeNode | null = tree;
    for (const index of full) node = node?.replies[index]?.next ?? null;
    return node?.end?.ending?.keeps === keeps;
  });
const SLOP = /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;

it(`a relative visits the player when the player is seriously ill, from the illness record (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  const found = new Set<string>();
  let played = 0;
  try {
    for (let attempt = 0; attempt < ATTEMPTS && played < 2; attempt += 1) {
      const place = drawPlace(seed, `visited-ill:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const id = playerId as PersonId;
      core.focusPersonIds.add(id);
      director.watch(core, id);
      const book = director.ledger.people.get(id)!;
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      if (!beginSeriousIllness(api, id)) {
        tried.push(`${where}: the health engine would not begin an illness`);
        continue;
      }
      let entry;
      for (let day = 0; day < 40 && !entry; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        entry = book.schedule.find((row) => {
          const moment = book.momentsById.get(row.momentId)!;
          const cause = core.durableLog.get(moment.causeId);
          return (
            row.bindings.some((b) => b.typeKey === "visit") &&
            cause?.kind === "health.serious-illness" &&
            cause.personIds[0] === id
          );
        });
      }
      if (!entry) {
        tried.push(`${where}: no visit scheduled for the ill player`);
        continue;
      }
      const moment = book.momentsById.get(entry.momentId)!;
      const record = core.durableLog.get(moment.causeId)!;
      const result = purposeScene(core, director, id, entry, {
        typeKey: "visit",
      });
      expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") continue;
      const { scene } = result;
      expect(scene.purpose, where).toBe("visited-ill-ask");
      // The visitor asks, and the ill player is the one asked.
      expect(scene.askedId, where).toBe(id);
      expect(scene.askerId, where).not.toBe(id);
      const given = illnessFacts(core, "visit", record.id, scene.askerId, id);
      expect(Object.keys(given), where).toContain("you-ill");
      for (const [key, expected] of Object.entries(given)) {
        const fact = scene.facts.find((row) => row.key === key);
        expect(fact?.text, `${where}: ${key}`).toBe(expected.text);
        expect(fact?.recordIds, `${where}: ${key}`).toEqual(
          expected.sourceRecordIds,
        );
        found.add(key);
      }
      for (const key of [
        "sick-for",
        "lives-alone",
        "partner",
        "child",
        "other",
        "employer",
        "visitor-partner",
      ])
        expect(
          scene.facts.some((row) => row.key === key),
          `${where}: ${key}`,
        ).toBe(key in given);
      for (const row of scene.talk.lines) {
        expect(row.text, where).not.toMatch(SLOP);
        expect(row.text, where).not.toMatch(/\ball right\b/i);
      }
      expect(scene.talk.gaps, where).toEqual([]);
      expect(scene.talk.depth, where).toBeGreaterThan(1);
      const yes = endsKeeping(scene.talk.tree, "promise")[0];
      expect(yes, `${where}: no path keeps a promise`).toBeTruthy();
      const replyId = replyInScene(core, director, id, entry, yes!, {
        typeKey: "visit",
      });
      const reply = core.durableLog.get(replyId!);
      expect(reply?.facts?.typeKey, where).toBe("visit");
      expect(reply?.facts?.causeId, where).toBe(record.id);
      expect(reply?.facts?.keeps, where).toBe("promise");
      expect(reply?.personIds, where).toContain(scene.askerId);
      played += 1;
      // A month on, the same record says how long they have been ill.
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      const later = illnessFacts(core, "visit", record.id, scene.askerId, id);
      expect(later["sick-for"]?.sourceRecordIds, where).toEqual([record.id]);
      process.stdout.write(
        `VISITED ILL ${where}: ${record.id}, ${scene.askerId} visits ${id}; facts ${scene.facts.map((f) => f.key).join(",")}; reply ${replyId} ending ${reply?.facts?.ending}\n  ${scene.talk.narration.map((l) => l.text).join(" ")} | ${scene.talk.state.text}\n`,
      );
    }
    process.stdout.write(`VISITED ILL facts found: ${[...found].join(",")}\n`);
    expect(played, `seed ${seed}: ${tried.join("; ")}`).toBeGreaterThan(0);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
