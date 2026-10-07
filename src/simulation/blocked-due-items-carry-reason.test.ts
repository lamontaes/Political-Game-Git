import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A handler that blocks a due item must say why with a structured reason key:
 * `future-transitions.ts` refuses a blocked state with none, and the refusal
 * stops the whole clock instead of recording the block. Found when a council
 * reading refused its vote and the advance threw. This reads every source
 * file, so a handler added later is held to it too.
 */

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("blocked future due items", () => {
  it("never return a null reason key", () => {
    const offenders: string[] = [];
    for (const file of sources("src")) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (!/status:\s*"blocked"/.test(line)) return;
        const near = lines.slice(Math.max(0, index - 3), index + 4);
        if (near.some((entry) => /reasonKey:\s*null/.test(entry)))
          offenders.push(`${file}:${index + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
