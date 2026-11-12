/**
 * Lists, and with --apply deletes, the scene-talk lines no scene can play
 * (owner, Nov 12, 2026: "You can, if you want to, you can delete every single
 * line. That's up to you.").
 *
 * A use is dead when its purpose (the part before any dot) is in DEAD_PURPOSES.
 * A part all of whose uses are dead is deleted; a part shared with a live
 * purpose keeps its place and loses only the dead uses; a part the owner
 * graded good (data/english/part-grades.json) is kept and listed.
 *
 * `--awaiting` adds the purposes of the situation types that carry `awaiting`
 * (a cause record not built yet) to the dead list: a measure only, because
 * most of those types also carry a live cause that plays today.
 *
 *   node --import tsx scripts/words/delete-dead-scene-talk.ts [--awaiting] [--apply]
 */
import { readFileSync, writeFileSync } from "node:fs";

const BANK = "data/english/parts/scene-talk.json";
const TYPES = "src/director/data/situation-types.json";
const GRADES = "data/english/part-grades.json";

/** Purposes with no situation type and no reader in src/, scripts or data (proved Nov 12). */
const DEAD_PURPOSES = ["party-ask"];

interface Use {
  purpose: string;
  [k: string]: unknown;
}
interface Part {
  key: string;
  text?: string;
  uses: Use[];
  piece?: { of: string; part: string; required?: boolean };
}

const argv = new Set(process.argv.slice(2));
const bank = JSON.parse(readFileSync(BANK, "utf8")) as {
  parts: Part[];
  [k: string]: unknown;
};
const types = (
  JSON.parse(readFileSync(TYPES, "utf8")) as {
    types: {
      key: string;
      purpose?: string;
      awaiting?: string[];
      causes: { awaitingProducer?: string; match?: unknown }[];
    }[];
  }
).types;
const dead = new Set(DEAD_PURPOSES);
for (const t of types) {
  if (!t.purpose) continue;
  // A type whose every cause waits on a producer that is not built plays nothing.
  const waitsOnly =
    t.causes.length > 0 && t.causes.every((c) => c.awaitingProducer);
  if (waitsOnly || (argv.has("--awaiting") && t.awaiting)) dead.add(t.purpose);
}

const grades = JSON.parse(readFileSync(GRADES, "utf8")) as unknown;
const gradeText = JSON.stringify(grades);
const isDead = (use: Use) => dead.has(use.purpose.split(".")[0]!);

const INSERT = /\{[^{}\s]+\}/;
const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
function counted(parts: Part[]): number {
  const w = new Map<string, { required: boolean; all: boolean }>();
  for (const p of parts)
    if (p.piece) {
      const id = `${p.piece.of}\0${p.piece.part}`;
      const r = w.get(id) ?? { required: true, all: true };
      r.required &&= p.piece.required === true;
      r.all &&= INSERT.test(p.text ?? "");
      w.set(id, r);
    }
  const ok = new Set<string>();
  for (const [id, r] of w) if (r.required && r.all) ok.add(id.split("\0")[0]!);
  return parts.filter(
    (p) =>
      !INSERT.test(p.text ?? "") &&
      words(p.text ?? "") > 3 &&
      !(p.piece && ok.has(p.piece.of)),
  ).length;
}

const before = { parts: bank.parts.length, counted: counted(bank.parts) };
const byPurpose = new Map<string, { deleted: number; trimmed: number }>();
const kept: Part[] = [];
const liked: string[] = [];
const dropped: Part[] = [];
for (const part of bank.parts) {
  const dies = part.uses.filter(isDead);
  if (!dies.length) {
    kept.push(part);
    continue;
  }
  if (dies.length < part.uses.length) {
    part.uses = part.uses.filter((u) => !isDead(u));
    for (const u of dies) {
      const r = byPurpose.get(u.purpose.split(".")[0]!) ?? {
        deleted: 0,
        trimmed: 0,
      };
      r.trimmed += 1;
      byPurpose.set(u.purpose.split(".")[0]!, r);
    }
    kept.push(part);
    continue;
  }
  if (gradeText.includes(JSON.stringify(part.key))) {
    liked.push(part.key);
    kept.push(part);
    continue;
  }
  dropped.push(part);
  const p0 = part.uses[0]!.purpose.split(".")[0]!;
  const r = byPurpose.get(p0) ?? { deleted: 0, trimmed: 0 };
  r.deleted += 1;
  byPurpose.set(p0, r);
}
const after = { parts: kept.length, counted: counted(kept) };
console.log(
  JSON.stringify(
    {
      dead: [...dead],
      byPurpose: Object.fromEntries(byPurpose),
      before,
      after,
      deleted: dropped.length,
      countedRemoved: before.counted - after.counted,
      gradedKept: liked,
    },
    null,
    1,
  ),
);
if (argv.has("--apply")) {
  bank.parts = kept;
  writeFileSync(BANK, JSON.stringify(bank, null, 2) + "\n");
}
