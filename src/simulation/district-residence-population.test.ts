import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import populationData from "../districts/place-district-population.generated.json" with { type: "json" };
import { districtIdentityCatalog } from "../districts/catalog";
import {
  bindingFromIdentity,
  districtsCrossingPlace,
} from "../districts/query";
import { largestPopulationShareDistrict } from "../districts/place-population-share";
import type { DistrictChamber, DistrictIdentity } from "../districts/types";
import {
  assignSplitHomeDistricts,
  chooseSplitHomeDistrict,
  districtResidenceIntervals,
  establishDistrictResidence,
  splitHomeDistricts,
} from "./district-residence";
import { factsForPerson } from "./people";
import { deserializeWorld, serializeWorld } from "./serialization";

interface PopulationCatalog {
  readonly populations: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
}
const recorded = populationData as unknown as PopulationCatalog;
const chambers: readonly DistrictChamber[] = ["state-lower", "state-upper"];
const identities = districtIdentityCatalog();
const seenStates = new Set<string>();
const sampled = Array.from({ length: 2 }, (_, index) => {
  const seed = `a144-population-placement-all56-${index}`;
  const place = drawRandomPlace(seed, (candidate) => {
    if (
      !candidate.sourceGeoid ||
      !candidate.stateJurisdictionKey ||
      seenStates.has(candidate.stateJurisdictionKey)
    )
      return false;
    const placeGeoid = candidate.sourceGeoid;
    return chambers.some((chamber) => {
      const candidates = districtsCrossingPlace(
        identities,
        placeGeoid,
        chamber,
      );
      const counts =
        recorded.populations[`${candidate.sourceGeoid}:${chamber}`];
      return (
        candidates.length > 1 &&
        counts !== undefined &&
        candidates.every(
          (district) =>
            Number.isSafeInteger(counts[district.geoid]) &&
            counts[district.geoid]! >= 0,
        ) &&
        candidates.some((district) => counts[district.geoid]! > 0)
      );
    });
  });
  seenStates.add(place.stateJurisdictionKey!);
  return { seed, place };
});

function expectedLargest(
  placeGeoid: string,
  chamber: DistrictChamber,
  candidates: readonly DistrictIdentity[],
) {
  const counts = recorded.populations[`${placeGeoid}:${chamber}`];
  if (!counts)
    throw new Error("The sampled split place has no locked population record.");
  const ranked = [...candidates].sort(
    (left, right) =>
      counts[right.geoid]! - counts[left.geoid]! ||
      left.geoid.localeCompare(right.geoid),
  );
  const total = candidates.reduce(
    (sum, candidate) => sum + counts[candidate.geoid]!,
    0,
  );
  return {
    identity: ranked[0]!,
    population: counts[ranked[0]!.geoid]!,
    totalPopulation: total,
    share: counts[ranked[0]!.geoid]! / total,
  };
}

function selectedCase(placeGeoid: string) {
  for (const chamber of chambers) {
    const candidates = districtsCrossingPlace(identities, placeGeoid, chamber);
    if (
      candidates.length > 1 &&
      largestPopulationShareDistrict(placeGeoid, chamber, candidates)
    )
      return { chamber, candidates };
  }
  throw new Error(
    "The sampled home has no supported split district population.",
  );
}

afterEach(() => vi.restoreAllMocks());

describe("split-home placement follows recorded population rather than a seed", () => {
  for (const { seed, place } of sampled) {
    it(`writes the largest recorded population share and current residence provenance in ${place.key} (${seed})`, () => {
      const built = smallWorld({ place: place.key, seed });
      const residence = factsForPerson(
        built.world.people[built.personId]!,
      ).find((fact) => fact.kind === "residence" && fact.endedAt === null)!;
      expect(residence).toBeDefined();
      const before = serializeWorld(built.world);
      const assigned = assignSplitHomeDistricts(built.world, built.personId);
      let supported = 0;
      for (const chamber of chambers) {
        const candidates = splitHomeDistricts(
          built.world,
          built.personId,
          chamber,
        );
        const selected = largestPopulationShareDistrict(
          place.sourceGeoid!,
          chamber,
          candidates,
        );
        if (!selected) continue;
        supported += 1;
        const expected = expectedLargest(
          place.sourceGeoid!,
          chamber,
          candidates,
        );
        expect(selected).toEqual(expected);
        const interval = districtResidenceIntervals(assigned).find(
          (row) =>
            row.personId === built.personId &&
            row.binding.chamber === chamber &&
            row.endedOn === null,
        );
        expect(interval?.binding.recordId).toBe(expected.identity.recordId);
        expect(interval?.provenance.method).toBe("split-home-assignment");
        expect(interval?.provenance.sourceEventId).toBe(residence.id);
        expect(interval?.startedOn).toBe(residence.occurredAt);
        expect(interval?.provenance.note).not.toMatch(/by seed|random|drawn/i);
      }
      expect(supported).toBeGreaterThan(0);
      expect(serializeWorld(built.world)).toBe(before);
    });

    it(`keeps the choice across different seeds, save/reload, and repeated assignment in ${place.key}`, () => {
      const key = place.sourceGeoid!;
      const { chamber, candidates } = selectedCase(key);
      const expected = expectedLargest(key, chamber, candidates);
      for (const suffix of ["first", "second", "third"]) {
        const built = smallWorld({
          place: place.key,
          seed: `${seed}:${suffix}`,
        });
        const assigned = assignSplitHomeDistricts(built.world, built.personId);
        const rows = districtResidenceIntervals(assigned).filter(
          (row) =>
            row.personId === built.personId &&
            row.binding.chamber === chamber &&
            row.endedOn === null,
        );
        expect(rows).toHaveLength(1);
        expect(rows[0]!.binding.recordId).toBe(expected.identity.recordId);
        const saved = serializeWorld(assigned);
        const reloaded = deserializeWorld(saved);
        expect(serializeWorld(reloaded)).toBe(saved);
        expect(
          serializeWorld(assignSplitHomeDistricts(reloaded, built.personId)),
        ).toBe(saved);
      }
    });

    it(`preserves an existing interval and the player's later explicit choice in ${place.key}`, () => {
      const built = smallWorld({ place: place.key, seed: `${seed}:manual` });
      const { chamber, candidates } = selectedCase(place.sourceGeoid!);
      const expected = expectedLargest(place.sourceGeoid!, chamber, candidates);
      const alternative = candidates.find(
        (candidate) => candidate.recordId !== expected.identity.recordId,
      )!;
      const established = establishDistrictResidence(built.world, {
        personId: built.personId,
        binding: bindingFromIdentity(alternative),
        startedOn: built.world.currentDate,
        provenance: {
          method: "authored",
          sourceEventId: null,
          note: "Explicit existing-interval fixture, not a population-derived choice.",
        },
      });
      if (established.kind === "refused") throw new Error(established.reason);
      const preserved = assignSplitHomeDistricts(
        established.world,
        built.personId,
      );
      expect(
        districtResidenceIntervals(preserved).find(
          (row) => row.id === established.interval.id,
        ),
      ).toEqual(established.interval);
      expect(
        districtResidenceIntervals(preserved)
          .filter(
            (row) =>
              row.personId === built.personId &&
              row.binding.chamber === chamber &&
              row.endedOn === null,
          )
          .map((row) => row.binding.recordId),
      ).toEqual([alternative.recordId]);

      const automaticallyAssigned = assignSplitHomeDistricts(
        built.world,
        built.personId,
      );
      const chosen = chooseSplitHomeDistrict(
        automaticallyAssigned,
        built.personId,
        bindingFromIdentity(alternative),
      );
      if (chosen.kind === "refused") throw new Error(chosen.reason);
      expect(chosen.interval.binding.recordId).toBe(alternative.recordId);
      expect(chosen.interval.provenance.note).toBe(
        "Chosen by the player among the districts crossing their town.",
      );
      const savedChoice = serializeWorld(chosen.world);
      const continued = deserializeWorld(savedChoice);
      expect(
        serializeWorld(assignSplitHomeDistricts(continued, built.personId)),
      ).toBe(savedChoice);
    });

    it(`leaves an older unassigned save unassigned when merely loaded in ${place.key}`, () => {
      const built = smallWorld({
        place: place.key,
        seed: `${seed}:older-save`,
      });
      expect(districtResidenceIntervals(built.world)).toHaveLength(0);
      const saved = serializeWorld(built.world);
      const reloaded = deserializeWorld(saved);
      expect(districtResidenceIntervals(reloaded)).toHaveLength(0);
      expect(serializeWorld(reloaded)).toBe(saved);
    });
  }

  it("breaks equal recorded-count ties by district GEOID regardless of candidate order", async () => {
    const { place } = sampled[0]!;
    const { chamber, candidates } = selectedCase(place.sourceGeoid!);
    const ordered = [...candidates].sort((left, right) =>
      left.geoid.localeCompare(right.geoid),
    );
    // Explicit query fixture using real crossing identities; these equal counts
    // test tie behavior and are not presented as Census measurements.
    const counts = Object.fromEntries(
      ordered.map((identity, index) => [identity.geoid, index < 2 ? 17 : 0]),
    );
    vi.resetModules();
    vi.doMock("../districts/place-district-population.generated.json", () => ({
      default: {
        ...populationData,
        populations: { [`${place.sourceGeoid}:${chamber}`]: counts },
      },
    }));
    try {
      const reader = await import("../districts/place-population-share");
      for (const list of [ordered, [...ordered].reverse()]) {
        const result = reader.largestPopulationShareDistrict(
          place.sourceGeoid!,
          chamber,
          list,
        );
        expect(result?.identity.geoid).toBe(ordered[0]!.geoid);
        expect(result?.population).toBe(17);
        expect(result?.totalPopulation).toBe(34);
        expect(result?.share).toBe(0.5);
      }
    } finally {
      vi.doUnmock("../districts/place-district-population.generated.json");
      vi.resetModules();
    }
  });
});
