/**
 * A relative's letter does not come back with the same ask and nothing
 * changed (pool item director-cap-on-scene-repeats). In the played world of a
 * place drawn from all 56, a relative living elsewhere writes to the player
 * twice, a month apart, through the record kin-contact writes
 * (`family.contact`): the first letter is staged as a scene; the second, with
 * no news of the writer's life on record since, a birthday missed or near,
 * goes to the journal. The place and seed are in every message; replay with
 * LETTER_SEED.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { FAMILY_CONTACT, livesElsewhere } from "../core2/modules/people";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { letterFacts, LETTER_TYPE } from "./letter-facts";

setBookkeeping(false);

const seed = process.env.LETTER_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "letter-repeat");
const where = `${place.name} (${place.key}), seed ${seed}`;

/** One day on the player's own clock, as the scene tool plays it. */
function playDay(core: CoreState, playerId: PersonId): void {
  let packet = advancePlayerV1(core, {
    controlledPersonId: playerId,
    through: { date: addDays(makeIsoDate(core.date), 1), minuteOfDay: 1439 },
  });
  while (packet.kind !== "complete")
    packet = resumePlayerV1(core, {
      kind: packet.kind === "choice" ? "own-choice" : "stop",
      pauseId: packet.pauseId,
    });
}

/** The writer's letter to the reader today, as kin-contact writes it. */
function writeLetter(core: CoreState, readerId: PersonId, writerId: PersonId) {
  const id = `${FAMILY_CONTACT}:${readerId}:${writerId}:${core.date}`;
  coreAPI(core).emit({
    id,
    date: core.date,
    kind: FAMILY_CONTACT,
    personIds: [readerId, writerId],
    placeId: core.people.get(readerId)!.placeId,
    publicRecord: false,
    source: {
      tag: "ESTIMATED",
      asOf: core.date,
      citation: "A test letter in the kin-contact record's shape.",
      estimatedFrom: "The test's two letters a month apart.",
    },
    facts: { how: "letter", writerId, closeness: "1" },
  });
  return id;
}

describe(`a relative's letter with nothing changed (${where})`, () => {
  it("stages the first letter and sends the same ask a month later to the journal", () => {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const playerId = world.playerId! as PersonId;
    const player = core.people.get(playerId)!;
    for (const id of core.households.get(player.householdId)?.memberIds ?? [])
      if (core.people.get(id)?.alive) director.watch(core, id);
    const writer = [...player.familyIds]
      .map((id) => core.people.get(id))
      .find((row) => row && livesElsewhere(core, row));
    expect(writer, `${where}: no relative lives elsewhere`).toBeDefined();
    const writerId = writer!.id;
    const outcomeOf = (causeId: string) =>
      director.ledger.people
        .get(playerId)
        ?.schedule.find(
          (entry) =>
            director.ledger.people
              .get(playerId)
              ?.momentsById.get(entry.momentId)?.causeId === causeId,
        );
    playDay(core, playerId);
    const first = writeLetter(core, playerId, writerId);
    playDay(core, playerId);
    const staged = outcomeOf(first);
    expect(
      staged,
      `${where}: the first letter ${first} was not scheduled`,
    ).toBeDefined();
    expect(
      staged!.bindings.some((row) => row.typeKey === LETTER_TYPE) &&
        staged!.outcome !== "journal-line",
      `${where}: the first letter ${first} was not staged (${staged!.outcome})`,
    ).toBe(true);
    for (let day = 0; day < 30; day += 1) playDay(core, playerId);
    const second = writeLetter(core, playerId, writerId);
    // Nothing on record since: the letter would say nothing new.
    expect(
      Object.keys(
        letterFacts(core, LETTER_TYPE, second, writerId, playerId, () => null),
      ),
      `${where}: the writer has news on record since, so a second letter may play`,
    ).toEqual([]);
    playDay(core, playerId);
    const again = outcomeOf(second);
    expect(
      !again ||
        again.outcome === "journal-line" ||
        !again.bindings.some((row) => row.typeKey === LETTER_TYPE),
      `${where}: ${second} staged the same letter again with nothing changed since ${first}`,
    ).toBe(true);
    // Held back with its reason on the schedule, for the journal to tell.
    if (again)
      expect(again.heldBack, `${where}: ${second}`).toContainEqual({
        typeKey: LETTER_TYPE,
        reason: "nothing-changed",
      });
  }, 600_000);
});
