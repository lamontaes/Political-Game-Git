import { expect, test, type Page } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { FAMILY_MEMBER_ADDED_EVENT } from "../../src/simulation/people-family";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import {
  readWorldSnapshot,
  type WorldPayload,
} from "../../src/simulation/serialization";
import { enterLife, saveLife, startLife } from "./support/creator";

const seed = "session6-recorded-life-random-place-20261006";
const place = drawRandomPlace(
  seed,
  (candidate) => candidate.scope === "locality",
);
const state = lifePlaceStateIdentities().find(
  (candidate) => candidate.jurisdictionKey === place.stateJurisdictionKey,
);
if (!state) throw new Error(`No state identity for ${place.displayName}.`);

async function clearBrowser(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const databases = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      databases.map(
        (database) =>
          new Promise<void>((resolve) => {
            if (!database.name) return resolve();
            const request = indexedDB.deleteDatabase(database.name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
    );
    window.localStorage.clear();
  });
  await page.reload();
}

async function savedWorld(page: Page) {
  const payload = await page.evaluate(async (): Promise<WorldPayload> => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("political-life-worlds");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<WorldPayload>((resolve, reject) => {
        const request = db
          .transaction("worlds", "readonly")
          .objectStore("worlds")
          .getAll();
        request.onsuccess = () => {
          const rows = request.result as {
            saveId?: string;
            generation?: number;
            payload?: string;
            payloadChunks?: { count: number };
            metadata?: unknown;
            data?: string;
          }[];
          const saved = rows.find(
            (row) => row.metadata && typeof row.payload === "string",
          );
          if (!saved) return reject(new Error("No saved new-game world."));
          if (typeof saved.payload !== "string")
            return reject(new Error("Saved world payload is missing."));
          if (saved.payload !== "\u0000ocd-chunked-payload:v1")
            return resolve(saved.payload);
          const prefix = `\u0000ocd-world-chunk:v1:${saved.saveId}:${saved.generation}:`;
          const chunks = rows
            .filter(
              (row) =>
                row.saveId?.startsWith(prefix) && typeof row.data === "string",
            )
            .sort(
              (left, right) =>
                Number(left.saveId!.slice(prefix.length)) -
                Number(right.saveId!.slice(prefix.length)),
            )
            .map((row) => row.data!);
          if (chunks.length !== saved.payloadChunks?.count)
            return reject(
              new Error("Saved world history chunks are incomplete."),
            );
          resolve(chunks);
        };
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
  return readWorldSnapshot(payload).world;
}

test("Creator and Begin preserve a recorded birth in a randomly drawn locality", async ({
  page,
}) => {
  await clearBrowser(page);
  await startLife(page, {
    age: 18,
    place: place.displayName,
    state: state.name,
    calibration: "short",
  });
  await enterLife(page);
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await saveLife(page);

  const world = await savedWorld(page);
  expect(world.preStartLife).toBeUndefined();
  expect(world.control.kind).toBe("person");
  if (world.control.kind !== "person") throw new Error("No controlled person.");
  const playerId = world.control.personId;
  const player = world.people[playerId];
  expect(player).toBeDefined();
  const birth = world.history.events.find(
    (event) =>
      event.type === FAMILY_MEMBER_ADDED_EVENT &&
      event.tags.includes("family.birth") &&
      event.involvedEntityIds.includes(playerId),
  );
  expect(birth).toBeDefined();
  expect(birth!.occurredAt).toBe(player!.birthDate);
  const household = world.history.householdMemberships.find(
    (row) => row.personId === playerId && row.startedAt === player!.birthDate,
  );
  expect(household).toBeDefined();

  console.info(
    `SESSION6_NEW_GAME_PROOF ${JSON.stringify({
      seed,
      worldSeed: world.seed,
      worldId: world.id,
      date: world.currentDate,
      place: place.displayName,
      state: state.name,
      playerId,
      birthEventId: birth!.id,
      birthDate: player!.birthDate,
      householdMembershipId: household!.id,
    })}`,
  );
});
