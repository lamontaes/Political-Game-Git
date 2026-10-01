import { expect, it } from "vitest";
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import { createOrganization, createWorkRelationship } from "./life";
import { requireLifePlace, stateJurisdictionForKey } from "./life-places";
import { startTownJobPay } from "./living-world/town-pay";
import { TOWN_EMPLOYMENT_VERSION } from "./living-world/town-employment";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { createStartingPerson } from "./people";
import { createProductionPolicyCatalog } from "./production-catalog";
import { resourceFlowTermsAt } from "./resource-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import { createWorld, createWorldId } from "./world";

const authored = {
  kind: "authored" as const,
  note: "Explicit public museum shop employee with recorded forty-hour work and ten-year tenure; no empirical actor or employer estimate.",
};
function initialPay(placeKey: string, variant: string) {
  const place = requireLifePlace(placeKey);
  const seed = `a40-placement:${placeKey}:${variant}`;
  // The existing first-pay catch-up starts January 16, where these sourced
  // starting phases exist. Earlier absent legal terms remain unsupported.
  const currentDate = makeIsoDate("2026-02-16");
  const person = createStartingPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    currentDate,
    age: 45,
    homeJurisdictionId: place.context.jurisdiction.id,
  });
  let world = createWorld({
    seed,
    currentDate,
    currentMoment: simulationMomentOnLocalDate(
      place.context.initialMoment,
      currentDate,
    ),
    people: [person],
    jurisdictions: [
      place.context.jurisdiction,
      stateJurisdictionForKey(place.stateJurisdictionKey!)!,
      NATIONAL_ELECTION_JURISDICTION,
    ],
    policyCatalog: createProductionPolicyCatalog(),
  });
  world = createOrganization(world, {
    stableKey: "fixture:a40:employer",
    formedAt: makeIsoDate("2015-01-16"),
    provenance: authored,
    initialProfile: {
      name: "Authored public museum",
      classification: "sector:state-government-office",
      locationJurisdictionId: place.context.jurisdiction.id,
    },
  });
  const employer = world.history.organizations.at(-1)!;
  world = createWorkRelationship(world, {
    stableKey: `${TOWN_EMPLOYMENT_VERSION}:fixture:a40:work`,
    personId: person.id,
    organizationId: employer.id,
    startedAt: makeIsoDate("2016-01-16"),
    kind: "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: authored,
    initialRole: {
      title: "Museum shop employee",
      occupationClassification: "occupation:retail-sales",
      locationJurisdictionId: place.context.jurisdiction.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: place.context.jurisdiction.id,
      },
    },
  });
  const work = world.history.workRelationships.at(-1)!;
  const paid = startTownJobPay(world, null, currentDate);
  const flow = paid.history.resourceFlows.find(
    (row) =>
      row.basisReference.kind === "work" &&
      row.basisReference.workRelationshipId === work.id,
  )!;
  expect(flow).toBeDefined();
  const terms = resourceFlowTermsAt(paid, flow.id)!;
  expect(terms.amount.minorUnits).toBeGreaterThan(0);
  expect(terms.cadenceKind).toMatch(/^schedule:town-biweekly-/);
  expect(startTownJobPay(paid, null, currentDate)).toBe(paid);
  expect(
    serializeWorld(
      startTownJobPay(
        deserializeWorld(serializeWorld(paid)),
        null,
        currentDate,
      ),
    ),
  ).toBe(serializeWorld(paid));
  return terms;
}
it.each(["1150000", "2836000", "5363000", "2938000", "3451000"])(
  "A40 same recorded job/tenure in %s receives the same initial pay across seeds",
  (placeKey) => {
    const first = initialPay(placeKey, "first");
    const second = initialPay(placeKey, "second");
    expect(second.amount).toEqual(first.amount);
    expect(second.provenance).toEqual(first.provenance);
  },
);
