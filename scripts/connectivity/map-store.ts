/**
 * The filesystem half of `src/connectivity/connectivity-map.ts`.
 *
 * Reading is a directory listing; filing is one new file, or an edit to an
 * existing one when a lane re-measures a subject it already recorded. Nothing
 * here appends to a shared document, because two lanes recording wiring from
 * two branches must never be able to lose one of them to a merge.
 */

import fs from "fs";
import path from "path";

import * as prettier from "prettier";

import { toCanonicalJson } from "../../src/authoring/canonical-json";
import {
  CONNECTIVITY_ENTRY_DIRECTORY,
  type ConnectivityEntry,
} from "../../src/connectivity/connectivity-map";

export interface LoadedConnectivityEntry {
  readonly filePath: string;
  readonly entry: ConnectivityEntry;
}

export interface ConnectivityLoadResult {
  readonly entries: readonly LoadedConnectivityEntry[];
  /** Files that are not readable entries. Never silently skipped. */
  readonly unreadable: readonly {
    readonly filePath: string;
    readonly reason: string;
  }[];
}

export function connectivityEntryDirectory(repositoryRoot: string): string {
  return path.join(repositoryRoot, CONNECTIVITY_ENTRY_DIRECTORY);
}

/** Read every subject on the map, oldest recording first. */
export function loadConnectivityEntries(
  repositoryRoot: string,
): ConnectivityLoadResult {
  const directory = connectivityEntryDirectory(repositoryRoot);
  if (!fs.existsSync(directory)) {
    return { entries: [], unreadable: [] };
  }
  const entries: LoadedConnectivityEntry[] = [];
  const unreadable: { filePath: string; reason: string }[] = [];

  for (const file of fs.readdirSync(directory).sort()) {
    if (!file.endsWith(".json")) continue;
    const filePath = path.join(directory, file);
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (cause) {
      unreadable.push({
        filePath,
        reason: `Not parseable JSON: ${(cause as Error).message}`,
      });
      continue;
    }
    if (typeof parsed !== "object" || parsed === null) {
      unreadable.push({ filePath, reason: "Not a JSON object." });
      continue;
    }
    const entry = parsed as ConnectivityEntry;
    const expected = `${entry.entryId}.json`;
    if (file !== expected) {
      unreadable.push({
        filePath,
        reason: `File is named '${file}' but its entryId is '${entry.entryId}', so the file expected is '${expected}'. The filename is how the map stays collision-free.`,
      });
      continue;
    }
    entries.push({ filePath, entry });
  }

  entries.sort((left, right) =>
    String(left.entry.recordedAt).localeCompare(String(right.entry.recordedAt)),
  );
  return { entries, unreadable };
}

export class ConnectivityEntryExistsError extends Error {}

/**
 * Write one subject.
 *
 * Unlike a research question, a subject on this map is expected to be
 * re-measured: a wire gets built and the entry has to say so. So `replace`
 * exists — but it is not the default, because overwriting somebody else's
 * reading by accident is exactly how a map stops being evidence.
 */
export async function writeConnectivityEntry(
  repositoryRoot: string,
  entry: ConnectivityEntry,
  options: { readonly replace?: boolean } = {},
): Promise<string> {
  const directory = connectivityEntryDirectory(repositoryRoot);
  fs.mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, `${entry.entryId}.json`);
  if (fs.existsSync(filePath) && !options.replace) {
    throw new ConnectivityEntryExistsError(
      `'${entry.entryId}' is already on the map at ${filePath}. Read it first. If the wiring has changed since it was recorded, file again with --replace and say so in the notes; if this is a different subject, give it its own id.`,
    );
  }
  // Canonical order, then Prettier's layout: the two disagree about a short
  // array, and writing canonical alone files an entry that fails the format
  // gate, which is a filing tool handing its user a broken branch.
  fs.writeFileSync(
    filePath,
    await prettier.format(toCanonicalJson(entry), {
      ...(await prettier.resolveConfig(filePath)),
      filepath: filePath,
    }),
  );
  return filePath;
}
