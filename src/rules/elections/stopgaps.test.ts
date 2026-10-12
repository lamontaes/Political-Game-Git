import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import registry from "./stopgaps.json";
describe("elections stopgap registry", () => {
  it("has a unique complete entry and exact code marker for every stopgap", () => {
    const markers = new Map<string, { file: string; line: number }[]>();
    for (const name of readdirSync("src/rules/elections").filter(
      (x) => x.endsWith(".ts") && !x.endsWith(".test.ts"),
    )) {
      const file = `src/rules/elections/${name}`;
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, index) => {
          for (const [, id] of line.matchAll(/stopgapId:\s*"([^"]+)"/g))
            markers.set(id!, [
              ...(markers.get(id!) ?? []),
              { file, line: index + 1 },
            ]);
        });
    }
    expect(new Set(registry.map((x) => x.id)).size).toBe(registry.length);
    expect([...markers.keys()].sort()).toEqual(
      registry.map((x) => x.id).sort(),
    );
    for (const item of registry) {
      for (const field of [
        "id",
        "kind",
        "file",
        "line",
        "whatItFakes",
        "why",
        "addedBy",
        "addedAt",
        "replacement",
        "status",
      ] as const)
        expect(item[field]).toBeTruthy();
      expect(markers.get(item.id)).toContainEqual({
        file: item.file,
        line: item.line,
      });
    }
  });
});
