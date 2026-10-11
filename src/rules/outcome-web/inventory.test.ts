import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import inventory from "./inventory.json" with { type: "json" };
import stopgaps from "./stopgaps.json" with { type: "json" };
import { STATES } from "../../simulation/state-reference";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const shelf = fileURLToPath(new URL("./", import.meta.url));

describe("outcome-web KEEP completion contract", () => {
  it("accounts for every classifier KEEP and named audit override with an explicit disposition", () => {
    expect(Object.keys(STATES)).toHaveLength(56);
    expect(
      inventory.entries.filter((entry) => entry.sourceClass === "RULE"),
    ).toHaveLength(inventory.classifierKeepFunctions);
    expect(
      new Set(
        inventory.entries.map((entry) => `${entry.source}:${entry.function}`),
      ).size,
    ).toBe(inventory.entries.length);
    for (const entry of inventory.entries) {
      expect(entry.reason.length).toBeGreaterThan(20);
      const path = root + entry.source;
      const source = ts.createSourceFile(
        path,
        readFileSync(path, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      expect(
        source.statements.some(
          (statement) =>
            (ts.isFunctionDeclaration(statement) &&
              statement.name?.text === entry.function) ||
            (ts.isVariableStatement(statement) &&
              statement.declarationList.declarations.some(
                (declaration) =>
                  ts.isIdentifier(declaration.name) &&
                  declaration.name.text === entry.function,
              )),
        ),
        `${entry.source}:${entry.function}`,
      ).toBe(true);
      if (entry.status === "lifted") {
        expect(entry.destination).toMatch(/^src\/rules\/outcome-web\//);
        expect(existsSync(root + entry.destination)).toBe(true);
      } else {
        expect(entry.status).toBe("not-liftable");
        expect(entry.destination).toBeNull();
      }
    }
  });
  it("pins unchanged legacy sources for this golden reference", () => {
    for (const [file, hash] of Object.entries(inventory.legacySourceSha256))
      expect(
        createHash("sha256")
          .update(readFileSync(root + file))
          .digest("hex"),
        file,
      ).toBe(hash);
  });
  it("keeps production rules independent of the old engine and registers every preservation marker", () => {
    const files = readdirSync(shelf).filter(
      (file) => file.endsWith(".ts") && !file.includes(".test"),
    );
    for (const file of files) {
      const text = readFileSync(shelf + file, "utf8");
      expect(text, file).not.toMatch(/from\s+["'][^"']*simulation\//);
      for (const id of text.matchAll(/STOPGAP (RULES4-OW-\d+)/g))
        expect(
          stopgaps.entries.some((entry) => entry.id === id[1]),
          file,
        ).toBe(true);
    }
    for (const entry of stopgaps.entries) {
      expect(entry.author).toContain("RULES-4");
      expect(entry.date).toBe("2026-10-10");
      expect(entry.replacement.length).toBeGreaterThan(20);
      expect(readFileSync(shelf + entry.path, "utf8")).toContain(
        `STOPGAP ${entry.id}`,
      );
    }
  });
});
