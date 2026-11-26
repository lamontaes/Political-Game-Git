/**
 * Every talk at fixed seeds, line by line, so a change to the talk engines can
 * be read as "the same talks before and after" or as a list of what moved
 * (the talk merge plan, slice 0). Development tooling; shipped play never
 * imports it, and the output is never committed: a pull request runs it on its
 * base and on its head and posts the difference.
 *
 *   node --import tsx scripts/words/talk-dump.ts [--only scenes|home]
 *
 * Scenes: the scene-talk fixture's world (`GOLDEN_PATH_SEED`, default the
 * tests' own), every purpose and variant composed in play, each tree read
 * depth first. Home: the New Game's day-one world at each of `SEEDS` (default
 * 23,24,26), one world per way of pressing (`PRESS`: first reply, last reply,
 * the scales), the house's talks and then the first residents of the town,
 * each walked to its end. For the scales it draws residents until two ask
 * about the player's own record, and lists the belief rows the lie left. Run
 * one seed per process to use the machine. Each section ends with a hash, so
 * a difference names the section it is in.
 */
import { createHash } from "node:crypto";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import {
  buildBenchWorldInStages,
  OPENING_WARMUP_DAYS,
} from "../../src/bench/world";
import { openingArrivalMinute } from "../../src/bench/opening";
import { roomIds } from "../../src/bench/scene";
import {
  beliefsOf,
  meetOverTalk,
  noteHeard,
  openConversation,
  say,
  type Conversation,
} from "../../src/director/conversation";
import type { SceneTalkLine, TreeNode } from "../../src/director/scene-talk";
import {
  buildTalks,
  seed as sceneSeed,
} from "../../tests/support/scene-talk-fixture";

const only = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1]
  : undefined;
const out: string[] = [];
const hashes: string[] = [];
let section: string[] = [];
const emit = (line: string) => section.push(line);
const closeSection = (name: string) => {
  const text = section.join("\n");
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 12);
  out.push(`## ${name} (${hash})`, text, "");
  hashes.push(`${name} ${hash}`);
  section = [];
};

const lineText = (line: SceneTalkLine) =>
  `${line.n} r${line.round} ${line.role}/${line.step}/${line.move}${line.auto ? "/auto" : ""}${line.chosen ? "/chosen" : ""}: ${line.text} [${line.parts.join("+")}] <${line.slotRecordIds.join(",")}>`;

function walk(node: TreeNode, depth: number, path: string): void {
  const pad = "  ".repeat(depth);
  for (const line of node.lines) emit(`${pad}${lineText(line)}`);
  for (const [at, reply] of node.replies.entries()) {
    emit(`${pad}> ${path}${at}: ${lineText(reply.line)}`);
    if (reply.next) walk(reply.next, depth + 1, `${path}${at}.`);
    else emit(`${pad}  (cut at the node bound)`);
  }
  for (const branch of node.branches ?? []) {
    emit(`${pad}* ${branch.label}`);
    walk(branch.node, depth + 1, `${path}*`);
  }
  if (node.end)
    emit(
      `${pad}= ${node.end.outcome}${node.end.ending ? ` ${node.end.ending.id}/${node.end.ending.keeps}` : ""}${node.end.close ? `: ${lineText(node.end.close)}` : ""}`,
    );
}

if (only !== "home") {
  setBookkeeping(false);
  const talks = buildTalks();
  for (const talk of talks) {
    emit(
      `# ${talk.typeKey} / ${talk.purpose} ${talk.askerId} -> ${talk.askedId}`,
    );
    for (const line of [...talk.narration, ...(talk.open ? [talk.open] : [])])
      emit(lineText(line));
    for (const line of talk.intro) emit(lineText(line));
    emit(lineText(talk.state));
    walk(talk.tree, 0, "");
    emit(`gaps: ${talk.gaps.join(" | ")}`);
  }
  closeSection(`scenes seed=${sceneSeed} talks=${talks.length}`);
}

type Press = "first" | "last" | "lie";
const dumpTalk = (talk: Conversation, press: Press) => {
  let turn = 0;
  let shown = 0;
  const show = () => {
    for (const line of talk.lines.slice(shown))
      emit(
        `  [${line.kind}/${line.act}] ${line.text} bank=${line.wording?.bank} parts=${(line.wording?.parts ?? []).join("+")} subject=${line.subjectId} records=${line.sourceRecordIds.join(",")}`,
      );
    shown = talk.lines.length;
    for (const choice of talk.choices)
      emit(
        `    - [${choice.move}] ${choice.text} parts=${(choice.wording?.parts ?? []).join("+")} answers=${choice.answers}${choice.raises ? ` raises=${choice.raises}` : ""}`,
      );
    for (const choice of talk.lies)
      emit(
        `    ~ lie [${choice.move}] ${choice.text} claim=${choice.claim?.key}=${choice.claim?.value}`,
      );
  };
  show();
  return {
    next(core: Parameters<typeof say>[0]) {
      const pool =
        press === "lie" && talk.lies.length ? talk.lies : talk.choices;
      const pick = press === "last" ? pool.at(-1) : pool[0];
      if (!pick || turn >= 12) return false;
      turn += 1;
      emit(`  press ${pick.key}`);
      say(core, talk, pick.key);
      show();
      return true;
    },
  };
};

if (only !== "scenes") {
  setBookkeeping(false);
  const presses = (process.env.PRESS ?? "first,last,lie").split(",") as Press[];
  // One world per seed and way of pressing: a talk changes the world it is had
  // in (the listener remembers it), so a second pass in the same world would
  // find nothing to say and prove nothing.
  for (const seed of (process.env.SEEDS ?? "23,24,26").split(","))
    for (const press of presses) {
      const world = await buildBenchWorldInStages(
        seed,
        gameStartDate(),
        { twoLevel: true, warmUpDays: OPENING_WARMUP_DAYS },
        () => undefined,
      );
      const { core, director } = world;
      const playerId = world.playerId as PersonId;
      emit(`# seed ${seed} ${world.place.displayName} press=${press}`);
      const me = core.people.get(playerId)!;
      const minute = openingArrivalMinute(core, playerId);
      const room = roomIds(core, playerId, undefined, minute);
      const staged = director.ledger.people
        .get(playerId)
        ?.schedule.find(
          (row) =>
            row.date === core.date &&
            row.outcome.startsWith("scene") &&
            row.bindings.length > 0,
        );
      const household = core.households.get(me.householdId ?? "");
      let talked = 0;
      let lied = 0;
      // The house first, then the first residents of the town (the people a
      // stranger's question about the player's own record, and so the scales,
      // comes from), in id order.
      const housemates = (household?.memberIds ?? []).filter(
        (member) => member !== playerId,
      );
      const strangers = [...(core.peopleByPlace.get(me.placeId) ?? [])]
        .filter(
          (id) =>
            id !== playerId &&
            !housemates.includes(id) &&
            core.people.get(id)?.alive &&
            (core.people.get(id)?.tier ?? "") !== "husk",
        )
        .sort()
        .slice(0, press === "lie" ? 40 : Number(process.env.STRANGERS ?? "6"));
      for (const id of [...housemates, ...strangers]) {
        if (!core.people.get(id as PersonId)?.alive) continue;
        emit(`## ${id}`);
        const talk = openConversation(core, playerId, id as PersonId, {
          director,
          presentIds: room as PersonId[],
          minuteOfDay: minute,
          ...(staged ? { occasionId: staged.momentId } : {}),
        });
        if (!talk.lines.length) {
          emit("  (nothing to say)");
          continue;
        }
        // The scales show only where a stranger asks about the player's own
        // record: for that press, find the first two such talks by drawing and
        // wait (the rest are named and passed over, opened and left unheard).
        if (press === "lie" && !housemates.includes(id)) {
          if (!talk.lies.length || lied >= 2) {
            emit("  (passed over: no scales)");
            continue;
          }
        }
        talked += 1;
        meetOverTalk(core, talk);
        noteHeard(core, talk);
        const walker = dumpTalk(talk, press);
        while (walker.next(core));
        lied += talk.lines.some((line) => line.act === "lie") ? 1 : 0;
        // What the scales left behind: the false claim as the listener holds it.
        for (const belief of beliefsOf(coreAPI(core), id as PersonId))
          emit(
            `  belief ${belief.id} claimed=${belief.claimed} truth=${belief.truth} event=${belief.lieEventId}`,
          );
      }
      emit(`talked=${talked} lies told=${lied}`);
      closeSection(
        `home seed=${seed} press=${press} talked=${talked} lies=${lied}`,
      );
    }
}

console.log(out.join("\n"));
console.log(`# sections\n${hashes.join("\n")}`);
