import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { isEligibleVoterIn } from "./issue-record";
import { deserializeWorld, serializeWorldPayload } from "./serialization";
import { addDays } from "./dates";
import { generalElectionDay } from "./nominations/nomination-rules";
import stateRules from "../../data/research/elections/state-initiative-rules.json" with { type: "json" };
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import { municipalGovernmentForLifePlace } from "./municipal-government";
import { resolveMunicipalRecallRule } from "./municipal-ballot-rules";
import {
  citizenPetitions,
  startCitizenPetition,
  RECALL_PETITION_CLOSES,
  municipalRecallRule,
  petitionFilingCheck,
  petitionRule,
  type PetitionKind,
} from "./recall";

const kinds: readonly PetitionKind[] = [
  "recall",
  "local-initiative",
  "protest-referendum",
  "state-initiative",
  "state-referendum",
  "constitutional-initiative",
];
describe("one petition rule gate", () => {
  it("returns complete nonblank rows for all six kinds in all56 places", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    expect(Object.keys(stateRules.places)).toHaveLength(56);
    for (const place of places)
      for (const kind of kinds) {
        const row = petitionRule(kind, place.usps);
        expect(row.stateUsps).toBe(place.usps);
        expect(row.kind).toBe(kind);
        expect(row.reason.trim()).not.toBe("");
        expect(row.source.trim()).not.toBe("");
        for (const field of [
          row.threshold,
          row.window,
          row.distribution,
          row.review,
        ])
          expect(Object.keys(field).length).toBeGreaterThan(0);
        expect(JSON.stringify(row)).not.toContain("null,null");
      }
  });
  it("refuses an unauthorized initiative with the row's plain legal reason", () => {
    const sample = Object.entries(stateRules.places).find(
      ([, place]) => !place.kinds["constitutional-initiative"].available,
    )!;
    const row = petitionRule("constitutional-initiative", sample[0]);
    expect(row.basis).toBe("primary-text-read");
    expect(petitionFilingCheck(row)).toEqual({
      allowed: false,
      reason: sample[1].kinds["constitutional-initiative"].reason,
    });
    expect(row.reason).toContain("legislature");
    expect(row.reason).not.toContain("NOT_ESTABLISHED");
  });
  it("keeps unread states operational with explicit median estimate provenance", () => {
    const sample = Object.entries(stateRules.places).find(
      ([, place]) =>
        place.kinds["state-initiative"].basis === "estimated-from-average",
    )!;
    for (const kind of [
      "state-initiative",
      "state-referendum",
      "constitutional-initiative",
    ] as const) {
      const row = petitionRule(kind, sample[0]);
      expect(row.available).toBe(true);
      expect(row.reason).toContain("ESTIMATED FROM AVERAGE");
      expect(row.threshold.percent).toBeGreaterThan(0);
      expect(row.window.days).toBeGreaterThan(0);
      expect(petitionFilingCheck(row).allowed).toBe(true);
    }
  });
  it("retains each town recall resolver's availability, threshold and clock", () => {
    let checked = 0;
    for (const state of lifePlaceStateIdentities()) {
      const place = searchLifePlaces("", 1000, {
        stateJurisdictionKey: state.jurisdictionKey,
      }).find((row) => municipalGovernmentForLifePlace(row));
      if (!place) continue;
      const government = municipalGovernmentForLifePlace(place)!;
      const before = municipalRecallRule(government.key);
      const row = petitionRule("recall", state.usps, {
        governmentKey: government.key,
      });
      expect(row.available).toBe(before.available);
      if (before.available) {
        expect(row.window.days).toBe(before.circulationDays);
        expect(row.window.basis).toBe(before.circulationBasis);
        expect(row.basis).toBe(before.doctrineBasis);
        if (before.threshold) expect(row.threshold).toEqual(before.threshold);
      } else
        expect(petitionFilingCheck(row)).toEqual({
          allowed: false,
          reason: before.reason,
        });
      expect(resolveMunicipalRecallRule(state.usps).stateUsps).toBe(state.usps);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
  it("files a proposition through the shared event reader and close clock, retaining terms after reload", () => {
    const sample = Object.entries(stateRules.places).find(
      ([, place]) =>
        place.kinds["state-initiative"].basis === "estimated-from-average",
    )!;
    const fixture = smallWorld({
      place: sample[0],
      seed: "session-110-petition-rule-clock",
      people: 6,
    });
    const petitionerPersonId = fixture.world.personOrder.find((id) =>
      isEligibleVoterIn(
        fixture.world,
        id,
        fixture.stateJurisdictionId,
        fixture.world.currentDate,
      ),
    )!;
    const propositionId = fixture.world.policyCatalog.propositionOrder[0]!;
    const world = startCitizenPetition(fixture.world, {
      kind: "state-initiative",
      petitionerPersonId,
      jurisdictionId: fixture.stateJurisdictionId,
      stateUsps: fixture.stateUsps,
      propositionId,
    });
    const reloaded = deserializeWorld(serializeWorldPayload(world));
    const petition = citizenPetitions(reloaded)[0]!;
    expect(petition.kind).toBe("state-initiative");
    if (petition.kind === "recall")
      throw new Error("Expected a proposition subject.");
    expect(petition.propositionId).toBe(propositionId);
    expect(petition.targetPersonId).toBeNull();
    expect(petition.rule).toEqual(
      petitionRule("state-initiative", fixture.stateUsps),
    );
    expect(petition.closesAt).toBe(
      addDays(fixture.world.currentDate, Number(petition.rule.window.days)),
    );
    expect(
      reloaded.history.futureDueItems.find(
        (row) => row.stableKey === `${petition.stableKey}:closes`,
      ),
    ).toMatchObject({
      transitionKey: RECALL_PETITION_CLOSES,
      dueAt: petition.closesAt,
    });
  });
  it("applies an actual initiative refusal at filing before creating any petition", () => {
    const sample = Object.entries(stateRules.places).find(
      ([, place]) => !place.kinds["constitutional-initiative"].available,
    )!;
    const fixture = smallWorld({
      place: sample[0],
      seed: "session-110-petition-refusal",
    });
    expect(() =>
      startCitizenPetition(fixture.world, {
        kind: "constitutional-initiative",
        petitionerPersonId: fixture.personId,
        jurisdictionId: fixture.stateJurisdictionId,
        stateUsps: fixture.stateUsps,
        propositionId: fixture.world.policyCatalog.propositionOrder[0]!,
      }),
    ).toThrow(sample[1].kinds["constitutional-initiative"].reason);
    expect(citizenPetitions(fixture.world)).toEqual([]);
  });
  it("uses a read election-relative filing deadline rather than a circulation-duration guess", () => {
    const sample = Object.entries(stateRules.places).find(
      ([, place]) =>
        place.kinds["state-initiative"].window.kind === "election-lead",
    )!;
    const fixture = smallWorld({
      place: sample[0],
      seed: "session-110-petition-deadline",
      people: 6,
    });
    const petitionerPersonId = fixture.world.personOrder.find((id) =>
      isEligibleVoterIn(
        fixture.world,
        id,
        fixture.stateJurisdictionId,
        fixture.world.currentDate,
      ),
    )!;
    const input = {
      kind: "state-initiative" as const,
      petitionerPersonId,
      jurisdictionId: fixture.stateJurisdictionId,
      stateUsps: fixture.stateUsps,
      propositionId: fixture.world.policyCatalog.propositionOrder[0]!,
    };
    expect(() => startCitizenPetition(fixture.world, input)).toThrow(
      "lawful election date",
    );
    const electionDate = generalElectionDay(
      Number(fixture.world.currentDate.slice(0, 4)),
    );
    const world = startCitizenPetition(fixture.world, {
      ...input,
      electionDate,
    });
    const petition = citizenPetitions(world)[0]!;
    expect(petition.closesAt).toBe(
      `${electionDate.slice(0, 4)}-07-${electionDate.slice(8)}`,
    );
  });
});
