// W1 played packet: a party's chair asks a member to run (party-recruit) and a new member is welcomed (party-welcome).
// Composes the ask through the scene engine with stand-in facts (the director stages no ask in the pinned Rainelle world) and plays a player who joins a party in a drawn place, and prints every
// line the scene shows, down each branch.
// Usage: node --import tsx scripts/story/recruit-packet.mts [drawn-run-seed]
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  PARTIES_MODULE_ID,
  partiesHere,
} from "../../src/core2/modules/parties";
import { P } from "../../src/core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../../src/core2/player-v1";
import { coreAPI } from "../../src/core2/state";
import { joinPartyAs } from "../../src/bench/government";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";
import type { CoreState, PersonId } from "../../src/core2/types";

setBookkeeping(false);
const out = (text: string) => process.stdout.write(`${text}\n`);

function playThrough(
  core: CoreState,
  personId: PersonId,
  through: string,
  seen: (stop: { recordId: string }) => boolean,
): void {
  let packet = advancePlayerV1(core, {
    controlledPersonId: personId,
    through: { date: through as never, minuteOfDay: P.zero },
  });
  while (packet.kind !== "complete") {
    if (packet.kind === "stop") {
      for (const stop of packet.stop.modules) if (seen(stop)) return;
      packet = resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId });
    } else
      packet = resumePlayerV1(core, {
        kind: "choice",
        pauseId: packet.pauseId,
        offerId: packet.offers[P.zero]!.offerId,
      });
  }
}

function walk(node: TreeNode, indent: string) {
  for (const line of node.lines) out(`${indent}${line.role}: ${line.text}`);
  for (const reply of node.replies) {
    out(`${indent}> [${reply.line.move}] ${reply.line.text}`);
    if (reply.next) walk(reply.next, `${indent}    `);
  }
  if (node.end?.close)
    out(`${indent}  (close, ${node.end.outcome}) ${node.end.close.text}`);
  else if (node.end) out(`${indent}  (ends: ${node.end.outcome})`);
}

function show(label: string, scene: NonNullable<ReturnType<typeof sceneOf>>) {
  out(`\n## ${label}`);
  for (const line of scene.talk.narration) out(`  narrator: ${line.text}`);
  if (scene.talk.open)
    out(`  ${scene.talk.open.role}: ${scene.talk.open.text}`);
  out(`  ${scene.talk.state.role}: ${scene.talk.state.text}`);
  walk(scene.talk.tree, "  ");
  if (scene.talk.gaps.length) out(`  GAPS: ${scene.talk.gaps.join(" | ")}`);
}
function sceneOf(r: ReturnType<typeof purposeScene>) {
  return r?.kind === "composed" ? r.scene : null;
}

// 1. The ask. The director never staged this scene in the pinned Rainelle world (the advice test, which reads the same asks, also finds no scene there on the
// train), so the lines are composed through the scene engine with the facts the scene is staged from (stand-in facts, named as such).
const { composeSceneTalk } = await import("../../src/director/scene-talk");
const fixture = await import("../../tests/support/scene-talk-fixture");
const { HELD } = fixture;
const recruit = fixture.types.find((row) => row.key === "party-recruit")!;
const say = (text: string) => ({ text, sourceRecordIds: [fixture.askerId] });
for (const variant of [
  { party: "Republican", office: "the state senate", place: "Rainelle" },
  { party: "Democratic", office: "the county commission", place: "Vanlue" },
]) {
  const facts = {
    ...fixture.facts,
    party: say(variant.party),
    office: say(variant.office),
    place: say(variant.place),
  };
  const result = composeSceneTalk(
    fixture.core,
    fixture.director,
    { askerId: fixture.askerId, askedId: fixture.askedId },
    recruit,
    facts,
    {},
    HELD,
  );
  if (result.kind !== "composed") {
    out(
      `NO party-recruit scene composed: ${JSON.stringify(result).slice(0, 200)}`,
    );
    continue;
  }
  const talk = result.talk;
  out(
    `\n## the ask (composed with stand-in facts: ${variant.party}, ${variant.office}, ${variant.place})`,
  );
  for (const line of talk.narration) out(`  narrator: ${line.text}`);
  if (talk.open) out(`  ${talk.open.role}: ${talk.open.text}`);
  out(`  ${talk.state.role}: ${talk.state.text}`);
  walk(talk.tree, "  ");
  if (talk.gaps.length) out(`  GAPS: ${talk.gaps.join(" | ")}`);
}

// 2. The welcome: the player joins a party in a drawn place.
const run = process.argv[2] ?? "w1-welcome";
let welcomed = 0;
for (let draw = 0; draw < 12 && welcomed < 2; draw += 1) {
  const place = drawPlace(`${run}:${draw}`, "recruit-packet");
  let world;
  try {
    world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
  } catch {
    continue;
  }
  const { core, director, playerId } = world;
  if (!core.modules.has(PARTIES_MODULE_ID)) continue;
  const me = playerId as PersonId;
  core.focusPersonIds.add(me);
  director.watch(core, me);
  const party = partiesHere(coreAPI(core))[0];
  if (!party) continue;
  joinPartyAs(core, me, party.id);
  const book = director.ledger.people.get(me)!;
  let got = false;
  playThrough(core, me, addDays(makeIsoDate(core.date), 6), (stop) => {
    const entry = book.schedule.find((row) => row.momentId === stop.recordId);
    if (!entry?.bindings.some((row) => row.typeKey === "party-welcome"))
      return false;
    const scene = sceneOf(
      purposeScene(core, director, me, entry, { typeKey: "party-welcome" }),
    );
    if (!scene) return false;
    show(
      `the welcome, ${place.name}, ${place.state} (${place.key}), run seed ${run}:${draw}, place seed ${place.seed}, ${party.name}`,
      scene,
    );
    got = true;
    return true;
  });
  if (got) welcomed += 1;
  else out(`\n(${place.name}: no welcome scene composed)`);
}
