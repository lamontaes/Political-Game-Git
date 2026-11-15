import { expect, it } from "vitest";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { familyFactsOf } from "../core2/closeness";
import { advanceCore } from "../core2/life";
import { openContests } from "../core2/modules/elections";
import { lawChain } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";

// The scenes of a filing and a race are the candidate's own: the clerk
// takes their papers, the household talks over their run, they lose their
// race. A housemate's filing reaches the player through their tie, and it
// staged the player's filing scenes as if the player had filed (Tutu, U.S.
// Virgin Islands, Oct 27: a second filing scene, and both a win and a loss
// on election night). Each such scene stands on a record that names the
// person it is staged for.
// Pinned to named places and fixed seeds (skill `pinned-tests`). The first
// version of this test drew twelve places per run and filed on the game's
// start date; no filing window is open on that date at a drawn place (probe,
// Nov 15: 0 open contests at Plantation, Naples and Alamogordo on the start
// date, 4 open on 2025-08-08 at Alamogordo with 148 eligible pairs among 40
// adults), so it failed "no race a housemate could enter" by its own date.
// A second place was tried and left out: Alamogordo, New Mexico took about
// 200 seconds. Each case here plays to the first day a race is open, then a housemate
// files through the game's own filing (`fileForOffice`).
const OWN = new Set(["filing", "family-filing", "race-won", "race-lost"]);
const PLACES = [
  { key: "3972242", seed: "scan-25", name: "Sherrodsville, Ohio" },
];
const PAIRS = 4;
/** The most days played while waiting for a filing window to open. */
const WAIT_DAYS = 240;

it.each(PLACES)(
  "a housemate's filing is never staged as the player's own ($name)",
  (place) => {
    setBookkeeping(false);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // Play to the first day a race is open for filing.
    for (
      let waited = 0;
      waited < WAIT_DAYS &&
      ![...openContests(api)].some(
        (c) => c.electionDate >= addDays(makeIsoDate(core.date), 60),
      );
      waited += 1
    )
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const town = lawChain(api).townPlaceId;
    const adult = (id: string) => {
      const row = core.people.get(id as PersonId);
      return (
        !!row?.alive &&
        row.placeId === town &&
        ageOnDate(row.birthDate, core.date) >= 25
      );
    };
    // Grown residents who live with another grown resident, one pair to a
    // home: a partner first, then a relative, then anyone else at home.
    const rank = (relation: string | undefined) =>
      relation === "partner" ? 0 : relation ? 1 : 2;
    const homes = new Set<string>();
    const pairs = [...core.people.values()]
      .filter((row) => adult(row.id))
      .sort((a, b) => a.id.localeCompare(b.id))
      .flatMap((row) => {
        const kin = familyFactsOf(row);
        const other = (core.households.get(row.householdId)?.memberIds ?? [])
          .filter((id) => id !== row.id && adult(id))
          .sort(
            (a, b) =>
              rank(kin.get(a)?.relation) - rank(kin.get(b)?.relation) ||
              a.localeCompare(b),
          )[0];
        return other
          ? [
              {
                me: row.id as PersonId,
                them: other,
                home: row.householdId,
                rank: rank(kin.get(other)?.relation),
              },
            ]
          : [];
      })
      .sort((a, b) => a.rank - b.rank || a.me.localeCompare(b.me))
      .filter((pair) => !homes.has(pair.home) && !!homes.add(pair.home))
      .slice(0, PAIRS);
    expect(pairs.length, `${where}: grown residents who share a home`).toBe(
      PAIRS,
    );
    core.playerId = pairs[0]!.me;
    for (const pair of pairs) director.watch(core, pair.me);
    // Each housemate files, through the game's own filing, for the first
    // open race they may enter.
    const races = [...openContests(api)]
      .filter((c) => c.electionDate >= addDays(makeIsoDate(core.date), 60))
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      );
    const filed = pairs.flatMap((pair) => {
      for (const contest of races) {
        try {
          fileForOffice(core, pair.them, contest.id);
        } catch {
          continue;
        }
        return [
          {
            ...pair,
            recordId: `candidate-filed:filing:${contest.id}:${pair.them}`,
          },
        ];
      }
      return [];
    });
    expect(filed.length, `${where}: housemates who filed`).toBeGreaterThan(0);
    advanceCore(core, addDays(makeIsoDate(core.date), 14));
    for (const pair of filed) {
      const book = director.ledger.people.get(pair.me)!;
      // Every filing or race scene staged for them stands on a record that
      // names them.
      const misplaced = book.schedule.flatMap((entry) => {
        const moment = book.momentsById.get(entry.momentId);
        return entry.bindings
          .filter((row) => OWN.has(row.typeKey) && !moment?.selfNamed)
          .map((row) => `${row.typeKey} on ${moment?.causeId}`);
      });
      expect(misplaced, `${where}: ${pair.me}`).toEqual([]);
    }
    // At least one housemate's filing reached the one at home through their
    // tie, so the check above had a filing to guard against.
    const reached = filed.find((pair) =>
      director.ledger.people
        .get(pair.me)!
        .moments.some((row) => row.causeId === pair.recordId),
    );
    expect(
      reached,
      `${where}: a filing that reached the one at home`,
    ).toBeDefined();
  },
  120_000,
);
