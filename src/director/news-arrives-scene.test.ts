import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { newsFacts } from "./news-facts";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// A household member brings the player news (a death, a pairing, a parting)
// and asks something of them (owner, Nov 9: a purpose for every scene kind
// that lacks one). The news is the record itself: `life.death`,
// `family.partnered` or `family.separated`. A year of drawn places is played
// with every full person watched, as birth-scenes.test.ts does, so the news
// the engines write for a person's circle reaches them; each such moment is
// composed through the one purpose engine. Nothing here is hand-staged.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 5;
const KINDS = new Set(["life.death", "family.partnered", "family.separated"]);

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

it(`news a household member brings asks something of the player, from the record that is the news (seed ${seed})`, () => {
  const tried: string[] = [];
  const kinds = new Set<string>();
  let played = 0;
  let replied = false;
  for (let life = 0; life < ATTEMPTS && kinds.size < 2; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "news-arrives");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    setBookkeeping(false);
    try {
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      for (const person of core.people.values())
        if (person.alive && person.id.startsWith("person_"))
          director.watch(core, person.id);
      let seen = 0;
      // The scenes are composed in the month their record is written, as play
      // meets them: the world folds a gone person's records away later.
      const done = new Set<string>();
      for (let month = 0; month < 12; month += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 30));
        for (const [personId, book] of director.ledger.people)
          for (const entry of book.schedule) {
            const key = `${personId}|${entry.momentId}`;
            if (done.has(key)) continue;
            done.add(key);
            if (!entry.bindings.some((b) => b.typeKey === "news-arrives"))
              continue;
            const moment = book.momentsById.get(entry.momentId)!;
            const record = core.durableLog.get(moment.causeId);
            if (!record || !KINDS.has(record.kind)) continue;
            const binding = entry.bindings.find(
              (b) => b.typeKey === "news-arrives",
            )!;
            const receiver = binding.roles.find((r) => r.role === "receiver")
              ?.personIds[0];
            // Only news the player is told (not news the player carries).
            if (receiver !== personId) continue;
            seen += 1;
            // News about someone the world no longer holds as a person, or a
            // pairing or parting the person is a party to, has nothing to name: the scene is skipped, not worded as "someone".
            const aboutId = binding.roles.find((r) => r.role === "about")
              ?.personIds[0];
            const aParty =
              record.kind !== "life.death" &&
              record.personIds.includes(personId);
            if (aParty || !aboutId || !core.people.has(aboutId as PersonId)) {
              const gone = purposeScene(
                core,
                director,
                personId as PersonId,
                entry,
                {
                  typeKey: "news-arrives",
                },
              );
              expect(gone?.kind, `${where}: ${record.id}`).toBe("skipped");
              continue;
            }

            const result = purposeScene(
              core,
              director,
              personId as PersonId,
              entry,
              {
                typeKey: "news-arrives",
              },
            );
            expect(
              result?.kind,
              `${where}: ${record.id} ${JSON.stringify(result)} ${JSON.stringify(binding.roles)} ${JSON.stringify(record.personIds)} facts ${JSON.stringify(Object.keys(newsFacts(core, "news-arrives", moment.causeId, binding.roles.find((r) => r.role === "bearer")!.personIds[0] as PersonId, personId as PersonId, binding.roles.find((r) => r.role === "about")?.personIds[0] as PersonId)))} about alive ${core.people.get(binding.roles.find((r) => r.role === "about")!.personIds[0]!)?.alive}`,
            ).toBe("composed");
            if (result?.kind !== "composed") continue;
            const { scene } = result;
            expect(scene.purpose, where).toBe("news-ask");
            expect(scene.askedId, where).toBe(personId);
            expect(scene.askerId, where).not.toBe(personId);
            const about = binding.roles.find((r) => r.role === "about")
              ?.personIds[0] as PersonId;
            expect(about, where).not.toBe(personId);
            const given = newsFacts(
              core,
              "news-arrives",
              moment.causeId,
              scene.askerId,
              personId as PersonId,
              about,
            );
            expect(Object.keys(given), where).toContain("subject");
            for (const [key, expected] of Object.entries(given)) {
              const fact = scene.facts.find((row) => row.key === key);
              expect(fact?.text, `${where}: ${key}`).toBe(expected.text);
              expect(fact?.recordIds, `${where}: ${key}`).toEqual(
                expected.sourceRecordIds,
              );
            }
            // The news a line names is the news the record is.
            const narration = scene.talk.narration.map((l) => l.text).join(" ");
            const said = scene.talk.lines.map((l) => l.text).join(" | ");
            for (const row of scene.talk.lines) {
              expect(row.text, where).not.toMatch(SLOP);
              expect(row.text, where).not.toMatch(/\ball right\b/i);
            }
            expect(scene.talk.gaps, where).toEqual([]);
            expect(scene.talk.depth, where).toBeGreaterThan(1);
            kinds.add(record.kind);
            played += 1;
            let note = "";
            if (!replied) {
              replied = true;
              // The reply is the player's: seat the player as this person.
              core.playerId = personId;
              const yes = endsKeeping(scene.talk.tree, "promise")[0];
              expect(yes, `${where}: no path keeps a promise`).toBeTruthy();
              const replyId = replyInScene(
                core,
                director,
                personId as PersonId,
                entry,
                yes!,
                { typeKey: "news-arrives" },
              );
              const reply = core.durableLog.get(replyId!);
              expect(reply?.facts?.typeKey, where).toBe("news-arrives");
              expect(reply?.facts?.causeId, where).toBe(record.id);
              expect(reply?.facts?.keeps, where).toBe("promise");
              note = ` reply ${replyId} ending ${reply?.facts?.ending};`;
            }
            process.stdout.write(
              `NEWS ${where}: ${record.id}; ${personId} told by ${scene.askerId} about ${about};${note} facts ${scene.facts.map((f) => f.key).join(",")}\n  ${narration} | ${said.slice(0, 400)}\n`,
            );
          }
      }
      if (!seen) tried.push(`${where}: no news staged for a receiver`);
    } finally {
      setBookkeeping(true);
    }
  }
  expect(played, `seed ${seed}: ${tried.join("; ")}`).toBeGreaterThan(0);
}, 3_600_000);
