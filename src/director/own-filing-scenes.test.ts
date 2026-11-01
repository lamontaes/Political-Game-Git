import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { familyFactsOf } from "../core2/closeness";
import { advanceCore } from "../core2/life";
import { fileCandidacy, openContests } from "../core2/modules/elections";
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
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const OWN = new Set(["filing", "family-filing", "race-won", "race-lost"]);
// A housemate's filing reaches the player only through their tie, by how
// close they are, so a loosely tied pair may not hear of it: each drawn place
// tries several households, partners and relatives first, and the test draws
// places until one has a filing reach a housemate, naming those passed over.
const ATTEMPTS = 12;
const PAIRS = 4;

it(`a housemate's filing is never staged as the player's own (seed ${seed})`, () => {
  const tried: string[] = [];
  setBookkeeping(false);
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "own-filing-scenes");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
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
    if (!pairs.length) {
      tried.push(`${where}: no two grown residents share a home`);
      continue;
    }
    core.playerId = pairs[0]!.me;
    for (const pair of pairs) director.watch(core, pair.me);
    // Each housemate files for the first open race they may enter.
    const filed = pairs.flatMap((pair) => {
      const contest = [...openContests(api)]
        .filter((c) => c.electionDate >= addDays(makeIsoDate(core.date), 60))
        .sort(
          (a, b) =>
            a.electionDate.localeCompare(b.electionDate) ||
            a.id.localeCompare(b.id),
        )
        .find(
          (c) =>
            fileCandidacy(api, {
              personId: pair.them,
              contestId: c.id,
              platform: [],
              party: null,
            }).status !== "refused",
        );
      return contest
        ? [
            {
              ...pair,
              recordId: `candidate-filed:filing:${contest.id}:${pair.them}`,
            },
          ]
        : [];
    });
    if (!filed.length) {
      tried.push(`${where}: no race a housemate could enter`);
      continue;
    }
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
    const reached = filed.find((pair) =>
      director.ledger.people
        .get(pair.me)!
        .moments.some((row) => row.causeId === pair.recordId),
    );
    if (!reached) {
      tried.push(
        `${where}: no housemate's filing reached the one at home (${filed.length} tried)`,
      );
      continue;
    }
    process.stdout.write(
      `OWN FILING ${where}${tried.length ? ` after ${tried.join("; ")}` : ""}: ${reached.them} filed (${reached.recordId}); ${reached.me} staged none of it as their own\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a housemate's filing reach the player: ${tried.join("; ")}`,
  );
}, 3_600_000);
