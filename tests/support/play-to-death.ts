/**
 * Opens a post the way the game does: its holder falls seriously ill through
 * the health engine (`beginSeriousIllness`) and the days are played until the
 * death that illness books. Everything that reads a death (the cause, the
 * public record, the estate, the vacancy, who hears of it) reads this one.
 * The days the course runs come from the holder's age and record
 * (`remainingDaysAfterOnset`), so a test that uses this plays most of a year.
 * Returns the day the holder died and how many days were played.
 */
import { beginSeriousIllness } from "../../src/core2/modules/health";
import { advanceCore } from "../../src/core2/life";
import { advancePlayerV1, resumePlayerV1 } from "../../src/core2/player-v1";
import { setStops, stopKinds } from "../../src/core2/modules/office-day";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { coreAPI } from "../../src/core2/state";
import type { CoreState, PersonId } from "../../src/core2/types";

/** The longest serious episode the health engine books, with a margin. */
const LONGEST_DAYS = 400;

/**
 * The same death, played on the player's own clock (`advancePlayerV1`), the
 * way the game plays a controlled person's days: a held stop (an open post
 * the player names, a vote) holds the clock for the player, and the
 * character makes the player's everyday choices. The player keeps only the
 * `keep` stops on (the office panel's own switch, `setStops`): a stop
 * switched off leaves them away from it, and nothing is cast or signed for
 * them. Returns when the holder has died and the clock has stopped for the
 * player or the day is done.
 */
export function playToDeathAsPlayer(
  core: CoreState,
  personId: string,
  playerId: string,
  keep: readonly string[],
): { readonly diedOn: string; readonly days: number } {
  const api = coreAPI(core);
  const started = core.date;
  setStops(
    api,
    playerId,
    Object.fromEntries(stopKinds().map((k) => [k, keep.includes(k)])),
  );
  // The health engine reads its data on its first day: on the opening day
  // nobody can fall ill yet, so that day is played first.
  if (!beginSeriousIllness(api, personId as PersonId))
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  if (!beginSeriousIllness(api, personId as PersonId))
    throw new Error(
      `${personId} could not fall ill (gone, or no health data).`,
    );
  let diedOn: string | null = null;
  const from = core.date;
  for (let day = 1; day <= LONGEST_DAYS; day++) {
    let packet = advancePlayerV1(core, {
      controlledPersonId: playerId,
      through: { date: addDays(makeIsoDate(from), day + 1), minuteOfDay: 0 },
    });
    for (let answers = 0; packet.kind !== "complete"; answers++) {
      if (!diedOn && !core.people.get(personId as PersonId)?.alive)
        diedOn = core.date;
      if (diedOn && packet.kind === "stop") break;
      if (answers > 1_000) throw new Error("The player's day never ended.");
      const next: ReturnType<typeof resumePlayerV1> =
        packet.kind === "stop"
          ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
          : resumePlayerV1(core, {
              kind: "own-choice",
              pauseId: packet.pauseId,
            });
      if (next === packet) {
        // A held stop: the clock waits for the player.
        if (!diedOn)
          throw new Error(
            `The player's clock held on ${core.date} before the death: ${JSON.stringify(packet.kind === "stop" ? packet.stop : packet.kind)}`,
          );
        break;
      }
      packet = next;
    }
    if (!diedOn && !core.people.get(personId as PersonId)?.alive)
      diedOn = core.date;
    if (diedOn) return { diedOn, days: day };
  }
  throw new Error(
    `${personId} was still alive ${LONGEST_DAYS} days after falling ill on ${started}.`,
  );
}
