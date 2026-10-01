import { describe, expect, it } from "vitest";

import { contactBases } from "./people-contact";
import { ageOnDate } from "./dates";
import {
  ensurePeopleTraits,
  notableQualityRoom,
  upbringingQualities,
} from "./people-traits";
import { latestPersonalityTendenciesForPerson } from "./queries";
import { traitDefinitionFromPack } from "./trait-packs";
import { traitRegistryFor } from "./trait-registry";
import {
  familyMoneyFor,
  upbringingFor,
  upbringingTraitTendencies,
  type PersonUpbringing,
} from "./people-upbringing";
import { annualPovertyLineMinor } from "./household-pay";
import { homeStateKey } from "./state-jurisdiction-id";
import { stableHash } from "./ids";
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import {
  activeChildAuthoritiesAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "./life-queries";
import { residenceStateKey } from "./statutory-tax";
import { createOrganization, createWorkRelationship } from "./life";
import { createWorkCompensation, money } from "./resources";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import type { EntityId, World } from "./types";

function adultLife(seed: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge: 30,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey: "3918000",
    household: "shares-a-home",
  });
  return {
    playerId: game.playerPersonId,
    world: openOrdinaryLife(game.world, game.playerPersonId),
  };
}

function notableRecords(
  world: ReturnType<typeof adultLife>["world"],
  id: EntityId,
) {
  const definitions = new Set(
    [...traitRegistryFor(world).traits.values()]
      .filter(({ pack }) => pack === "personality-v1")
      .map((trait) => traitDefinitionFromPack(trait).id),
  );
  return latestPersonalityTendenciesForPerson(world, id).filter(
    ({ tendencyId }) => definitions.has(tendencyId),
  );
}

function expectNotableTraits(
  world: ReturnType<typeof adultLife>["world"],
  id: EntityId,
) {
  const records = notableRecords(world, id);
  const room = notableQualityRoom(
    ageOnDate(world.people[id]!.birthDate, world.currentDate),
  );
  expect(records.length).toBeGreaterThanOrEqual(1);
  expect(records.length).toBeLessThanOrEqual(room);
  // Every notable quality is one the upbringing leans toward; none is drawn.
  const leans = new Set(
    upbringingQualities(upbringingFor(world, id)).map(({ trait }) => trait),
  );
  const keyOf = new Map(
    [...traitRegistryFor(world).traits.values()].map((trait) => [
      traitDefinitionFromPack(trait).id,
      trait.qualifiedKey,
    ]),
  );
  for (const record of records) {
    expect(record.scopeTags).toContain("personality-v1.upbringing");
    expect(leans.has(keyOf.get(record.tendencyId)!)).toBe(true);
  }
}

/** A person's notable traits without the record ids a history assigns. */
function drawn(world: ReturnType<typeof adultLife>["world"], id: EntityId) {
  return notableRecords(world, id).map(
    ({ stableKey, tendencyId, expressionKey, strength, scopeTags }) => ({
      stableKey,
      tendencyId,
      expressionKey,
      strength,
      scopeTags,
    }),
  );
}

describe("upbringing and starting traits", () => {
  it("gives every generated NPC the notable traits their upbringing leans toward: the player's contacts at opening, anyone else when first needed", () => {
    const { world, playerId } = adultLife("upbringing-ordinary-route");
    const contacts = new Set(
      contactBases(world, playerId).map(({ personId }) => personId),
    );
    const others = world.personOrder.filter(
      (id) => id !== playerId && !contacts.has(id),
    );
    expect(contacts.size).toBeGreaterThan(0);
    expect(contacts.size + others.length).toBeGreaterThan(20);
    // The player's household, family, work and other contacts hold their
    // traits as soon as the life opens.
    for (const id of contacts) expectNotableTraits(world, id);
    // Nobody else is written at opening: writing the whole world made
    // starting a life take about half an hour.
    for (const id of others) expect(notableRecords(world, id)).toEqual([]);
    // Anyone else is drawn the first time a decision asks for them.
    for (const id of others) {
      expectNotableTraits(ensurePeopleTraits(world, [id]), id);
    }
    // The played character is never given any.
    expect(notableRecords(world, playerId)).toEqual([]);
  }, 120_000);

  it("is deterministic and labels where the family's money came from", () => {
    const first = adultLife("upbringing-repeat");
    const second = adultLife("upbringing-repeat");
    const firstNpc = first.world.personOrder.find(
      (id) => id !== first.playerId,
    )!;
    const secondNpc = second.world.personOrder.find(
      (id) => id !== second.playerId,
    )!;
    expect(upbringingFor(first.world, firstNpc)).toEqual(
      upbringingFor(second.world, secondNpc),
    );
    expect(
      upbringingFor(first.world, firstNpc).money.every(
        ({ source }) =>
          source.kind === "world-record" ||
          (source.kind === "public-data" &&
            source.note.startsWith("ESTIMATED FROM AVERAGE")),
      ),
    ).toBe(true);

    // The same opening writes the same traits for the same contacts.
    const contacts = contactBases(first.world, first.playerId).map(
      ({ personId }) => personId,
    );
    expect(contacts.length).toBeGreaterThan(0);
    expect(
      contactBases(second.world, second.playerId).map(
        ({ personId }) => personId,
      ),
    ).toEqual(contacts);
    for (const id of contacts) {
      expect(drawn(first.world, id)).toEqual(drawn(second.world, id));
    }

    // Someone drawn later gets the same traits in both worlds, and the same
    // traits whether they are drawn alone or alongside other people.
    const others = first.world.personOrder.filter(
      (id) => id !== first.playerId && !contacts.includes(id),
    );
    expect(others.length).toBeGreaterThan(1);
    const [later, alongside] = others;
    const alone = drawn(ensurePeopleTraits(first.world, [later!]), later!);
    expect(alone.length).toBeGreaterThanOrEqual(1);
    expect(drawn(ensurePeopleTraits(second.world, [later!]), later!)).toEqual(
      alone,
    );
    expect(
      drawn(ensurePeopleTraits(first.world, [alongside!, later!]), later!),
    ).toEqual(alone);
  }, 120_000);

  it("uses protective care as a counterweight after a parent's death", () => {
    const base: PersonUpbringing = {
      personId: "person_test" as EntityId,
      money: [],
      homeStability: "stable",
      caregiving: "consistent-firm",
      protectiveCaregiver: true,
      events: ["parent-death"],
      schooling: [],
      firstJob: "none",
    };
    const protectedTraits = upbringingTraitTendencies(base).map(
      ({ trait }) => trait,
    );
    const unprotectedTraits = upbringingTraitTendencies({
      ...base,
      protectiveCaregiver: false,
    }).map(({ trait }) => trait);
    expect(protectedTraits).toContain("personality-v1:facet-devoted");
    expect(protectedTraits).not.toContain(
      "personality-v1:facet-intimacy-guarded",
    );
    expect(unprotectedTraits).toContain(
      "personality-v1:facet-intimacy-guarded",
    );
  });

  it("keeps first-job effects in work and law inputs separate", () => {
    const upbringing: PersonUpbringing = {
      personId: "person_test" as EntityId,
      money: [],
      homeStability: "stable",
      caregiving: "consistent-firm",
      protectiveCaregiver: false,
      events: [
        "law-allegation",
        "adjudicated-law-trouble",
        "harsh-authority-treatment",
      ],
      schooling: [],
      firstJob: "autonomy",
    };
    const rows = upbringingTraitTendencies(upbringing);
    expect(
      rows
        .filter(({ because }) => because.includes("first job"))
        .every(({ lifePart }) => lifePart === "work"),
    ).toBe(true);
    expect(rows.some(({ because }) => because.includes("adjudicated"))).toBe(
      true,
    );
    expect(rows.some(({ because }) => because.includes("authorities"))).toBe(
      true,
    );
  });
});

/** The place of all 56 that this seed draws, with a locality to start in. */
function drawPlace(): { seed: string; usps: string; placeKey: string } {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  for (let n = 1; n < 200; n++) {
    const seed = `a137-${n}`;
    const place =
      places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
    const locality = searchLifePlaces("", 1, {
      stateJurisdictionKey: place.jurisdictionKey,
      scope: "locality",
    })[0];
    if (locality) return { seed, usps: place.usps, placeKey: locality.key };
  }
  throw new Error("No place with a locality was drawn.");
}

describe("A137: a childhood's money comes from the family's records", () => {
  const { seed, usps, placeKey } = drawPlace();
  const provenance = { kind: "authored" as const, note: "A137 family pay" };

  /** A 13-year-old's opening, with the guardian and household on record. */
  function teenLife() {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "custom",
      seed,
      placeKey,
      startAge: 13,
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      questionnaire: "skipped",
      household: "shares-a-home",
    });
    const world = game.world;
    const childId = game.playerPersonId;
    const authority = activeChildAuthoritiesAt(world, childId).find(
      (row) => row.authority.holder.kind === "person",
    );
    if (authority?.authority.holder.kind !== "person")
      throw new Error("The child needs a recorded guardian.");
    return { world, childId, adultId: authority.authority.holder.personId };
  }

  /** The guardian's job at a weekly wage, through the canonical writers. */
  function withJob(world: World, adultId: EntityId, weeklyMinor: number) {
    const home = world.people[adultId]!.homeJurisdictionId;
    let next = createOrganization(world, {
      stableKey: `a137:${adultId}:employer`,
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: "Test employer",
        classification: "enterprise:retail",
        locationJurisdictionId: home,
      },
    });
    next = createWorkRelationship(next, {
      stableKey: `a137:${adultId}:work`,
      personId: adultId,
      organizationId: next.history.organizations.at(-1)!.id,
      startedAt: world.currentDate,
      kind: "employment:local-business",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Clerk",
        occupationClassification: "occupation:office-clerk",
        locationJurisdictionId: home,
        timeDemand: {
          expectedWeekly: { minimumHours: 30, maximumHours: 40 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: home,
        },
      },
    });
    return createWorkCompensation(next, {
      stableKey: `a137:${adultId}:wages`,
      workRelationshipId: next.history.workRelationships.at(-1)!.id,
      startsAt: world.currentDate,
      amount: money(weeklyMinor, "USD"),
      cadenceKind: "schedule:weekly",
      restrictionKind: null,
      jurisdictionId: null,
      provenance,
    });
  }

  it(`reads a teenager's family money from the household's recorded pay (US-${usps}, seed ${seed})`, () => {
    const { world, childId, adultId } = teenLife();
    // Nobody in the household has a recorded job yet: unknown is not zero,
    // so the money is the median child's, marked as an estimate.
    const before = familyMoneyFor(world, childId, "adolescence");
    expect(before.level).toBe("secure");
    expect(before.source.note).toMatch(/^ESTIMATED FROM AVERAGE/);
    // An adult whose early childhood was before the World began: estimated.
    expect(familyMoneyFor(world, adultId, "early-childhood").source.kind).toBe(
      "public-data",
    );

    // The leaf's reading of the home state agrees with the tax system's.
    expect(homeStateKey(world, childId)).toBe(
      residenceStateKey(world, childId),
    );
    const household = householdMembershipsAt(world, childId)[0]!;
    const members = peopleInHouseholdAt(world, household.household.id);
    const line = annualPovertyLineMinor(
      residenceStateKey(world, childId)!,
      members.length,
      world.currentDate,
    );
    // The same household at half, one and a half, and three times the line.
    for (const [multiple, level] of [
      [0.5, "severe-scarcity"],
      [1.5, "strained"],
      [3, "secure"],
    ] as const) {
      const weekly = Math.round((line * multiple) / 52);
      const paid = withJob(world, adultId, weekly);
      const money = familyMoneyFor(paid, childId, "adolescence");
      expect(money.level, `${multiple} times the poverty line`).toBe(level);
      expect(money.source.kind).toBe("world-record");
      expect(upbringingFor(paid, childId).money[1]).toMatchObject({
        period: "adolescence",
        level,
      });
    }
  }, 60_000);
});
