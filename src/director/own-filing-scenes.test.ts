import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
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
const ATTEMPTS = 6;

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
    // A grown resident who lives with another grown resident.
    const pair = [...core.people.values()]
      .filter((row) => adult(row.id))
      .sort((a, b) => a.id.localeCompare(b.id))
      .flatMap((row) => {
        const other = (
          core.households.get(row.householdId)?.memberIds ?? []
        ).find((id) => id !== row.id && adult(id));
        return other ? [{ me: row.id as PersonId, them: other }] : [];
      })[0];
    if (!pair) {
      tried.push(`${where}: no two grown residents share a home`);
      continue;
    }
    core.playerId = pair.me;
    for (const id of [pair.me, pair.them]) director.watch(core, id as PersonId);
    // The housemate files for the first open race they may enter.
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
    if (!contest) {
      tried.push(`${where}: no race the housemate could enter`);
      continue;
    }
    const recordId = `candidate-filed:filing:${contest.id}:${pair.them}`;
    advanceCore(core, addDays(makeIsoDate(core.date), 14));
    const book = director.ledger.people.get(pair.me)!;
    const reached = book.moments.some((row) => row.causeId === recordId);
    // Every filing or race scene staged for the player stands on a record
    // that names the player.
    const misplaced = book.schedule.flatMap((entry) => {
      const moment = book.momentsById.get(entry.momentId);
      return entry.bindings
        .filter((row) => OWN.has(row.typeKey) && !moment?.selfNamed)
        .map((row) => `${row.typeKey} on ${moment?.causeId}`);
    });
    expect(misplaced, where).toEqual([]);
    if (!reached) {
      tried.push(
        `${where}: the housemate's filing ${recordId} did not reach the player`,
      );
      continue;
    }
    console.log(
      `OWN FILING ${where}: ${pair.them} filed (${recordId}); ${pair.me} staged none of it as their own`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a housemate's filing reach the player: ${tried.join("; ")}`,
  );
}, 3_600_000);
