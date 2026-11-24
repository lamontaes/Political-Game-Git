import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { carriers, nextFeature, unfinished } from "./next-feature";

const item = (id: string, status: string, body: string, after = "") => ({
  id,
  text: `---\nid: ${id}\ntitle: "${id}"\nstatus: ${status}\n${after ? `after: ${after}\n` : ""}---\n\n${body}\n`,
});

describe("the top unfinished roadmap spec", () => {
  it("takes milestones by number, then the file's order", () => {
    const specs = [
      { id: "M1-01", milestone: "M1", title: "", passes: false, command: null },
      { id: "M0-02", milestone: "M0", title: "", passes: true, command: null },
      { id: "M0-03", milestone: "M0", title: "", passes: false, command: null },
      { id: "M2-01", milestone: "M1", title: "", passes: false, command: null },
    ];
    assert.deepEqual(
      unfinished(specs).map((s) => s.id),
      ["M0-03", "M1-01", "M2-01"],
    );
  });

  it("is carried only by a live item that names its exact id", () => {
    const items = [
      item("a", "open", "Blocks roadmap M0-05."),
      item("b", "done", "Flips M0-05."),
      item("c", "open", "Roadmap M0-050 and M0-5 are other things."),
      item("d", "in-pr", "M0-05's flag."),
    ];
    assert.deepEqual(
      carriers("M0-05", items).map((c) => c.id),
      ["a", "d"],
    );
  });

  const root = mkdtempSync(join(tmpdir(), "next-feature-"));
  after(() => rmSync(root, { recursive: true, force: true }));
  const write = (
    items: ReturnType<typeof item>[],
    more: { id: string; passes: boolean }[] = [],
  ) => {
    rmSync(join(root, "docs"), { recursive: true, force: true });
    mkdirSync(join(root, "docs/roadmap"), { recursive: true });
    mkdirSync(join(root, "docs/pool/items"), { recursive: true });
    writeFileSync(
      join(root, "docs/roadmap/features.json"),
      JSON.stringify({
        features: [
          { id: "M0-01", milestone: "M0", title: "One", passes: true },
          { id: "M0-02", milestone: "M0", title: "Two", passes: false },
          ...more.map((m) => ({ ...m, milestone: "M0", title: m.id })),
        ],
      }),
    );
    for (const i of items)
      writeFileSync(join(root, `docs/pool/items/${i.id}.md`), i.text);
  };
  const run = () => {
    try {
      return {
        code: 0,
        out: execFileSync(
          process.execPath,
          [
            "--import",
            "tsx",
            "scripts/roadmap/next-feature.ts",
            "--root",
            root,
          ],
          { encoding: "utf8", stdio: "pipe" },
        ),
      };
    } catch (error) {
      const e = error as { status: number; stdout: string; stderr: string };
      return { code: e.status, out: e.stdout + e.stderr };
    }
  };

  it("names the spec and its item, and exits 0", () => {
    write([item("roadmap-two", "open", "Flips M0-02.")]);
    assert.equal(nextFeature(root).top?.id, "M0-02");
    const r = run();
    assert.equal(r.code, 0);
    assert.match(r.out, /Top unfinished spec: M0-02/);
    assert.match(r.out, /Carried by roadmap-two \(open\)/);
    assert.match(r.out, /Start on: roadmap-two \(M0-02\)/);
  });

  it("fails when no live item carries the top spec", () => {
    write([item("roadmap-two", "done", "Flips M0-02.")]);
    const r = run();
    assert.equal(r.code, 1);
    assert.match(r.out, /M0-02 has no live pool item/);
  });

  it("skips an item that waits on an unfinished one, as pool claim does", () => {
    write([
      item("dep", "open", "Something else."),
      item("a-gated", "open", "Flips M0-02.", "dep"),
      item("b-alt", "open", "Also M0-02."),
    ]);
    const r = run();
    assert.equal(r.code, 0);
    assert.match(r.out, /Carried by a-gated \(open, after dep\)/);
    assert.match(r.out, /Start on: b-alt \(M0-02\)/);
  });

  it("takes the next spec when every item of the top one waits", () => {
    write(
      [
        item("dep", "claimed", "Something else."),
        item("gated", "open", "Flips M0-02.", "dep"),
        item("three", "open", "Flips M0-03."),
      ],
      [{ id: "M0-03", passes: false }],
    );
    const r = run();
    assert.equal(r.code, 0);
    assert.match(r.out, /Top unfinished spec: M0-02/);
    assert.match(r.out, /Start on: three \(M0-03\)/);
  });

  it("starts on a waiting item once what it waits on is done", () => {
    write([
      item("dep", "done", "Something else."),
      item("gated", "open", "Flips M0-02.", "dep"),
    ]);
    assert.match(run().out, /Start on: gated \(M0-02\)/);
  });

  it("fails and says so when no item can be claimed", () => {
    write([
      item("dep", "in-pr", "Something else."),
      item("gated", "open", "Flips M0-02.", "dep"),
      item("taken", "claimed", "Also M0-02."),
    ]);
    const r = run();
    assert.equal(r.code, 1);
    assert.doesNotMatch(r.out, /Start on:/);
    assert.match(r.out, /No unfinished spec has an item a session can claim/);
  });
});
