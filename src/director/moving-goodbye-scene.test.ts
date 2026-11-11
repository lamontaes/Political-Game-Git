import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { departureOf } from "../core2/modules/moves";
import type { CoreState, PersonId } from "../core2/types";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";
import type { ScheduleEntry } from "./scheduling";
import { expectUpToFourDifferent } from "./reply-set-check";

// Someone the player knows who moves away (the moves engine's departure record,
// circumstance row moved-away-farewell) comes to say goodbye, and the goodbye
// is about the leaving (owner, Nov 8 playtest, P38): who is leaving, where to
// and why when the records say. It was the departure type with no purpose, so
// after "has come to say goodbye" small talk ran a news topic and her leaving
// was never mentioned (owner, Oct 25: an absence is a scene "when a record
// explains it"; Oct 26: "no reason to have that dialogue").
//
// The moves engine decides who leaves, so the test first plays a drawn place's
// year to learn who moved away and who among the people left behind knows them,
// then plays the same world again watching those people through the director's
// own ledger, to the day the farewell is staged for one of them.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 8;
/** The days the first pass plays to learn who to watch; the second stops on the day the scene is staged. */
const FIND_DAYS = 120;
const AFTER_DAYS = 6;
const WATCHED = 4;
const LABEL = "circumstance:moved-away-farewell";

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

/** The year as it plays: adults who knew someone who moved away, with the day they left, in that order. */
function leaversAcquaintances(build: () => ReturnType<typeof buildBenchWorld>) {
  const { core } = build();
  const start = core.date;
  // Only people the world has at its opening can be watched from it.
  const present = new Set(core.people.keys());
  advanceCore(core, addDays(makeIsoDate(core.date), FIND_DAYS));
  const players = new Map<PersonId, { date: string; leaver: PersonId }>();
  for (const id of core.logByKind.get("person.moved-away") ?? []) {
    const record = core.durableLog.get(id as never);
    if (!record || record.date < start) continue;
    const leaver = record.personIds[0];
    if (!leaver) continue;
    // The people left behind who knew them: those the record names as knowing
    // of the move, and the leaver's family on record.
    for (const friend of [
      ...(record.witnessIds ?? []),
      ...(core.people.get(leaver)?.familyIds ?? []),
    ])
      if (
        present.has(friend as PersonId) &&
        !record.personIds.includes(friend as PersonId) &&
        core.people.get(friend as PersonId)?.knownIds.has(leaver) &&
        adult(core, friend as PersonId)
      )
        players.set(friend as PersonId, { date: record.date, leaver });
    if (players.size >= WATCHED) break;
  }
  return players;
}

it(`a goodbye is about the leaving, from the record (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `moving-goodbye:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const build = () =>
        buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
      // The year as it plays: who moved away, and who left behind knows them.
      // The first world is let go before the second is built.
      const players = leaversAcquaintances(build);
      // The first world is let go before the second is built (a crowded container
      // runs this with --expose-gc; otherwise a no-op).
      (globalThis as { gc?: () => void }).gc?.();
      if (!players.size) {
        tried.push(`${where}: no one left behind knew a leaver`);
        continue;
      }
      // The same world, played as the first of them, through the player's
      // clock (only the person the player controls is served scenes from
      // circumstance), to a few days after the move.
      const { core, director } = build();
      // Who knew the leaver on the day they left (the first pass reads who
      // knows them at the end of the months, which can be later): the replay
      // runs to the day before the move and keeps those who already knew.
      const dates = [
        ...new Set([...players.values()].map((row) => row.date)),
      ].sort();
      let knew: [PersonId, { date: string; leaver: PersonId }][] = [];
      for (const date of dates) {
        advanceCore(core, addDays(makeIsoDate(date), -P.one));
        knew = [...players].filter(
          ([friend, row]) =>
            row.date === date &&
            core.people.get(friend)?.alive === true &&
            core.people.get(friend)?.knownIds.has(row.leaver),
        );
        if (knew.length) break;
      }
      if (!knew.length) {
        tried.push(`${where}: no one left behind knew the leaver on the day`);
        continue;
      }
      const [personId, { date: movedOn }] = knew[0]!;
      core.focusPersonIds.add(personId);
      director.watch(core, personId);
      const book = director.ledger.people.get(personId)!;
      const hit: { entry?: ScheduleEntry } = {};
      const open = () => {
        const entry = book.schedule.find(
          (row) => book.momentsById.get(row.momentId)?.label === LABEL,
        );
        if (entry) hit.entry = entry;
      };
      let packet = advancePlayerV1(core, {
        controlledPersonId: personId,
        through: {
          date: addDays(makeIsoDate(movedOn), AFTER_DAYS),
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
          `${where}: played as ${personId} to ${movedOn} and ${AFTER_DAYS} days after, no farewell staged`,
        );
        continue;
      }
      const entry = hit.entry;
      const moment = book.momentsById.get(entry.momentId)!;
      const record = core.durableLog.get(moment.causeId);
      expect(record?.kind, where).toBe("person.moved-away");
      expect(
        entry.bindings.map((row) => row.typeKey),
        where,
      ).toContain("moving-goodbye");
      const result = purposeScene(core, director, personId, entry);
      expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") return;
      const { scene } = result;
      expect(scene.purpose, where).toBe("moving-goodbye");
      // The one who is leaving is the one who speaks, and the record names them.
      expect(record?.personIds, where).toContain(scene.askerId);
      expect(scene.askedId, where).toBe(personId);
      // It names where they are going, from the departure record.
      const departure = departureOf(record?.facts);
      expect(departure?.personId, where).toBe(scene.askerId);
      const destination = scene.facts.find((row) => row.key === "destination");
      expect(destination?.recordIds, where).toContain(departure!.destinationId);
      const said = scene.talk.lines.map((row) => row.text).join(" | ");
      expect(scene.talk.state.text, where).toContain(destination!.text);
      // A reason is said only when the records name one.
      const why = scene.facts.filter((row) => row.key.startsWith("why-"));
      process.stdout.write(
        `reasons on record ${JSON.stringify(
          Object.keys(departure!.reasons).filter(
            (key) => (departure!.reasons[key] ?? 0) > 0,
          ),
        )}; basis ${departure!.destinationBasis}; said ${why.map((row) => row.key).join(",") || "none"}\n`,
      );
      const root = scene.talk.tree.replies.map((reply) => reply.line);
      expectUpToFourDifferent(root, where);
      for (const row of root)
        expect(["comfort", "ask", "promise", "thank"], where).toContain(
          row.move,
        );
      expect(scene.talk.depth, where).toBeGreaterThan(1);
      for (const row of scene.talk.lines)
        expect(row.text, where).not.toMatch(
          /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
        );
      // A promise to keep in touch is kept on the reply's record and told in
      // the journal.
      const promised = paths(scene.talk.tree).find((full) => {
        let node: TreeNode | null = scene.talk.tree;
        for (const index of full) node = node?.replies[index]?.next ?? null;
        return node?.end?.ending?.keeps === "promise";
      });
      expect(promised, `${where}: no path keeps a promise`).toBeTruthy();
      const id = replyInScene(core, director, personId, entry, promised!);
      const reply = core.durableLog.get(id!);
      expect(reply?.facts?.typeKey, where).toBe("moving-goodbye");
      expect(reply?.facts?.causeId, where).toBe(moment.causeId);
      expect(reply?.facts?.keeps, where).toBe("promise");
      const told = composeJournal(core, director, personId)
        .flatMap((chapter) => chapter.lines)
        .find((line) => line.momentIds.includes(id!));
      const note = `MOVING GOODBYE ${where}: ${core.date}, cause ${moment.causeId}, ${personId} with ${scene.askerId} (to ${destination?.text}); reply ${id}; journal "${told?.text ?? "(other unnamed)"}"\n  ${said}`;
      if (process.env.SCENE_LOG) writeFileSync(process.env.SCENE_LOG, note);
      process.stdout.write(`${note}\n`);
      return;
    }
    throw new Error(
      `no drawn place staged a farewell: ${tried.join("; ")} (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
