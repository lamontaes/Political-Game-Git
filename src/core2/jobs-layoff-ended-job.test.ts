/**
 * A layoff ends the job in the book that holds it. The world is the one
 * that reproduced the stop: the bench world on a fixed seed (named so a
 * regression is found here), twelve sitting officials offered large bribes
 * by the fifteen richest residents, the engines' own reports, trials and
 * sentences after that. Six officials went to prison by March 2025, and on
 * July 1, 2026 the monthly employer review laid off a worker whose job lived
 * only in the counted books while the worker was already a full person; the
 * full-job ending threw "Only a current recorded job can end." Played
 * through September 2026 the year now runs.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { considerBribe } from "./modules/corruption";
import { lawChain } from "./modules/laws";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";

const seed = "ce7a4fce5dcd8334";

describe(`a layoff after officials are imprisoned (seed ${seed})`, () => {
  it("ends a job in the book that holds it, and the year runs past July 2026", () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
    const api = coreAPI(core);
    console.log(
      `jobs-layoff-ended-job: ${lawChain(api).placeName}, seed ${seed}`,
    );
    const terms = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as TermRow[];
    const alive = (id: string) =>
      core.people.get(id)?.alive &&
      core.cashJournal.residualAccountByOwner.has(id);
    const members = [
      ...new Set(
        terms
          .filter(
            (t) => t.status === "serving" && t.personId && alive(t.personId),
          )
          .map((t) => t.personId!),
      ),
    ].slice(0, 12);
    const rich = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.tier !== "husk" &&
          !members.includes(p.id) &&
          alive(p.id),
      )
      .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id))
      .slice(0, 15);
    // The only forced part is the offers; everything after is the engines' own.
    for (const offerer of rich)
      for (const official of members)
        considerBribe(api, {
          offererId: offerer.id,
          officialId: official,
          stakeMinor: 50_000_000,
          subjectId: `favor:${offerer.id}:${official}`,
        });
    const end = "2026-09-01";
    while (core.date < end)
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
    expect(core.date >= end).toBe(true);
  }, 1_800_000);
});
