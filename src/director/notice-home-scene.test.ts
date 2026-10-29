import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  HOUSING_MODULE_ID,
  NOTICE_SERVED_EVENT,
} from "../core2/modules/housing";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";
import type { ScheduleEntry } from "./scheduling";

// The day the landlord serves the player's household notice to pay or leave
// (the housing engine's notice record, circumstance row notice-home), someone
// they live with brings it to them at home: what is owed and the day it is
// due, from the record. The player's answer is written back, and a promise to
// pay is kept on its record and told in their journal.
//
// Who the landlord serves is the housing engine's own weighing of months
// owed and months late, so the test first plays a drawn place's year to learn
// which household of two or more it serves, then plays the same world again
// as an adult of that household (as Advanced lets the player pick a
// resident), through the player's clock, to the day of the notice.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 6;
const DAYS = 330;
const LABEL = "circumstance:notice-home";

/** Every path of a tree: the replies chosen, the node it reaches. */
const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

interface CaseRow {
  householdId: string;
  counted?: boolean;
  noticeAt: string;
}

it(`a notice to pay or leave is talked over at home, from the record (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `notice-home:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const build = () =>
        buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
      // The year as it plays: the first full household of two or more the
      // landlord serves, and the day.
      const first = build();
      advanceCore(first.core, addDays(makeIsoDate(first.core.date), DAYS));
      const served = (
        coreAPI(first.core)
          .moduleState(HOUSING_MODULE_ID)
          .table("cases")
          .rows() as unknown as CaseRow[]
      )
        .filter(
          (row) =>
            !row.counted &&
            (first.core.households.get(row.householdId)?.memberIds.length ??
              0) > 1,
        )
        .sort((a, b) => a.noticeAt.localeCompare(b.noticeAt))[0];
      if (!served) {
        tried.push(`${where}: no household of two served notice`);
        continue;
      }
      // The same world, played as an adult of that household.
      const { core, director } = build();
      const start = makeIsoDate(core.date);
      const personId = (
        core.households.get(served.householdId)?.memberIds ?? []
      ).find((id) => {
        const row = core.people.get(id);
        return (
          row?.alive &&
          row.tier !== "husk" &&
          ageOnDate(makeIsoDate(row.birthDate), start) >= 18
        );
      });
      if (!personId) {
        tried.push(`${where}: no adult in ${served.householdId}`);
        continue;
      }
      core.focusPersonIds.add(personId);
      director.watch(core, personId);
      const book = director.ledger.people.get(personId)!;
      let entry: ScheduleEntry | undefined;
      const open = () => {
        entry ??= book.schedule.find(
          (row) => book.momentsById.get(row.momentId)?.label === LABEL,
        );
      };
      let packet = advancePlayerV1(core, {
        controlledPersonId: personId,
        through: {
          date: addDays(makeIsoDate(served.noticeAt), 2),
          minuteOfDay: P.zero,
        },
      });
      while (packet.kind !== "complete" && !entry) {
        if (packet.kind === "stop") {
          open();
          if (entry) break;
          packet = resumePlayerV1(core, {
            kind: "stop",
            pauseId: packet.pauseId,
          });
        } else
          packet = resumePlayerV1(core, {
            kind: "own-choice",
            pauseId: packet.pauseId,
          });
      }
      open();
      if (!entry) {
        tried.push(
          `${where}: ${served.householdId}, served ${served.noticeAt} in the year, not talked over as ${personId}`,
        );
        continue;
      }
      const moment = book.momentsById.get(entry.momentId)!;
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
