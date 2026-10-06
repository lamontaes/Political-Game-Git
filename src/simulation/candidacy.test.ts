import { randomInt } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  candidacyEligibility,
  electiveOfficesForJurisdiction,
} from "./candidacy";
import { projectCampaignGuidance } from "./campaign-life-activities";
import * as filing from "./candidate-filing-terms";
import { candidateQualificationRuleSet } from "./candidate-qualification";
import { makeIsoDate } from "./dates";
import { officeQualifications } from "./office-qualification-rules";
import { lifePlaceStateIdentities } from "./life-places";
import { stateExecutiveIdentity } from "./nationwide-world/state-executive-candidacy-packs";
import { chiefExecutiveJurisdictionId } from "./nationwide-world/government-jurisdiction";
import { congressSeats } from "./living-world/congress-seats";
import {
  nominationPlan,
  nominationRuleRow,
} from "./nominations/nomination-rules";

const places = lifePlaceStateIdentities();
const selected = places[randomInt(places.length)]!;
const seed = "session-110-filing-gate";
function executiveJurisdiction(usps: string) {
  const jurisdictionId = chiefExecutiveJurisdictionId(usps);
  if (jurisdictionId === null)
    throw new Error("The fixture requires an executive jurisdiction.");
  return jurisdictionId;
}
afterEach(() => vi.restoreAllMocks());

describe("the one candidacy filing gate", () => {
  it("returns nonblank filing terms in all 56 places, including a random watched place", () => {
    expect(places).toHaveLength(56);
    for (const place of places) {
      const fixture = smallWorld({ place: place.jurisdictionKey, seed });
      const office = stateExecutiveIdentity(place.usps)!;
      const result = candidacyEligibility(fixture.world, {
        personId: fixture.personId,
        jurisdictionId: executiveJurisdiction(place.usps),
        officeKey: office.officeKey,
        alreadyACandidate: false,
      });
      expect(result.filingTerms, place.usps).not.toBeNull();
      expect(result.filingTerms!.deadline).toMatch(/^\d{2}-\d{2}$/);
      expect(result.filingTerms!.estimatedFrom.trim()).not.toBe("");
      if (place.usps === selected.usps)
        process.stdout.write(
          `${JSON.stringify({ seed, place: fixture.place.key, worldId: fixture.world.id, date: fixture.world.currentDate, personId: fixture.personId, terms: result.filingTerms })}\n`,
        );
    }
  });

  it("does not refuse an unread executive for missing research, and preserves its estimated age", () => {
    const unread = places.filter((place) => {
      const office = stateExecutiveIdentity(place.usps)!;
      return (
        officeQualifications(place.jurisdictionKey, "GOVERNOR", "2026-01-05")
          .length === 0 &&
        candidateQualificationRuleSet(
          office.candidacyPackId,
          office.officeKey,
          makeIsoDate("2026-01-05"),
        ) === null
      );
    });
    expect(unread.length).toBeGreaterThan(0);
    for (const place of unread) {
      const fixture = smallWorld({ place: place.jurisdictionKey, seed });
      const person = fixture.world.people[fixture.personId]!;
      const world = {
        ...fixture.world,
        people: {
          ...fixture.world.people,
          [person.id]: { ...person, birthDate: makeIsoDate("1960-01-01") },
        },
      };
      const result = candidacyEligibility(world, {
        personId: person.id,
        jurisdictionId: executiveJurisdiction(place.usps),
        officeKey: stateExecutiveIdentity(place.usps)!.officeKey,
        alreadyACandidate: false,
      });
      expect(result.blocks, place.usps).toEqual([]);
      expect(result.eligible).toBe(true);
      expect(result.filingTerms?.estimated).toBe(true);
      expect(result.office?.qualification.minimumAge).toMatchObject({
        kind: "known",
        source: { verification: "game-profile" },
      });
      expect(result.minimumAgeRequirement).toContain("ESTIMATED FROM AVERAGE");
      const rule = result.office!.qualification.minimumAge;
      if (rule.kind !== "known")
        throw new Error("Expected the marked age estimate.");
      const young = {
        ...world,
        people: {
          ...world.people,
          [person.id]: {
            ...person,
            birthDate: makeIsoDate(
              `${Number(world.currentDate.slice(0, 4)) - rule.value + 1}-01-01`,
            ),
          },
        },
      };
      expect(
        candidacyEligibility(young, {
          personId: person.id,
          jurisdictionId: executiveJurisdiction(place.usps),
          officeKey: result.office!.officeKey,
          alreadyACandidate: false,
        }).blocks.some((block) => block.kind === "profile-minimum-age"),
      ).toBe(true);
    }
  });

  it("preserves a fee-only row and tells the player no petition is required", () => {
    const offered = places
      .map((place) => smallWorld({ place: place.jurisdictionKey, seed }))
      .filter(
        (fixture) =>
          electiveOfficesForJurisdiction(fixture.jurisdictionId).length > 0,
      );
    const fixture = offered[randomInt(offered.length)]!;
    const terms = {
      ...filing.candidateFilingTerms(selected.usps, "local"),
      signatures: 0,
      feeInLieuOfSignatures: false,
      estimated: false,
    };
    vi.spyOn(filing, "candidateFilingTerms").mockReturnValue(terms);
    const office = electiveOfficesForJurisdiction(
      fixture.jurisdictionId,
      fixture.world.currentDate,
      fixture.world,
    )[0]!;
    const result = candidacyEligibility(fixture.world, {
      personId: fixture.personId,
      jurisdictionId: fixture.jurisdictionId,
      officeKey: office.officeKey,
      alreadyACandidate: false,
    });
    expect(result.filingTerms).toEqual(terms);
    const guidance = projectCampaignGuidance(fixture.world, fixture.personId);
    expect(guidance.petitions.note).toContain("No petition is required.");
    expect(guidance.petitions.note).not.toContain("0 signatures");
    expect(guidance.filingFees.note).toContain(
      `$${(terms.feeMinorUnits / 100).toFixed(2)}`,
    );
    expect(guidance.filingDeadline.note).toContain(terms.deadline);
    expect(guidance.filingAuthority.note).toContain("election clerk");
  });

  it("reads each federal office's deadline from the shared nomination filing row", () => {
    for (const place of places) {
      const seats = congressSeats().filter(
        (seat) => seat.stateUsps === place.usps,
      );
      if (!seats.length) continue;
      const fixture = smallWorld({
        place: place.jurisdictionKey,
        date: "2026-01-01",
        seed,
      });
      for (const family of ["us-house", "us-senate"] as const) {
        const seat = seats.find((row) => row.chamberKey === family)!;
        const plan = nominationPlan(fixture.world, {
          stateUsps: place.usps,
          family,
          year: 2026,
          onDate: fixture.world.currentDate,
        });
        const row = nominationRuleRow(place.usps)?.filing;
        const deadline = plan.known
          ? plan.filingDeadline
          : (row?.deadlines2026[family] ?? row?.deadlines2026.all);
        const result = candidacyEligibility(fixture.world, {
          personId: fixture.personId,
          jurisdictionId: fixture.stateJurisdictionId,
          officeKey: seat.seatKey,
          alreadyACandidate: false,
        });
        expect(result.filingTerms!.deadline, `${place.usps}/${family}`).toBe(
          deadline!.slice(5),
        );
      }
    }
  });
});
