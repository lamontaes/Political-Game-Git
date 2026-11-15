/**
 * A counted ballot reads what the voter's group has heard or lived (its row
 * in countedStances, through the voter's stance profile), once for each
 * question the field's platforms take a side on, and keeps it, so the
 * ballot's reasons read exactly what the vote read. A row kept before the
 * column existed reads without the term, so nothing is counted twice.
 *
 * Pinned: Ocean Springs, Mississippi, drawn with seed h1 for "nan-hunt" (the
 * place counted-ballots-json pins), played from Jan 20, 2025 to the day
 * after its first election with counted ballots: the game's own days, since
 * a kept counted ballot exists only after a count. About 200 seconds on a
 * 4-core container; the limit is near twice that.
 */
import { afterAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { groupAgreement, type StanceProfile } from "./campaign-views";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import {
  countedBallotAt,
  VOTING_MODULE_ID,
  type CountedBallotsRow,
} from "./modules/voting";
import { coreAPI } from "./state";

const place = drawPlace("h1", "nan-hunt");
const where = `${place.name} (${place.key}), seed ${place.seed}`;

const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

const PARTS = [
  "party",
  "standing",
  "incumbent",
  "ballot",
  "scandal",
  "pledge",
  "warmth",
  "endorsed",
] as const;

describe("a counted ballot reads its group's heard stance once and keeps it", () => {
  it("moves the platform part of the appeal by the kept term, and a row kept before the column reads without it", () => {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const first = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as { electionDate: string }[]
    )
      .map((row) => row.electionDate)
      .filter((date) => date > core.date)
      .sort()[0]!;
    expect(first, where).toBeTruthy();
    advanceCore(core, addDays(makeIsoDate(first), 1));
    const rows = api
      .moduleState(VOTING_MODULE_ID)
      .table("countedBallots")
      .rows() as unknown as CountedBallotsRow[];
    expect(
      rows.length,
      `${where}: counted ballots on ${first}`,
    ).toBeGreaterThan(0);
    let moved = 0,
      still = 0;
    for (const row of rows) {
      expect(
        row.heard,
        `${where}: ${row.id} keeps the heard column`,
      ).toBeDefined();
      // The same row as one kept before the column existed.
      const older: CountedBallotsRow = { ...row, heard: undefined };
      for (const [i, heard] of row.heard!.entries()) {
        const now = countedBallotAt(row, i).appeal;
        const then = countedBallotAt(older, i).appeal;
        if (!heard) {
          // Nothing moved this voter: both read the same.
          expect(now, `${where}: ${row.voterIds[i]}`).toEqual(then);
          still += 1;
          continue;
        }
        const base: StanceProfile = {
          ...(Number.isFinite(row.faith?.[i])
            ? { faithFromAverage: row.faith![i]! }
            : {}),
          ...(Number.isFinite(row.college?.[i])
            ? { collegeFromAverage: row.college![i]! }
            : {}),
        };
        const withHeard: StanceProfile = {
          ...base,
          heard: (question) => heard[question] ?? 0,
        };
        for (const entry of row.field) {
          const a = now[entry.id]!;
          const b = then[entry.id]!;
          // Every part but the platform's is the same either way.
          for (const part of PARTS)
            expect(a[part], `${where}: ${row.voterIds[i]} ${part}`).toBe(
              b[part],
            );
          // The platform part moves by the kept term, counted once.
          const shift =
            groupAgreement(row.lean[i]!, entry.platform, withHeard) -
            groupAgreement(row.lean[i]!, entry.platform, base);
          expect(
            a.recognition - b.recognition,
            `${where}: ${row.voterIds[i]} on ${entry.id}`,
          ).toBeCloseTo(entry.recognition * shift, 12);
          if (entry.recognition * shift !== 0) moved += 1;
        }
      }
    }
    expect(moved, `${where}: ballots the heard term moved`).toBeGreaterThan(0);
    process.stdout.write(
      `COUNTED HEARD ${where}: election ${first}, ${rows.length} rows, ${moved} voter-candidate appeals moved, ${still} voters unmoved\n`,
    );
  }, 420_000);
});
