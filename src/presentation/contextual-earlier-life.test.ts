import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { defaultPronounsForGender } from "../simulation/person-identity";
import { describe, expect, it } from "vitest";
import {
  buildProductionWorld,
  type ProductionWorldInput,
} from "./production-world";
import { requireLifePlace, searchLifePlaces } from "../simulation/life-places";
import { assertWorldIntegrity } from "../simulation/world";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { generateContextualCharacterHistory } from "../simulation/contextual-character-history";
import { applyCharacterHistoryPlan } from "../simulation/character-history";

const cases = [
  ["Calais", "ME", 22, "lives-alone"],
  ["Portland", "ME", 47, "shares-a-home"],
  ["Duluth", "MN", 35, "lives-alone"],
  ["Minneapolis", "MN", 19, "shares-a-home"],
  ["Tucson", "AZ", 61, "lives-alone"],
  ["Strong City", "KS", 32, "lives-alone"],
  ["Blue Mound", "KS", 46, "shares-a-home"],
  ["Buchanan", "MI", 43, "shares-a-home"],
  ["Coulee City", "WA", 28, "shares-a-home"],
] as const;
function inputFor(
  name: string,
  state: string,
  age: number,
  household: ProductionWorldInput["household"],
): ProductionWorldInput {
  const place = searchLifePlaces(name, 100, {
    stateJurisdictionKey: `US-${state}`,
    scope: "locality",
  }).find((place) => place.displayName === `${name}, ${place.withinName}`);
  if (!place) throw new Error(`Missing nominated place: ${name}, ${state}`);
  return {
    seed: `w-context-v2-heldout:${state}:${name}:${age}`,
    place,
    age,
    givenName: "Avery",
    familyName: "Lane",
    startingLife: "ordinary-life",
    depth: "summarize-earlier-life",
    household,
    earlierLifeGenerationVersion: "context-v2",
  };
}
/**
 * Removes the fields that shipped authored content moves, and only those.
 * Organization profiles keep every field but `name`, so a profile that changes
 * any other way still reaches the comparison.
 */
function withoutShippedContent(serialized: string): string {
  const parsed = JSON.parse(serialized) as {
    snapshotId?: unknown;
    world: {
      policyCatalog?: unknown;
      history: { organizationProfiles: Record<string, unknown>[] };
    };
  };
  delete parsed.snapshotId;
  delete parsed.world.policyCatalog;
  for (const profile of parsed.world.history.organizationProfiles)
    delete profile.name;
  return JSON.stringify(parsed);
}
describe("versioned canonical earlier life", () => {
  it("preserves the captured pre-repair 171bb production save byte-for-byte", () => {
    const payload = readFileSync(
      new URL(
        "./fixtures/playtest65-context-legacy-171bb.json",
        import.meta.url,
      ),
      "utf8",
    );
    const world = deserializeWorld(payload);
    const before = serializeWorld(world);
    expect(createHash("sha256").update(before).digest("hex")).toBe(
      "f57082935ecdccf7706a5e3b5ed77c88219a1cf5488b0f1bed2f949f1650c499",
    );
    const playerPersonId =
      world.control.kind === "person"
        ? world.control.personId
        : world.personOrder[0]!;
    const result = applyCharacterHistoryPlan(
      world,
      generateContextualCharacterHistory(world, {
        stableKey: "production:earlier-life",
        personId: playerPersonId,
        jurisdictionId: world.people[playerPersonId]!.homeJurisdictionId!,
      }),
    ).world;
    expect(serializeWorld(result)).toBe(before);
    // The captured save is the promise, and the two assertions above hold it
    // exactly: it loads byte-for-byte, and the earlier-life generator leaves
    // it alone. A REBUILD from the same descriptor is a weaker claim, because
    // a rebuilt world carries whatever authored content this build ships.
    // Two lanes shipped some on 2026-09-22 — the sourced policy vocabulary
    // (#379) and generated school names (#378) — and main re-accepted its own
    // legacy-opening hashes for exactly that reason (`3c168794`,
    // `world46-opening.test.ts`). Measured here against this fixture, the
    // rebuild differs from the capture in exactly three places and nowhere
    // else: `world.policyCatalog`, the `name` of each generated organization
    // profile ("Local Elementary School" and its two siblings), and
    // `snapshotId`, which is a digest of those. Everything else — people,
    // jurisdictions, the rest of history, every other field of every profile —
    // is still required to match.
    const replay = buildProductionWorld({
      ...inputFor("Duluth", "MN", 35, "lives-alone"),
      seed: "w-context-legacy-171bb-duluth",
      earlierLifeGenerationVersion: undefined,
    }).world;
    expect(withoutShippedContent(serializeWorld(replay))).toBe(
      withoutShippedContent(before),
    );
  });
  it.each(cases)(
    "keeps %s %s family and known history without universal institutions",
    (name, state, age, household) => {
      const input = inputFor(name, state, age, household);
      const gender =
        age % 3 === 0 ? "male" : age % 3 === 1 ? "female" : "nonbinary";
      const variedInput = {
        ...input,
        identity: { gender, pronouns: defaultPronounsForGender(gender) },
      } as ProductionWorldInput;
      const { world, playerPersonId } = buildProductionWorld(variedInput);
      assertWorldIntegrity(world);
      expect(world.history.organizations).toHaveLength(0);
      expect(world.history.educationEnrollments).toHaveLength(0);
      expect(world.history.workRelationships).toHaveLength(0);
      expect(world.history.kinshipRelationships).not.toHaveLength(0);
      expect(
        world.history.relationshipInteractions.some((record) =>
          record.personIds.includes(playerPersonId),
        ),
      ).toBe(true);
      const serialized = serializeWorld(world);
      expect(serializeWorld(deserializeWorld(serialized))).toBe(serialized);
      expect(serializeWorld(buildProductionWorld(variedInput).world)).toBe(
        serialized,
      );
      const repeated = applyCharacterHistoryPlan(
        world,
        generateContextualCharacterHistory(world, {
          stableKey: "production:earlier-life",
          personId: playerPersonId,
          jurisdictionId: input.place.context.jurisdiction.id,
        }),
      ).world;
      expect(serializeWorld(repeated)).toBe(serialized);
    },
  );
  it("keeps D.C. distinct and puts a school-age child in the school they attend", () => {
    const input: ProductionWorldInput = {
      seed: "w-context-v2-dc-child",
      place: requireLifePlace("1150000"),
      age: 10,
      givenName: "Morgan",
      familyName: "Lane",
      startingLife: "ordinary-life",
      depth: "play-formative-years",
      household: "shares-a-home",
      earlierLifeGenerationVersion: "context-v2",
    };
    const { world, playerPersonId } = buildProductionWorld(input);
    assertWorldIntegrity(world);
    // `context-v2` declines to invent a school in an ADULT's summarized past.
    // A ten-year-old is a different claim: they are in school now, and that is
    // present circumstance rather than invented biography. This assertion read
    // zero before that distinction was drawn, and a ten-year-old with no
    // enrollment made `in-school` false, every early.school and early.peer
    // opening ineligible, and left the town with no school in it.
    const mine = world.history.educationEnrollments.filter(
      (enrollment) => enrollment.personId === playerPersonId,
    );
    expect(mine).toHaveLength(1);
    // The classmates are enrolled at the same school, not at invented ones.
    const schools = new Set(
      world.history.educationEnrollments.map(
        (enrollment) => enrollment.organizationId,
      ),
    );
    expect(schools).toEqual(new Set([mine[0]!.organizationId]));
    expect(world.history.workRelationships).toHaveLength(0);
    expect(world.history.childAuthorities.length).toBeGreaterThan(0);
    expect(world.personOrder.length).toBeGreaterThan(1);
  });
  it("leaves absent-version legacy records and serialization intact", () => {
    const input = {
      ...inputFor("Duluth", "MN", 35, "lives-alone"),
      earlierLifeGenerationVersion: undefined,
    };
    const { world } = buildProductionWorld(input);
    expect(world.history.organizationProfiles.map((p) => p.name)).toContain(
      "Neighborhood Market",
    );
    expect(world.history.educationEnrollments.length).toBeGreaterThan(0);
    expect(world.history.workRelationships.length).toBeGreaterThan(0);
    expect(serializeWorld(deserializeWorld(serializeWorld(world)))).toBe(
      serializeWorld(world),
    );
  });
});
