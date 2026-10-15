/* global indexedDB, structuredClone */
import { isDeepStrictEqual } from "node:util";

/** Existing browser storage, read-only; no gameplay bridge or debug API. */
export async function readSavedRecords(page, databaseName) {
  return page.evaluate(async (name) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      // The repository stores a large life as a manifest plus history chunks,
      // and retains deletion tombstones. Those rows are not additional lives.
      // Read both stores in one transaction, then reconstruct the exact saved
      // generation using browser-world-repository.ts's on-disk chunk contract.
      const records = await new Promise((resolve, reject) => {
        const transaction = db.transaction(["worlds", "interface"], "readonly");
        const result = {};
        for (const store of ["worlds", "interface"]) {
          const request = transaction.objectStore(store).getAll();
          request.onsuccess = () => {
            result[store] = request.result;
          };
          request.onerror = () => reject(request.error);
        }
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      const chunkPrefix = "\u0000ocd-world-chunk:v1:";
      const chunkMarker = "\u0000ocd-chunked-payload:v1";
      const chunks = new Map();
      const worlds = [];
      for (const row of records.worlds) {
        if (
          typeof row?.saveId === "string" &&
          row.saveId.startsWith(chunkPrefix)
        ) {
          if (chunks.has(row.saveId))
            throw new Error("Duplicate saved history chunk.");
          chunks.set(row.saveId, row);
        } else if (
          row?.kind === "political-life-browser-world-deleted" &&
          typeof row.saveId === "string"
        ) {
          // A durable deletion is not a kept life.
        } else if (row?.kind === "political-life-browser-world") {
          worlds.push(row);
        } else {
          throw new Error(
            "Unrecognized saved world row; persisted life count cannot be proven.",
          );
        }
      }
      return {
        worlds: worlds.map((row) => {
          if (row.payload !== chunkMarker) return row;
          const descriptor = row.payloadChunks;
          if (
            typeof row.saveId !== "string" ||
            !Number.isSafeInteger(row.generation) ||
            descriptor?.kind !== "world-payload-chunks-v1" ||
            !Number.isSafeInteger(descriptor.count) ||
            descriptor.count < 1 ||
            descriptor.count > 100_000 ||
            !Number.isSafeInteger(descriptor.length) ||
            descriptor.length < 1
          )
            throw new Error("Invalid saved world chunk manifest.");
          // Match the repository's safe joined-string limit. Do not turn an
          // oversized or corrupt snapshot into a false absence or identity pass.
          if (descriptor.length > 2 ** 28)
            throw new Error(
              "Saved world exceeds the desktop identity proof's joined-payload limit.",
            );
          const parts = [];
          let length = 0;
          for (let index = 0; index < descriptor.count; index += 1) {
            const key = `${chunkPrefix}${row.saveId}:${row.generation}:${index}`;
            const chunk = chunks.get(key);
            if (chunk?.saveId !== key || typeof chunk.data !== "string")
              throw new Error(
                `Saved world ${row.saveId} is missing history chunk ${index}.`,
              );
            length += chunk.data.length;
            if (length > descriptor.length)
              throw new Error(
                "Saved world chunk length disagrees with its manifest.",
              );
            parts.push(chunk.data);
          }
          if (length !== descriptor.length)
            throw new Error(
              "Saved world chunk length disagrees with its manifest.",
            );
          return { ...row, payload: parts.join("") };
        }),
        interfaces: records.interface,
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
