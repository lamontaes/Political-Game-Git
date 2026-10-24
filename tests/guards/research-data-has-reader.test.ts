import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { engineDocOrder } from "../../scripts/audit/autoscan";
import { REPO_ROOT, researchReaders } from "../../scripts/audit/readers";

/*
 * Research data must have a reader. Every JSON file under data/research is
 * read by at least one non-test file under src/ or scripts/ (an import, or a
 * path it resolves and reads), or it is listed in
 * scripts/audit/research-data-allowlist.json with a one-line reason: raw
 * source the game is not meant to read, or research still waiting for the
 * code that should read it. The waiting list may only shrink.
 *
 * `unreadFound` lists, folder by folder and with a count, the files found
 * unread on Oct 16 when the scanner stopped treating a quoted "data/research/"
 * prefix as a read of the whole tree. Each folder's count is exact: a file that
 * gains a reader lowers it in the same change, and a new unread file in a
 * listed folder, or in a folder not listed, fails the guard.
 */

interface AllowEntry {
  readonly file: string;
  readonly reason: string;
  readonly engine?: string;
  readonly readerOwner?: string;
}

/**
 * The waiting list may only shrink. When a file gains its reader and leaves
 * the list, lower this to the new length in the same change; never raise it.
 */
// 8 from 7: the employer callback-gap table moved here from rawSource,
// where it skipped the reader guard; it waits for the hiring engine to read it.
const AWAITING_READER_CEILING = 8;
/** The same for the files found unread on Oct 16 (see `unreadFound`). */
const UNREAD_FOUND_CEILING = 364;

const allowlist = JSON.parse(
  readFileSync(
    join(REPO_ROOT, "scripts/audit/research-data-allowlist.json"),
    "utf8",
  ),
) as {
  readonly rawSource: readonly AllowEntry[];
  readonly awaitingReader: readonly AllowEntry[];
  readonly unreadFound: readonly {
    readonly prefix: string;
    readonly files: number;
    readonly reason: string;
  }[];
};

const readers = researchReaders(["src", "scripts"]);
const allowed = new Map(
  [...allowlist.rawSource, ...allowlist.awaitingReader].map((entry) => [
    entry.file,
    entry,
  ]),
);

const folderOf = (file: string) => file.slice(0, file.lastIndexOf("/") + 1);
const foundFolders = new Map(
  allowlist.unreadFound.map((entry) => [entry.prefix, entry]),
);
/** Unread files per folder that are listed by folder rather than by name. */
const unreadByFolder = new Map<string, string[]>();
for (const [file, found] of readers)
  if (found.length === 0 && !allowed.has(file))
    unreadByFolder.set(folderOf(file), [
      ...(unreadByFolder.get(folderOf(file)) ?? []),
      file,
    ]);

describe("research data has a reader", () => {
  it("every data/research JSON file is read by production code or scripts, or is allowlisted with a reason", () => {
    const unread = [...unreadByFolder]
      .filter(
        ([folder, files]) =>
          !foundFolders.has(folder) ||
          files.length > foundFolders.get(folder)!.files,
      )
      .flatMap(([, files]) => files);
    expect(
      unread,
      `These research files have no reader in src/ or scripts/. Wire each one into the code that should use it, or, if it is raw source the game is not meant to read, add it to scripts/audit/research-data-allowlist.json with a reason:\n${unread.join("\n")}`,
    ).toEqual([]);
  });

  it("every allowlist entry names a real file that still has no reader, with a reason", () => {
    for (const entry of allowed.values()) {
      expect(readers.has(entry.file), `${entry.file} does not exist`).toBe(
        true,
      );
      expect(entry.reason.trim().length, entry.file).toBeGreaterThan(0);
      // A file that gained a reader leaves the list in the same change.
      expect(
        readers
          .get(entry.file)
          ?.map((reader) => `${reader.file}:${reader.line}`),
        `${entry.file} has a reader now; remove it from the allowlist`,
      ).toEqual([]);
    }
    expect(allowed.size).toBe(
      allowlist.rawSource.length + allowlist.awaitingReader.length,
    );
  });

  it("the waiting list never grows, and each waiting file names its engine and the squad that owns its reader", () => {
    expect(
      allowlist.awaitingReader.length,
      "The list of research files waiting for a reader may only shrink. Wire the new file to its reader instead of adding it.",
    ).toBeLessThanOrEqual(AWAITING_READER_CEILING);
    const engines = new Map(
      engineDocOrder().map((section) => [section.engine, section.squads]),
    );
    for (const entry of allowlist.awaitingReader) {
      const squads = engines.get(entry.engine ?? "");
      expect(squads, `${entry.file}: engine "${entry.engine}"`).toBeDefined();
      expect(
        squads!.includes(entry.readerOwner ?? "\u0000"),
        `${entry.file}: "${entry.readerOwner}" is not one of the ${entry.engine} squads (${squads})`,
      ).toBe(true);
    }
  });

  it("each folder of files found unread lists its exact count and a reason, and the total never grows", () => {
    for (const entry of allowlist.unreadFound) {
      expect(entry.reason.trim().length, entry.prefix).toBeGreaterThan(0);
      expect(
        unreadByFolder.get(entry.prefix)?.length ?? 0,
        `${entry.prefix}: ${entry.files} files listed unread; a file here gained a reader (or was removed), so lower this count or drop the folder`,
      ).toBe(entry.files);
    }
    expect(
      allowlist.unreadFound.reduce((sum, entry) => sum + entry.files, 0),
      "The files found unread may only shrink. Wire the new file to its reader instead of adding it.",
    ).toBeLessThanOrEqual(UNREAD_FOUND_CEILING);
  });

  it("finds a real import and a real path read, and ignores a citation", () => {
    // links.json is imported with { type: "json" } by the outcome web.
    expect(
      readers
        .get("data/research/outcome-web/links.json")
        ?.some(
          (reader) => reader.file === "src/simulation/outcome-web/index.ts",
        ),
    ).toBe(true);
    // export-town-pay reads the minimum-wage table by its path.
    expect(
      readers
        .get("data/research/money/minimum-wage-2026.json")
        ?.some((reader) => reader.how === "path"),
    ).toBe(true);
    // legal-outcome.ts only cites batch 2 in a sourceIds list: no reader.
    expect(
      readers.get("data/research/laws/catalog-terms-batch-02.json"),
    ).toEqual([]);
  });
});
