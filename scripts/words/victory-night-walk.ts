/**
 * Plays the night a winner has in a drawn place and prints every talk whole (Story lead, Nov 17;
 * development tooling like door-walk.ts, shipped play never imports it).
 *
 *   node --import tsx scripts/words/victory-night-walk.ts --seed <word> [--label a] [--home]
 *     [--all] [--force a,b] [--drop c,d] [--scenarios "name:forced,facts/dropped,facts;..."]
 *
 * The place is drawn from all 56 by seed and label. Residents file for the soonest local race
 * that holds two of them (victory-night-play.ts), the world runs to the voting engine's own count,
 * and the winner's night (`race-won`) is composed with purposeScene at the venue, and with --home
 * at the winner's home. Every reply is pressed and the whole tree printed with the facts the lines
 * lean on and the piece keys said. With --all each fitting line is said by composing again with
 * the lines already said held back. A forced or dropped fact (and each named scenario) is a
 * reading of the bank for a fact the drawn race does not hold, and says so: it is never a record.
 */
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { purposeScene } from "../../src/director/purpose-scene";
import {
  composeSceneTalk,
  type PurposeType,
  type SceneTalk,
  type TreeNode,
} from "../../src/director/scene-talk";
import { SITUATION_LIBRARY } from "../../src/director/scheduling";
import type { Fact } from "../../src/english/scene-talk-words";
import { found, playNight } from "./victory-night-play";
import { drawPlace } from "../core2-year/place";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const label = option("label", "a");
const home = process.argv.includes("--home");
// Synthetic reading (a fact the drawn race does not hold, to read its lines):
// --force a,b adds these facts, --drop c,d removes these, --all says every fitting line
// by composing again with the lines already said held back. A forced read is a
// reading of the bank only, never a record, and says so.
const list = (name: string) => option(name, "").split(",").filter(Boolean);
const force = list("force");
const drop = list("drop");
const all = process.argv.includes("--all");

setBookkeeping(false);
const place = drawPlace(seed, `victory-night-walk:${label}`);
console.log(`# PLACE ${place.name} (${place.key}), seed ${place.seed}`);
const passed: string[] = [];
const night = playNight(place, passed);
for (const line of passed) console.log(`# passed over: ${line}`);
if (!found(night)) {
  console.log(`SKIP: ${night.why}`);
  process.exit(0);
}
const printTree = (node: TreeNode, ind: string) => {
  for (const l of node.lines)
    console.log(`${ind}${l.speaker}: ${l.text}   <${l.parts.join(" + ")}>`);
  for (const r of node.replies) {
    console.log(
      `${ind}> YOU press [${r.line.move}]: ${r.line.text}   <${r.line.parts.join(" + ")}>`,
    );
    if (r.next) printTree(r.next, ind + "    ");
  }
  if (node.end)
    console.log(
      `${ind}[END ${node.end.ending?.id}]${node.end.close ? ` close: ${node.end.close.text} <${node.end.close.parts.join(" + ")}>` : ""}`,
    );
};
const { core, director, winner, entry, contest, causeId } = night;
console.log(
  `# WON ${winner} in ${contest.id} (${contest.title}); cause ${causeId}; ${night.filings.length} filed`,
);
const shown = home
  ? {
      ...entry,
      bindings: entry.bindings.map((row) =>
        row.typeKey === "race-won"
          ? { ...row, setting: { ...row.setting, kind: "home" } }
          : row,
      ),
    }
  : entry;
const result = purposeScene(core, director, winner, shown as typeof entry, {
  typeKey: "race-won",
});
if (result?.kind !== "composed") {
  console.log(`NOT COMPOSED: ${JSON.stringify(result)}`);
  process.exit(0);
}
const { scene } = result;
const scenarios: { name: string; force: string[]; drop: string[] }[] = [
  { name: "the drawn record", force: [], drop: [] },
  ...option("scenarios", "")
    .split(";")
    .filter(Boolean)
    .map((spec) => {
      const [name = "", rest = ""] = spec.split(":");
      const [forced = "", dropped = ""] = rest.split("/");
      return {
        name,
        force: forced.split(",").filter(Boolean),
        drop: dropped.split(",").filter(Boolean),
      };
    }),
];
if (force.length || drop.length) scenarios[0] = { name: "forced", force, drop };
const type = SITUATION_LIBRARY.types.find(
  (row) => row.key === "race-won",
) as unknown as PurposeType;
const keysOf = (talk: SceneTalk) => {
  const keys: string[] = [];
  const keep = (line: { parts: readonly string[] }) => keys.push(...line.parts);
  const walkTree = (node: TreeNode) => {
    node.lines.forEach(keep);
    for (const r of node.replies) {
      keep(r.line);
      if (r.next) walkTree(r.next);
    }
    if (node.end?.close) keep(node.end.close);
  };
  talk.narration.forEach(keep);
  if (talk.open) keep(talk.open);
  keep(talk.state);
  walkTree(talk.tree);
  return keys;
};
for (const row of scenarios) {
  const synthetic = row.force.length > 0 || row.drop.length > 0;
  const talks: SceneTalk[] = [];
  if (!synthetic && !all) talks.push(scene.talk);
  else {
    const facts: Record<string, Fact> = {};
    for (const f of scene.facts)
      facts[f.key] = { text: f.text, sourceRecordIds: f.recordIds };
    for (const key of row.force)
      facts[key] = { text: "yes", sourceRecordIds: [causeId] };
    for (const key of row.drop) delete facts[key];
    const shown = new Set<string>();
    for (let round = 0; round < (all ? 12 : 1); round += 1) {
      const composed = composeSceneTalk(
        core,
        director,
        { askerId: scene.askerId, askedId: scene.askedId, causeId },
        type,
        facts,
        {},
        { shown },
      );
      if (composed.kind !== "composed") {
        console.log(`NOT COMPOSED (${row.name}): ${composed.reason}`);
        break;
      }
      const before = shown.size;
      keysOf(composed.talk).forEach((key) => shown.add(key));
      talks.push(composed.talk);
      if (shown.size === before) break;
    }
  }
  console.log(
    `\n# READING ${row.name}${synthetic ? `: forced [${row.force.join(", ")}], dropped [${row.drop.join(", ")}] (a reading of the bank, not the drawn record)` : ""}${all ? "; every fitting line" : ""}`,
  );
  let at = 0;
  for (const talk of talks) {
    at += 1;
    console.log(
      `\n## race-won (${home ? "home" : "venue"}) ${row.name}${talks.length > 1 ? ` reading ${at}` : ""}`,
    );
    if (at === 1 && row === scenarios[0])
      for (const f of scene.facts)
        console.log(`   fact ${f.key} = ${f.text}  [${f.recordIds.join(" ")}]`);
    for (const n of talk.narration)
      console.log(`Narrator: ${n.text}   <${n.parts.join(" + ")}>`);
    if (talk.open)
      console.log(
        `${talk.open.speaker}: ${talk.open.text}   <${talk.open.parts.join(" + ")}>`,
      );
    console.log(
      `${talk.state.speaker}: ${talk.state.text}   <${talk.state.parts.join(" + ")}>`,
    );
    printTree(talk.tree, "  ");
    if (talk.gaps.length) console.log(`GAPS: ${talk.gaps.join("; ")}`);
    console.log(`# ENDINGS ${JSON.stringify(talk.endingCounts)}`);
  }
}
process.exit(0);
