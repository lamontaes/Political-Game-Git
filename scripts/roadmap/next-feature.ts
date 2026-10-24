/* global process, console */
// Roadmap M0-12: what a fresh session starts on. Reads docs/roadmap/features.json
// and the pool's items (the progress file since the owner's Oct 15 ruling), and
// names the first unfinished spec in milestone order with the pool items that
// carry it. Exits 1 when that spec has no item, so a session would have to ask.
// Usage: node --import tsx scripts/roadmap/next-feature.ts [--root <dir>]
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseFrontMatter } from "../pool/index";

/** Statuses of an item someone can still take or is working on. */
const LIVE = new Set(["open", "claimed", "in-pr", "blocked"]);

export interface Spec {
  readonly id: string;
  readonly milestone: string;
  readonly title: string;
  readonly passes: boolean;
  readonly command: unknown;
}
export interface Carrier {
  readonly id: string;
  readonly status: string;
  readonly title: string;
}

/** Milestones by their number (M0, M1, M2 ...), not by their order in the file. */
const milestoneOrder = (id: string) => Number(/^M(\d+)/.exec(id)?.[1] ?? 99);

/** Unfinished specs in the order a session takes them. */
export function unfinished(specs: readonly Spec[]): Spec[] {
  return specs
    .filter((s) => !s.passes)
    .map((s, i) => ({ s, i }))
    .sort(
      (a, b) =>
        milestoneOrder(a.s.milestone ?? a.s.id) -
          milestoneOrder(b.s.milestone ?? b.s.id) || a.i - b.i,
    )
    .map(({ s }) => s);
}

/** Live pool items that name the spec id in their title or body. */
export function carriers(
  specId: string,
  items: readonly { id: string; text: string }[],
): Carrier[] {
  const named = new RegExp(`(^|[^\\w-])${specId}(?![\\w-]?\\d)`);
  const out: Carrier[] = [];
  for (const item of items) {
    const front = parseFrontMatter(item.text);
    if (!front || !LIVE.has(front.status ?? "")) continue;
    if (named.test(item.text))
      out.push({ id: item.id, status: front.status!, title: front.title });
  }
  return out;
}

export function nextFeature(root: string) {
  const document = JSON.parse(
    readFileSync(join(root, "docs/roadmap/features.json"), "utf8"),
  ) as { features: Spec[] };
  const dir = join(root, "docs/pool/items");
  const items = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => ({
      id: f.slice(0, -3),
      text: readFileSync(join(dir, f), "utf8"),
    }));
  const queue = unfinished(document.features);
  const top = queue[0];
  // The first spec with an item nobody has taken: where a fresh session starts.
  const start = queue
    .map((spec) => ({
      spec,
      item: carriers(spec.id, items).find((c) => c.status === "open"),
    }))
    .find((s) => s.item);
  return {
    top,
    start,
    carriers: top ? carriers(top.id, items) : [],
    uncarried: queue
      .filter((s) => !carriers(s.id, items).length)
      .map((s) => s.id),
    unfinished: queue.length,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const at = process.argv.indexOf("--root");
  const result = nextFeature(at > 0 ? process.argv[at + 1]! : process.cwd());
  if (!result.top) {
    console.log("Every roadmap spec passes.");
    process.exit(0);
  }
  console.log(
    `Top unfinished spec: ${result.top.id} "${result.top.title}" (${result.unfinished} unfinished).`,
  );
  console.log(`Command: ${JSON.stringify(result.top.command)}`);
  for (const c of result.carriers)
    console.log(`Carried by ${c.id} (${c.status}): ${c.title}`);
  if (result.start)
    console.log(
      `Start on: ${result.start.item!.id} (${result.start.spec.id}): ${result.start.item!.title}`,
    );
  if (result.uncarried.length)
    console.log(
      `Unfinished specs no live pool item names: ${result.uncarried.join(", ")}`,
    );
  if (!result.carriers.length) {
    console.error(
      `${result.top.id} has no live pool item: add one (npm run pool -- add) so a session can start without asking.`,
    );
    process.exit(1);
  }
}
