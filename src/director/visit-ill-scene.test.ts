import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { beginSeriousIllness } from "../core2/modules/health";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { illnessFacts } from "./illness-facts";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// The player visits someone they know who is seriously ill, and the sick
// person asks something of them (owner, Nov 9: a purpose for every scene kind
// that lacks one; the stopgap SG-WORDS-visit-ill-no-purpose). The cause is the
// health engine's own `health.serious-illness` record; the facts (how long
// they have been ill, who is at home, another person who heard) are read from
// it, the household and the witnesses and cited by id.
//
// HAND-STAGED: the illness is begun through the health engine's own
// `beginSeriousIllness` for an adult the player knows, so a visit is certain
// in the few days played; the onset, the record, the director's cast and the
// scene are the engines'.
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

it(`a visit to someone seriously ill is the sick person asking something, from the illness record (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  const found = new Set<string>();
  let played = 0;
  try {
    for (let attempt = 0; attempt < ATTEMPTS && played < 2; attempt += 1) {
      const place = drawPlace(seed, `visit-ill:${attempt}`);
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
      const player = core.people.get(id)!;
      const known = [...player.knownIds]
        .filter((other) => other !== id)
        .sort()
        .map((other) => core.people.get(other))
        .filter(
          (row) =>
            !!row &&
            row.alive &&
            row.tier !== "husk" &&
            ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date)) >=
              P.votingAge,
        );
      const ill = known.find((row) => beginSeriousIllness(api, row!.id));
      if (!ill) {
        tried.push(`${where}: no adult the player knows could fall ill`);
        continue;
      }
      let entry;
      for (let day = 0; day < 40 && !entry; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        entry = book.schedule.find((row) => {
          const moment = book.momentsById.get(row.momentId)!;
          return (
            row.bindings.some((b) => b.typeKey === "visit") &&
            core.durableLog.get(moment.causeId)?.kind ===
              "health.serious-illness" &&
            core.durableLog.get(moment.causeId)?.personIds[0] === ill.id
          );
        });
      }
      if (!entry) {
        tried.push(`${where}: no visit scheduled for ${ill.id}`);
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
      expect(scene.purpose, where).toBe("visit-ill-ask");
      expect(scene.askedId, where).toBe(id);
      // The sick person asks, never the visitor.
      expect(scene.askerId, where).toBe(ill.id);
      const given = illnessFacts(core, "visit", record.id, scene.askerId, id);
      expect(Object.keys(given), where).toContain("ill");
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
      expect(reply?.personIds, where).toContain(ill.id);
      played += 1;
      // A month on, the same record says how long they have been ill.
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      const later = illnessFacts(core, "visit", record.id, scene.askerId, id);
      expect(later["sick-for"]?.sourceRecordIds, where).toEqual([record.id]);
      expect(later["sick-for"]?.text, where).toBeTruthy();
      process.stdout.write(
        `VISIT ILL ${where}: ${record.id}, ${id} visits ${ill.id}; facts ${scene.facts.map((f) => f.key).join(",")}; reply ${replyId} ending ${reply?.facts?.ending}\n  ${scene.talk.narration.map((l) => l.text).join(" ")} | ${scene.talk.state.text}\n`,
      );
    }
    process.stdout.write(`VISIT ILL facts found: ${[...found].join(",")}\n`);
    expect(played, `seed ${seed}: ${tried.join("; ")}`).toBeGreaterThan(0);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
