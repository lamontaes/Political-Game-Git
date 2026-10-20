import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Owner notes must not ship: a data citation, a calibration proposal or a
// stopgap's replacement text names its source and method, not who ruled on
// which day. (The decision itself lives in docs/coordination/.)
const OWNER_DATE =
  /\b(?:the )?owner (?:ruled|decided|said|asked)\b|\(owner,? (?:Oct|Sept|Nov)\b|\bon (?:Oct|Sept|Nov) \d/i;

function strings(value: unknown, at = "", out: [string, string][] = []) {
  if (typeof value === "string") out.push([at, value]);
  else if (Array.isArray(value))
    value.forEach((v, i) => strings(v, `${at}[${i}]`, out));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) strings(v, `${at}.${k}`, out);
  return out;
}

describe("no owner or date notes in shipped data text", () => {
  it("parameters.json citations and calibration proposals carry none", () => {
    for (const file of [
      "src/core2/data/parameters.json",
      "src/core2/tooling/calibration-targets.json",
    ]) {
      const rows = strings(JSON.parse(readFileSync(file, "utf8"))).filter(
        ([at]) => /citation|proposal|source/.test(at),
      );
      expect(rows.length, `${file} has text to check`).toBeGreaterThan(0);
      for (const [at, text] of rows)
        expect(
          OWNER_DATE.test(text),
          `${file}${at}: ${text.slice(0, 120)}`,
        ).toBe(false);
    }
  });

  it("a stopgap's replacement text carries none", () => {
    const rows = strings(
      JSON.parse(readFileSync("src/core2/data/stopgaps.json", "utf8")),
    ).filter(([at]) => /\.replacement$/.test(at));
    expect(rows.length).toBeGreaterThan(0);
    for (const [at, text] of rows)
      expect(OWNER_DATE.test(text), `${at}: ${text.slice(0, 120)}`).toBe(false);
  });
});
