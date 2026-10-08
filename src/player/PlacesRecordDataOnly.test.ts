import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("the Places screen carries no authored sentences", () => {
  it("keeps sentence literals out of the screen component", () => {
    const text = readFileSync(join(__dirname, "PlacesWorkspace.tsx"), "utf8")
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
