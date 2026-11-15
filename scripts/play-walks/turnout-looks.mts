// Plays the public-action scenes and the paper's story at named places and
// fixed seeds, by the game's own path, and writes every line as a player reads
// it (Account lead, #9418). Usage:
//   node --import tsx scripts/play-walks/turnout-looks.mts <good|bad> <seed> <label> <outfile-fragment>
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { townSeats } from "../../src/core2/modules/offices";
import { actionsOf } from "../../src/core2/modules/public-action";
import { coreAPI } from "../../src/core2/state";
import { OUTCOME_WEB_MODULE_ID } from "../../src/core2/outcome-web-model";
import { TERM_MEASURES } from "../../src/core2/term-read";
import { wordPrintedStory } from "../../src/bench/archive-words";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";
import type { PersonId } from "../../src/core2/types";

const [mood, seed, label] = process.argv.slice(2) as [string, string, string];
const LOCAL = new Set(["city", "county", "township"]);
setBookkeeping(false);
const place = drawPlace(seed, label);
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core, director, placeId } = world;
const api = coreAPI(core);
for (const row of townSeats(api)) {
  const id = row.holder?.personId;
  if (id && LOCAL.has(row.office.level) && core.people.get(id)?.alive)
    director.watch(core, id);
}
const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
const bad: Record<string, number> = {
  "housing.rent": 0.3,
  "labor.unemployment": 0.4,
  "health.": -0.2,
};
const falls = ["labor.unemployment", "housing.rent", "crime."];
for (const [at, month] of [
  "2025-01",
  "2026-01",
  "2026-02",
  "2026-03",
].entries()) {
  const values: Record<string, number> = {};
  for (const key of TERM_MEASURES) {
    const factor =
      mood === "bad"
        ? Object.entries(bad).find(([p]) => key.startsWith(p))?.[1]
        : falls.some((p) => key.startsWith(p))
          ? -0.3
          : 0.3;
    values[key] = 100 * (1 + (factor ?? 0) * (Math.max(at - 1, 0) / 2));
  }
  web.put({
    id: `web:${placeId}:${month}`,
    placeId,
    month,
    date: `${month}-02`,
    values,
    bases: values,
    effects: {},
    engineSources: {},
  } as never);
}
advanceCore(core, mood === "bad" ? "2025-07-06" : "2025-07-06");
const out: string[] = [];
const say = (s: string) => out.push(s);
say(
  `## ${place.name} (${place.key}), seed ${seed}, label ${label}, term staged "${mood}"`,
);
const tree = (node: TreeNode | null, depth: number) => {
  if (!node || depth > 3) return;
  const pad = "  ".repeat(depth);
  for (const l of node.lines) say(`${pad}- ${l.role}: ${l.text}`);
  for (const r of node.replies) {
    say(`${pad}- player: ${r.line.text}`);
    tree(r.next, depth + 1);
  }
};
for (const row of actionsOf(api, placeId)) {
  const record = [...core.durableLog.values()].find(
    (r) => (r.facts as Record<string, string> | undefined)?.actionId === row.id,
  );
  say(
    `\n### ${row.kind} / ${row.area}: ${record?.facts?.size ?? "?"} people when it formed, the record says "${record?.facts?.turnout ?? "?"}"`,
  );
  if (!record) {
    say("(no civic record)");
    continue;
  }
  const paper = wordPrintedStory(core, {
    id: `printed:play:${row.id}`,
    kind: "press.printed",
    date: record.date ?? core.date,
    facts: { sourceRecordId: record.id },
  } as never);
  say(
    `Paper: ${paper ? `${paper.headline} / ${paper.lede}` : "(not printed)"}`,
  );
  // The paper's outlets each take their own wording of one record: every
  // outlet's story id is tried and each distinct lede is listed.
  const ledes = new Set<string>();
  for (let outlet = 0; outlet < 24; outlet += 1) {
    const other = wordPrintedStory(core, {
      id: `printed:outlet-${outlet}:${row.id}`,
      kind: "press.printed",
      date: record.date ?? core.date,
      facts: { sourceRecordId: record.id },
    } as never);
    if (other) ledes.add(`${other.headline} / ${other.lede}`);
  }
  for (const lede of ledes) say(`Paper, another outlet: ${lede}`);
  const hosts = [...(record.witnessIds ?? [])];
  let shown = 0;
  for (const hostId of hosts) {
    const book = director.ledger.people.get(hostId as PersonId);
    const entry = book?.schedule.find((r) => r.momentId.includes(record.id));
    if (!entry) continue;
    for (const binding of entry.bindings) {
      const result = purposeScene(core, director, hostId as PersonId, entry, {
        typeKey: binding.typeKey,
      });
      if (result?.kind !== "composed") continue;
      if (shown++ >= 1) break;
      const { scene } = result;
      say(`Scene type ${binding.typeKey}:`);
      for (const n of scene.talk.narration) say(`- narrator: ${n.text}`);
      for (const n of scene.talk.intro ?? []) say(`- ${n.role}: ${n.text}`);
      tree(
        {
          lines: [scene.talk.state],
          replies: scene.talk.tree.replies,
          ...{},
        } as TreeNode,
        0,
      );
    }
  }
  if (!shown) say("(no scene composed for the town's officials)");
}
console.log(out.join("\n"));
