import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("the municipal screen carries no authored sentence", () => {
  it("has no sentence literal in its file", () => {
    const text = readFileSync(join(__dirname, "MunicipalWorkspace.tsx"), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");
    expect(text.match(/"[A-Z][^"]{25,}[.?!]"/g) ?? []).toEqual([]);
    expect(text.match(/`[A-Z][^`]{25,}[.?!]`/g) ?? []).toEqual([]);
    expect(
      text.match(/>\s*[A-Z][a-z]+ [a-z ,'&;]{20,}[.?!]\s*</g) ?? [],
    ).toEqual([]);
  });
});
