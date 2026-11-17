/**
 * A played player who really borrows and then misses a payment, through the
 * game's own days (promises.test.ts, apology-variants.test.ts). The credit
 * engine lends only to a household's oldest member whose cash is below a
 * month of costs, so a fresh 18-year-old living at home never borrows; the
 * New game creator's birthday (buildBenchWorld's playerBirthDate) picks a
 * player who heads a home with a grown housemate. `BANK_BORROWER` is the
 * named case, found by a script outside the test that played draws of all 56
 * places (one hour, Nov 15): Ragland, Alabama, born 1995, whose player takes
 * a bank personal loan on Jul 1, 2025 and misses on Aug 1. The case before it
 * (Cherry Hill, Virginia, born 1985: a payday loan of $317 on Apr 1, missed
 * Jul 1) hung on the town's payday store having cash, which counted
 * households drain in the first month since #9117 (pool item
 * world-counted-households-flood-lenders-month-one); a bank loan does not.
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
/** Days the player's clock may run before the first missed payment: the loan is written at a month's close and billed monthly. */
const QUARREL_DAYS = 200;
/** The creator birthdays a draw is played with: a player who heads a home with a grown housemate, then an older one. */
export const BORROWER_BIRTHS: readonly string[] = ["1995-03-01", "1985-03-01"];
/** How many places a search draws before it is a true red. */
export const BORROWER_DRAWS = 4;

/** A borrower found by drawing: the played world at its first money quarrel over a missed payment. */
export interface FoundBorrower {
  readonly core: CoreState;
  readonly director: ReturnType<typeof buildBenchWorld>["director"];
  readonly playerId: PersonId;
  readonly where: string;
  readonly quarrel: NonNullable<ReturnType<typeof playToQuarrel>>;
  /** The draws played with no borrower, one line each. */
  readonly passedOver: readonly string[];
}

/**
 * Draws places on `LOAN_SEED` and plays each with each birthday until a
 * household really borrows and misses a payment (CTO, Nov 17, on #10009:
 * "take the pin out ... searches drawn places for any household that
 * actually borrowed ... never passes on a draw with no borrower, and it
 * prints how many places it drew"). Returns the first found, or undefined
 * with every draw named: then the red is the world's (pool items
 * credit-young-adult-at-home-never-borrows and
 * world-loan-bill-before-first-payday-no-borrower-keeps).
 */
export function findBorrower(
  draws: number = BORROWER_DRAWS,
  births: readonly string[] = BORROWER_BIRTHS,
): FoundBorrower | { readonly passedOver: readonly string[] } {
  const passedOver: string[] = [];
  for (let draw = 0; draw < draws; draw += 1)
    for (const birth of births) {
      const { core, director, playerId, where } = borrowerWorld(draw, birth);
      const id = playerId as PersonId;
      director.watch(core, id);
      const quarrel = playToQuarrel(core, id);
      if (quarrel)
        return { core, director, playerId: id, where, quarrel, passedOver };
      passedOver.push(`${where}: no missed payment by ${core.date}`);
    }
  return { passedOver };
}

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
export function play(core: CoreState, playerId: PersonId, days: number) {
  let packet: ReturnType<typeof advancePlayerV1> | undefined = advancePlayerV1(
    core,
    {
      controlledPersonId: playerId,
      through: { date: addDays(makeIsoDate(core.date), days), minuteOfDay: 0 },
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
