import { describe, expect, it } from "vitest";
import { appendFileSync } from "node:fs";
import { smallWorld } from "../fixtures/small-world";
import {
  createOrganization,
  createWorkRelationship,
} from "../../src/simulation/life";
import { addDays, daysBetween } from "../../src/simulation/dates";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import {
  startTownJobPay,
  townJobRate,
  townMinimumHourlyAt,
  townPayPercentile,
} from "../../src/simulation/living-world/town-pay";
import { TOWN_EMPLOYMENT_VERSION } from "../../src/simulation/living-world/town-employment";
import { resourceFlowTermsAt } from "../../src/simulation/resource-queries";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import { pickDistinct, SeededRng } from "../../src/simulation/rng";
import type { EntityId, World } from "../../src/simulation/types";
import { personName } from "../../src/simulation/people";

const SEED = "a40-recorded-tenure-all56";
const places = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  56,
);
const provenance = {
  kind: "authored" as const,
  note: "Recorded-tenure mechanism control; no supplied wage or credential premium.",
};

function termsFor(world: World, workId: EntityId) {
  const flow = world.history.resourceFlows.find(
    (row) =>
      row.basisReference.kind === "work" &&
      row.basisReference.workRelationshipId === workId,
  );
  return flow ? resourceFlowTermsAt(world, flow.id) : null;
}

describe("A40 existing wage tenure rule without a person draw", () => {
  it.each(places)(
    "writes equal terms for equal recorded work in $jurisdictionKey",
    (place) => {
      const game = smallWorld({
        place: place.jurisdictionKey,
        date: "2026-01-20",
        seed: `${SEED}:${place.jurisdictionKey}`,
      });
      let world = createOrganization(game.world, {
        stableKey: "a40:employer",
        formedAt: game.world.currentDate,
        provenance,
        initialProfile: {
          name: "Recorded tenure employer",
          classification: "sector:state-government-office",
          locationJurisdictionId: game.jurisdictionId,
        },
      });
      const organizationId = world.history.organizations.at(-1)!.id;
      const workIds: EntityId[] = [];
      for (const personId of world.personOrder.slice(0, 2)) {
        world = createWorkRelationship(world, {
          stableKey: `${TOWN_EMPLOYMENT_VERSION}:a40:work:${personId}`,
          personId,
          organizationId,
          startedAt: world.currentDate,
          kind: "employment:civil-service",
          compensation: "paid",
          authority: "directed",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance,
          initialRole: {
            title: "Recorded clerk",
            occupationClassification: "occupation:office-clerk",
            locationJurisdictionId: game.jurisdictionId,
            timeDemand: {
              expectedWeekly: { minimumHours: 40, maximumHours: 40 },
              attention: "high",
              concurrency: "mostly-exclusive",
              scheduleRigidity: "rigid",
              interruptibility: "limited",
              locationJurisdictionId: game.jurisdictionId,
            },
          },
        });
        workIds.push(world.history.workRelationships.at(-1)!.id);
      }
      const rate = townJobRate(
        "occupation:office-clerk",
        game.jurisdictionId,
        townPayPercentile(0),
        townMinimumHourlyAt(world, game.jurisdictionId, world.currentDate),
      );
      const started = startTownJobPay(world, null, world.currentDate);
      const first = termsFor(started, workIds[0]!);
      const second = termsFor(started, workIds[1]!);
      if (!rate) {
        expect(first).toBeNull();
        expect(second).toBeNull();
      } else {
        expect(first).not.toBeNull();
        expect(second).not.toBeNull();
        expect(first!.amount).toEqual(second!.amount);
        expect(first!.cadenceKind).toBe(second!.cadenceKind);
        expect(first!.amount.minorUnits).toBe(
          Math.round((rate.hourlyMinor * 40 * 52) / 26),
        );
      }
      expect(started.history.resourceTransferOutcomes).toEqual(
        world.history.resourceTransferOutcomes,
      );
      expect(startTownJobPay(started, null, world.currentDate)).toBe(started);
      const saved = serializeWorld(started);
      expect(
        serializeWorld(
          startTownJobPay(deserializeWorld(saved), null, world.currentDate),
        ),
      ).toBe(saved);
      if (process.env.TEAM3_TENURE_RECORD)
        appendFileSync(
          process.env.TEAM3_TENURE_RECORD,
          JSON.stringify({
            place: place.jurisdictionKey,
            seed: `${SEED}:${place.jurisdictionKey}`,
            organizationId,
            workers: workIds.map((workId) => {
              const work = started.history.workRelationships.find(
                (row) => row.id === workId,
              )!;
              return {
                personId: work.personId,
                name: personName(started.people[work.personId]!),
                workId,
                startedAt: work.startedAt,
                terms: termsFor(started, workId),
              };
            }),
          }) + "\n",
        );
    },
  );

  it("ignores the retired person draw while retaining the existing recorded-tenure calibration", () => {
    const date = "2026-01-20" as World["currentDate"];
    const startedAt = addDays(date, -3652);
    const years = daysBetween(startedAt, date) / 365.25;
    expect(townPayPercentile(years, 0)).toBe(townPayPercentile(years, 1));
    expect(townPayPercentile(years)).toBeGreaterThan(townPayPercentile(0));
    expect(townPayPercentile(-1)).toBe(25);
    expect(townPayPercentile(40)).toBe(75);
  });

  it.todo(
    "A40: add recorded credentials only through an approved existing wage-position contract",
  );
});
