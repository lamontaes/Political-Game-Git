/**
 * Papers endorse (owner, Oct 16: "if it happens in real life, sure"; an
 * outlet's endorsement follows its own leanings and the record, no dice).
 * An outlet of a kind that endorses (src/core2/data/press/endorsements.json)
 * weighs the races on its beat by the one endorsement rule (`outletWeighsRace` in
 * src/core2/modules/campaigns.ts): its head backs the candidate they agree
 * with above every rival, under the outlet's own name. Its followers hear it
 * (their impressions of the candidate, which the voting engine reads), and
 * the paper prints the news of it in its own pages in its next press week.
 *
 * Pinned: Marshfield, Massachusetts, world seed 75d9b7ad, the township board
 * races of Nov 4, 2025. The papers weigh them in the first press week the
 * races are on their beat (Sep 29) and print them in the press week after
 * (Oct 6); playing Jan 20 to Oct 8 is the game's own days, about 135
 * seconds, so the test sets its own limit near twice that.
 */
import { afterAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CAMPAIGNS_MODULE_ID } from "./modules/campaigns";
import { followersOf, PRESS_MODULE_ID, type OutletRow } from "./modules/press";
import { coreAPI } from "./state";
import type { CoreState } from "./types";
import endorsing from "./data/press/endorsements.json" with { type: "json" };

const MARSHFIELD = {
  name: "Marshfield, Massachusetts",
  key: "2538820",
  seed: "75d9b7ad36560f47b03a252ae33001b88ec529e8f4871fa480acf053c7642a78",
};
const where = `${MARSHFIELD.name} (${MARSHFIELD.key}), seed ${MARSHFIELD.seed}`;

const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

interface EndorsementRow {
  readonly id: string;
  readonly filingId: string;
  readonly candidateId: string;
  readonly speakerId: string;
  readonly organizationId: string | null;
  readonly answer: "yes" | "no";
  readonly reached: number;
}

describe("an outlet endorses in a race on its beat", () => {
  it("a paper's head backs one candidate under the paper's name and its followers hear it", () => {
    const { core } = buildBenchWorld(MARSHFIELD.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: MARSHFIELD.key,
    });
    advanceCore(core as CoreState, makeIsoDate("2025-10-01"));
    const api = coreAPI(core as CoreState);
    const outlets = api
      .moduleState(PRESS_MODULE_ID)
      .table("outlets")
      .rows() as unknown as OutletRow[];
    const byOrganization = new Map(outlets.map((o) => [o.organizationId, o]));
    const endorsed = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("endorsements")
        .rows() as unknown as EndorsementRow[]
    ).filter(
      (row) =>
        row.answer === "yes" &&
        row.organizationId !== null &&
        byOrganization.has(row.organizationId),
    );
    expect(endorsed.length, where).toBeGreaterThan(0);
    // Only the kinds that endorse in real life do, each by its own head.
    for (const row of endorsed) {
      const outlet = byOrganization.get(row.organizationId!)!;
      expect(endorsing.kinds, `${where}: ${row.id}`).toContain(outlet.kind);
      expect(row.speakerId, `${where}: ${row.id}`).toBe(outlet.headId);
    }
    // One candidate per outlet and race.
    const once = new Set(
      endorsed.map(
        (row) => `${row.organizationId}|${row.filingId.split(":person")[0]}`,
      ),
    );
    expect(once.size, where).toBe(endorsed.length);
    // Its followers heard it from the paper's head: their impressions of the
    // candidate it backed, which the voting engine reads (a cause is kept
    // whole only for the player's circle; everyone else's folds into the
    // impression, campaigns.ts `reach`).
    const heard = endorsed.find((row) => row.reached > 0);
    expect(heard, where).toBeDefined();
    const outlet = byOrganization.get(heard!.organizationId!)!;
    const impressions = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("impressions");
    const told = followersOf(api, outlet.id).filter(
      (id) =>
        id !== outlet.headId &&
        impressions.get(`${id}|${heard!.candidateId}`) !== undefined,
    );
    expect(told.length, `${where}: ${heard!.id}`).toBeGreaterThanOrEqual(
      heard!.reached,
    );
    // Each paper prints its own endorsement in its own pages in its next
    // press week, under its head's name, whatever other endorsements of the
    // race that week held.
    advanceCore(core as CoreState, makeIsoDate("2025-10-08"));
    const stories = api.moduleState(PRESS_MODULE_ID).table("stories");
    for (const row of endorsed) {
      const paper = byOrganization.get(row.organizationId!)!;
      const printed = stories.get(
        `printed:${paper.id}:campaign-endorsed:${row.id}`,
      ) as { readonly reporterId: string } | undefined;
      expect(printed, `${where}: ${row.id} in ${paper.id}`).toBeDefined();
      expect(printed!.reporterId, `${where}: ${row.id}`).toBe(row.speakerId);
    }
    console.log(
      `${where}: ${endorsed.length} outlet endorsements, ${heard!.id} reached ${heard!.reached}, ${told.length} followers hold an impression; every one printed by its own paper`,
    );
  }, 200_000);
});
