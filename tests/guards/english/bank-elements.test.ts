import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * A bank line names the shared elements it draws on (the CTO, Nov 24,
 * 7133845630 on #9750: "every new line cites the element ids it draws on"),
 * as `"elements": ["<id>", ...]`, each id the name of a file in
 * docs/story/elements/<kind>/. This guard holds every cited id to a file the
 * bank has, so a line never cites research nobody can read.
 */
const ROOT = path.resolve(__dirname, "../../..");
const PARTS = path.join(ROOT, "data/english/parts");
const ELEMENTS = path.join(ROOT, "docs/story/elements");

const known = new Set<string>(
  existsSync(ELEMENTS)
    ? readdirSync(ELEMENTS, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((kind) =>
          readdirSync(path.join(ELEMENTS, kind.name))
            .filter((file) => file.endsWith(".json"))
            .map((file) => file.replace(/\.json$/, "")),
        )
    : [],
);

describe("the lines' element ids", () => {
  it("name elements the bank holds", () => {
    const wrong: string[] = [];
    for (const file of readdirSync(PARTS).filter((name) =>
      name.endsWith(".json"),
    )) {
      const bank = JSON.parse(readFileSync(path.join(PARTS, file), "utf8")) as {
        parts?: { key: string; elements?: unknown }[];
      };
      for (const part of bank.parts ?? []) {
        if (part.elements === undefined) continue;
        if (
          !Array.isArray(part.elements) ||
          part.elements.some((id) => typeof id !== "string")
        ) {
          wrong.push(`${part.key}: elements is not a list of ids`);
          continue;
        }
        for (const id of part.elements as string[])
          if (!known.has(id)) wrong.push(`${part.key}: no element ${id}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});
