/**
 * Staging for the rival after a debate: for each drawn place, plays a year,
 * stages every rally-opponent scene whose cause is a debate through
 * `purposeScene` (the game's own path), and prints which place and seed draws
 * which lines, with the whole talk. Usage:
 *   node --import tsx scripts/dev-tests/debate-rival-draws.ts <seed> <draws> <out.md>
 */
import { writeFileSync } from "node:fs";
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { ballot, openContests } from "../../src/core2/modules/elections";
import { townSeats } from "../../src/core2/modules/offices";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";

const seed = process.argv[2] ?? "d1";
const DRAWS = Number(process.argv[3] ?? "6");
const outFile = process.argv[4] ?? "";
const YEAR = 365;
const WEEK = 7;
const SOON_DAYS = 60;
const LABEL = "cause:event:debate";
const out: string[] = [];
const L = (s: string) => out.push(s);
const texts = (node: TreeNode | null): string[] => {
  if (!node) return [];
  const rows: string[] = node.lines.map((l) => l.text);
  for (const b of node.branches ?? []) rows.push(...texts(b.node));
  for (const r of node.replies) {
    rows.push(r.line.text, ...texts(r.next));
  }
  const e = node.end as { close?: { text: string } } | undefined;
  if (e?.close) rows.push(e.close.text);
  return rows;
};

for (let draw = 0; draw < DRAWS; draw += 1) {
  const place = drawPlace(`${seed}:${draw}`, "debate-opponent");
  const where = `${place.name} (${place.key}), seed ${seed}:${draw}, world seed ${place.seed}`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const watched = new Set<string>();
  for (const row of townSeats(coreAPI(core))) {
    const holder = row.holder?.personId;
    if (holder && core.people.has(holder as PersonId)) watched.add(holder);
  }
  for (const id of watched) director.watch(core, id as PersonId);
  const end = addDays(makeIsoDate(core.date), YEAR);
  const api = coreAPI(core);
  while (core.date < end) {
    advanceCore(core, [addDays(makeIsoDate(core.date), WEEK), end].sort()[0]!);
    const soon = addDays(makeIsoDate(core.date), SOON_DAYS);
    for (const contest of openContests(api).filter(
      (c) => c.electionDate <= soon,
    ))
      for (const filing of ballot(api, contest.id))
        if (
          !watched.has(filing.personId) &&
          core.people.has(filing.personId as PersonId)
        ) {
          watched.add(filing.personId);
          director.watch(core, filing.personId as PersonId);
        }
  }
  let staged = 0;
  for (const [personId, book] of director.ledger.people)
    for (const entry of book.schedule) {
      const moment = book.momentsById.get(entry.momentId);
      if (moment?.label !== LABEL) continue;
      if (!entry.bindings.some((row) => row.typeKey === "rally-opponent"))
        continue;
      const result = purposeScene(core, director, personId as PersonId, entry, {
        typeKey: "rally-opponent",
      });
      if (result?.kind !== "composed") continue;
      staged += 1;
      const { scene } = result;
      const facts = scene.facts
        .map((f) => f.key)
        .filter((k) =>
          [
            "issue",
            "said-for",
            "said-against",
            "said-none",
            "rival-for",
            "rival-against",
          ].includes(k),
        );
      const lines = [
        ...scene.talk.narration.map((l) => l.text),
        ...(scene.talk.open ? [scene.talk.open.text] : []),
        scene.talk.state.text,
        ...texts(scene.talk.tree),
      ];
      L(
        `## ${where}: cause ${moment.causeId}; facts ${facts.join(",") || "none"}`,
      );
      for (const t of lines) L(`- ${t}`);
    }
  L(`# ${where}: ${staged} scenes`);
  console.log(`# ${where}: ${staged} scenes`);
}
if (outFile) writeFileSync(outFile, out.join("\n") + "\n");
