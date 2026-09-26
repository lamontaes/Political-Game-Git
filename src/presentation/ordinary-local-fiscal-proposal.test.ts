import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { daysBetween } from "../simulation/dates";
import { enactedLawEffects } from "../simulation/enacted-law-effects";
import {
  governmentUnit,
  governmentUnitsForPlace,
} from "../simulation/government-units";
import {
  LOCAL_MEMBER_AGENDA_INTAKE,
  LOCAL_MEMBER_AGENDA_VERSION,
  scheduleLocalMemberAgendaIntakes,
} from "../simulation/governing/member-agenda";
import type { PrincipleRecordInput } from "../simulation/history";
import { measurePosition } from "../simulation/legislation";
import { currentMeasureProvisions } from "../simulation/legislative-politics";
import { requireLifePlace } from "../simulation/life-places";
import {
  LOCAL_ORDINANCE_GAME_PROFILE_VERSION,
  localFiscalGameAuthorityForRulePackId,
} from "../simulation/local-ordinance-game-profile";
import {
  ensureCountyCouncilOpening,
  ensureMunicipalCouncilOpening,
} from "../simulation/municipal-council-opening";
import { municipalSeats } from "../simulation/municipal-public-work";
import { COUNCIL_READING_DUE } from "../simulation/municipal-ordinance-procedure";
import { ensureHomeLocalGovernments } from "../simulation/nationwide-world/local-governments";
import {
  createFormationContext,
  recordPrinciples,
} from "../simulation/politics";
import { publicGovernmentOrganizationKey } from "../simulation/public-government-identity";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type {
  IsoDate,
  PublicGovernmentIdentity,
  PublicProgramAppropriationRecord,
  World,
} from "../simulation/types";
import { advanceWorld } from "../simulation/world";
import {
  ensureWorldStartingConditions,
  worldOpeningRecord,
} from "../simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../simulation/world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../simulation/world-setup/types";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

const place = requireLifePlace("0162328");
const city = governmentUnitsForPlace(place.sourceGeoid!).find(
  (unit) => unit.unitType === "municipality" && unit.functionalActive,
)!;
const county = governmentUnit("gus2025:100001")!;
const bodies = [
  { label: "city", governmentKey: city.id, level: "municipality" },
  { label: "county", governmentKey: county.id, level: "county" },
] as const;
const handlers = createCampaignElectionTransitionRegistry();

function advanceTo(world: World, date: IsoDate): World {
  const days = daysBetween(world.currentDate, date);
  return days > 0 ? advanceWorld(world, days, handlers) : world;
}

function intakeFor(world: World, governmentKey: string) {
  const prefix = `${LOCAL_MEMBER_AGENDA_VERSION}:intake:${encodeURIComponent(governmentKey)}:`;
  return world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === LOCAL_MEMBER_AGENDA_INTAKE &&
      item.stableKey.startsWith(prefix),
  );
}

describe("ordinary opening city and county fiscal proposals", () => {
  it("lets each admitted NPC body file and decide one bill on its own saved clock", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "ordinary-local-fiscal-prattville-autauga",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    });
    let world = ensureWorldStartingConditions(game.world, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      political: generatePoliticalStartingConditions,
    });
    expect(worldOpeningRecord(world)?.openingVersion).toBe(
      CRUNCH46_WORLD_OPENING_VERSION,
    );
    world = ensureHomeLocalGovernments(world, game.playerPersonId);
    world = ensureMunicipalCouncilOpening(world, city.id);
    world = ensureCountyCouncilOpening(world, county.id);

    // Only reasons for an NPC to propose are supplied. No proposal, ballot,
    // council tally, enactment, or fiscal effect is written by the fixture.
    const supporting = ["fiscal-restraint", "environmental-stewardship"].map(
      (key) =>
        Object.values(world.policyCatalog.principles).find(
          (principle) => principle.stableKey === `us-policy-positions:${key}`,
        )!,
    );
    expect(supporting.every(Boolean)).toBe(true);
    const reasons: PrincipleRecordInput[] = bodies.flatMap((body) => {
      const seats = municipalSeats(world, body.governmentKey).filter(
        (seat) => seat.role === "member" || seat.role === "presiding-member",
      );
      expect(seats).toHaveLength(5);
      expect(seats.every((seat) => seat.personId !== game.playerPersonId)).toBe(
        true,
      );
      return seats.flatMap((seat) =>
        supporting.map((principle) => ({
          stableKey: `ordinary-local-fiscal:${body.governmentKey}:${seat.personId}:${principle.stableKey}`,
          personId: seat.personId,
          principleId: principle.id,
          formedAt: world.currentDate,
          stance: "endorses" as const,
          conviction: "settled" as const,
          flexibility: "firm" as const,
          qualification: null,
          formation: createFormationContext("other:drawn-before-play", {
            note: "Saved NPC member reasons make a local maintenance proposal available; members still decide their own votes.",
          }),
          supersedesPrincipleRecordId: null,
        })),
      );
    });
    world = recordPrinciples(world, reasons);

    world = scheduleLocalMemberAgendaIntakes(world);
    const intakes = bodies.map((body) => {
      const intake = intakeFor(world, body.governmentKey);
      expect(intake).toMatchObject({
        transitionKey: LOCAL_MEMBER_AGENDA_INTAKE,
        provenance: { kind: "authored" },
      });
      if (!intake) throw new Error(`${body.label} intake was not scheduled.`);
      return intake;
    });
    const latestIntake = intakes.reduce(
      (latest, item) => (item.dueAt > latest ? item.dueAt : latest),
      intakes[0]!.dueAt,
    );
    world = advanceTo(world, latestIntake);

    const measures = bodies.map((body, index) => {
      expect(
        world.history.futureDueItemStates
          .filter((state) => state.dueItemId === intakes[index]!.id)
          .at(-1)?.status,
      ).toBe("resolved");
      const prefix = `${LOCAL_MEMBER_AGENDA_VERSION}:${encodeURIComponent(body.governmentKey)}:`;
      const filed = (world.history.legislativeMeasures ?? []).filter(
        (measure) => measure.stableKey.startsWith(prefix),
      );
      expect(filed).toHaveLength(1);
      const measure = filed[0]!;
      const admitted = localFiscalGameAuthorityForRulePackId(
        `${body.governmentKey}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`,
      );
      expect(admitted?.authority).toMatchObject({
        governmentUnitId: body.governmentKey,
        level: body.level,
        basis: "game-profile",
      });
      expect(measure).toMatchObject({
        origin: "member-introduction",
        subjectClass: "appropriation",
        jurisdictionId: admitted?.jurisdictionId,
        rulePackId: `${body.governmentKey}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`,
      });
      expect(measure.sponsorPersonId).toBeTruthy();
      expect(measure.sponsorPersonId).not.toBe(game.playerPersonId);
      const fiscalClause = currentMeasureProvisions(world, measure.id).find(
        (provision) => provision.provisionKey === "amount-provided",
      );
      expect(fiscalClause).toMatchObject({
        operativeEffect: { kind: "public-program-appropriation" },
      });
      expect(fiscalClause?.fiscalExposureMinorUnits).toBeGreaterThan(0);
      expect(
        world.history.legislativeDraftLineages?.find(
          (lineage) => lineage.measureId === measure.id,
        ),
      ).toMatchObject({ variantKey: "local-fix-it-first-v1" });
      return measure;
    });

    // A profile may require more than one reading. Let the actual due items
    // and member decisions resolve each body; never supply its vote result.
    for (
      let guard = 0;
      guard < 8 &&
      measures.some((measure) => !measurePosition(world, measure.id).terminal);
      guard++
    ) {
      const nextReading = world.history.futureDueItems
        .filter(
          (item) =>
            item.transitionKey === COUNCIL_READING_DUE &&
            measures.some((measure) => item.entityIds.includes(measure.id)) &&
            !world.history.futureDueItemStates.some(
              (state) =>
                state.dueItemId === item.id && state.status === "resolved",
            ),
        )
        .sort((left, right) => left.dueAt.localeCompare(right.dueAt))[0];
      if (!nextReading) throw new Error("A local bill has no next reading.");
      world = advanceTo(world, nextReading.dueAt);
    }

    const enactedAppropriations: PublicProgramAppropriationRecord[] = [];
    for (const [index, body] of bodies.entries()) {
      const measure = measures[index]!;
      const vote = (world.history.legislativeVotes ?? [])
        .filter(
          (entry) =>
            entry.measureId === measure.id && entry.purpose === "floor-stage",
        )
        .at(-1);
      expect(vote?.provenance.method).toBe("member-decisions");
      expect(
        vote?.dispositions.some(
          (disposition) =>
            disposition.personId !== null &&
            disposition.reason?.startsWith("member:") === true,
        ),
      ).toBe(true);
      const position = measurePosition(world, measure.id);
      expect(position.terminal).toBe(true);
      expect(position.outcome).toBe(
        vote?.outcome === "passed" ? "enacted" : "failed-on-floor",
      );
      const appropriations = (world.history.publicProgramRecords ?? []).filter(
        (record): record is PublicProgramAppropriationRecord =>
          record.kind === "appropriation" &&
          record.sourceMeasureId === measure.id,
      );
      if (position.outcome !== "enacted") {
        expect(appropriations).toHaveLength(0);
        continue;
      }
      expect(appropriations).toHaveLength(1);
      const appropriation = appropriations[0]!;
      const identity: PublicGovernmentIdentity = {
        kind: "local-government",
        governmentKey: body.governmentKey,
        jurisdictionId: measure.jurisdictionId,
      };
      expect(appropriation).toMatchObject({
        sourceMeasureId: measure.id,
        jurisdictionId: measure.jurisdictionId,
        publicGovernmentIdentity: identity,
        basis: { kind: "game-profile" },
      });
      expect(appropriation.amount.minorUnits).toBeGreaterThan(0);
      expect(appropriation.amount.currency).toBe("USD");
      expect(appropriation.amount.minorUnits).toBe(
        currentMeasureProvisions(world, measure.id).find(
          (provision) => provision.provisionKey === "amount-provided",
        )?.fiscalExposureMinorUnits,
      );
      expect(
        world.history.organizations.find(
          (organization) =>
            organization.id === appropriation.accountOrganizationId,
        )?.stableKey,
      ).toBe(publicGovernmentOrganizationKey(identity));
      const effects = enactedLawEffects(world, measure.id);
      expect(effects?.operativeEffectOutcomes).toContainEqual(
        expect.objectContaining({
          provisionKey: "amount-provided",
          effectKind: "public-program-appropriation",
          status: "applied",
        }),
      );
      expect(effects?.lines).toContainEqual(
        expect.objectContaining({
          kind: "appropriation",
          programKey: appropriation.programKey,
          amountMinorUnits: appropriation.amount.minorUnits,
        }),
      );
      enactedAppropriations.push(appropriation);
    }

    const reopened = deserializeWorld(serializeWorld(world));
    expect(worldOpeningRecord(reopened)).toEqual(worldOpeningRecord(world));
    for (const measure of measures) {
      expect(measurePosition(reopened, measure.id)).toEqual(
        measurePosition(world, measure.id),
      );
      expect(
        reopened.history.legislativeVotes?.filter(
          (vote) => vote.measureId === measure.id,
        ),
      ).toEqual(
        world.history.legislativeVotes?.filter(
          (vote) => vote.measureId === measure.id,
        ),
      );
      expect(enactedLawEffects(reopened, measure.id)).toEqual(
        enactedLawEffects(world, measure.id),
      );
    }
    for (const appropriation of enactedAppropriations)
      expect(
        reopened.history.publicProgramRecords?.find(
          (record) => record.id === appropriation.id,
        ),
      ).toEqual(appropriation);
  }, 900_000);
});
