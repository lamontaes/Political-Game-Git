import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { keyChambersOf, keyPeopleOf } from "./opening-key-people";
import { leaderOf } from "./modules/leadership";
import {
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  memberKey,
  members,
} from "./modules/legislature";
import { OFFICES_MODULE_ID, townSeats } from "./modules/offices";
import { governmentView } from "../bench/government";
import { coreAPI } from "./state";
import keyData from "./data/opening/key-people.json" with { type: "json" };

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
      for (const kind of ["president", "vice-president"]) {
        const seat = covering.find((row) => row.office.kind === kind);
        expect(
          byReason(kind).map((row) => row.officeId),
          context,
        ).toEqual(seat ? [seat.office.id] : []);
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
      expect(byReason("own-us-representative"), context).toHaveLength(
        own(["us-house"]),
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
      // The Politics screen reads the same list the opening does.
      expect(
        governmentView(core, world.playerId!).keyPeople.map(
          (row) => row.personId,
        ),
        context,
      ).toEqual(keys.map((row) => row.id));
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
