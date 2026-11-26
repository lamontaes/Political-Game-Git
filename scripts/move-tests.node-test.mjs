import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const mover = fileURLToPath(new URL("./move-tests", import.meta.url));
test("moves relative test imports and source imports, preserves paths, and reruns", () => {
  const root = mkdtempSync(path.join(tmpdir(), "move-tests-"));
  const git = (...args) => execFileSync("git", args, { cwd: root });
  const run = (...args) =>
    execFileSync(process.execPath, [mover, ...args], {
      cwd: root,
      encoding: "utf8",
    });
  const write = (name, contents) => {
    const file = path.join(root, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, contents);
  };
  const read = (name) => readFileSync(path.join(root, name), "utf8");
  try {
    git("init", "-q");
    write("src/demo/value.ts", "export const value = 3;\n");
    write("src/demo/other.test.ts", "export const other = 4;\n");
    write(
      "src/demo/value.test.ts",
      [
        'import { value } from "./value";',
        'import { other } from "./other.test";',
        'const fixture = new URL("./fixture.json", import.meta.url);',
        "if (value + other !== 7) throw Error(fixture.href);",
        "",
      ].join("\n"),
    );
    write("docs/demo.md", "`src/demo/value.test.ts`\n");
    write("src/bench/m1-10-check.ts", "// See src/demo/value.test.ts.\n");
    write("tsconfig.node.json", '{\n  "include": ["src/demo/**/*.ts"]\n}\n');
    git("add", ".");
    assert.match(run("--dry-run"), /2 moves/);
    assert.ok(existsSync(path.join(root, "src/demo/value.test.ts")));
    assert.match(run(), /2 moves/);
    assert.ok(!existsSync(path.join(root, "src/demo/value.test.ts")));
    const moved = read("tests/src/demo/value.test.ts");
    assert.match(moved, /from "\.\.\/\.\.\/\.\.\/src\/demo\/value"/);
    assert.match(moved, /from "\.\/other\.test"/);
    assert.match(moved, /src\/demo\/value\.test\.ts", import\.meta\.url/);
    assert.equal(read("docs/demo.md"), "`tests/src/demo/value.test.ts`\n");
    assert.equal(
      read("src/bench/m1-10-check.ts"),
      "// See tests/src/demo/value.test.ts.\n",
    );
    assert.match(
      read("tsconfig.node.json"),
      /tests\/src\/demo\/value\.test\.ts/,
    );
    git("add", "-A");
    assert.match(run(), /0 paths, 0 moves/);
    assert.equal(read("tests/src/demo/value.test.ts"), moved);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
