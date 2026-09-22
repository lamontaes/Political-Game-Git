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
  seatStartingCondition,
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
  delete (legacy as { openingDataVersion?: unknown }).openingDataVersion;
  // Every versioned field the current default stamps has to come off, not just
  // the opening one. A descriptor written before a field existed decodes with
  // it undefined, so a helper that leaves one on is not building an old save:
  // it builds a hybrid that never existed, and the hash it produces reports a
  // difference nobody made. Leaving `earlierLifeGenerationVersion` on is what
  // made this gate look like the client line had lost a character's schooling.
  delete (legacy as { earlierLifeGenerationVersion?: unknown })
    .earlierLifeGenerationVersion;
  delete (legacy as { livingWorldMemberNameVersion?: unknown })
    .livingWorldMemberNameVersion;
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
 *
 * RE-ACCEPTED 2026-09-22, and this is a decision rather than a moved baseline.
 * These hashes cover the WHOLE serialized world, and a world carries the
 * authored catalogs it shipped with, so any authored content legitimately
 * moves them. Two lanes changed authored content that day and the delta was
 * measured to be exactly those two things and nothing else:
 *
 *   - `world.policyCatalog`, from the first sourced policy vocabulary (#379):
 *     13 domains and 127 issues where the production catalog had been empty.
 *   - `world.history.organizationProfiles`, from the school and party names
 *     (#378): "Local Elementary School" became "Thomas Edison Elementary
 *     School", and the two others alongside it.
 *   - `snapshotId`, which is a digest of the above and moves with them.
 *
 * `worldId` is UNCHANGED, and so is every other part of the world: people,
 * jurisdictions and the rest of history are byte-identical. That was
 * established by hashing both openings on this head and on `1d92c558`, the
 * last commit before either change, with those three fields removed — the
 * remainders match exactly for both Kentucky and Peebles. So the opening logic
 * did not move; the content it opens with did.
 *
 * Note what this fixture can and cannot promise. `legacySetup` spreads
 * DEFAULT_NEW_GAME_SETUP and deletes one field, so it is today's defaults
 * without an opening version, not a save written by an old build. It gates the
 * legacy opening PATH, not save compatibility, and it moves whenever shipped
 * content does. LEGACY_OPENING_SHAPE below is the part that should not move.
 *
 * RE-ACCEPTED AGAIN 2026-09-22, and this time LEGACY_OPENING_SHAPE moves too,
 * which by the paragraph above means the opening path really is behaving
 * differently. It is, deliberately: a generated person's given name is now
 * drawn from the pool that agrees with the gender the world already gave them,
 * so a generated name can move whether or not it was previously wrong — the
 * draw is over a smaller pool, not only a corrected one. `legacySetup` spreads
 * today's defaults and deletes the versioned fields that exist to make an old
 * descriptor replay; `givenNameGenerationVersion` is deliberately NOT one of
 * them here, because this fixture is today's new game minus an opening
 * version, and today's new game declares the repair.
 *
 * Measured rather than assumed. The legacy Kentucky opening was serialized on
 * `origin/main` at 55183d37 and on this head and compared leaf by leaf: 21
 * leaves differ in the whole world and no others.
 *
 *   - 5 `givenName` values, of 544 people;
 *   - 15 `establishedFacts[].summary` strings, every one of which becomes
 *     identical after substituting that person's old given name for their new
 *     one — 0 summaries are unexplained by the name alone;
 *   - `snapshotId`, which is a digest of the world and moves with it.
 *
 * Four of the five were the defect itself: a "Jeremiah" and an "Austin" both
 * recorded female, now Monique and Jenna, and two more alongside them. The
 * fifth, Mason to Gage, was male and stayed male; it moved because the pool
 * narrowed. Nothing else differs — no person id, birth date, family name,
 * identity, jurisdiction, organization, event or history structure, and
 * `worldId` is unchanged. A move here for any other reason is still a
 * regression.
 *
 * RE-ACCEPTED AGAIN the same day, for the shared-name rule
 * (`GIVEN_NAME_POOL_REACH_V1`): a stated man or woman can now also be given
 * one of the 36 names both sexes carried. Measured the same way, against the
 * hashes this replaced: same people and ids, identical leaf paths, 0
 * identities changed. Kentucky: 6 given names and 18 summaries, each made
 * identical by one renamed person's old given name, plus `snapshotId`.
 * Peebles: 3 given names and 9 summaries, plus `snapshotId`. 0 unexplained.
 */
const FED321F7_LEGACY = {
  kentucky: "7ecf6924fb6a9451f63be38669c06c9e9a598b16f199739b344c403b8a59e3e2",
  peebles: "1dc306e0694eec4e8f4fbdf5da3a8c4e781e7ff869a73eec57d6650bc2e7789c",
} as const;

/**
 * The same two openings with the authored catalogs, the generated organization
 * names and the derived snapshot digest removed. This is the invariant with
 * real teeth: it is what fed321f7 built and what this head builds, and unlike
 * the hashes above it does NOT move when authored content ships. A change here
 * is the legacy opening path actually behaving differently, which is what the
 * test above was reaching for and could not hold on its own.
 */
const LEGACY_OPENING_SHAPE = {
  kentucky: "039d5fc55cc85c1f3a1a1487f101faa56d0158be229af007b0878edf2b431ec2",
  peebles: "f50d53595074667a4183212edc0eeb00d4286079b1060635b884949cd737fdd8",
} as const;

/**
 * Strips the three fields that shipped content moves, so what remains is the
 * opening path's own output. Deliberately NOT a deep filter: it removes named
 * fields and leaves everything else exactly as serialized, so anything new
 * appearing in a world still reaches the comparison.
 */
function openingShape(serialized: string): string {
  const parsed = JSON.parse(serialized) as Record<string, unknown>;
  delete parsed.snapshotId;
  const world = parsed.world as Record<string, unknown>;
  delete world.policyCatalog;
  delete (world.history as Record<string, unknown>).organizationProfiles;
  return JSON.stringify(parsed);
}

describe("WORLD46 opening version gate", () => {
  it("a replay descriptor carries the opening version; an old one reads as legacy", () => {
    const current = { ...DEFAULT_NEW_GAME_SETUP, seed: "gate" };
    expect(current.worldOpeningVersion).toBe(CRUNCH46_WORLD_OPENING_VERSION);
    expect(
      decodeReplayDescriptor(encodeReplayDescriptor(current))
        ?.worldOpeningVersion,
    ).toBe(CRUNCH46_WORLD_OPENING_VERSION);
    const old = legacySetup("kentucky", "gate");
    expect(old.openingDataVersion).toBeUndefined();
    expect(old.earlierLifeGenerationVersion).toBeUndefined();
    expect(old.livingWorldMemberNameVersion).toBeUndefined();
    expect(
      decodeReplayDescriptor(encodeReplayDescriptor(old))
        ?.earlierLifeGenerationVersion,
    ).toBeUndefined();
    expect(
      decodeReplayDescriptor(encodeReplayDescriptor(old))
        ?.livingWorldMemberNameVersion,
    ).toBeUndefined();
    expect(
      decodeReplayDescriptor(encodeReplayDescriptor(old))?.openingDataVersion,
    ).toBeUndefined();
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
      // PRESS setup belongs to the new opening only; a legacy replay has none.
      expect(kentucky.world.history.pressRecords ?? []).toHaveLength(0);
      // Shape first, so a genuine opening-path regression is what the failure
      // names. The whole-world hashes below also move when content ships, and
      // on their own they cannot tell the two apart.
      const kentuckySerialized = serializeWorld(kentucky.world);
      const peeblesSerialized = serializeWorld(legacyPeebles.world);
      expect(sha256(openingShape(kentuckySerialized))).toBe(
        LEGACY_OPENING_SHAPE.kentucky,
      );
      expect(sha256(openingShape(peeblesSerialized))).toBe(
        LEGACY_OPENING_SHAPE.peebles,
      );
      expect(sha256(kentuckySerialized)).toBe(FED321F7_LEGACY.kentucky);
      expect(sha256(peeblesSerialized)).toBe(FED321F7_LEGACY.peebles);
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
      // The press opening runs once, behind the recognized opening version.
      expect((life.world.history.pressRecords ?? []).length).toBeGreaterThan(0);
      expect(worldOpeningVersionOf(life.world)).toBe(
        CRUNCH46_WORLD_OPENING_VERSION,
      );
      const macro = macroStartingConditions(life.world)!;
      const politics = politicalStartingConditions(life.world)!;
      expect(macro.policyVersion).toBe("crunch46-provisional-v1");
      expect(politics.regime).toBe(macro.regime);
      expect(politics.seats).toHaveLength(535);
      const first = politics.seats[0]!;
      expect(seatStartingCondition(life.world, first.seatKey)).toEqual(first);
      expect(seatStartingCondition(life.world, "us-house:ZZ-99")).toBeNull();
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
