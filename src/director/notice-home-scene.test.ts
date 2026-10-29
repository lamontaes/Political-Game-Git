import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { NOTICE_SERVED_EVENT } from "../core2/modules/housing";
import type { PersonId } from "../core2/types";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";
import type { ScheduleEntry } from "./scheduling";

// The day the landlord serves a household notice to pay or leave (the
// housing engine's notice record, circumstance row notice-home), someone the
// person lives with brings it to them at home: what is owed and the day it is
// due, from the record. The person's answer is written back, and a promise to
// pay is kept on its record and told in their journal. Places are drawn in
// turn until a household of two or more is served notice.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 4;
const DAYS = 240;
const LABEL = "circumstance:notice-home";

/** Every path of a tree: the replies chosen, the node it reaches. */
const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

it(`a notice to pay or leave is talked over at home, from the record (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `notice-home:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      // Everyone full who lives with someone: whoever is served, the
      // director has their ledger.
      const watched = [...core.people.values()]
        .filter(
          (row) =>
            row.alive &&
            row.tier !== "husk" &&
            (core.households.get(row.householdId)?.memberIds.length ?? 0) > 1,
        )
        .map((row) => row.id as PersonId);
      for (const id of watched) director.watch(core, id);
      let found: { personId: PersonId; entry: ScheduleEntry } | undefined;
      for (let day = 0; day < DAYS && !found; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        for (const id of watched) {
          const book = director.ledger.people.get(id);
          const entry = book?.schedule.find(
            (row) =>
              row.date === core.date &&
              book.momentsById.get(row.momentId)?.label === LABEL,
          );
          if (entry) {
            found = { personId: id, entry };
            break;
          }
        }
      }
      if (!found) {
        tried.push(`${where}: no notice talked over in ${DAYS} days`);
        continue;
      }
      const { personId, entry } = found;
      const moment = director.ledger.people
        .get(personId)!
        .momentsById.get(entry.momentId)!;
      const record = core.durableLog.get(moment.causeId);
      expect(record?.kind, where).toBe(NOTICE_SERVED_EVENT);
      const result = purposeScene(core, director, personId, entry);
      expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") return;
      const { scene } = result;
      // Someone they live with brings it, and says what is owed and when.
      expect(scene.askerId, where).not.toBe(personId);
      expect(core.people.get(scene.askerId)?.householdId, where).toBe(
        core.people.get(personId)?.householdId,
      );
      const said = scene.talk.lines.map((row) => row.text).join(" | ");
      const owed = scene.facts.find((row) => row.key === "owed");
      expect(owed?.recordIds, where).toContain(moment.causeId);
      // The four answers are four moves.
      const root = scene.talk.tree.replies.map((reply) => reply.line);
      expect(new Set(root.map((row) => row.move)).size, where).toBe(
        root.length,
      );
      // A promise to find the money is kept on the reply's record.
      const promised = paths(scene.talk.tree).find((full) => {
        let node: TreeNode | null = scene.talk.tree;
        for (const index of full) node = node?.replies[index]?.next ?? null;
        return node?.end?.ending?.keeps === "promise";
      });
      expect(promised, `${where}: no path keeps a promise`).toBeTruthy();
      const id = replyInScene(core, director, personId, entry, promised!);
      expect(core.durableLog.get(id!)?.facts?.keeps, where).toBe("promise");
      const told = composeJournal(core, director, personId)
        .flatMap((chapter) => chapter.lines)
        .find((line) => line.momentIds.includes(id!));
      const note = `NOTICE HOME ${where}: ${core.date}, cause ${moment.causeId}, ${personId} with ${scene.askerId} (owed ${owed?.text}); reply ${id}; journal "${told?.text ?? "(other unnamed)"}"\n  ${said}`;
      if (process.env.SCENE_LOG) writeFileSync(process.env.SCENE_LOG, note);
      return;
    }
    throw new Error(
      `no drawn place talked over a notice: ${tried.join("; ")} (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
