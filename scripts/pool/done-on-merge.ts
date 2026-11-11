// Flips a pool item to merged on main when its pull request merges. Merged is
// not done: a second session makes it done by seeing it in the running game
// (`pool seen`; owner, Nov 3).
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

/** Whether the body's first line says the PR only touches an item ("Touches pool item: <id>"). */
export function touchesOnly(body: string): boolean {
  const first = body.split(/\r?\n/).find((line) => line.trim() !== "");
  return /^touch(es|ing)?\b/i.test(first?.trim() ?? "");
}

/**
 * The item a merged pull request lands: the id in its body, else the item
 * pointing at it. A "Touches" first line flips nothing, so the pr: fallback
 * never applies to it; a body with no first-line id at all keeps the fallback.
 */
export function itemForMergedPr(
  prNumber: string,
  body: string,
  pool: { ids: Set<string>; byPr: Map<string, string> },
): string | null {
  if (touchesOnly(body)) return null;
  return idFromBody(body, pool.ids) ?? pool.byPr.get(prNumber) ?? null;
}

/** Statuses a merge leaves alone: already on main, already seen, or dropped. */
const SETTLED = ["merged", "done", "dropped"];

/**
 * Flips the item a merged pull request names to `merged`, in the pool under the
 * working directory. Returns what happened, and whether it failed.
 */
export function mergeFlip(
  prNumber: string,
  body: string,
  noPush: boolean,
): { message: string; failed: boolean } {
  const number = prNumber.replace(/^#/, "");
  const pool = readPool(join(process.cwd(), "docs", "pool"));
  const id = itemForMergedPr(number, body, pool);
  if (!id)
    return {
      message: `PR #${number} names no pool item; nothing to flip.`,
      failed: false,
    };
  const status =
    parseFrontMatter(
      readFileSync(join("docs", "pool", "items", `${id}.md`), "utf8"),
    )?.status ?? "";
  if (SETTLED.includes(status))
    return {
      message: `pool: ${id} is already ${status}; nothing to flip.`,
      failed: false,
    };
  const error = command([
    "status",
    id,
    "merged",
    "--pr",
    number,
    // A rehearsal commits on the current branch and pushes nothing.
    ...(noPush ? ["--no-push"] : []),
  ]);
  return error
    ? { message: error, failed: true }
    : { message: `pool: ${id} merged (#${number})`, failed: false };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { message, failed } = mergeFlip(
    process.env.PR_NUMBER ?? "",
    process.env.PR_BODY ?? "",
    !!process.env.POOL_NO_PUSH,
  );
  if (failed) {
    console.error(message);
    process.exit(1);
  }
  console.log(message);
}
