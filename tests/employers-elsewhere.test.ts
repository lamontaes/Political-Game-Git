import { describe, expect, it } from "vitest";

import { smallWorld } from "./fixtures/small-world";
import { addDays } from "../src/simulation/dates";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "../src/simulation/life";
import { workStatusAt } from "../src/simulation/life-queries";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../src/simulation/life-places";
import { localBusinessSupplyFor } from "../src/simulation/local-business-counts";
import {
  townJobRate,
  townPayPercentile,
} from "../src/simulation/living-world/town-pay";
import {
  bestEmployerFor,
  ensureEmployerElsewhere,
  NO_CREDENTIAL_OCCUPATIONS,
  placeToLookFor,
} from "../src/simulation/migration/employers-elsewhere";
import { SeededRng, pickDistinct } from "../src/simulation/rng";
import type {
  EntityId,
  OccupationClassification,
  World,
} from "../src/simulation/types";

/**
 * LIVES slice step 4b (A135, CTO ruling 23(b)): a job offer elsewhere comes
 * from a private employer the place really has, written when the offer needs
 * it, at the place's published pay. The world's place is drawn by seed from
 * all 56.
 */
const SEED = "lives-4b-recorded-employers";
const STATES = lifePlaceStateIdentities();
const [state] = pickDistinct(new SeededRng(SEED), STATES, 1);
const PLACE = state!.jurisdictionKey;

const provenance = (note: string) => ({ kind: "authored" as const, note });

/** A past job in `occupation`, two years long and ended, through the life writers. */
function withPastJob(
  world: World,
  personId: EntityId,
  town: EntityId,
  occupation: OccupationClassification,
): World {
  let next = createOrganization(world, {
    stableKey: `lives-4b:past-employer:${personId}`,
    formedAt: addDays(world.currentDate, -1_200),
    provenance: provenance("LIVES 4b fixture past employer."),
    initialProfile: {
      name: "Fixture Past Employer",
      classification: "custom:fixture-employer",
      locationJurisdictionId: town,
    },
  });
  next = createWorkRelationship(next, {
    stableKey: `lives-4b:past-job:${personId}`,
    personId,
    organizationId: next.history.organizations.at(-1)!.id,
    startedAt: addDays(world.currentDate, -1_000),
    kind: "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: provenance("LIVES 4b fixture past job."),
    initialRole: {
      title: "Fixture worker",
      occupationClassification: occupation,
      locationJurisdictionId: town,
      timeDemand: {
        expectedWeekly: { minimumHours: 35, maximumHours: 40 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: town,
      },
    },
  });
  const job = next.history.workRelationships.at(-1)!;
  return recordWorkStatus(next, {
    stableKey: `lives-4b:past-job-ended:${personId}`,
    workRelationshipId: job.id,
    effectiveAt: addDays(world.currentDate, -270),
    status: "ended",
    reason: "labor:laid-off",
    provenance: provenance("LIVES 4b fixture layoff."),
    supersedesStatusId: workStatusAt(next, job.id)!.id,
  });
}

describe(`job offers elsewhere come from the place's recorded employers (${PLACE}, seed ${SEED})`, () => {
  it("in each of the 56 states and territories, someone with no line of work is offered work that needs none, at the place's pay", () => {
    expect(STATES).toHaveLength(56);
    const small = smallWorld({ place: PLACE, seed: SEED, people: 4 });
    const personId = small.world.personOrder[1]!;
    const estimated: string[] = [];
    for (const { jurisdictionKey } of STATES) {
      const home = searchLifePlaces("", 1, {
        stateJurisdictionKey: jurisdictionKey,
        scope: "locality",
      })[0]!;
      const homeId = home.context.jurisdiction.id;
      const place = placeToLookFor(homeId, null);
      expect(place, jurisdictionKey).not.toBeNull();
      expect(place!.context.jurisdiction.id).not.toBe(homeId);
      // Their own state's largest other town; the country's largest where
      // the state has no other town.
      const others = searchLifePlaces("", 2, {
        stateJurisdictionKey: jurisdictionKey,
        scope: "locality",
      }).length;
      if (others > 1) expect(place!.stateJurisdictionKey).toBe(jurisdictionKey);
      const offer = bestEmployerFor(small.world, personId, null, place!);
      expect(offer, `${jurisdictionKey}: ${place!.displayName}`).not.toBeNull();
      expect(NO_CREDENTIAL_OCCUPATIONS.has(offer!.kind.workerOccupation)).toBe(
        true,
      );
      // Only a kind of business the place really has.
      const supply = localBusinessSupplyFor(offer!.placeId);
      if (supply)
        expect(
          Math.round(
            supply.find((row) => row.kind === offer!.kind.key)!.expected,
          ),
        ).toBeGreaterThanOrEqual(1);
      if (offer!.payBasis === "published")
        expect(offer!.hourlyMinor).toBe(
          townJobRate(
            offer!.kind.workerOccupation,
            offer!.placeId,
            townPayPercentile(0, 0.5),
          )!.hourlyMinor,
        );
      else estimated.push(`${jurisdictionKey} (${place!.displayName})`);
    }
    console.info(
      `LIVES 4b: every state and territory has an employer to look to; pay ESTIMATED FROM AVERAGE in ${estimated.length}: ${estimated.join(", ") || "none"}`,
    );
  });

  it("the employer fits the person: their own line of work first, by their record, never a draw", () => {
    const small = smallWorld({ place: PLACE, seed: SEED, people: 4 });
    const [, first, second] = small.world.personOrder as EntityId[];
    const place = placeToLookFor(small.jurisdictionId, null)!;
    const supply = localBusinessSupplyFor(place.context.jurisdiction.id);
    // A kind there that needs experience: someone who has done the work is
    // offered it; someone with the same record otherwise is not.
    const skilled = bestKindNeedingExperience(supply);
    expect(skilled, `${place.displayName} has a skilled kind`).not.toBeNull();
    const world = withPastJob(
      small.world,
      first!,
      small.jurisdictionId,
      skilled!,
    );
    const done = bestEmployerFor(world, first!, skilled!, place)!;
    expect(done.kind.workerOccupation).toBe(skilled);
    expect(done.daysInLine).toBeGreaterThan(0);
    const fresh = bestEmployerFor(world, second!, null, place)!;
    expect(fresh.kind.workerOccupation).not.toBe(skilled);
    expect(NO_CREDENTIAL_OCCUPATIONS.has(fresh.kind.workerOccupation)).toBe(
      true,
    );
    // The same record gives the same answer, every time.
    expect(bestEmployerFor(world, first!, skilled!, place)).toEqual(done);
    console.info(
      `LIVES 4b ${place.displayName}: with ${done.daysInLine} days as ${done.kind.workerTitle.toLowerCase()} the offer is ${done.kind.workerTitle} at $${(done.hourlyMinor / 100).toFixed(2)}; with none, ${fresh.kind.workerTitle} at $${(fresh.hourlyMinor / 100).toFixed(2)}`,
    );
  });

  it("the employer is written once, at its place, when an offer first needs it", () => {
    const small = smallWorld({ place: PLACE, seed: SEED, people: 4 });
    const personId = small.world.personOrder[1]!;
    const place = placeToLookFor(small.jurisdictionId, null)!;
    const offer = bestEmployerFor(small.world, personId, null, place)!;
    const before = small.world.history.organizations.length;
    const first = ensureEmployerElsewhere(small.world, place, offer);
    const again = ensureEmployerElsewhere(first.world, place, offer);
    expect(again.organizationId).toBe(first.organizationId);
    expect(again.world.history.organizations).toHaveLength(before + 1);
    expect(again.world.jurisdictions[offer.placeId]).toBeDefined();
    const employer = again.world.history.organizations.at(-1)!;
    expect(employer.stableKey).toBe(
      `employer-elsewhere:${offer.placeId}:${offer.kind.key}`,
    );
  });
});

/** The best-staffed kind at the place whose work needs experience. */
function bestKindNeedingExperience(
  supply: ReturnType<typeof localBusinessSupplyFor>,
): OccupationClassification | null {
  const kinds = [
    ["construction", "trade:carpenter"],
    ["auto-repair", "trade:automotive-mechanic"],
    ["salon", "service:hairstylist"],
    ["accounting", "profession:bookkeeper"],
    ["law-office", "profession:legal-assistant"],
  ] as const;
  const held = kinds.filter(([key]) =>
    supply
      ? Math.round(supply.find((row) => row.kind === key)?.expected ?? 0) >= 1
      : true,
  );
  return held[0]?.[1] ?? null;
}
