// The stopgap register is one folder of family files with one reader
// (tooling-stopgaps-register-per-family).
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STOPGAP_FAMILIES } from "./stopgap-families";
import { STOPGAPS } from "./stopgaps";
import {
  readStopgapFiles,
  readStopgapFolder,
  stopgapFamilyFile,
  STOPGAP_FOLDER,
  writeStopgapFolder,
} from "./stopgaps-folder";

const ROOT = join(import.meta.dirname, "..", "..");

describe("the stopgap register", () => {
  it("the game's register is exactly the folder's files, nothing else", () => {
    const files = readStopgapFiles(ROOT);
    expect(Object.keys(STOPGAP_FAMILIES).sort()).toEqual([...files.keys()]);
    for (const [file, rows] of files)
      expect(STOPGAP_FAMILIES[file], file).toEqual(rows);
    expect(STOPGAPS).toEqual(readStopgapFolder(ROOT));
  });

  it("every entry sits in its family's file, once", () => {
    const ids = new Set<string>();
    for (const [file, rows] of readStopgapFiles(ROOT))
      for (const row of rows as { id: string }[]) {
        expect(stopgapFamilyFile(row.id), row.id).toBe(file);
        expect(ids.has(row.id), `duplicate ${row.id}`).toBe(false);
        ids.add(row.id);
      }
    expect(ids.size).toBe(STOPGAPS.length);
  });

  it("adding an entry to one family file changes no other file", () => {
    const root = mkdtempSync(join(tmpdir(), "stopgaps-"));
    mkdirSync(join(root, STOPGAP_FOLDER), { recursive: true });
    const row = (id: string) => ({ id, status: "open" });
    writeFileSync(
      join(root, STOPGAP_FOLDER, "gov.json"),
      JSON.stringify([row("SG-GOV-a")]),
    );
    writeFileSync(
      join(root, STOPGAP_FOLDER, "play.json"),
      JSON.stringify([row("SG-PLAY-b")]),
    );
    const before = readStopgapFiles(root);
    writeStopgapFolder(root, [row("SG-GOV-a"), row("SG-GOV-new")]);
    const after = readStopgapFiles(root);
    expect(after.get("play.json")).toEqual(before.get("play.json"));
    expect(after.get("gov.json")).toEqual([row("SG-GOV-a"), row("SG-GOV-new")]);
    expect(readStopgapFolder(root).map((r) => r.id)).toEqual([
      "SG-GOV-a",
      "SG-GOV-new",
      "SG-PLAY-b",
    ]);
  });

  it("an id without a family prefix is refused", () => {
    expect(() => stopgapFamilyFile("no-family")).toThrow(/SG-<FAMILY>-/);
  });
});
