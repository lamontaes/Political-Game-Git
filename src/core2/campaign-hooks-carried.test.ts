import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ballot,
  checkEligibility,
  ELECTIONS_MODULE_ID,
  openContests,
  type ContestRow,
} from "./modules/elections";
import { coreAPI } from "./state";
import type { PersonId } from "./types";
import { buildBenchWorld } from "../bench/world";

/**
 * What the voting module hands the engines that cannot import it, shown by the
 * effect each one has in a world drawn at random (Elections item 7; the 1-year
 * records proof of the Parma, Idaho world does not notice either of these two,
 * so they are proved here, and each fails when its field is taken off the
 * module):
 *
 * - `closedContestWeighed`: a race whose filing closed before the record began
 *   has its field finished at the opening (its stand-in nominees file), so its
 *   ballot is never empty.
 * - `wardResidency`: a seat chosen by part of a town asks its candidate to live
 *   in that part, a "district-residency" check the clerk reads.
 *
 * Each place passed over is printed with why; the test fails by name when no
 * place had the case.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const PLACES = 8;
const WEEKS = 52;

describe("the voting module's hooks reach the engines that read them", () => {
  it(`a race closed before the record began has its field finished at the opening (seed ${seed})`, () => {
    setBookkeeping(false);
    const passedOver: string[] = [];
    for (let attempt = 0; attempt < PLACES; attempt += 1) {
      const place = drawPlace(seed, `hooks-closed:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const closed = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      ).filter(
        (c) => c.filingDeadline < core.date && c.electionDate > core.date,
      );
      if (!closed.length) {
        passedOver.push(
          `${where}: no race closed at the opening (${core.date})`,
        );
        continue;
      }
      // Candidacy weighs the closed races on the first day.
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const empty = closed.filter((c) => ballot(api, c.id).length === 0);
      expect(
        empty.map((c) => c.id),
        `${where}: closed races with an empty ballot`,
      ).toEqual([]);
      process.stdout.write(
        `hooks-closed: ${where}, ${closed.length} closed races, each with a field; passed over: ${passedOver.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a race closed at the opening in ${PLACES} draws: ${passedOver.join("; ")}`,
    );
  }, 1_800_000);

  it(`a ward seat asks its candidate to live in that ward (seed ${seed})`, () => {
    setBookkeeping(false);
    const passedOver: string[] = [];
    for (let attempt = 0; attempt < PLACES; attempt += 1) {
      const place = drawPlace(seed, `hooks-ward:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const me = playerId as PersonId;
      const wardCheck = () => {
        for (const contest of openContests(api)) {
          const check = checkEligibility(api, me, contest.id).find(
            (c) => c.rule === "district-residency",
          );
          if (check) return { contest, check };
        }
        return null;
      };
      let found = wardCheck();
      for (let week = 0; week < WEEKS && !found; week += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 7));
        found = wardCheck();
      }
      if (!found) {
        passedOver.push(
          `${where}: no ward seat open for filing by ${core.date}`,
        );
        continue;
      }
      const { contest, check } = found;
      expect(check.required, `${where}: ${contest.id}`).toMatch(/^\d+$/);
      expect(check.actual, `${where}: ${contest.id}`).toMatch(/^\d+$/);
      expect(check.met, `${where}: ${contest.id}`).toBe(
        check.required === check.actual,
      );
      process.stdout.write(
        `hooks-ward: ${where}, ${contest.id}: lives in ward ${check.actual}, seat is ward ${check.required}; passed over: ${passedOver.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a ward seat open in ${PLACES} draws: ${passedOver.join("; ")}`,
    );
  }, 3_600_000);
});
