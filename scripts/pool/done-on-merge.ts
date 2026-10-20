// Flips a pool item to done on main when its pull request merges.
// Run by .github/workflows/pool-done-on-merge.yml with PR_NUMBER and PR_BODY.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { command, parseFrontMatter } from "./index";

/** The pool id named on the first line of a PR body: `Pool item: <id>` or a bare id. */
export function idFromBody(
  body: string,
  known: ReadonlySet<string>,
): string | null {
  const first = body.split(/\r?\n/).find((line) => line.trim() !== "");
  if (!first) return null;
  const text = first.trim().replace(/^pool items?:\s*/i, "");
  const token = /^[a-z0-9][a-z0-9-]*/i.exec(text)?.[0].toLowerCase();
  return token && known.has(token) ? token : null;
}

/** Every item id, and the item whose `pr:` field names this pull request. */
export function readPool(dir: string): {
  ids: Set<string>;
  byPr: Map<string, string>;
} {
  const ids = new Set<string>();
  const byPr = new Map<string, string>();
  const items = join(dir, "items");
  if (!existsSync(items)) return { ids, byPr };
  for (const file of readdirSync(items).filter((f) => f.endsWith(".md"))) {
    const fm = parseFrontMatter(readFileSync(join(items, file), "utf8"));
    if (!fm?.id) continue;
    ids.add(fm.id);
    const pr = /^#(\d+)/.exec(fm.pr ?? "")?.[1];
    if (pr && fm.status === "in-pr") byPr.set(pr, fm.id);
  }
  return { ids, byPr };
}

/** The item a merged pull request finishes: the id in its body, else the item pointing at it. */
export function itemForMergedPr(
  prNumber: string,
  body: string,
  pool: { ids: Set<string>; byPr: Map<string, string> },
): string | null {
  return idFromBody(body, pool.ids) ?? pool.byPr.get(prNumber) ?? null;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const number = (process.env.PR_NUMBER ?? "").replace(/^#/, "");
  const pool = readPool(join(process.cwd(), "docs", "pool"));
  const id = itemForMergedPr(number, process.env.PR_BODY ?? "", pool);
  if (!id) {
    console.log(`PR #${number} names no pool item; nothing to flip.`);
    process.exit(0);
  }
  const status = parseFrontMatter(
    readFileSync(join("docs", "pool", "items", `${id}.md`), "utf8"),
  )?.status;
  if (status === "done" || status === "dropped") {
    console.log(`pool: ${id} is already ${status}; nothing to flip.`);
    process.exit(0);
  }
  const error = command([
    "status",
    id,
    "done",
    "--pr",
    number,
    "--by",
    "cto",
    // A rehearsal commits on the current branch and pushes nothing.
    ...(process.env.POOL_NO_PUSH ? ["--no-push"] : []),
  ]);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`pool: ${id} done (#${number})`);
}
