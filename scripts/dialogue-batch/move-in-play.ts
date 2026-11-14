/**
 * Plays the move-in ask whole in three drawn places, once per answer (yes;
 * no then plea; not yet), and writes the talk tree and the household record
 * before and after. Run: node --import tsx scripts/dialogue-batch/move-in-play.ts <seed> <out.md>
 */
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { moduleState } from "../../src/core2/module-state";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { FAMILY_MOVE_IN_ASKED } from "../../src/core2/modules/partnerships";
import { coreAPI } from "../../src/core2/state";
import type { CoreState, PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode, SceneTalkLine } from "../../src/director/scene-talk";
import { drawPlace } from "../core2-year/place";

const [seed, out] = process.argv.slice(2) as [string, string];
setBookkeeping(false);
const lines: string[] = [];
const say = (s: string) => lines.push(s);
const adult = (core: CoreState, born: string) =>
  ageOnDate(makeIsoDate(born), makeIsoDate(core.date)) >= 18;

function home(core: CoreState, id: PersonId) {
  const p = core.people.get(id)!;
  const h = core.households.get(p.householdId)!;
  return `${p.givenName} ${p.familyName}: household ${h.id} (${[...h.memberIds].map((m) => core.people.get(m)?.givenName).join(", ")})`;
}

for (let draw = 0; draw < 3; draw += 1) {
  const place = drawPlace(`${seed}:${draw}`, "move-in-play");
  say(`\n## ${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`);
  for (const ending of ["said-yes", "turned-down", "not-yet"] as const) {
    const { core, director, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const me = playerId! as PersonId;
    director.watch(core, me);
    while (!adult(core, core.people.get(me)!.birthDate))
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const player = core.people.get(me)!;
    const partnered = new Set<string>();
    for (const l of core.familyLinks.values())
      if (l.kind === "partner") for (const id of l.personIds) partnered.add(id);
    const other = [...core.people.values()]
      .filter((r) => r.alive && r.tier !== "husk" && r.id !== me && r.householdId !== player.householdId && r.placeId === player.placeId && !partnered.has(r.id) && !player.familyIds.has(r.id) && adult(core, r.birthDate) && r.looks?.gender !== player.looks?.gender)
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!other) { say(`no single in town`); break; }
    const api = coreAPI(core);
    api.setPartnersV1({ personIds: [me, other.id], together: true, source: { tag: "SOURCED", asOf: core.date, citation: "The partnerships writer." }, facts: { union: "dating" } });
    const link = [...core.familyLinks.values()].find((r) => r.kind === "partner" && r.personIds.includes(me))!;
    const couples = moduleState(core, "partnerships").table("couples");
    couples.put({ id: link.id, stage: "dating", since: core.date, progress: 0.999 } as never);
    advanceCore(core, addDays(makeIsoDate(core.date), 32));
    const book = director.ledger.people.get(me)!;
    const entry = book.schedule.find((r) => book.momentsById.get(r.momentId)?.causeId.startsWith(`${FAMILY_MOVE_IN_ASKED}:`));
    say(`\n### Answer: ${ending}`);
    if (!entry) { say(`no ask on the player's book; couple ${JSON.stringify(couples.get(link.id))}`); continue; }
    const causeId = book.momentsById.get(entry.momentId)!.causeId;
    say(`cause ${causeId}; outcome ${entry.outcome}; ${entry.date}`);
    const res = purposeScene(core, director, me, entry, { typeKey: "move-in" });
    if (res?.kind !== "composed") { say(`not composed: ${JSON.stringify(res)}`); continue; }
    const talk = res.scene.talk;
    const asker = other.givenName;
    const who = (l: SceneTalkLine) => (l.role === "asked" ? "You" : asker);
    say(`facts: ${res.scene.facts.map((f) => f.key + "=" + f.text).join("; ")}`);
    for (const l of talk.narration) say(`Narration: ${l.text}`);
    if (talk.open) say(`${asker}: ${talk.open.text}`);
    say(`${asker}: ${talk.state.text}  _[${talk.state.bearing ?? "-"}]_`);
    const flat = (n: TreeNode, ind: string) => {
      for (const l of n.lines) say(`${ind}${who(l)}: ${l.text}  _[${l.move}; ${l.bearing ?? "-"}]_`);
      if (n.end?.close) say(`${ind}${who(n.end.close)}: ${n.end.close.text}  _[close]_`);
      if (n.end) say(`${ind}**end: ${n.end.outcome}${n.end.ending ? " / " + n.end.ending.label : ""}**`);
      for (const r of n.replies) { say(`${ind}- You (${r.line.move}): ${r.line.text}`); if (r.next) flat(r.next, ind + "  "); }
    };
    flat(talk.tree, "");
    say(`Before: ${home(core, me)}; ${home(core, other.id)}`);
    api.emit({ id: `scene-reply:${causeId}:${ending}`, date: core.date, kind: "scene.reply", personIds: [me, other.id], placeId: player.placeId, source: { tag: "SOURCED", citation: "The player's reply.", asOf: core.date }, facts: { typeKey: "move-in", causeId, ending } });
    say(`After ${ending}: ${home(core, me)}; ${home(core, other.id)}; couple ${JSON.stringify(couples.get(link.id))}`);
    if (ending === "not-yet") {
      // Run on until the partner raises it again from the couple's record.
      let again: string | undefined;
      for (let m = 0; m < 24 && !again; m += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 31));
        again = [...core.durableLog.values()].find((r) => r.kind === FAMILY_MOVE_IN_ASKED && r.id !== causeId && r.personIds.includes(me))?.id;
      }
      say(`Asked again: ${again ?? "not within two years"}`);
    }
  }
}
writeFileSync(out, lines.join("\n") + "\n");
