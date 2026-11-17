/**
 * Plays a mentor's advice in a drawn place and prints every talk whole (Story lead, Nov 17;
 * development tooling like door-walk.ts, shipped play never imports it).
 *
 *   node --import tsx scripts/words/mentor-walk.ts --seed <word> [--label a] [--months 24]
 *     [--cause party|work|both] [--per 3] [--seen-out <file>] [--window]
 *
 * The place is drawn from all 56 by seed and label. The director watches the people a cause can
 * name before it happens: every party member in town (a party's chair asks a member to run the
 * day filing opens for a partisan seat, and a seated officeholder of the party takes them under
 * their wing) and every working-age full person in town (a new hire's eldest coworker takes them
 * under their wing in the partnerships monthly review). The world runs a month at a time; each
 * staged `advice` scene is composed with purposeScene and its whole tree printed with every reply
 * pressed, with the facts it leans on and the piece keys said. With `--seen-out`, the keys of every
 * piece said are written to the file, one per line. With `--window`, the world is built again to
 * open a few days before the first filing window of a seat held under a party label (the elections
 * engine's own calendar, read from the first build), so a party's ask comes in days, not years.
 *
 * A party's mentor weighs in only for the person the player controls (the director stages scenes
 * from circumstance for a controlled person), so each member a party asked who was taken under a
 * wing is played again: the same world is built anew, run to the day before the ask, and that
 * member is played as the controlled person through the week after it (the first choice of each
 * offer taken, so the ask's own scene is answered), and the advice scene the next day is composed.
 */
import { writeFileSync } from "fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { seatParty } from "../../src/core2/candidate-pool";
import {
  ELECTIONS_MODULE_ID,
  filingWindowOpens,
  type ContestRow,
} from "../../src/core2/modules/elections";
import { PARTIES_MODULE_ID } from "../../src/core2/modules/parties";
import { partyMentorOf } from "../../src/core2/modules/candidacy";
import { advancePlayerV1, resumePlayerV1 } from "../../src/core2/player-v1";
import { P } from "../../src/core2/parameters";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";
import { drawPlace } from "../core2-year/place";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const label = option("label", "a");
const months = Number(option("months", "24"));
const cause = option("cause", "both");
const per = Number(option("per", "3"));
const seenOut = option("seen-out", "");
const LABELS: Record<string, string> = {
  party: "circumstance:mentor-weighs-in",
  work: "feeling:event:work.mentorship-formed",
};
const wanted = Object.entries(LABELS)
  .filter(([key]) => cause === "both" || cause === key)
  .map(([, value]) => value);

setBookkeeping(false);
const place = drawPlace(seed, `mentor-walk:${label}`);
const where = `${place.name} (${place.key}), seed ${place.seed}`;
console.log(`# PLACE ${where}`);
const build = (start: string) =>
  buildBenchWorld(place.seed, start as never, {
    twoLevel: true,
    placeKey: place.key,
  });
let world = build(gameStartDate());
if (process.argv.includes("--window")) {
  // The first filing window of a seat held under a party label, from the
  // elections engine's calendar; the world opens a few days before it.
  const first = coreAPI(world.core);
  const opens = (
    first
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((row) => seatParty(first, row))
    .map((row) => filingWindowOpens(row))
    .filter((day) => day > world.core.date)
    .sort()[0];
  if (!opens) {
    console.log("SKIP: no seat held under a party label opens for filing");
    process.exit(0);
  }
  const start = addDays(makeIsoDate(opens), -3);
  console.log(
    `# WINDOW a partisan filing window opens ${opens}; world opens ${start}`,
  );
  world = build(start);
}
const { core, director } = world;
const api = coreAPI(core);
const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
const said = new Set<string>();
const printTree = (node: TreeNode, ind: string) => {
  for (const l of node.lines) {
    l.parts.forEach((key) => said.add(key));
    console.log(`${ind}${l.speaker}: ${l.text}   <${l.parts.join(" + ")}>`);
  }
  for (const r of node.replies) {
    r.line.parts.forEach((key) => said.add(key));
    console.log(
      `${ind}> YOU press [${r.line.move}]: ${r.line.text}   <${r.line.parts.join(" + ")}>`,
    );
    if (r.next) printTree(r.next, ind + "    ");
  }
  if (node.end) {
    node.end.close?.parts.forEach((key) => said.add(key));
    console.log(
      `${ind}[END ${node.end.ending?.id}]${node.end.close ? ` close: ${node.end.close.text} <${node.end.close.parts.join(" + ")}>` : ""}`,
    );
  }
};
const show = (result: ReturnType<typeof purposeScene>, head: string) => {
  if (result?.kind !== "composed") {
    console.log(`\n## ${head}: not composed (${result?.reason ?? "none"})`);
    return false;
  }
  const { scene } = result;
  console.log(`\n## ${head}: ${scene.purpose}`);
  for (const f of scene.facts)
    console.log(`   fact ${f.key} = ${f.text}  [${f.recordIds.join(" ")}]`);
  for (const n of scene.talk.narration) {
    n.parts.forEach((key) => said.add(key));
    console.log(`Narrator: ${n.text}   <${n.parts.join(" + ")}>`);
  }
  for (const l of [
    ...(scene.talk.open ? [scene.talk.open] : []),
    ...scene.talk.intro,
  ]) {
    l.parts.forEach((key) => said.add(key));
    console.log(`${l.speaker}: ${l.text}   <${l.parts.join(" + ")}>`);
  }
  scene.talk.state.parts.forEach((key) => said.add(key));
  console.log(
    `${scene.talk.state.speaker}: ${scene.talk.state.text}   <${scene.talk.state.parts.join(" + ")}>`,
  );
  printTree(scene.talk.tree, "  ");
  if (scene.talk.gaps.length)
    console.log(`   GAPS: ${scene.talk.gaps.join("; ")}`);
  return true;
};

// Who a cause can name, watched before it happens.
const watched = new Set<string>();
const watch = (id: string) => {
  if (watched.has(id)) return;
  watched.add(id);
  // A record that names only people outside the player's circle is not kept
  // in the durable log; the watched are treated as the player's own here.
  core.focusPersonIds.add(id as PersonId);
  director.watch(core, id as PersonId);
};
if (wanted.includes(LABELS.party!) && core.modules.has(PARTIES_MODULE_ID))
  for (const tie of api
    .moduleState(PARTIES_MODULE_ID)
    .table("ties")
    .rows() as unknown as { personId: string; tie: string }[])
    if (
      tie.tie === "party" &&
      core.people.get(tie.personId as PersonId)?.placeId === town
    )
      watch(tie.personId);
const watchWorkers = () => {
  if (!wanted.includes(LABELS.work!)) return;
  for (const person of core.people.values())
    if (
      person.alive &&
      person.tier !== "husk" &&
      person.placeId === town &&
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) < 30 &&
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) >= 16
    )
      watch(person.id);
};
watchWorkers();
console.log(`# WATCHING ${watched.size} people`);
// What the engines wrote that a cause can stand on, for the log.
const written = new Map<string, number>();
api.subscribeEvents(
  "mentor-walk",
  ["party-asked", "party.mentorship-formed", "work.mentorship-formed"],
  (_api, event) => {
    written.set(event.kind, (written.get(event.kind) ?? 0) + 1);
    if (event.kind !== "work.mentorship-formed")
      console.log(`# ${event.kind} ${event.id} on ${event.date}`);
  },
);

const seen = new Set<string>();
const got = new Map<string, number>();
if (cause === "party") {
  // The asks of members a seated officeholder took under their wing, in the
  // order the party wrote them.
  // The wing is taken just after the ask is written, so who has a mentor is
  // read once the day is done.
  const written: {
    id: string;
    date: string;
    personId: PersonId;
    partyId: string;
  }[] = [];
  api.subscribeEvents("mentor-walk-asks", ["party-asked"], (_api, event) => {
    const personId = event.personIds[P.zero] as PersonId | undefined;
    if (personId)
      written.push({
        id: event.id,
        date: event.date,
        personId,
        partyId: String(event.facts?.partyId ?? ""),
      });
  });
  const asks: typeof written = [];
  for (let week = 0; week < months * 5 && asks.length < per * 4; week += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    for (const row of written.splice(0))
      if (partyMentorOf(api, row.personId, row.partyId)) asks.push(row);
  }
  console.log(`# ASKS with a mentor: ${asks.length}`);
  const opened = world.core.startedAt ?? gameStartDate();
  for (const ask of asks) {
    if ((got.get(LABELS.party!) ?? 0) >= per) break;
    const again = build(String(opened).slice(0, 10));
    advanceCore(again.core, addDays(makeIsoDate(ask.date), -1));
    again.core.focusPersonIds.add(ask.personId);
    again.director.watch(again.core, ask.personId);
    const book = again.director.ledger.people.get(ask.personId)!;
    let shown = false;
    let packet = advancePlayerV1(again.core, {
      controlledPersonId: ask.personId,
      through: {
        date: addDays(makeIsoDate(ask.date), 6),
        minuteOfDay: P.zero,
      },
    });
    const sweep = () => {
      for (const entry of book.schedule) {
        const moment = book.momentsById.get(entry.momentId);
        if (shown || moment?.label !== LABELS.party) continue;
        if (seen.has(entry.momentId)) continue;
        seen.add(entry.momentId);
        if (!entry.bindings.some((row) => row.typeKey === "advice")) continue;
        shown = show(
          purposeScene(again.core, again.director, ask.personId, entry, {
            typeKey: "advice",
          }),
          `${moment.label} on ${again.core.date} for ${ask.personId} (${moment.causeId})`,
        );
      }
    };
    while (packet.kind !== "complete" && !shown) {
      sweep();
      packet =
        packet.kind === "stop"
          ? resumePlayerV1(again.core, {
              kind: "stop",
              pauseId: packet.pauseId,
            })
          : resumePlayerV1(again.core, {
              kind: "choice",
              pauseId: packet.pauseId,
              offerId: packet.offers[P.zero]!.offerId,
            });
    }
    sweep();
    if (shown) got.set(LABELS.party!, (got.get(LABELS.party!) ?? 0) + 1);
    else
      console.log(
        `# passed over ${ask.id}: no advice scene by ${again.core.date}`,
      );
  }
  if (seenOut) writeFileSync(seenOut, [...said].sort().join("\n") + "\n");
  console.log(
    `\n# DONE ${where}: ${[...got.entries()].map(([k, v]) => `${k} x${v}`).join("; ") || "no advice scene"}`,
  );
  process.exit(0);
}
for (let month = 0; month < months; month += 1) {
  advanceCore(core, addDays(makeIsoDate(core.date), 30));
  watchWorkers();
  for (const book of director.ledger.people.values())
    for (const entry of book.schedule) {
      const key = `${book.personId}|${entry.momentId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const moment = book.momentsById.get(entry.momentId);
      if (!moment || !wanted.includes(moment.label)) continue;
      if (!entry.bindings.some((row) => row.typeKey === "advice")) continue;
      if ((got.get(moment.label) ?? 0) >= per) continue;
      if (
        show(
          purposeScene(core, director, book.personId as PersonId, entry, {
            typeKey: "advice",
          }),
          `${moment.label} on ${core.date} (${moment.causeId})`,
        )
      )
        got.set(moment.label, (got.get(moment.label) ?? 0) + 1);
    }
  if (wanted.every((label) => (got.get(label) ?? 0) >= per)) break;
}
if (seenOut) writeFileSync(seenOut, [...said].sort().join("\n") + "\n");
console.log(
  `\n# WRITTEN ${[...written.entries()].map(([k, v]) => `${k} x${v}`).join("; ") || "nothing"}`,
);
console.log(
  `\n# DONE ${where}: ${[...got.entries()].map(([k, v]) => `${k} x${v}`).join("; ") || "no advice scene"}; last day ${core.date}`,
);
process.exit(0);
