import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  asPath,
  data,
  deadPointers,
  exists,
  pathsNamed,
  tracked,
} from "../../scripts/current/pointers";
import { currentPage } from "../../scripts/current/write";
import baseline from "./current-pointers-baseline.json";

/**
 * Nothing points at anything old (owner, Nov 11, 2026: "updates all documents
 * so that nothing is pointing at anything old, and have somewhere as like a
 * master updater or something, to where in the future old things aren't
 * pointing at all different things at all different times").
 *
 * docs/current.json is that one place: the current thing for each kind, a row
 * for everything at the top of the repository, and every path that was
 * replaced or removed. This guard holds it:
 *  - every path the master file calls current exists;
 *  - everything at the top of the repository has a row in it;
 *  - docs/CURRENT.md is the page written from it;
 *  - a document, rule, skill or code comment that names a path names one that
 *    is in the repository. A path on the replaced list is named with what
 *    stands in its place.
 *
 * What is read: every tracked Markdown file, and the comments of tracked
 * TypeScript and JavaScript files under src, scripts and tests. A path is a
 * word in backticks (in a comment, also a bare word with a file extension)
 * that starts with one of the repository's own top folders. A path with a
 * placeholder in it (`<id>`, `*`, `{name}`) is a pattern, not a pointer; one
 * followed by " (new)" is a file an item will create. Records (the master
 * file's `records`) keep what was said or shipped and are not read.
 *
 * What already pointed nowhere is counted by area in
 * ./current-pointers-baseline.json; a count may only go down, and an area
 * the baseline does not name may hold none.
 */

const ROOT = path.resolve(__dirname, "../..");

describe("the master file says what is current", () => {
  it("names only paths that exist", () => {
    expect(
      data.current.filter((row) => !exists(row.path)).map((row) => row.path),
    ).toEqual([]);
  });

  it("has a row for everything at the top of the repository", () => {
    const rows = new Set(data.topLevel.map((row) => row.path));
    const top = [...new Set(tracked.map((file) => file.split("/")[0]!))];
    expect(top.filter((entry) => !rows.has(entry))).toEqual([]);
    // A row for something that is gone is taken out, and its path goes on the replaced list.
    expect(
      data.topLevel.filter((row) => !top.includes(row.path)).map((r) => r.path),
    ).toEqual([]);
  });

  it("is what docs/CURRENT.md was written from", () => {
    expect(readFileSync(path.join(ROOT, "docs/CURRENT.md"), "utf8")).toBe(
      currentPage(data),
    );
  });

  it("keeps the replaced list to paths that are gone", () => {
    expect(
      data.replaced.filter((row) => exists(row.old)).map((row) => row.old),
    ).toEqual([]);
  });
});

describe("nothing points at anything old", () => {
  const found = deadPointers();
  const known = baseline.areas as Record<string, number>;

  it("adds no pointer to a path that is not in the repository", () => {
    const over = Object.entries(found)
      .filter(([area, list]) => list.length > (known[area] ?? 0))
      .map(
        ([area, list]) =>
          `${area}: ${list.length} pointers name nothing, ${known[area] ?? 0} known. Point at the current path (docs/CURRENT.md), or add the old path to the replaced list in docs/current.json and fix every pointer to it. Some of them: ${list.slice(-4).join("; ")}`,
      );
    expect(over).toEqual([]);
  });

  it("lowers an area's known count as soon as its pointers are fixed", () => {
    const stale = Object.entries(known)
      .filter(([area, n]) => (found[area]?.length ?? 0) < n)
      .map(
        ([area, n]) =>
          `${area}: lower ${n} to ${found[area]?.length ?? 0} in tests/guards/current-pointers-baseline.json`,
      );
    expect(stale).toEqual([]);
  });

  it("reads a path the way a reader would", () => {
    expect(asPath("src/bench/play.mjs:42")).toBe("src/bench/play.mjs");
    expect(asPath("docs/pool/items/")).toBe("docs/pool/items");
    expect(asPath("docs/pool/items/<id>.md")).toBeNull();
    expect(asPath("src/bench/*.browser.mjs")).toBeNull();
    expect(asPath("npm run pool")).toBeNull();
    expect(
      pathsNamed("See `src/bench/gone.ts` and `src/new.ts` (new).", false),
    ).toEqual(["src/bench/gone.ts"]);
    // A path marked as removed is not a pointer when the replaced list covers
    // it, and still is one when nothing on the list does.
    expect(
      pathsNamed(
        "It lived in `src/simulation/old.ts` (removed) and `src/bench/never-listed.ts` (removed).",
        false,
      ),
    ).toEqual(["src/bench/never-listed.ts"]);
    // In code only comments are read, and a bare path with an extension counts.
    expect(
      pathsNamed(
        'const a = "src/bench/in-a-string.ts";\n// see src/bench/in-a-comment.ts',
        true,
      ),
    ).toEqual(["src/bench/in-a-comment.ts"]);
  });
});
