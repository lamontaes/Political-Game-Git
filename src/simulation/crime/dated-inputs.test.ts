import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { addDays, makeIsoDate } from "../dates";
import { recordHouseholdLocation } from "../life";
import { lifePlaceStateIdentities } from "../life-places";
import { stableHash } from "../ids";
import { recordRelationshipInteraction } from "../records";
import { recordPersonDeath } from "../vitality";
import { recordWorldEvent } from "../world";
import {
  crimeCutoff,
  crimeKnownTiesAt,
  crimeResidenceAt,
} from "./dated-inputs";
import { eligibleOffenders } from "./offenders";
import { crimeExposures } from "./producer";

const seed = "session20-dated-crime";
const places = lifePlaceStateIdentities();
const place =
  places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
const provenance = {
  kind: "authored" as const,
  note: "Dated crime boundary fixture",
};
function fixture() {
  const small = smallWorld({
    place: place.usps,
    people: 4,
    household: true,
    seed,
  });
  const world = recordHouseholdLocation(small.world, {
    stableKey: "dated-crime:home",
    householdId: small.world.history.households.at(-1)!.id,
    effectiveAt: small.world.currentDate,
    jurisdictionId: small.jurisdictionId,
    kind: "residence:home",
    label: "Recorded home",
    provenance,
    supersedesLocationId: null,
  });
  return { ...small, world };
}

describe(`dated crime evidence (${place.usps}, ${seed})`, () => {
  it("keeps absent dated residence unknown despite today's home field", () => {
    const f = smallWorld({ place: place.usps, people: 4, seed });
    expect(f.world.people[f.personId]!.homeJurisdictionId).toBe(
      f.jurisdictionId,
    );
    expect(
      crimeResidenceAt(
        f.world,
        f.personId,
        crimeCutoff(f.world, f.world.currentDate),
      ),
    ).toBeNull();
    expect(crimeExposures(f.world, f.world.currentDate)).toHaveLength(0);
  });

  it("uses the recorded home before a later move, including sequence boundaries", () => {
    const f = fixture();
    const before = crimeCutoff(f.world, f.world.currentDate);
    const date = makeIsoDate(addDays(f.world.currentDate, 2));
    const prior = f.world.history.householdLocations.at(-1)!;
    const moved = recordHouseholdLocation(
      {
        ...f.world,
        currentDate: date,
        currentMoment: { ...f.world.currentMoment, date },
      },
      {
        stableKey: "dated-crime:moved",
        householdId: prior.householdId,
        effectiveAt: date,
        jurisdictionId: f.stateJurisdictionId,
        kind: "residence:home",
        label: "Later home",
        provenance,
        supersedesLocationId: prior.id,
      },
    );
    expect(crimeResidenceAt(moved, f.personId, before)).toBe(f.jurisdictionId);
    expect(crimeResidenceAt(moved, f.personId, crimeCutoff(moved, date))).toBe(
      f.stateJurisdictionId,
    );
    expect(
      crimeResidenceAt(
        moved,
        f.personId,
        crimeCutoff(moved, date, before.historySequenceExclusive),
      ),
    ).toBe(f.jurisdictionId);
    expect(
      crimeExposures(moved, before.asOfDate, before.historySequenceExclusive),
    ).toEqual(crimeExposures(f.world, before.asOfDate));
    expect(crimeExposures(moved, date)).toHaveLength(0);
  });

  it("excludes later interactions and same-date records beyond the sequence ceiling", () => {
    const f = smallWorld({ place: place.usps, people: 4, seed });
    const [first, second] = f.world.personOrder;
    const date = makeIsoDate(addDays(f.world.currentDate, 1));
    const met = recordRelationshipInteraction(
      {
        ...f.world,
        currentDate: date,
        currentMoment: { ...f.world.currentMoment, date },
      },
      {
        stableKey: "dated-crime:met",
        personIds: [first!, second!],
        occurredAt: date,
        eventId: null,
        kind: "contact:conversation",
        change: "formed",
        significance: "meaningful",
        summary: "They met.",
        tags: [],
      },
    );
    expect(
      crimeKnownTiesAt(met, [first!], crimeCutoff(met, f.world.currentDate)),
    ).not.toContain(second);
    expect(
      crimeKnownTiesAt(
        met,
        [first!],
        crimeCutoff(met, date, f.world.history.nextSequence),
      ),
    ).not.toContain(second);
    expect(crimeKnownTiesAt(met, [first!], crimeCutoff(met, date))).toContain(
      second,
    );
  });

  it("does not apply a later death to earlier household and alive exposure", () => {
    const f = fixture();
    const date = f.world.currentDate;
    const later = makeIsoDate(addDays(date, 1));
    const dead = recordPersonDeath(
      {
        ...f.world,
        currentDate: later,
        currentMoment: { ...f.world.currentMoment, date: later },
      },
      {
        stableKey: "dated-crime:death",
        personId: f.personId,
        diedAt: later,
        causeKey: "test:recorded-death",
        sourceEntityIds: [f.personId],
        summary: "Recorded later death.",
        provenance,
      },
    );
    expect(crimeExposures(dead, date)).toEqual(crimeExposures(f.world, date));
    expect(
      crimeKnownTiesAt(
        dead,
        [f.world.personOrder[1]!],
        crimeCutoff(dead, date),
      ),
    ).toContain(f.personId);
    expect(
      crimeKnownTiesAt(
        dead,
        [f.world.personOrder[1]!],
        crimeCutoff(dead, later),
      ),
    ).not.toContain(f.personId);
  });

  it("does not import a later referral into prior-record or busy status", () => {
    const f = fixture();
    const date = f.world.currentDate;
    const eligible = eligibleOffenders(f.world, f.jurisdictionId, date);
    expect(eligible.length).toBeGreaterThan(0);
    const personId = eligible[0]!.personId;
    const later = makeIsoDate(addDays(date, 1));
    const referred = recordWorldEvent(
      {
        ...f.world,
        currentDate: later,
        currentMoment: { ...f.world.currentMoment, date: later },
      },
      {
        stableKey: "dated-crime:referral",
        type: "justice.prosecution-referred",
        occurredAt: later,
        recordedAt: later,
        jurisdictionId: f.jurisdictionId,
        involvedEntityIds: [personId],
        participants: [{ personId, role: "focus:subject", detail: "Referred" }],
        personFactConstraints: [],
        visibility: "public",
        tags: [],
        summary: "Later referral.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      },
    );
    expect(eligibleOffenders(referred, f.jurisdictionId, date)).toEqual(
      eligible,
    );
    expect(
      eligibleOffenders(
        referred,
        f.jurisdictionId,
        later,
        f.world.history.nextSequence,
      ),
    ).toEqual(eligible);
    expect(
      eligibleOffenders(
        referred,
        f.jurisdictionId,
        makeIsoDate(addDays(later, 1)),
      ).some((row) => row.personId === personId),
    ).toBe(false);
  });
});
