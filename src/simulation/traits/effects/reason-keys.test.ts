import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const here = __dirname;
const changedReaderFiles = new Set(
  execFileSync("git", ["diff", "--name-only", "origin/main...HEAD"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter((path) => path.startsWith("src/simulation/traits/effects/"))
    .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"))
    .map((path) => path.slice(path.lastIndexOf("/") + 1)),
);
const readerFiles = readdirSync(here).filter(
  (name) => changedReaderFiles.has(name) && name !== "index.ts",
);

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("trait reasons stay out of effect files", () => {
  it("no effect file contains a sentence literal or an explanation field", () => {
    const offenders: string[] = [];
    for (const name of readerFiles) {
      const code = withoutComments(readFileSync(join(here, name), "utf8"));
      if (/\bexplanation\s*:/.test(code))
        offenders.push(`${name}: explanation`);
      for (const match of code.matchAll(/"((?:[^"\\]|\\.)*)"|`([^`]*)`/g)) {
        const text = match[1] ?? match[2] ?? "";
        if (/\s/.test(text) && !text.startsWith("import")) {
          offenders.push(`${name}: ${text}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
