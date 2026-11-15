/**
 * A played player who really borrows and then misses a payment, through the
 * game's own days (promises.test.ts, apology-variants.test.ts). The credit
 * engine lends only to a household's oldest member whose cash is below a
 * month of costs, so a fresh 18-year-old living at home never borrows; the
 * New game creator's birthday (buildBenchWorld's playerBirthDate) picks a
 * player who heads a home with a grown housemate. `PAYDAY_BORROWER` is the
 * named case, found by playing draws of all 56 places: Cherry Hill, Virginia,
 * whose player takes a payday loan on Apr 1, 2025 and misses on Jul 1.
 */
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  leaveMeeting,
  meetingInProgress,
} from "../../src/core2/modules/office-day";
import { advancePlayerV1, resumePlayerV1 } from "../../src/core2/player-v1";
import { coreAPI } from "../../src/core2/state";
import type { CoreState, PersonId } from "../../src/core2/types";

export const LOAN_SEED = "promises-real-loan-1";
/** The player who takes a payday loan and misses its payment (draw and birthday on `LOAN_SEED`). */
export const PAYDAY_BORROWER = { draw: 2, birth: "1985-03-01" } as const;
/** Days the player's clock may run before the first missed payment: the loan is written at a month's close and billed monthly. */
const QUARREL_DAYS = 200;

export function borrowerWorld(draw: number, birth: string) {
  const place = drawPlace(LOAN_SEED, `loan:${draw}`);
  const where = `${place.name} (${place.key}), seed ${LOAN_SEED} draw loan:${draw}, born ${birth}, world seed ${place.seed}`;
  const built = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
    playerBirthDate: birth,
  });
  return { ...built, where };
}

/** Plays the player's days with the clock, taking the first choice at each pause (meeting-scene.test.ts). */
export function play(
  core: CoreState,
  playerId: PersonId,
  days: number,
  /** Stop partway into the last day (the player still inside it); midnight by default. */
  minuteOfDay = 0,
) {
  let packet: ReturnType<typeof advancePlayerV1> | undefined = advancePlayerV1(
    core,
    {
      controlledPersonId: playerId,
      through: { date: addDays(makeIsoDate(core.date), days), minuteOfDay },
    },
  );
  while (packet && packet.kind !== "complete") {
    // A resident held at a meeting they marked sits through its public
    // comment and leaves (office-day's own act, which records that they came).
    const meeting =
      packet.kind === "stop" ? meetingInProgress(coreAPI(core)) : undefined;
    if (meeting?.audience === playerId) leaveMeeting(coreAPI(core), meeting.id);
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

/** Plays the player's days until the credit engine's missed payment starts a money quarrel the player owes; its record. */
export function playToQuarrel(
  core: CoreState,
  id: PersonId,
  days: number = QUARREL_DAYS,
) {
  const found: string[] = [];
  coreAPI(core).subscribeEvents(
    "promises-quarrel",
    ["family.quarrel"],
    (_, event) => {
      if (event.facts?.owes === id) found.push(event.id);
    },
  );
  const until = addDays(makeIsoDate(core.date), days);
  while (!found.length && core.date < until) play(core, id, 15);
  return found[0] ? core.durableLog.get(found[0]) : undefined;
}
