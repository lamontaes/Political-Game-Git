/**
 * A world race's winner is seated on a day the calendar has not run yet.
 * The count seats the winner on the term's first day; where a seat's holder
 * on record serves only to the election day itself, that day has come by
 * the count's own day, and the count must seat the winner the morning after
 * instead of on a day already run. Before the fix the count stopped the year
 * ("Institutional work must be placed on an unprocessed future date";
 * office-day-member-filings.test.ts with seed pet-run-1).
 *
 * Named edge case: the holder's end date is set by hand to the election day,
 * since an opening world's terms end later; in play a special election's
 * winner, who serves what was left of the term, can carry such a date.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { novemberGeneralElectionDay } from "./gov-rules/town-election-calendar";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./modules/offices";
import { racesOf, worldRacesOpen } from "./modules/voting";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;

it(`a world race's winner whose term begins on the count's own day is seated the morning after, from seed ${seed}`, () => {
  const misses: string[] = [];
  for (let n = 0; n < DRAWS; n += 1) {
    const place = drawPlace(`${seed}:${n}`, "seat-winner-day");
    const where = `${place.name}, ${place.state} (${place.key}), seed ${seed}:${n}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    if (!worldRacesOpen(api)) {
      misses.push(`${where}: world races not open`);
      continue;
    }
    const offices = api.moduleState(OFFICES_MODULE_ID);
    const inTown = new Set(townSeats(api).map((entry) => entry.seat.id));
    // The legislative seat outside the town whose general election comes first.
    const target = (
      offices.table("seats").rows() as unknown as {
        id: string;
        officeId: string;
        coversTown: boolean;
        electionYear?: number;
      }[]
    )
      .filter((seat) => {
        const office = offices
          .table("offices")
          .get(seat.officeId) as unknown as
          { kind: string; elected: boolean } | undefined;
        return (
          office?.elected &&
          office.kind.startsWith("legislature-") &&
          !seat.coversTown &&
          !inTown.has(seat.id) &&
          seat.electionYear &&
          novemberGeneralElectionDay(seat.electionYear) > core.date
        );
      })
      .flatMap((seat) => {
        const holder = (
          offices
            .table("terms")
            .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[]
        )[0];
        return holder
          ? [
              {
                seat,
                holder,
                day: novemberGeneralElectionDay(seat.electionYear!),
              },
            ]
          : [];
      })
      .sort((a, b) => a.day.localeCompare(b.day))[0];
    if (!target) {
      misses.push(`${where}: no held legislative seat outside the town`);
      continue;
    }
    offices.table("terms").put({
      ...target.holder,
      endDate: target.day,
    } as never);
    advanceCore(core, addDays(makeIsoDate(target.day), 2));
    const race = racesOf(api).find(
      (row) => row.seatId === target.seat.id && row.date === target.day,
    );
    expect(race, `${where}: the seat's race was counted`).toBeDefined();
    expect(race!.seatedOn, where).toBe(target.day);
    const seated = (
      offices
        .table("terms")
        .query("bySeatStatus", [
          target.seat.id,
          "serving",
        ]) as unknown as TermRow[]
    )[0];
    expect(seated?.reached, `${where}: the winner serves`).toBe(
      `elected ${target.day}`,
    );
    expect(seated?.startDate, where).toBe(addDays(makeIsoDate(target.day), 1));
    process.stdout.write(
      `SEATED ${where}: ${race!.id}, winner ${race!.winnerParty}, term ${seated!.id} from ${seated!.startDate}\n`,
    );
    return;
  }
  expect.fail(`no draw held the case in ${DRAWS}: ${misses.join("; ")}`);
}, 3_600_000);
