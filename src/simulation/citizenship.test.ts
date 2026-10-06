import { describe, expect, it } from "vitest";
import nominationRules from "../../data/research/elections/party-nomination-rules-2026.json";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { createCharacterHistoryContextPerson } from "./character-history";
import { initializePersonCitizenship } from "./citizenship-creation";
import { citizenshipSharesForJurisdiction } from "./county-citizenship";
import corpus from "./county-citizenship.generated.json";
import {
  citizenshipEligibility,
  citizenshipStatusOf,
  recordCitizenshipTransition,
} from "./citizenship";
import { addDays, makeIsoDate } from "./dates";
import { searchLifePlaces } from "./life-places";
import { createLightweightPerson, createStartingPerson } from "./people";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assessOfficeQualifications } from "./office-qualification-rules";
import { createWorldId, assertWorldIntegrityFully } from "./world";
import type { World } from "./types";

const seed = "session13-citizenship-county-status";
const place = drawRandomPlace(seed);
function fixture() {
  const { world } = smallWorld({ place: place.key, seed, date: "2026-01-05" });
  console.log(
    `Citizenship source fixture: ${place.displayName}; seed ${seed}; not played-route proof.`,
  );
  return { world, personId: world.personOrder[0]! };
}
function naturalize(world: World, personId: World["personOrder"][number]) {
  return recordCitizenshipTransition(world, {
    stableKey: "fixture:naturalization",
    personId,
    effectiveAt: world.currentDate,
    kind: "naturalization",
    status: "naturalized-citizen",
    citizenSince: world.currentDate,
    sourceEntityIds: [],
    reason:
      "Authored dated naturalization authority for the saved-record regression, not a played choice.",
  });
}

describe("canonical private citizenship", () => {
  it("seeds every jurisdiction's new people from actual county shares or a marked fallback", () => {
    const jurisdictions = Object.keys(nominationRules.places).sort();
    expect(jurisdictions).toHaveLength(56);
    const worldId = createWorldId(seed);
    for (const jurisdiction of jurisdictions) {
      const town = searchLifePlaces("", 100_000, {
        stateJurisdictionKey: jurisdiction,
      }).find((row) => row.scope !== "state")!;
      expect(town).toBeDefined();
      const input = {
        worldId,
        worldSeed: seed,
        index: 0,
        currentDate: makeIsoDate("2026-01-05"),
        homeJurisdictionId: town.context.jurisdiction.id,
      };
      const person = createLightweightPerson(input);
      expect(person.citizenshipStatuses).toHaveLength(1);
      const status = person.citizenshipStatuses![0]!;
      const shares = citizenshipSharesForJurisdiction(input.homeJurisdictionId);
      expect(status.provenance).toMatchObject({
        method: "estimated-from-population-share",
        basis: shares.basis,
        countyGeoids: shares.countyGeoids,
      });
      expect(status.visibility).toBe("private");
      expect(status.sourceEventId).toBeNull();
      expect(createLightweightPerson(input).citizenshipStatuses).toEqual(
        person.citizenshipStatuses,
      );
      const { citizenshipStatuses: previous, ...unassigned } = person;
      expect(previous).toHaveLength(1);
      expect(
        initializePersonCitizenship(
          {
            ...unassigned,
            givenName: "Changed",
            familyName: "Name",
            appearance: undefined,
          },
          seed,
          input.currentDate,
        ).citizenshipStatuses,
      ).toEqual(person.citizenshipStatuses);
    }
    expect(Object.keys(corpus.counties)).toHaveLength(3222);
    for (const row of Object.values(corpus.counties))
      expect(row.citizenByBirth + row.naturalizedCitizen + row.noncitizen).toBe(
        row.total,
      );
  });

  it("covers starting people, appended context people, and save reload without leaking a public event", () => {
    const f = fixture();
    const starting = createStartingPerson({
      worldId: f.world.id,
      worldSeed: seed,
      currentDate: f.world.currentDate,
      age: 35,
      homeJurisdictionId: f.world.people[f.personId]!.homeJurisdictionId,
    });
    expect(starting.citizenshipStatuses).toHaveLength(1);
    const appended = createCharacterHistoryContextPerson(f.world, {
      stableKey: "citizenship:context-person",
      givenName: "Fixture",
      familyName: "Person",
      birthDate: makeIsoDate("1980-01-01"),
      homeJurisdictionId: f.world.people[f.personId]!.homeJurisdictionId,
    });
    const added = appended.personOrder.at(-1)!;
    expect(citizenshipStatusOf(appended, added)?.provenance.method).toBe(
      "estimated-from-population-share",
    );
    expect(appended.history.events).toEqual(f.world.history.events);
    const restored = deserializeWorld(serializeWorld(appended));
    for (const id of appended.personOrder)
      expect(citizenshipStatusOf(restored, id)).toEqual(
        citizenshipStatusOf(appended, id),
      );
  });

  it("records naturalization once, preserves private evidence and dates, and survives reload", () => {
    const f = fixture();
    const before = serializeWorld(f.world);
    const changed = naturalize(f.world, f.personId);
    const status = citizenshipStatusOf(changed, f.personId)!;
    console.log(
      JSON.stringify({
        place: place.displayName,
        seed,
        personId: f.personId,
        name: `${changed.people[f.personId]!.givenName} ${changed.people[f.personId]!.familyName}`,
        before: citizenshipStatusOf(f.world, f.personId),
        after: status,
        minimumSevenYears: citizenshipEligibility(changed, f.personId, {
          minimumYears: 7,
        }).verdict,
        proof: "source regression, not a played naturalization",
      }),
    );
    expect(status).toMatchObject({
      status: "naturalized-citizen",
      citizenSince: changed.currentDate,
      visibility: "private",
      provenance: { method: "recorded-event" },
    });
    expect(changed.history.events.at(-1)).toMatchObject({
      id: status.sourceEventId,
      type: "citizenship.status-recorded",
      visibility: "private",
    });
    expect(
      citizenshipStatusOf(changed, f.personId, {
        historySequenceExclusive: status.sequence!,
      }),
    ).toEqual(citizenshipStatusOf(f.world, f.personId));
    expect(citizenshipEligibility(changed, f.personId).verdict).toBe("meets");
    expect(
      citizenshipEligibility(changed, f.personId, { minimumYears: 7 }).verdict,
    ).toBe("fails");
    expect(serializeWorld(f.world)).toBe(before);
    expect(naturalize(changed, f.personId)).toBe(changed);
    const saved = deserializeWorld(serializeWorld(changed));
    expect(citizenshipStatusOf(saved, f.personId)).toEqual(status);
    expect(naturalize(saved, f.personId)).toBe(saved);
    assertWorldIntegrityFully(saved);
  });

  it("does not rewrite status when name, appearance, home, or behavior changes", () => {
    const f = fixture();
    const person = f.world.people[f.personId]!;
    const changed = {
      ...f.world,
      people: {
        ...f.world.people,
        [f.personId]: {
          ...person,
          givenName: "Other",
          familyName: "Name",
          homeJurisdictionId: f.world.personOrder.length
            ? f.world.jurisdictionOrder.at(-1)!
            : person.homeJurisdictionId,
          appearance: undefined,
        },
      },
    };
    expect(citizenshipStatusOf(changed, f.personId)).toEqual(
      citizenshipStatusOf(f.world, f.personId),
    );
    expect(
      initializePersonCitizenship(
        changed.people[f.personId]!,
        "different-seed",
        changed.currentDate,
      ),
    ).toBe(changed.people[f.personId]);
  });

  it("reads the latest same-day transition by recorded sequence and never grants others knowledge", () => {
    const f = fixture();
    const naturalized = naturalize(f.world, f.personId);
    const first = citizenshipStatusOf(naturalized, f.personId)!;
    const lost = recordCitizenshipTransition(naturalized, {
      stableKey: "fixture:citizenship-loss",
      personId: f.personId,
      effectiveAt: naturalized.currentDate,
      kind: "citizenship-loss",
      status: "noncitizen",
      citizenSince: null,
      sourceEntityIds: [first.sourceEventId!],
      reason:
        "Authored citizenship-loss authority for same-day sequence regression only.",
    });
    const final = citizenshipStatusOf(lost, f.personId)!;
    expect(final.status).toBe("noncitizen");
    expect(final.provenance.sourceEntityIds).toEqual([first.sourceEventId]);
    expect(lost.history.events.at(-1)!.tags).toContain(
      `source-record:${first.sourceEventId}`,
    );
    expect(
      citizenshipStatusOf(lost, f.personId, {
        historySequenceExclusive: final.sequence!,
      }),
    ).toEqual(first);
    expect(citizenshipEligibility(lost, f.personId).verdict).toBe("fails");
    expect(lost.history.knowledge).toBe(f.world.history.knowledge);
    expect(lost.currentMoment).toEqual(f.world.currentMoment);
    expect(
      citizenshipStatusOf(deserializeWorld(serializeWorld(lost)), f.personId),
    ).toEqual(final);
  });

  it("keeps old-save absence unknown and refuses future transitions and conflicting stable keys", () => {
    const f = fixture();
    const { citizenshipStatuses: previous, ...person } =
      f.world.people[f.personId]!;
    expect(previous).toHaveLength(1);
    const old = {
      ...f.world,
      people: { ...f.world.people, [f.personId]: person },
    };
    expect(citizenshipStatusOf(old, f.personId)).toBeNull();
    expect(citizenshipEligibility(old, f.personId)).toMatchObject({
      isCitizen: null,
      verdict: "unverified",
    });
    expect(
      citizenshipStatusOf(deserializeWorld(serializeWorld(old)), f.personId),
    ).toBeNull();
    const input = {
      stableKey: "invalid",
      personId: f.personId,
      effectiveAt: addDays(f.world.currentDate, 1),
      kind: "naturalization" as const,
      status: "naturalized-citizen" as const,
      citizenSince: addDays(f.world.currentDate, 1),
      sourceEntityIds: [],
      reason: "Fixture future event",
    };
    expect(() => recordCitizenshipTransition(f.world, input)).toThrow(
      /nonfuture/,
    );
    expect(() =>
      citizenshipStatusOf(f.world, f.personId, { asOfDate: input.effectiveAt }),
    ).toThrow(/future/);
    expect(() =>
      recordCitizenshipTransition(naturalize(f.world, f.personId), {
        ...input,
        stableKey: "fixture:naturalization",
      }),
    ).toThrow(/conflicts/);
  });

  it("can confirm a supplied earlier naturalization date without backdating the creation estimate", () => {
    const f = fixture();
    const citizenSince = addDays(
      f.world.people[f.personId]!.birthDate,
      365 * 8,
    );
    const confirmed = recordCitizenshipTransition(f.world, {
      stableKey: "fixture:document-confirms-naturalization",
      personId: f.personId,
      effectiveAt: f.world.currentDate,
      kind: "status-confirmation",
      status: "naturalized-citizen",
      citizenSince,
      sourceEntityIds: [],
      reason:
        "Authored dated-document confirmation fixture; not an inferred naturalization date.",
    });
    expect(citizenshipStatusOf(confirmed, f.personId)).toMatchObject({
      effectiveAt: f.world.currentDate,
      recordedAt: f.world.currentDate,
      citizenSince,
    });
    expect(
      citizenshipEligibility(confirmed, f.personId, { minimumYears: 7 })
        .verdict,
    ).toBe("meets");
    expect(
      citizenshipStatusOf(confirmed, f.personId, {
        asOfDate: addDays(f.world.currentDate, -1),
      }),
    ).toBeNull();
  });

  it("uses citizenship status without inventing a duration or substituting all elective rules", () => {
    const f = fixture();
    const person = f.world.people[f.personId]!;
    const common = {
      person,
      stateJurisdictionKey: "US-MO",
      officeFamily: "GOVERNOR" as const,
      stateResidenceSince: person.birthDate,
      districtResidenceSince: null,
      onDate: f.world.currentDate,
    };
    const citizenship = (
      citizenStatus: boolean | null,
      citizenSince: typeof person.birthDate | null,
    ) =>
      assessOfficeQualifications({
        ...common,
        citizenStatus,
        citizenSince,
      }).find((row) => row.field === "US_CITIZENSHIP");
    expect(citizenship(false, null)?.verdict).toBe("fails");
    expect(citizenship(null, null)?.verdict).toBe("not-evaluated");
    expect(citizenship(true, null)?.verdict).toBe("not-evaluated");
    expect(citizenship(true, f.world.currentDate)?.verdict).toBe("fails");
    const changed = naturalize(f.world, f.personId);
    expect(
      citizenshipEligibility(changed, f.personId).sourceEntityIds,
    ).toContain(changed.history.events.at(-1)!.id);
  });
});
