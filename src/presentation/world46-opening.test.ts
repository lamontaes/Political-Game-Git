import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CRUNCH46_WORLD_OPENING_VERSION,
  deserializeWorld,
  lifePlaceByKey,
  lifePlaceSearch,
  macroStartingConditions,
  partyRecords,
  politicalStartingConditions,
  projectCongress,
  publicPartyAffiliation,
  serializeWorld,
  worldOpeningVersionOf,
} from "../simulation";
import type { World } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import {
  decodeReplayDescriptor,
  encodeReplayDescriptor,
} from "./new-game-identity";
import { WASHINGTON_PLACE_KEY } from "./opening-federal-geography";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { currentPublicOfficeholders } from "./opening-officeholders";

const LONG = 600_000;

const peebles = lifePlaceSearch("Peebles", 20, {
  stateJurisdictionKey: "US-OH",
  scope: "locality",
}).find((place) => /\bPeebles\b/i.test(place.displayName))!;

function legacySetup(placeKey: string, seed: string): NewGameSetup {
  const legacy: Omit<NewGameSetup, "seed"> = { ...DEFAULT_NEW_GAME_SETUP };
  delete (legacy as { worldOpeningVersion?: unknown }).worldOpeningVersion;
  return {
    ...legacy,
    seed,
    placeKey,
    startAge: 30,
    depth: "summarize-earlier-life",
  };
}

function open(setup: NewGameSetup) {
  return generateOpeningLife(prepareOpeningLife(setup)).game!;
}

const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");

/**
 * Hashes of the same openings built by main fed321f7 before this change
 * (PG-WORLD46-scratch/golden/legacy-hash.ts, run 2026-09-16 on the pristine
 * base worktree). An old descriptor must still rebuild exactly that world.
 */
const FED321F7_LEGACY = {
  kentucky: "446fc2516699d0a28d87d7a6e3268f11c7d8be919a58c48ced817575dc48bf55",
  peebles: "34562e64faae79fb7938063d27f47de557869646dc599885956283b5029a989c",
} as const;

describe("WORLD46 opening version gate", () => {
  it("a replay descriptor carries the opening version; an old one reads as legacy", () => {
    const current = { ...DEFAULT_NEW_GAME_SETUP, seed: "gate" };
    expect(current.worldOpeningVersion).toBe(CRUNCH46_WORLD_OPENING_VERSION);
    expect(
      decodeReplayDescriptor(encodeReplayDescriptor(current))
        ?.worldOpeningVersion,
    ).toBe(CRUNCH46_WORLD_OPENING_VERSION);
    const old = legacySetup("kentucky", "gate");
    expect(
      decodeReplayDescriptor(encodeReplayDescriptor(old))?.worldOpeningVersion,
    ).toBeUndefined();
    const unknown = Buffer.from(
      JSON.stringify({
        ...JSON.parse(
          Buffer.from(encodeReplayDescriptor(old), "base64url").toString(),
        ),
        worldOpeningVersion: "world-opening-from-the-future",
      }),
    ).toString("base64url");
    expect(decodeReplayDescriptor(unknown)).toBeNull();
  });

  it(
    "old descriptors rebuild byte-for-byte what fed321f7 built",
    () => {
      const kentucky = open(legacySetup("kentucky", "world46-legacy-a"));
      const legacyPeebles = open(legacySetup(peebles.key, "world46-legacy-b"));
      expect(worldOpeningVersionOf(kentucky.world)).toBeNull();
      expect(sha256(serializeWorld(kentucky.world))).toBe(
        FED321F7_LEGACY.kentucky,
      );
      expect(sha256(serializeWorld(legacyPeebles.world))).toBe(
        FED321F7_LEGACY.peebles,
      );
    },
    LONG,
  );
});

describe("WORLD46 current opening: Peebles and a contrasting home", () => {
  let peeblesLife: ReturnType<typeof open>;
  let contrast: ReturnType<typeof open>;
  const current = (placeKey: string, seed: string): NewGameSetup => ({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey,
    startAge: 30,
    depth: "summarize-earlier-life",
  });
  beforeAll(() => {
    peeblesLife = open(current(peebles.key, "world46-current"));
    contrast = open(current("kentucky", "world46-current"));
  }, LONG);

  it("persists its opening version and generated conditions at Begin", () => {
    for (const life of [peeblesLife, contrast]) {
      expect(worldOpeningVersionOf(life.world)).toBe(
        CRUNCH46_WORLD_OPENING_VERSION,
      );
      const macro = macroStartingConditions(life.world)!;
      const politics = politicalStartingConditions(life.world)!;
      expect(macro.policyVersion).toBe("crunch46-provisional-v1");
      expect(politics.regime).toBe(macro.regime);
      expect(politics.seats).toHaveLength(535);
    }
  });

  it("federal officials live in Washington, not in the player's home", () => {
    const washington =
      lifePlaceByKey(WASHINGTON_PLACE_KEY)!.context.jurisdiction.id;
    for (const life of [peeblesLife, contrast]) {
      const officials = currentPublicOfficeholders(life.world).filter(
        (holder) =>
          ["us-president", "us-chief-justice"].includes(holder.officeKey),
      );
      expect(officials).toHaveLength(2);
      const player = life.world.people[life.playerPersonId]!;
      for (const holder of officials) {
        const person = life.world.people[holder.personId]!;
        expect(person.homeJurisdictionId).toBe(washington);
        expect(person.homeJurisdictionId).not.toBe(player.homeJurisdictionId);
        const birth = person.establishedFacts.find(
          (fact) => fact.kind === "birthplace",
        );
        expect(life.world.jurisdictions[birth!.jurisdictionId!]).toBeDefined();
      }
    }
  });

  it("the seated Congress and executives are the saved generated conditions", () => {
    for (const life of [peeblesLife, contrast]) {
      const politics = politicalStartingConditions(life.world)!;
      const bySeat = new Map(
        politics.seats.map((seat) => [seat.seatKey, seat]),
      );
      const congress = projectCongress(life.world)!;
      const parties = new Map(
        partyRecords(life.world)
          .filter((record) => record.kind === "party-unit")
          .map((record) => [
            record.organizationId,
            (record as { partyKey: string }).partyKey,
          ]),
      );
      for (const seat of [...congress.house.seats, ...congress.senate.seats]) {
        if (seat.occupant.kind !== "member") continue;
        const generated = bySeat.get(seat.seatKey)!;
        const party = seat.occupant.member.partyOrganizationId;
        expect(party === null ? null : parties.get(party)).toBe(
          ["democratic", "republican"].includes(generated.affiliation)
            ? generated.affiliation
            : null,
        );
      }
      const president = currentPublicOfficeholders(life.world).find(
        (holder) => holder.officeKey === "us-president",
      )!;
      const presidentParty = publicPartyAffiliation(
        life.world,
        president.personId,
      );
      expect(parties.get(presidentParty!)).toBe(politics.presidency.winner);
    }
  });

  it(
    "replays byte-identically and survives the real serializer",
    () => {
      const again = open(current(peebles.key, "world46-current"));
      const payload = serializeWorld(peeblesLife.world);
      expect(serializeWorld(again.world)).toBe(payload);
      const restored: World = deserializeWorld(payload);
      expect(serializeWorld(restored)).toBe(payload);
      expect(politicalStartingConditions(restored)).toEqual(
        politicalStartingConditions(peeblesLife.world),
      );
    },
    LONG,
  );

  it("no shortage story is written for a world that has none", () => {
    for (const life of [peeblesLife, contrast]) {
      const text = JSON.stringify([
        life.world.history.events.map((event) => event.summary),
        life.world.history.publications ?? [],
      ]).toLowerCase();
      if (
        macroStartingConditions(life.world)!.initial.housingSupplyDemandRatio >=
        1
      ) {
        expect(text).not.toMatch(/housing (shortage|crisis)/);
      }
    }
  });
});
