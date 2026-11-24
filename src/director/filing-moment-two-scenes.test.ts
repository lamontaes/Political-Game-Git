import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { stakeOf } from "./family-stake";

// One moment, two scenes (the page-side fix is play-a-moments-second-scene-is-
// skipped-unless-the-first-ends-on-a-bare-reply): when a resident files for a
// local office and someone in their household has a stake in the run, the
// filing moment binds the filing scene and the talk at home after it. The
// places and seeds are pinned; each filer is a resident the records give a
// household stake, found by rule, so the test names where it ran. A refused
// filing (someone who lives elsewhere, or is too young) is the rule working, so
// the filers here are residents and the test goes on to the next one.
const PINS = [
  { drawSeed: "probe9201-0", name: "Henlopen Acres, Delaware" },
  { drawSeed: "probe9201-1", name: "Orland Hills, Illinois" },
] as const;

it.each(PINS)(
  "the filing moment binds the filing scene and the talk at home at $name",
  ({ drawSeed, name }) => {
    const place = drawPlace(drawSeed, "family-stake-scene");
    const where = `${place.name} (${place.key}), seed ${drawSeed}`;
    expect(place.name, where).toBe(name);
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    for (
      let day = 0;
      !openContests(api).some(
        (r) => r.level !== "federal" && r.level !== "state",
      ) && day < 365;
      day += 7
    )
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const race = [...openContests(api)]
      .filter((r) => r.level !== "federal" && r.level !== "state")
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    expect(race, `${where}: no local race opened`).toBeTruthy();
    const home = core.people.get(core.playerId)!.placeId;
    const clerk = filingClerkFor(api, race.id)?.personId;
    const residents = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.id !== core.playerId &&
          p.id !== clerk &&
          p.placeId === home &&
          (core.households.get(p.householdId)?.memberIds ?? []).some(
            (m) => m !== p.id && core.people.get(m)?.alive,
          ),
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 60);
    const homes = new Set<string>();
    let filed: { id: PersonId; filingId: string; stakes: number } | null = null;
    for (const person of residents) {
      if (homes.has(person.householdId)) continue;
      homes.add(person.householdId);
      director.watch(core, person.id);
      const result = fileCandidacy(api, {
        personId: person.id,
        contestId: race.id,
        platform: [],
      });
      if (!result.filing) continue;
      const stakes = (
        core.households.get(person.householdId)?.memberIds ?? []
      ).filter(
        (m) =>
          stakeOf(core, person.id, `candidate-filed:${result.filing.id}`, m) !==
          null,
      ).length;
      if (stakes > 0 && !filed)
        filed = { id: person.id, filingId: result.filing.id, stakes };
      if (filed) break;
    }
    expect(filed, `${where}: no resident's household has a stake`).toBeTruthy();
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const entry = director.ledger.people
      .get(filed!.id)!
      .schedule.find((row) =>
        row.momentId.includes(`candidate-filed:${filed!.filingId}`),
      );
    expect(entry, `${where}: the filing fired no moment`).toBeTruthy();
    const types = entry!.bindings.map((row) => row.typeKey);
    expect(types, `${where}: ${filed!.id}`).toEqual(
      expect.arrayContaining(["filing", "family-filing"]),
    );
  },
  600_000,
);
