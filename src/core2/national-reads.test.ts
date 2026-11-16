/**
 * A story of a national public event is read by the people who follow the
 * outlet that printed it, as a `news.read` record naming them, so someone in
 * the player's life can bring it up later (owner, Nov 15: a friend calls
 * after the President's speech). Before, only a story that argued a side, a
 * law taking effect or a bribe report was read; the President's address was
 * heard and never read. Pinned: Wilmont, Minnesota (2770582), the world
 * seed below, played to the first address a national outlet printed.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { NEWS_READ, storyOfReadEvent } from "./modules/news";
import { PRESS_MODULE_ID } from "./modules/press";
import { coreAPI } from "./state";

const PLACE = {
  name: "Wilmont, Minnesota",
  key: "2770582",
  seed: "2cb5aaf15d55f6b06548834319221a87402931e3d1570c6e674f546d2ff2025f",
};

it(`a national outlet's story of the President's address is read by name (${PLACE.name})`, () => {
  const where = `${PLACE.name} (${PLACE.key}), world seed ${PLACE.seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(core);
  const reads: { id: string; storyId: string; readers: string[] }[] = [];
  api.subscribeEvents("national-reads-test", [NEWS_READ], (_api, event) => {
    const storyId = storyOfReadEvent(event.id);
    if (storyId)
      reads.push({
        id: event.id,
        storyId,
        // A read is kept in the log when it names someone in the player's
        // circle (state.ts retainLog): those are the readers who can bring
        // it up with the player.
        readers: (event.witnessIds ?? []).filter(
          (id) => core.focusPersonIds.has(id) || id === core.playerId,
        ),
      });
  });
  const press = api.moduleState(PRESS_MODULE_ID);
  const nationalOutlets = new Set(
    (
      press.table("outlets").rows() as unknown as {
        id: string;
        tier?: string;
      }[]
    )
      .filter((outlet) => outlet.tier === "national")
      .map((outlet) => outlet.id),
  );
  const addresses = () =>
    (
      press.table("stories").rows() as unknown as {
        id: string;
        kind: string;
        outletId: string;
      }[]
    ).filter(
      (story) =>
        story.kind === "president.address" &&
        nationalOutlets.has(story.outletId),
    );
  let day = makeIsoDate(core.date);
  const end = addDays(day, 40);
  let read: (typeof reads)[number] | undefined;
  while (day < end && !read) {
    day = addDays(day, 1);
    advanceCore(core, day);
    const printed = new Set(addresses().map((story) => story.id));
    read = reads.find(
      (row) => printed.has(row.storyId) && row.readers.length > 0,
    );
  }
  expect(
    addresses().length,
    `${where}: an address printed nationally`,
  ).toBeGreaterThan(0);
  expect(
    read,
    `${where}: a read of an address story naming someone in the player's circle`,
  ).toBeDefined();
  // The read is a record in the log by its id, naming the reader, with the
  // story it came from; it argues no side.
  const record = core.durableLog.get(read!.id);
  expect(record?.kind, `${where}: ${read!.id}`).toBe(NEWS_READ);
  expect(record?.desiredChange, `${where}: no side`).toBeUndefined();
  expect(
    core.logByPerson.get(read!.readers[0]!)?.has(read!.id),
    `${where}: the read is in its reader's record`,
  ).toBe(true);
  process.stdout.write(
    `NATIONAL READ ${where}: ${read!.id} names ${read!.readers.length} readers, first ${core.people.get(read!.readers[0]!)!.givenName} ${core.people.get(read!.readers[0]!)!.familyName}\n`,
  );
}, 60_000);
