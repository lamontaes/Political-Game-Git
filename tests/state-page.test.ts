// docs/STATE.md says where the game stands, and every line says where it comes
// from (docs-state-page). A bullet must name something a reader can open: a
// file that exists, a pool item, a pull request, a commit, or a replay number.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PAGE = "docs/STATE.md";

describe("the state page", () => {
  it("exists and has its four parts", () => {
    const text = readFileSync(PAGE, "utf8");
    for (const part of [
      "## What a player can do now",
      "## Newest build",
      "## Who owns what",
      "## The pool",
    ])
      expect(text).toContain(part);
  });

  it("every bullet names a source a reader can open", () => {
    const bullets = readFileSync(PAGE, "utf8")
      .split("\n")
      .filter((line) => /^\s*- /.test(line));
    expect(bullets.length).toBeGreaterThan(5);
    for (const line of bullets) {
      const paths = [...line.matchAll(/`([\w./-]+\.(?:md|json|yml|ts))`/g)]
        .map((m) => m[1]!)
        .filter((p) => existsSync(p) || /^docs\/lanes\//.test(p));
      const items = [...line.matchAll(/`([a-z0-9-]+)`/g)].filter((m) =>
        existsSync(`docs/pool/items/${m[1]}.md`),
      );
      const named =
        paths.length > 0 ||
        items.length > 0 ||
        /#\d{4}\b/.test(line) ||
        /\b[0-9a-f]{10}\b/.test(line) ||
        /\b[0-9a-f]{16}\b/.test(line);
      expect(named, line).toBe(true);
    }
  });
});
