import { describe, expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { addDays } from "../../src/simulation/dates";
import {
  createOrganization,
  createWorkRelationship,
} from "../../src/simulation/life";
import {
  initializeOfficeSalaryFlows,
  settleOfficeSalaries,
} from "../../src/simulation/office-salary";
import { CONGRESS_MEMBER_SALARY_DOLLARS } from "../../src/simulation/office-pay";
import { resourceFlowTermsHistory } from "../../src/simulation/resource-queries";
import { createWorkCompensation, money } from "../../src/simulation/resources";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import { SeededRng } from "../../src/simulation/rng";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";

const places = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, count] = pair.split(":") as [string, string];
  const state = key.slice(0, 2);
  if ((places.get(state)?.[1] ?? -1) < Number(count))
    places.set(state, [key, Number(count)]);
}
places.set("15", ["1571550", 0]);
places.set("72", ["7276770", 0]);
for (const [key, , usps] of TERRITORY_PLACE_ROWS)
  if (!places.has(usps)) places.set(usps, [key, 0]);
const candidates = [...places.values()].map(([key]) => key);
const rng = new SeededRng("office-flow-opening-five-places");
const sampled: string[] = [];
while (sampled.length < 5)
  sampled.push(candidates.splice(rng.integer(0, candidates.length - 1), 1)[0]!);

describe.each(sampled)("office flow initialization in %s", (placeKey) => {
  it("matches the old first-call flow at the actual current date without paying, survives reopening, and preserves existing terms", () => {
    const seed = `office-flow-opening:${placeKey}`;
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey,
        startAge: 30,
        questionnaire: "skipped",
      }),
    ).game!;
    let world = createOrganization(game.world, {
      stableKey: "fixture:office-employer",
      formedAt: game.world.currentDate,
      provenance: {
        kind: "authored",
        note: "Recorded office initialization control.",
      },
      initialProfile: {
        name: "Fixture congressional office",
        classification: "sector:government",
        locationJurisdictionId: null,
      },
    });
    world = createWorkRelationship(world, {
      stableKey: "fixture:office-work",
      personId: game.playerPersonId,
      organizationId: world.history.organizations.at(-1)!.id,
      startedAt: addDays(world.currentDate, -14),
      kind: "employment:congress-member",
      compensation: "paid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: {
        kind: "authored",
        note: "Recorded office initialization control.",
      },
      initialRole: {
        title: "Member of Congress",
        occupationClassification: null,
        locationJurisdictionId: null,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 60 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: null,
        },
      },
    });
    const work = world.history.workRelationships.at(-1)!;
    const initialized = initializeOfficeSalaryFlows(world, game.playerPersonId);
    expect(serializeWorld(initialized)).toBe(
      serializeWorld(settleOfficeSalaries(world, game.playerPersonId)),
    );
    const flow = initialized.history.resourceFlows.at(-1)!;
    expect(flow.stableKey).toBe(`office-salary:${work.id}`);
    expect(flow.startsAt).toBe(world.currentDate);
    const terms = resourceFlowTermsHistory(initialized, flow.id);
    expect(terms.at(-1)!.amount).toEqual(
      money(Math.round((CONGRESS_MEMBER_SALARY_DOLLARS * 100) / 52), "USD"),
    );
    expect(terms.at(-1)!.cadenceKind).toBe("schedule:weekly");
    expect(initialized.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    expect(initialized.history.statutoryTaxLiabilities).toEqual(
      world.history.statutoryTaxLiabilities,
    );
    expect(initializeOfficeSalaryFlows(initialized, game.playerPersonId)).toBe(
      initialized,
    );
    const reopened = deserializeWorld(serializeWorld(initialized));
    expect(initializeOfficeSalaryFlows(reopened, game.playerPersonId)).toBe(
      reopened,
    );
    const contracted = createWorkCompensation(world, {
      stableKey: "fixture:existing-office-pay",
      workRelationshipId: work.id,
      startsAt: world.currentDate,
      amount: money(12345, "USD"),
      cadenceKind: "schedule:weekly",
      restrictionKind: null,
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: "Existing terms must remain owned by their writer.",
      },
    });
    expect(initializeOfficeSalaryFlows(contracted, game.playerPersonId)).toBe(
      contracted,
    );
    expect(
      initializeOfficeSalaryFlows(
        { ...world, control: { kind: "observer" } },
        game.playerPersonId,
      ).history,
    ).toBe(world.history);
    console.log(
      JSON.stringify({
        placeKey,
        seed,
        personId: game.playerPersonId,
        flowId: flow.id,
        startsAt: flow.startsAt,
        noPayment: true,
      }),
    );
  }, 120000);
});
