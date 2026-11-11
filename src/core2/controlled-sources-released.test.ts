/**
 * A controlled person's payroll and cash-act sources are released once the next
 * one posts (pool item core-long-run-controlled-sources-required-forever). In a
 * drawn place (replay with CONTROLLED_SOURCES_SEED) a working adult of the town
 * is played on the player clock for 120 days, and the cash journal's
 * required-by-source table is read at day 60 and at day 120: it must stop
 * growing, so there is at most one required receipt per commitment rather than
 * one per payday. The place and seed are in every message; the test draws more
 * places, up to a bound, until it finds a worker.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advancePlayerV1, resumePlayerV1 } from "./player-v1";
import type { CoreState, PersonId } from "./types";

const base =
  process.env.CONTROLLED_SOURCES_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const HALF = 60;

/** How many sources the cash journal still requires, across every kind. */
const requiredCount = (core: CoreState) => {
  let n = 0;
  for (const byId of core.cashJournal.requiredBySource.values()) n += byId.size;
  return n;
};

/** The player's clock, lived to `days` after the start, answering what it asks. */
function liveTo(core: CoreState, personId: PersonId, days: number) {
  let packet = advancePlayerV1(core, {
    controlledPersonId: personId,
    through: {
      date: addDays(makeIsoDate(gameStartDate()), days),
      minuteOfDay: 0,
    },
  });
  while (packet.kind !== "complete") {
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, {
            kind: "choice",
            pauseId: packet.pauseId,
            offerId: packet.offers[0]!.offerId,
          });
  }
}

it(`a controlled worker's required sources stop growing with each payday (seed ${base})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const seed = createHash("sha256")
      .update(`${base}:${attempt}`)
      .digest("hex");
    const place = drawPlace(seed, "controlled-sources");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const was = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core } = world;
      const town = core.people.get(world.playerId as PersonId)!.placeId;
      // A working adult of the town: a full person with a work commitment today.
      const worker = [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            p.tier !== "husk" &&
            p.placeId === town &&
            (core.work.commitmentsByPerson.get(p.id)?.size ?? 0) > 0,
        )
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      if (!worker) {
        tried.push(`${where}: no worker`);
        continue;
      }
      const personId = worker.id as PersonId;
      const commitments = core.work.commitmentsByPerson.get(personId)!.size;
      liveTo(core, personId, HALF);
      const half = requiredCount(core);
      liveTo(core, personId, 2 * HALF);
      const full = requiredCount(core);
      // Two months of paydays (about four biweekly) would add at least that many
      // rows if each stayed required; a released source adds none.
      expect(
        full - half,
        `${where}: ${personId} (${commitments} commitments): required sources at day ${HALF} ${half}, at day ${2 * HALF} ${full}`,
      ).toBeLessThanOrEqual(commitments);
      console.log(
        `controlled-sources: ${where}; ${personId}, ${commitments} commitments, required sources ${half} at day ${HALF} and ${full} at day ${2 * HALF}`,
      );
      return;
    } finally {
      setBookkeeping(was);
    }
  }
  throw new Error(
    `no drawn place had a controlled worker: ${tried.join("; ")} (seed ${base})`,
  );
}, 3_600_000);
