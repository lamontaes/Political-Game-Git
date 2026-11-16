/**
 * Rivals stay apart (views from life, popularity in voters' views): a voter's
 * view carries how popular a question is across the country, and a
 * candidate's platform does not (`ownOpeningStance` in
 * `src/core2/modules/views.ts`, read by `StanceReader` in
 * `src/core2/campaign-stances.ts`). When a platform carried it too, every
 * candidate in a race moved to the popular side together: at Marshfield MA
 * the township board seat 0 race had no pair of rivals on opposite sides of
 * more than 5 of 29 questions, and every voter's reason to give doubled.
 *
 * Pinned: Marshfield MA, world seed 75d9b7ad, the race on Oct 1, 2025. The
 * world opens on the game's start date because the moderate in this race files
 * on a cause formed at a Feb 3 board meeting; a world opened later has no cause
 * lived before its start and fields only the two liberals (pool item
 * opening-world-holds-causes-lived-before-its-start, which moves this test to
 * a late opening once that is built). The case ends on Oct 1: the candidates
 * file on Aug 1 with three questions each and share none until their campaigns
 * start saying more in late September; on Oct 1 two of them are opposed on 9 of
 * 12 shared questions, and with the country's view in platforms the most was
 * 2 of 12. Building the world takes about 18 seconds and playing Jan 20 to
 * Sep 15 about 80 (the year's days, not this race); Sep 15 to Oct 1 adds 8.
 * The test sets its own timeout near twice its 100 seconds.
 */
import { afterAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const MARSHFIELD = {
  name: "Marshfield, Massachusetts",
  key: "2538820",
  seed: "75d9b7ad36560f47b03a252ae33001b88ec529e8f4871fa480acf053c7642a78",
};
const RACE = "contest:seat:gus2025:208271:board:0:2025-11-04";
const where = `${MARSHFIELD.name} (${MARSHFIELD.key}), seed ${MARSHFIELD.seed}, ${RACE}`;

const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

interface PlatformRow {
  readonly contestId: string;
  readonly candidateId: string;
  readonly platform: readonly { question: string; position: number }[];
}

describe("rival candidates keep their own platforms", () => {
  it("a pair of rivals stands on opposite sides of more than half the questions they share", () => {
    const { core } = buildBenchWorld(MARSHFIELD.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: MARSHFIELD.key,
    });
    advanceCore(core as CoreState, makeIsoDate("2025-10-01"));
    const api = coreAPI(core as CoreState);
    const rivals = (
      api
        .moduleState("core2-campaigns-v1")
        .table("campaigns")
        .rows() as unknown as PlatformRow[]
    ).filter((row) => row.contestId === RACE);
    expect(rivals.length, where).toBeGreaterThanOrEqual(2);
    const pairs: string[] = [];
    let apart = false;
    for (let i = 0; i < rivals.length; i += 1)
      for (let j = i + 1; j < rivals.length; j += 1) {
        const mine = new Map(
          rivals[i]!.platform.map((s) => [s.question, s.position]),
        );
        let shared = 0;
        let opposite = 0;
        for (const s of rivals[j]!.platform) {
          const position = mine.get(s.question);
          if (position === undefined) continue;
          shared += 1;
          if (position * s.position < 0) opposite += 1;
        }
        pairs.push(
          `${rivals[i]!.candidateId} and ${rivals[j]!.candidateId}: ${opposite} of ${shared}`,
        );
        if (shared > 0 && opposite > shared / 2) apart = true;
      }
    expect(apart, `${where}: ${pairs.join("; ")}`).toBe(true);
  }, 200_000);
});
