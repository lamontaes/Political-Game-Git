import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../../src/bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import {
  keyChambersOf,
  keyPeopleOf,
} from "../../../src/core2/opening-key-people";
import { leaderOf } from "../../../src/core2/modules/leadership";
import {
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  memberKey,
  members,
} from "../../../src/core2/modules/legislature";
import {
  OFFICES_MODULE_ID,
  townSeats,
} from "../../../src/core2/modules/offices";
import { governmentView } from "../../../src/bench/government";
import { coreAPI } from "../../../src/core2/state";
import keyData from "../../../src/core2/data/opening/key-people.json" with { type: "json" };

// The opening's key people (owner ruling, Oct 15, afternoon), in the played
// world of three places drawn from all 56 (GOLDEN_PATH_SEED pins the first).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe.each([0, 1, 2])("the opening's key people, draw %i", (draw) => {
  const place = drawPlace(`${seed}:${draw}`, "opening-key-people");
  it(
    `are exactly the ruled set in ${place.name}, seed ${seed}:${draw}`,
    { timeout: 600_000 },
    () => {
      setBookkeeping(false);
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core } = world;
      const api = coreAPI(core);
      const keys = keyPeopleOf(core, world.playerId!);
      const byReason = (reason: string) =>
        keys.filter((row) =>
          (row.reasons as readonly string[]).includes(reason),
        );
      const context = `${place.name} (${place.key})`;
      const covering = townSeats(api).filter((row) => row.holder);

      // The president and vice president, from the seats over the player's town.
      // Everyone knows them, a territory's town too, whose voters do not choose them (owner
      // ruling, Oct 19): the one office of each kind, whether or not a seat covers the town.
      for (const kind of ["president", "vice-president"]) {
        const office = (
          api
            .moduleState(OFFICES_MODULE_ID)
            .table("offices")
            .rows() as unknown as { id: string; kind: string }[]
        ).filter((row) => row.kind === kind);
        expect(
          byReason(kind).map((row) => row.officeId),
          context,
        ).toEqual(office.map((row) => row.id));
      }
      // The player's own representatives: council, state legislators, U.S. representative and senators.
      const own = (kinds: string[]) =>
        covering.filter((row) => kinds.includes(row.office.kind)).length;
      expect(byReason("own-council-member"), context).toHaveLength(
        own(["council"]),
      );
      expect(byReason("own-us-senator"), context).toHaveLength(
        own(["us-senate"]),
      );
      // A territory's delegate is its representative (the ruled data lists both kinds).
      expect(byReason("own-us-representative"), context).toHaveLength(
        own(keyData.ownOffices["own-us-representative"]),
      );
      expect(byReason("own-state-legislator"), context).toHaveLength(
        own([
          "legislature-lower",
          "legislature-upper",
          "legislature-unicameral",
        ]),
      );
      // Every sitting legislator of the player's state, and no one of another state.
      const stateChambers = (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .query("byJurisdiction", [place.state]) as unknown as {
          id: string;
          kind: string;
        }[]
      ).filter((row) => row.kind.startsWith("legislature-"));
      expect(
        stateChambers.length,
        `${context} has a legislature`,
      ).toBeGreaterThan(0);
      const legislators = stateChambers.flatMap((row) =>
        members(api, row.id).map(memberKey),
      );
      expect(
        byReason("state-legislator")
          .map((row) => row.id)
          .sort(),
        context,
      ).toEqual([...new Set(legislators)].sort());
      // The most powerful person in each chamber: Congress's two and the state's own (one if unicameral).
      const chambers = keyChambersOf(core, world.playerId!);
      expect(chambers).toEqual(
        expect.arrayContaining([FEDERAL_HOUSE, FEDERAL_SENATE]),
      );
      expect(chambers.length, context).toBe(2 + stateChambers.length);
      const leaders = byReason("chamber-leader");
      expect(leaders.length, context).toBeLessThanOrEqual(chambers.length);
      for (const leader of leaders) {
        const post = (keyData.mostPowerfulPost as Record<string, string>)[
          leader.officeKind
        ]!;
        const chamber = chambers.find(
          (id) => leaderOf(api, id, post) === leader.id,
        );
        expect(chamber, `${leader.name} leads a key chamber`).toBeDefined();
      }
      // The Politics screen reads the same list the opening does, less the state's other
      // legislators and the governor: those stay behind its State filter (`stateLegislators`,
      // src/bench/government.ts `POLITICS_KEY_ORDER`; Oct 26, "the rest behind the filters").
      const onPolitics = (reason: string) =>
        reason !== "state-legislator" && reason !== "governor";
      expect(
        governmentView(core, world.playerId!)
          .keyPeople.map((row) => row.personId)
          .sort(),
        context,
      ).toEqual(
        keys
          .filter((row) => row.reasons.some(onPolitics))
          .map((row) => row.id)
          .sort(),
      );
      // The screen lists them in the ruled order: the player's own members first, then the
      // President, the Vice President and the chamber leaders (each person by their first
      // reason; src/bench/government.ts `POLITICS_KEY_ORDER`).
      const politicsOrder = [
        "own-us-senator",
        "own-us-representative",
        "own-state-legislator",
        "own-council-member",
        "president",
        "vice-president",
        "chamber-leader",
      ];
      const firstRank = (reasons: readonly string[]) =>
        Math.min(
          ...reasons.map((reason) => {
            const at = politicsOrder.indexOf(reason);
            // A reason the screen does not list (the governor, another legislator) ranks last.
            return at < 0 ? politicsOrder.length : at;
          }),
        );
      const ranks = governmentView(core, world.playerId!).keyPeople.map((row) =>
        firstRank(row.reasons),
      );
      expect(ranks, `${context}: the Politics list's order`).toEqual(
        [...ranks].sort((a, b) => a - b),
      );
      // Nothing else is key: every key person has at least one ruled reason, and
      // a person appears once.
      expect(new Set(keys.map((row) => row.id)).size).toBe(keys.length);
      for (const row of keys) {
        expect(row.reasons.length, row.name).toBeGreaterThan(0);
        expect(row.sourceRecordIds.length, row.name).toBeGreaterThan(0);
      }
      const reasons = new Set<string>(keyData.reasons);
      for (const row of keys)
        for (const reason of row.reasons)
          expect(reasons.has(reason)).toBe(true);
    },
  );
});
