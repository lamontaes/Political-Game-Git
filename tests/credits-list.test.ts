import { readFileSync, readdirSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The Credits screen reads data/credits/credits.json. Every art reference
 * photo whose license requires credit (CC BY and CC BY-SA) and every data
 * source whose lock sets attributionRequired must have a row there.
 */

const ROOT = path.resolve(__dirname, "..");
const readJson = (p: string) =>
  JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));

interface CreditRow {
  kind: string;
  key: string;
  license: string;
  artist: string;
  creditLine: string;
}
const credits: CreditRow[] = readJson("data/credits/credits.json").credits;
const keys = new Set(credits.map((c) => `${c.kind}:${c.key}`));

describe("credits list", () => {
  it("covers every art reference photo whose license requires credit", () => {
    const missing: string[] = [];
    for (const [file, list] of [
      ["art/campuses/manifest.json", "campuses"],
      ["art/backdrops/manifest.json", "backdrops"],
    ] as const) {
      for (const item of readJson(file)[list] as Array<
        Record<string, string>
      >) {
        if (
          /^CC BY/.test(item.referenceLicense ?? "") &&
          !keys.has(`art-reference-photo:${item.referencePhoto}`)
        ) {
          missing.push(
            `${file}: ${item.referencePhoto} (${item.referenceLicense})`,
          );
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("covers every data source whose lock requires attribution", () => {
    const missing: string[] = [];
    for (const dir of readdirSync(path.join(ROOT, "data/source"))) {
      const lockPath = `data/source/${dir}/artifact-lock.json`;
      let lock: {
        artifacts?: Array<{ rights?: { attributionRequired?: unknown } }>;
      };
      try {
        lock = readJson(lockPath);
      } catch {
        continue;
      }
      if (
        lock.artifacts?.some((a) => a.rights?.attributionRequired === true) &&
        !keys.has(`data-source:${dir}`)
      ) {
        missing.push(lockPath);
      }
    }
    expect(missing).toEqual([]);
  });

  it("gives every row an artist, license and credit line", () => {
    for (const c of credits) {
      expect(c.artist, c.key).toBeTruthy();
      expect(c.license, c.key).toBeTruthy();
      expect(c.creditLine, c.key).toBeTruthy();
    }
  });
});
