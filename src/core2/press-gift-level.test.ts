import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { lawChain } from "./modules/laws";
import { deskContext, outletsHere } from "./modules/press";
import { runDesk } from "./press-desk";
import { wireItem, type WireItem } from "./press-topics";
import { coreAPI } from "./state";
import type { CoreEventInput } from "./types";

// A gift or an endorsement is the news of its race, so it takes the level of
// the office the race fills, and the paper tells one gift story and one
// endorsement story a race a week. Pinned to McKenney, Virginia, seed
// survey-a (drawn by printed-words' purpose), where one played year made
// 1,041 gifts and 224 endorsements, all town news (survey-b, Williamstown,
// Kentucky: 1,333 and 556).
const SEED = "survey-a";

function world() {
  setBookkeeping(false);
  const place = drawPlace(SEED, "printed-words");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return {
    api: coreAPI(core),
    where: `${place.name} (${place.key}), seed ${SEED}`,
  };
}

it(`a race's gifts and endorsements take the level of its office, and the desk tells one of each a race a week (${SEED})`, () => {
  const { api, where } = world();
  const chain = lawChain(api);
  const town = { placeId: chain.townPlaceId, stateKey: chain.stateKey };
  const contests = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as { id: string; level: string }[];
  const byLevel = (level: string) => contests.find((c) => c.level === level);
  const event = (
    kind: string,
    contestId: string,
    n: number,
  ): CoreEventInput => ({
    id: `${kind}:${contestId}:${n}`,
    date: api.state.date,
    kind,
    personIds: [],
    placeId: town.placeId,
    publicRecord: true,
    source: { tag: "SOURCED", citation: "test", asOf: api.state.date },
    facts: { contestId, donorId: `donor-${n}` },
  });

  // The level of the office, not of the town the record is kept in.
  const expected: Record<string, string> = {
    federal: "nation",
    state: "state",
    city: "town",
  };
  for (const [officeLevel, wireLevel] of Object.entries(expected)) {
    const contest = byLevel(officeLevel);
    expect(
      contest,
      `${where}: a ${officeLevel} race on the books`,
    ).toBeTruthy();
    for (const kind of ["campaign-gift", "campaign-endorsed"])
      expect(
        wireItem(api, event(kind, contest!.id, 0), town)?.level,
        `${where}: ${kind} in a ${officeLevel} race`,
      ).toBe(wireLevel);
  }

  // The desk: three donors' gifts and two endorsements in each of two races,
  // all at the town's own level, the same week.
  const races = [byLevel("city")!, byLevel("state")!];
  const wire: WireItem[] = [];
  for (const race of races)
    for (let n = 0; n < 3; n++)
      for (const kind of ["campaign-gift", "campaign-endorsed"])
        if (kind === "campaign-gift" || n < 2)
          wire.push({
            ...wireItem(api, event(kind, race.id, n), town)!,
            level: "town",
          });
  const outlet = outletsHere(api).find(
    (o) => o.tier !== "national" && o.reporterIds.length,
  );
  expect(outlet, `${where}: a local outlet with a reporter`).toBeTruthy();
  const printed = runDesk(api, deskContext(api), outlet!, wire);
  const told = (kind: string, contestId: string) =>
    printed.filter(
      (s) =>
        s.kind === kind &&
        wire.find((w) => w.id === s.wireId)?.facts?.contestId === contestId,
    ).length;
  for (const race of races)
    for (const kind of ["campaign-gift", "campaign-endorsed"])
      expect(
        told(kind, race.id),
        `${where}: ${outlet!.id} told ${kind} in ${race.id} as one story`,
      ).toBeLessThanOrEqual(1);
  expect(
    printed.length,
    `${where}: the desk printed something`,
  ).toBeGreaterThan(0);
  // Never two stories on one race's gifts, or one race's backing.
  const keys = printed.map(
    (s) => `${s.kind}:${wire.find((w) => w.id === s.wireId)?.facts?.contestId}`,
  );
  expect(new Set(keys).size, `${where}: ${keys.join(", ")}`).toBe(keys.length);
  // A national outlet carries a federal race's endorsements, one a race, and
  // no donor's gift nor a state race's endorsement.
  const federal = byLevel("federal")!;
  const abroad: WireItem[] = [];
  for (const race of [federal, byLevel("state")!])
    for (let n = 0; n < 3; n++)
      for (const kind of ["campaign-gift", "campaign-endorsed"])
        abroad.push(wireItem(api, event(kind, race.id, n), town)!);
  const national = outletsHere(api).find(
    (o) => o.tier === "national" && o.reporterIds.length,
  );
  expect(national, `${where}: a national outlet with a reporter`).toBeTruthy();
  const nationally = runDesk(api, deskContext(api), national!, abroad).filter(
    (s) => ["campaign-gift", "campaign-endorsed"].includes(s.kind),
  );
  expect(
    nationally.map((s) => [
      s.kind,
      abroad.find((w) => w.id === s.wireId)?.facts?.contestId,
    ]),
    `${where}: ${national!.id}`,
  ).toEqual([["campaign-endorsed", federal.id]]);
}, 300_000);
