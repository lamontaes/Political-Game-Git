import { expect, it } from "vitest";
import { fairnessLawCovers } from "./fairness-pay-law";

// Burn (2018), Journal of Labor Research: average hourly-pay gain in the
// studied population. Calibration evidence, never an individual offer rule.
const RESEARCHED_AVERAGE_GAIN = 0.027;
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import {
  createOrganization,
  createPartnership,
  createWorkRelationship,
} from "./life";
import { requireLifePlace, stateJurisdictionForKey } from "./life-places";
import { startTownJobPay } from "./living-world/town-pay";
import { TOWN_EMPLOYMENT_VERSION } from "./living-world/town-employment";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import {
  createLightweightPerson,
  createStartingPerson,
  personName,
} from "./people";
import { createProductionPolicyCatalog } from "./production-catalog";
import { resourceFlowTermsAt } from "./resource-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import { createWorld, createWorldId } from "./world";

const authored = {
  kind: "authored" as const,
  note: "Explicit public museum shop employee with recorded forty-hour work and ten-year tenure; explicit male couple control. No discriminatory employer offer is authored.",
};
function initialPay(placeKey: string, partnered: boolean) {
  const place = requireLifePlace(placeKey);
  const seed = `a43-recorded-offer:${placeKey}`;
  // The existing first-pay catch-up starts January 16, where these sourced
  // starting phases exist. Earlier absent legal terms remain unsupported.
  const currentDate = makeIsoDate("2026-02-16");
  const person = createStartingPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    currentDate,
    age: 45,
    identity: { gender: "male", pronouns: "he-him" },
    homeJurisdictionId: place.context.jurisdiction.id,
  });
  const partner = {
    ...createLightweightPerson({
      worldId: createWorldId(seed),
      worldSeed: seed,
      index: 1,
      currentDate,
      homeJurisdictionId: place.context.jurisdiction.id,
    }),
    identity: { gender: "male" as const, pronouns: "he-him" as const },
  };
  let world = createWorld({
    seed,
    currentDate,
    currentMoment: simulationMomentOnLocalDate(
      place.context.initialMoment,
      currentDate,
    ),
    people: [person, partner],
    jurisdictions: [
      place.context.jurisdiction,
      stateJurisdictionForKey(place.stateJurisdictionKey!)!,
      NATIONAL_ELECTION_JURISDICTION,
    ],
    policyCatalog: createProductionPolicyCatalog(),
  });
  if (partnered)
    world = createPartnership(world, {
      stableKey: "fixture:a43:partnership",
      personIds: [person.id, partner.id],
      startedAt: makeIsoDate("2026-01-16"),
      kind: "legal:marriage",
      provenance: authored,
    });
  world = createOrganization(world, {
    stableKey: "fixture:a43:employer",
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
    stableKey: `${TOWN_EMPLOYMENT_VERSION}:fixture:a43:work`,
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
      title: "Museum financial manager",
      occupationClassification: "profession:financial-manager",
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
  expect(
    flow,
    `${personName(person)} / ${person.id} / ${work.id}`,
  ).toBeDefined();
  const terms = resourceFlowTermsAt(paid, flow.id)!;
  expect(terms.amount.minorUnits).toBeGreaterThan(0);
  expect(terms.provenance).not.toMatchObject({
    note: expect.stringContaining("no fairness law covers"),
  });
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
  const covers = fairnessLawCovers(
    paid,
    place.context.jurisdiction.id,
    currentDate,
  );
  console.info(
    `${personName(person)} (${person.id}), ${place.displayName}, seed ${seed}: initial ${terms.amount.minorUnits} minor units, partnership=${partnered}, fairnessCoverage=${covers}, work=${work.id}, terms=${terms.id}`,
  );
  return { terms, covers };
}
it.each(["1150000", "3137000", "5363000", "2938000", "3451000"])(
  "A43 the same recorded job offer in %s is not reduced by a male partnership",
  (placeKey) => {
    const single = initialPay(placeKey, false);
    const partnered = initialPay(placeKey, true);
    expect(partnered.terms.amount).toEqual(single.terms.amount);
    expect(partnered.terms.provenance).toEqual(single.terms.provenance);
    // The former population-average discount must not become an offer.
    expect(partnered.terms.amount.minorUnits).not.toBe(
      Math.round(
        single.terms.amount.minorUnits / (1 + RESEARCHED_AVERAGE_GAIN),
      ),
    );
    if (placeKey === "2938000") expect(partnered.covers).toBe(false);
  },
);
