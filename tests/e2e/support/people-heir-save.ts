import { writeFileSync } from "node:fs";

import {
  createBrowserWorldRecord,
  type BrowserSaveStore,
} from "../../../src/presentation/browser-world-repository";
import {
  exportPortableSave,
  serializePortableSave,
} from "../../../src/presentation/portable-save";
import type { EntityId } from "../../../src/simulation";
import { personName } from "../../../src/simulation/people";
import { openedLifeWithAdultChild } from "../../fixtures/people-heir";

/**
 * Writes PEOPLE's adult-child fixture as a saved-life file, through the
 * game's own portable-save export, and prints who is in it as JSON.
 *
 * It runs under `node --import tsx` because the simulation imports JSON
 * catalogs the Playwright loader will not load without import attributes.
 *
 *   node --import tsx tests/e2e/support/people-heir-save.ts <out-file>
 */
async function main(outFile: string) {
  const { world, playerPersonId, childPersonId } = openedLifeWithAdultChild();
  const record = createBrowserWorldRecord(world, "2026-09-17T00:00:00.000Z");
  // The export reads the slot through the store it is given. This one holds
  // the fixture record and has no browser database, so the file says the
  // interface state was unavailable rather than inventing any.
  const store = {
    indexedDB: undefined,
    databaseName: "ui46-heir-export",
    inspectRecord: async (saveId: EntityId) =>
      saveId === record.saveId ? record : null,
  } as unknown as BrowserSaveStore;
  const exported = await exportPortableSave(store, record.saveId);
  if (exported.status !== "ok") throw new Error(exported.reason);
  writeFileSync(outFile, serializePortableSave(exported.bundle));
  process.stdout.write(
    JSON.stringify({
      playerName: personName(world.people[playerPersonId]!),
      childName: personName(world.people[childPersonId]!),
      childPersonId,
    }),
  );
}

const outFile = process.argv[2];
if (!outFile) throw new Error("usage: people-heir-save.ts <out-file>");
await main(outFile);
