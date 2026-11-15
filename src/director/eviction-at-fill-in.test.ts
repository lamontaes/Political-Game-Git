/**
 * A household evicted while counted and filled in later still tells its
 * eviction (a full household with no moment on the ledger, which the test
 * passes no director for, takes the same path when no counted one is evicted) (pool item words-eviction-moment-at-fill-in): the director reads
 * the case from the household's housing status row when it holds no moment.
 * Storrs, Connecticut (key 0973980) is a place where it happens; places are
 * then drawn from all 56 until a counted household has been evicted within
 * the year.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { HOUSING_MODULE_ID } from "../core2/modules/housing";
import { residentsRuntime } from "../core2/modules/residents";
import { coreAPI, fillInPerson } from "../core2/state";
import type { PersonId } from "../core2/types";
import { subjectsBetween } from "./conversation";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a person of an evicted counted household, filled in, can bring up the eviction by its case and event record (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  const places = [
    { name: "Storrs, Connecticut", key: "0973980", seed: `${seed}:storrs` },
    ...[0, 1, 2].map((n) => drawPlace(`${seed}:${n}`, "eviction-at-fill-in")),
  ];
  for (const place of places) {
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const housing = api.moduleState(HOUSING_MODULE_ID);
    const removed = (
      housing.table("cases").rows() as unknown as {
        id: string;
        householdId: string;
        counted?: boolean;
        stage?: string;
        removedAt?: string;
      }[]
    ).filter((c) => c.stage === "removed" && c.removedAt);
    // Counted households first: they are the ones with no moment on any ledger.
    removed.sort(
      (a, b) =>
        Number(!!b.counted) - Number(!!a.counted) || a.id.localeCompare(b.id),
    );
    const store = residentsRuntime(core)?.store;
    let shown = false;
    for (const c of removed) {
      const status = housing.table("statuses").get(c.householdId) as
        { caseId?: string } | undefined;
      const h = c.counted ? store?.liveHousehold(c.householdId) : undefined;
      const members = c.counted
        ? h
          ? store!.memberIdsOf(h)
          : []
        : (core.households.get(c.householdId)?.memberIds ?? []).filter(
            (id) => core.people.get(id as PersonId)?.alive,
          );
      if (status?.caseId !== c.id || !members.length) continue;
      const person = c.counted
        ? fillInPerson(core, members[0] as PersonId)
        : core.people.get(members[0] as PersonId)!;
      // A filled-in person is a stranger and a stranger does not volunteer
      // it, so the test makes them an acquaintance who knew the player
      // before today: the read of the case is what is under test.
      const known = person as unknown as {
        knownIds: Set<PersonId>;
        knownIdSources?: Record<string, { learnedAt: string }>;
      };
      known.knownIds.add(core.playerId!);
      known.knownIdSources = {
        ...(known.knownIdSources ?? {}),
        [core.playerId!]: { learnedAt: addDays(makeIsoDate(core.date), -40) },
      };
      const subjects = subjectsBetween(core, person.id, core.playerId!);
      const eviction = subjects.find((s) => s.kind === "eviction");
      expect(
        eviction,
        `${where}: ${person.id} of ${c.householdId} (case ${c.id}) tells no eviction`,
      ).toBeTruthy();
      expect(eviction!.facts.when?.sourceRecordIds, where).toContain(
        `event:housing.eviction:${c.id}`,
      );
      shown = true;
      break;
    }
    if (shown) return;
    tried.push(
      `${where}: ${removed.length} counted evictions with a status row and a member`,
    );
  }
  throw new Error(
    `no household was evicted with a status row: ${tried.join("; ")}`,
  );
}, 1_200_000);
