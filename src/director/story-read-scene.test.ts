import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { familyFactsOf } from "../core2/modules/people";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import type { CoreState, PersonId } from "../core2/types";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";
import type { ScheduleEntry } from "./scheduling";
import { expectUpToFourDifferent } from "./reply-set-check";

// A story someone at home read (the news engine's `news.read` record, circumstance
// rows story-read-home and national-news-work) is a scene with a purpose of its
// own (owner, Nov 8 playtest, P37): the reader brings up the story by name, with
// the paper that ran it, and the player agrees, disagrees, asks or puts the talk
// off. It was the news-arrives type with no purpose, so small talk picked the
// biggest recorded event (the president's address, two weeks on) and the scene
// never named the story it was about (owner, Oct 15: "a scene needs a purpose,
// and stakes"; Oct 19: "A narrator line names the thing it refers to").
//
// Who reads is the news engine's: so the test first plays a drawn place's year
// to learn which adults of a household of two a reader's story reached, then
// plays the same world again watching those housemates through the director's
// own ledger, to the day a story-read scene is staged for one of them.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 6;
/** The days the first pass plays to learn who to watch; the second stops on the day the scene is staged. */
const FIND_DAYS = 45;
const PLAY_DAYS = 90;
const WATCHED = 4;
const LABELS = new Set([
  "circumstance:story-read-home",
  "circumstance:national-news-work",
]);

/** Every path of a tree: the replies chosen, the node it reaches. */
const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

const adult = (core: CoreState, id: PersonId) => {
  const row = core.people.get(id);
  return (
    !!row &&
    row.alive &&
    row.tier !== "husk" &&
    ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date)) >= 18
  );
};

/** The year as it plays: adults whose housemate a story reached, in the order it reached them. */
function readersHousemates(build: () => ReturnType<typeof buildBenchWorld>) {
  const { core } = build();
  const start = core.date;
  // Only people the world has at its opening can be watched from it.
  const present = new Set(core.people.keys());
  advanceCore(core, addDays(makeIsoDate(core.date), FIND_DAYS));
  const players = new Set<PersonId>();
  for (const id of core.logByKind.get("news.read") ?? []) {
    const record = core.durableLog.get(id as never);
    if (!record || record.date < start) continue;
    for (const reader of record.witnessIds ?? []) {
      if (!adult(core, reader as PersonId)) continue;
      const home = core.households.get(
        core.people.get(reader as PersonId)!.householdId,
      );
      for (const mate of home?.memberIds ?? [])
        if (mate !== reader && present.has(mate) && adult(core, mate))
          players.add(mate);
    }
    if (players.size >= WATCHED) break;
  }
  return players;
}

it(`a story read at home is talked over by name (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `story-read:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const build = () =>
        buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
      // The year as it plays: housemates of the people a story reached. The
      // first world is let go before the second is built.
      const players = readersHousemates(build);
      // The first world is let go before the second is built (a crowded container
      // runs this with --expose-gc; otherwise a no-op).
      (globalThis as { gc?: () => void }).gc?.();
      if (!players.size) {
        tried.push(`${where}: no story reached a household of two adults`);
        continue;
      }
      // The same world, its housemates watched day by day.
      // The same world, played as the first of them, through the player's
      // clock (only the person the player controls is served scenes from
      // circumstance), to the day a story-read scene is staged for them.
      const { core, director } = build();
      const personId = [...players][0]!;
      core.focusPersonIds.add(personId);
      director.watch(core, personId);
      const book = director.ledger.people.get(personId)!;
      const hit: { entry?: ScheduleEntry } = {};
      const open = () => {
        const entry = book.schedule.find((row) =>
          LABELS.has(book.momentsById.get(row.momentId)?.label ?? ""),
        );
        if (entry) hit.entry = entry;
      };
      let packet = advancePlayerV1(core, {
        controlledPersonId: personId,
        through: {
          date: addDays(makeIsoDate(core.date), PLAY_DAYS),
          minuteOfDay: P.zero,
        },
      });
      while (packet.kind !== "complete" && !hit.entry) {
        if (packet.kind === "stop") {
          open();
          if (hit.entry) break;
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
      if (!hit.entry) {
        tried.push(
          `${where}: played as ${personId} for ${PLAY_DAYS} days, no story-read scene`,
        );
        continue;
      }
      const entry = hit.entry;
      const moment = book.momentsById.get(entry.momentId)!;
      const record = core.durableLog.get(moment.causeId);
      expect(record?.kind, where).toBe("news.read");
      // Staged as the story-read type, not the small talk of news-arrives.
      expect(
        entry.bindings.map((row) => row.typeKey),
        where,
      ).toContain("story-read");
      const result = purposeScene(core, director, personId, entry);
      if (result?.kind !== "composed") {
        // A story the catalog cannot name is not worded as "something".
        tried.push(
          `${where}: ${moment.causeId} skipped: ${JSON.stringify(result)}`,
        );
        continue;
      }
      const { scene } = result;
      expect(scene.purpose, where).toBe("story-read");
      expect(scene.askerId, where).not.toBe(personId);
      // The reader is one of the people the story reached.
      expect(record?.witnessIds, where).toContain(scene.askerId);
      // At home, the reader lives with the player.
      if (moment.label === "circumstance:story-read-home")
        expect(core.people.get(scene.askerId)?.householdId, where).toBe(
          core.people.get(personId)?.householdId,
        );
      // It names the thing it refers to: the story's subject, from the record.
      const story = scene.facts.find((row) => row.key === "story");
      expect(story?.recordIds, where).toContain(moment.causeId);
      const said = scene.talk.lines.map((row) => row.text).join(" | ");
      expect(scene.talk.state.text, where).toContain(story!.text);
      expect(
        scene.talk.narration.map((row) => row.text).join(" "),
        where,
      ).toBeTruthy();
      // Four ways to answer, four moves, and a branch deeper than one.
      const root = scene.talk.tree.replies.map((reply) => reply.line);
      expectUpToFourDifferent(root, where);
      for (const row of root)
        expect(["agree", "disagree", "ask", "deflect"], where).toContain(
          row.move,
        );
      expect(scene.talk.depth, where).toBeGreaterThan(1);
      // No developer text.
      for (const row of scene.talk.lines)
        expect(row.text, where).not.toMatch(
          /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
        );
      // Every end of the tree names what the talk kept; the reply that ends
      // it is written on a record the tie, the owed talk and the journal read.
      // A talk put off or argued out strains the tie (when the reader presses
      // it, which their traits decide), so that path is taken where there is one.
      expect(
        scene.talk.gaps.filter((gap) => gap.includes("/ending/")),
        where,
      ).toEqual([]);
      const ends = paths(scene.talk.tree).flatMap((full) => {
        let node: TreeNode | null = scene.talk.tree;
        for (const index of full) node = node?.replies[index]?.next ?? null;
        return node?.end?.ending ? [{ full, ending: node.end.ending }] : [];
      });
      expect(ends.length, where).toBeGreaterThan(0);
      const chosen =
        ends.find((row) => row.ending.keeps === "relationship-strained") ??
        ends[0]!;
      const id = replyInScene(core, director, personId, entry, chosen.full);
      const reply = core.durableLog.get(id!);
      expect(reply?.facts?.typeKey, where).toBe("story-read");
      expect(reply?.facts?.causeId, where).toBe(moment.causeId);
      expect(reply?.facts?.ending, where).toBe(chosen.ending.id);
      expect(reply?.facts?.keeps, where).toBe(chosen.ending.keeps);
      const told = composeJournal(core, director, personId)
        .flatMap((chapter) => chapter.lines)
        .find((line) => line.momentIds.includes(id!));
      // The journal names someone the player can name (a relative, or someone
      // they know); a housemate they have no name for is not told.
      const me = core.people.get(personId)!;
      if (
        chosen.ending.keeps !== "none" &&
        (familyFactsOf(me).has(scene.askerId) || me.knownIds.has(scene.askerId))
      )
        expect(told?.text, `${where}: the journal tells it`).toBeTruthy();
      const note = `STORY READ ${where}: ${core.date}, cause ${moment.causeId}, ${personId} with ${scene.askerId} (${story?.text}); reply ${id} ending ${chosen.ending.id} keeps ${chosen.ending.keeps}; journal "${told?.text ?? "(other unnamed)"}"\n  ${said}`;
      if (process.env.SCENE_LOG) writeFileSync(process.env.SCENE_LOG, note);
      process.stdout.write(`${note}\n`);
      return;
    }
    throw new Error(
      `no drawn place talked over a story: ${tried.join("; ")} (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
