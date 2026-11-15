import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { beginSeriousIllness } from "../core2/modules/health";
import { HEALTH_RESCUED } from "../core2/modules/rescue";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import { rescueFacts } from "./rescue-facts";
import type { TreeNode } from "./scene-talk";
import { expectUpToFourDifferent } from "./reply-set-check";

// A rescue asks the player for something (owner, Nov 9: a purpose for every
// scene kind that lacks one). The facts come from the partnerships engine's
// own `health.rescued` record (who got help, who was in the room), the family
// records (a partner) and the witnesses' birth dates (a child).
//
// HAND-STAGED: a played year seldom shows a rescue for the player, so the
// player's serious illness is begun through the health engine's own
// `beginSeriousIllness`; the onset event, the rescuer's choice and the
// `health.rescued` record are the engines' own, and so is the scene's cause.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 2;

const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

function endsKeeping(tree: TreeNode, keeps: string) {
  return paths(tree).flatMap((full) => {
    let node: TreeNode | null = tree;
    for (const index of full) node = node?.replies[index]?.next ?? null;
    return node?.end?.ending?.keeps === keeps
      ? [{ full, ending: node.end.ending }]
      : [];
  });
}

const SLOP = /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;

const log = (note: string) => {
  if (process.env.SCENE_LOG)
    writeFileSync(process.env.SCENE_LOG, `${note}\n`, { flag: "a" });
  process.stdout.write(`${note}\n`);
};

it(`a rescue asks the player for something, from the rescue record (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  let played = 0;
  const found = new Set<string>();
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `rescue:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const id = playerId as PersonId;
      const api = coreAPI(core);
      director.watch(core, id);
      const book = director.ledger.people.get(id)!;
      // HAND-STAGED trigger: the illness begins through the health engine.
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      if (!beginSeriousIllness(api, id)) {
        tried.push(`${where}: the health engine would not begin an illness`);
        continue;
      }
      const seen = new Set<string>();
      let replied = false;
      for (let days = 0; days < 60; days += 2) {
        advanceCore(core, addDays(makeIsoDate(core.date), 2));
        for (const entry of book.schedule.filter(
          (row) =>
            !seen.has(row.momentId) &&
            row.bindings.some((bound) => bound.typeKey === "rescue"),
        )) {
          seen.add(entry.momentId);
          const moment = book.momentsById.get(entry.momentId)!;
          const record = core.durableLog.get(moment.causeId);
          if (record?.kind !== HEALTH_RESCUED) continue;
          // Played only where the player is the one who fell ill.
          if (record.personIds[0] !== id) continue;
          const rescuerId = record.personIds[1]!;
          const result = purposeScene(core, director, id, entry, {
            typeKey: "rescue",
          });
          expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
            "composed",
          );
          if (result?.kind !== "composed") return;
          const { scene } = result;
          expect(scene.purpose, where).toBe("rescue-ask");
          expect(scene.askedId, where).toBe(id);
          // The one who called for help asks, never the player.
          expect(scene.askerId, where).toBe(rescuerId);
          const fact = (key: string) =>
            scene.facts.find((row) => row.key === key);
          const given = rescueFacts(
            core,
            "rescue",
            moment.causeId,
            scene.askerId,
            id,
          );
          for (const [key, expected] of Object.entries(given)) {
            expect(fact(key)?.text, `${where}: ${key}`).toBe(expected.text);
            expect(fact(key)?.recordIds, `${where}: ${key}`).toEqual(
              expected.sourceRecordIds,
            );
            found.add(key);
          }
          for (const key of ["partner", "child", "others-there"])
            expect(!!fact(key), `${where}: ${key}`).toBe(key in given);
          // A child fact is a witness under voting age, from the record.
          if (given.child) {
            const kid = core.people.get(
              given.child.sourceRecordIds.at(-1) as PersonId,
            )!;
            expect(record.witnessIds, where).toContain(kid.id);
            expect(
              ageOnDate(makeIsoDate(kid.birthDate), makeIsoDate(record.date)),
              where,
            ).toBeLessThan(18);
          }
          const root = scene.talk.tree.replies.map((reply) => reply.line);
          expectUpToFourDifferent(root, where);
          for (const row of root)
            expect(["agree", "ask", "decline"], where).toContain(row.move);
          expect(scene.talk.depth, where).toBeGreaterThan(1);
          expect(
            scene.talk.gaps.filter((gap) => gap.includes("/ending/")),
            where,
          ).toEqual([]);
          for (const row of scene.talk.lines) {
            expect(row.text, where).not.toMatch(SLOP);
            expect(row.text, where).not.toMatch(/\ball right\b/i);
          }
          const narration = scene.talk.narration
            .map((row) => row.text)
            .join(" ");
          const said = scene.talk.lines.map((row) => row.text).join(" | ");
          if (!replied) {
            replied = true;
            const settled = endsKeeping(scene.talk.tree, "kept-in-scene")[0];
            expect(
              settled,
              `${where}: no path settles in the scene`,
            ).toBeTruthy();
            const replyId = replyInScene(
              core,
              director,
              id,
              entry,
              settled!.full,
              { typeKey: "rescue" },
            );
            const reply = core.durableLog.get(replyId!);
            expect(reply?.facts?.typeKey, where).toBe("rescue");
            expect(reply?.facts?.causeId, where).toBe(moment.causeId);
            expect(reply?.facts?.ending, where).toBe(
              "said-yes-after-the-rescue",
            );
            expect(reply?.facts?.keeps, where).toBe("kept-in-scene");
            expect(reply?.personIds, where).toContain(scene.askerId);
            const sour = endsKeeping(
              scene.talk.tree,
              "relationship-strained",
            )[0];
            const sourId = sour
              ? replyInScene(core, director, id, entry, sour.full, {
                  typeKey: "rescue",
                })
              : null;
            if (sourId)
              expect(core.durableLog.get(sourId)?.facts?.ending, where).toBe(
                "turned-down-who-got-you-help",
              );
            log(
              `RESCUE (illness begun through the health engine, rescue record the engines' own) ${where}: ${moment.date}, cause ${moment.causeId}, ${id} asked by ${scene.askerId}; facts ${scene.facts.map((row) => row.key).join(",")}; reply ${replyId} ending ${reply?.facts?.ending}; strained ${sourId ?? "(none reachable)"}\n  ${narration} | ${said}`,
            );
          }
          played += 1;
        }
      }
      if (!seen.size) tried.push(`${where}: no rescue scene scheduled`);
    }
    log(`RESCUE facts found: ${[...found].join(",") || "(none)"}`);
    expect(
      played,
      `no rescue played: ${tried.join("; ")} (seed ${seed})`,
    ).toBeGreaterThan(0);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
