/* global indexedDB, structuredClone */
import { isDeepStrictEqual } from "node:util";

/** Existing browser storage, read-only; no gameplay bridge or debug API. */
export async function readSavedRecords(page, databaseName) {
  return page.evaluate(async (name) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const read = (store) =>
        new Promise((resolve, reject) => {
          const request = db
            .transaction(store, "readonly")
            .objectStore(store)
            .getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      return {
        worlds: await read("worlds"),
        interfaces: await read("interface"),
      };
    } finally {
      db.close();
    }
  }, databaseName);
}

/** Names/heading formatting are deliberately not identity discriminators. */
export function savedIdentity(record) {
  const world = JSON.parse(record.payload).world;
  const personId =
    world.control.kind === "person" ? world.control.personId : null;
  const person = world.people[personId];
  if (
    !record.saveId ||
    !world.id ||
    !personId ||
    !person?.appearance ||
    record.metadata.worldId !== world.id ||
    record.metadata.playerPersonId !== personId ||
    person.id !== personId
  )
    throw new Error(
      "Saved slot, World, controlled person or appearance identity is invalid.",
    );
  return {
    saveId: record.saveId,
    worldId: world.id,
    personId,
    appearance: structuredClone(person.appearance),
  };
}

export function sameSavedIdentity(expected, actual) {
  return isDeepStrictEqual(expected, actual);
}
