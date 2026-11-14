import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { PLATFORM_QUESTIONS } from "./campaign-data";
import { stanceReader } from "./campaign-stances";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  checkEligibility,
  fileCandidacy,
  playerContests,
  type FilingRow,
} from "./modules/elections";
import { platformAnswers, standsOnRecord } from "./modules/press";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

// A sitting offers the candidate what they hold on a question the filed
// platform does not take up: their own view, votes and party, never nothing
// where the record holds a stand and never a stand where it holds none.
// Pinned to two drawn places (fixed seed and tags, never a draw to hope for).
const PINNED = ["stands-on-record-a", "stands-on-record-b"];
const SEED = "c1-stands-on-record";
const WEEKS = 52;
const round = (x: number) => Math.round(x * 1000) / 1000;

it.each(PINNED)(
  "a question outside the filed platform reads the player's own stand (%s)",
  (tag) => {
    setBookkeeping(false);
    const place = drawPlace(SEED, tag);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const playerId = core.playerId as PersonId;
    const open = () =>
      playerContests(api).find(
        (row) =>
          row.level !== "federal" &&
          row.level !== "state" &&
          checkEligibility(api, playerId, row.id).every((check) => check.met),
      );
    let contest = open();
    for (let week = 0; week < WEEKS && !contest; week += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      contest = open();
    }
    expect(
      contest,
      `${where}: no local race the player may file for`,
    ).toBeTruthy();
    // Filed with no stated platform at all, as the sitting finds a filing
    // whose platform holds nothing on the question asked.
    const filed = (
      fileCandidacy(api, {
        personId: playerId,
        contestId: contest!.id,
        platform: [],
        party: null,
      }) as { filing?: FilingRow }
    ).filing!;
    const questions = [...PLATFORM_QUESTIONS];
    // The filed platform says nothing on any of them.
    for (const answer of platformAnswers(api, filed.id, questions))
      expect(answer.position, where).toBeNull();
    const stands = standsOnRecord(api, filed.id, questions);
    const reader = stanceReader(api, playerId, filed.party ?? null);
    let held = 0;
    for (const answer of stands) {
      const grounds = reader.grounds(answer.question);
      const label = `${where}: ${answer.question}`;
      if (grounds === "vote" || grounds === "view") {
        // Their own stand, from their vote or their view.
        expect(answer.source, label).toBe(grounds);
        expect(answer.position, label).toBe(
          round(reader.stance(answer.question)!),
        );
        held += 1;
      } else {
        // Nothing of their own (a party's position alone is not theirs).
        expect(answer.source, label).toBeNull();
        expect(answer.position, label).toBeNull();
      }
    }
    expect(
      held,
      `${where}: the player holds a stand on some question`,
    ).toBeGreaterThan(0);
  },
  600_000,
);
