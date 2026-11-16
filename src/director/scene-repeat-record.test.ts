/**
 * The same speaker's next speech stages its own scene (pool item
 * director-cap-on-scene-repeats). In the played world of Frankfort, Kentucky
 * (2128900), the officials who are full people are watched through the autumn
 * of the first year. One of them hears the same speaker give a speech to the
 * same organization on November 25 and again on December 7, 12 days later,
 * two speech records. The old thirty-day window folded the second into the
 * first; the rule that replaced it reads the cause records, so the second
 * speech, a record the first scene did not have, stages its own afterward.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";

setBookkeeping(false);

const PLACE = "2128900";
const SEED = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9";
const where = `Frankfort, Kentucky (${PLACE}), seed ${SEED}`;
const HEARER = "person_57e066480701d554" as PersonId;
const SPEAKER = "person_5844b0737de24c0e";
const ORG = "organization_76d42b69d6f7d1a0";

it(`a second speech by the same speaker within thirty days stages its own scene (${where})`, () => {
  const { core, director } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  for (const seat of townSeats(coreAPI(core)))
    if (
      seat.holder?.personId &&
      !director.ledger.people.has(seat.holder.personId)
    )
      director.watch(core, seat.holder.personId);
  while (core.date < "2025-12-08")
    advanceCore(core, addDays(makeIsoDate(core.date), 1));

  const book = director.ledger.people.get(HEARER)!;
  const first = `speech:${SPEAKER}:2025-11-25:speech:${ORG}`;
  const second = `speech:${SPEAKER}:2025-12-07:speech:${ORG}`;
  const scenes = book.schedule
    .filter(
      (entry) =>
        entry.outcome !== "journal-line" &&
        entry.bindings.some((b) => b.typeKey === "speech-afterward"),
    )
    .map((entry) => ({
      entry,
      cause: book.momentsById.get(entry.momentId)!.causeId,
    }));
  const one = scenes.find((s) => s.cause === first);
  const two = scenes.find((s) => s.cause === second);
  expect(one, `${where}: scene for ${first}`).toBeDefined();
  expect(two, `${where}: scene for ${second}`).toBeDefined();
  expect(
    (two!.entry.heldBack ?? []).filter((h) => h.typeKey === "speech-afterward"),
  ).toEqual([]);
}, 400_000);
