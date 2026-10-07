import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { daysBetween } from "../simulation/dates";
import {
  allGovernmentUnits,
  governmentUnitJurisdictionId,
} from "../simulation/government-units";
import { stableHash } from "../simulation/ids";
import { measurePosition, introduceMeasure } from "../simulation/legislation";
import { addDays } from "../simulation/dates";
import { makeIsoDate } from "../simulation/dates";
import { recordCouncilReadingVote } from "../simulation/municipal-ordinance-procedure";
import { personName } from "../simulation/people";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { createResourcePosition, money } from "../simulation/resources";
import type { EntityId } from "../simulation/types";
import { localFiscalAuthorityFor } from "../simulation/local-fiscal-authority";
import { requireLifePlace } from "../simulation/life-places";
import { LOCAL_MEMBER_AGENDA_VERSION } from "../simulation/governing/member-agenda";
import { LOCAL_ORDINANCE_GAME_PROFILE_VERSION } from "../simulation/local-ordinance-game-profile";
import {
  localTaxAuthority,
  localTaxGovernment,
  localTaxPowerEvidenceFor,
} from "../simulation/local-tax-authority";
import { ensureMunicipalCouncilOpening } from "../simulation/municipal-council-opening";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "../simulation/municipal-government";
import {
  placeMunicipalOrdinanceOnAgenda,
  scheduleOrdinaryCouncilReading,
} from "../simulation/municipal-ordinance-procedure";
import { municipalSeats } from "../simulation/municipal-public-work";
import { ensureHomeLocalGovernments } from "../simulation/nationwide-world/local-governments";
import { PROPERTY_BASE_KEY } from "../simulation/property-tax-bases";

import { attachTaxProposal } from "../simulation/tax-policy";
import type { IsoDate, World } from "../simulation/types";
import { advanceWorld } from "../simulation/world";
import {
  ensureWorldStartingConditions,
  worldOpeningRecord,
} from "../simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../simulation/world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../simulation/world-setup/types";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

const handlers = createCampaignElectionTransitionRegistry();
function advanceTo(world: World, date: IsoDate): World {
  const days = daysBetween(world.currentDate, date);
  return days > 0 ? advanceWorld(world, days, handlers) : world;
}

/** A playable city drawn by seed from every place that has one. */
function drawCity(seed: string) {
  const cities = allGovernmentUnits().filter(
    (unit) =>
      unit.functionalActive &&
      unit.unitType === "municipality" &&
      unit.placeGeoid !== null &&
      municipalGovernmentByKey(unit.id) &&
      municipalRulePackFor(municipalGovernmentByKey(unit.id)!).ok,
  );
  return cities[parseInt(stableHash(seed).slice(0, 8), 16) % cities.length]!;
}

describe("a city property tax in a generated world", () => {
  it.each(["m2-local-property-tax", "m2-local-property-tax-b"])(
    "is filed, decided by the council, and lands on a named payer (%s)",
    (seed) => {
      const city = drawCity(seed);
      const place = requireLifePlace(city.placeGeoid!);
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
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
      const sponsor = municipalSeats(world, city.id).find(
        (seat) => seat.role === "member" || seat.role === "presiding-member",
      )!;
      const government = localTaxGovernment(city.id)!;
      const authority = localTaxAuthority({
        ...government,
        instrument: "property",
      });
      process.stderr.write(
        `LOCAL PROPERTY TAX world seed ${seed}, place ${place.displayName} (${city.stateUsps}, ${city.id}), date ${world.currentDate}, property authority ${authority.status} (${authority.basis})\n`,
      );
      // The same council's payroll question is open only where the state lets a
      // city levy one; the admission says so in the state's own terms.
      const payroll = localTaxAuthority({
        ...government,
        instrument: "payroll",
      });
      const payrollGrant = localFiscalAuthorityFor(
        { ...world, control: { kind: "person", personId: sponsor.personId! } },
        city.id,
        "us-tax-terms:city.payroll-tax-terms",
        "typed-proposal",
      );
      process.stderr.write(
        `PAYROLL ${city.stateUsps}: authority ${payroll.status}, council admission ${payrollGrant.ok ? "open" : payrollGrant.reason}\n`,
      );
      expect(payrollGrant.ok).toBe(payroll.permits);
      const proposition = Object.values(world.policyCatalog.propositions).find(
        (row) => row.stableKey === "us-tax-terms:city.property-tax-terms",
      )!;
      expect(proposition).toBeDefined();
      const jurisdictionId = governmentUnitJurisdictionId(city);
      world = introduceMeasure(world, {
        stableKey: `${LOCAL_MEMBER_AGENDA_VERSION}:${encodeURIComponent(city.id)}:${seed}`,
        jurisdictionId,
        rulePackId: `${city.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`,
        designation: "Ord. Property Tax (authored)",
        shortTitle: "City property tax",
        summary: "Authored proof: a city property tax.",
        origin: "member-introduction",
        subjectClass: "revenue",
        originChamberKey: "council",
        sponsorPersonId: sponsor.personId,
        propositionIds: [proposition.id],
        propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
      });
      const measureId = world.history.legislativeMeasures!.at(-1)!.id;
      world = attachTaxProposal(world, {
        stableKey: `${seed}:tax`,
        measureId,
        sponsorPersonId: sponsor.personId!,
        publicGovernmentIdentity: {
          kind: "local-government",
          governmentKey: city.id,
          jurisdictionId,
        },
        power: localTaxPowerEvidenceFor({
          ...government,
          governmentKey: city.id,
          instrument: "property",
        }),
        terms: {
          seriesKey: "tax:city-property",
          baseKey: PROPERTY_BASE_KEY,
          baseLabel: "Assessed value of a household's home or a year's rent",
          rateNumerator: 1,
          rateDenominator: 100,
          allowanceMinorUnits: 0,
          exemptBaseKeys: [],
          currency: money(0, "USD").currency,
          effectiveDelayDays: 90,
          collectionLagDays: 30,
          publicPurpose: "City services",
          assumptionNote: "Authored proof terms.",
          legalBaselineAssumption: "carry-forward-acquired-baseline-in-game",
          instrument: "property",
        },
      });
      const control = world.control;
      const placed = placeMunicipalOrdinanceOnAgenda(
        { ...world, control: { kind: "person", personId: sponsor.personId! } },
        {
          governmentKey: city.id,
          measureId,
        },
      );
      expect(placed.ok ? "ok" : placed.reason).toBe("ok");
      if (!placed.ok) return;
      world = {
        ...scheduleOrdinaryCouncilReading(placed.world, city.id, measureId),
        control,
      };
      const filed = world;
      const roll = municipalSeats(filed, city.id)
        .filter(
          (seat) => seat.role === "member" || seat.role === "presiding-member",
        )
        .map((seat) => ({
          memberKey: `council:${seat.participationId}`,
          personId: seat.personId,
          disposition: "yea" as const,
        }));

      // Case 1: the council decides for itself. The question is direction-neutral,
      // so the other members have no recorded reason and do not carry it.
      let decided = filed;
      for (
        let guard = 0;
        guard < 8 && !measurePosition(decided, measureId).terminal;
        guard++
      ) {
        const due = decided.history.futureDueItems
          .filter(
            (item) =>
              item.entityIds.includes(measureId) &&
              !decided.history.futureDueItemStates.some(
                (state) =>
                  state.dueItemId === item.id && state.status === "resolved",
              ),
          )
          .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
        if (!due) break;
        decided = advanceTo(decided, due.dueAt);
      }
      const vote = (decided.history.legislativeVotes ?? []).find(
        (v) => v.measureId === measureId,
      )!;
      process.stderr.write(
        `CASE 1 council decided on its own: ${vote.outcome}; ${vote.dispositions.map((d) => `${d.disposition}/${d.reason}`).join(", ")}; policies ${decided.history.taxPolicies?.length ?? 0}\n`,
      );
      expect(vote.provenance.method).toBe("member-decisions");

      // Case 2: the roll is supplied (an authored fixture) so the law is in force
      // and the landing can be watched.
      const taken = recordCouncilReadingVote(
        { ...filed, control: { kind: "person", personId: sponsor.personId! } },
        {
          governmentKey: city.id,
          measureId,
          dispositions: roll,
          provenance: {
            method: "authored-fixture",
            note: "Authored roll: every seated member votes yea, so the law lands.",
            sourceEntityIds: [measureId],
          },
        },
      );
      expect(taken.ok ? "ok" : taken.reason).toBe("ok");
      if (!taken.ok) return;
      let law = { ...taken.world, control };
      for (
        let guard = 0;
        guard < 12 && (law.history.taxPolicies?.length ?? 0) === 0;
        guard++
      ) {
        const due = law.history.futureDueItems
          .filter(
            (item) =>
              !law.history.futureDueItemStates.some(
                (state) =>
                  state.dueItemId === item.id && state.status !== "scheduled",
              ) && item.entityIds.includes(measureId),
          )
          .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
        if (!due) break;
        law = advanceTo(law, due.dueAt);
      }
      process.stderr.write(
        `position ${JSON.stringify(measurePosition(law, measureId).phase)} policies ${law.history.taxPolicies?.length ?? 0} date ${law.currentDate}\n`,
      );
      const policy = law.history.taxPolicies?.[0];
      expect(policy).toBeDefined();
      if (!policy) return;
      law = advanceTo(law, makeIsoDate(addDays(policy.effectiveAt, 1)));
      const bases = (law.history.taxBases ?? []).filter(
        (row) => row.baseKey === PROPERTY_BASE_KEY,
      );
      expect(bases.length).toBeGreaterThan(0);
      expect(law.history.taxAssessments).toHaveLength(bases.length);
      const sample = bases[0]!;
      const assessment = law.history.taxAssessments!.find(
        (row) => row.baseId === sample.id,
      )!;
      const payerId = (sample.payer as { personId: string }).personId;
      expect(law.people[payerId]).toBeDefined();
      expect(assessment.taxAmount.minorUnits).toBe(
        Math.round(sample.amount.minorUnits / 100),
      );
      process.stderr.write(
        `PAYER ${personName(law.people[payerId]!)} base ${sample.amount.minorUnits} tax ${assessment.taxAmount.minorUnits} note: ${sample.assumptionNote}\n`,
      );
      const power = law.history.taxProposals![0]!.power!;
      expect(power).toMatchObject({
        authorityStatus: authority.status,
        estimated: authority.estimated,
      });

      // Collection reaches the city's own public account on its due day. Most
      // payers in a generated world have no recorded cash account, so the city
      // cannot collect from them (unknown is not zero); one authored account
      // shows the money moving where a payer has one.
      const funded = bases.find(
        (row) =>
          row.payer.kind === "person" &&
          !law.history.resourcePositions.some(
            (position) =>
              position.owner.kind === "person" &&
              row.payer.kind === "person" &&
              position.owner.personId === row.payer.personId,
          ),
      )!;
      law = createResourcePosition(law, {
        stableKey: `${seed}:funded-payer`,
        owner: {
          kind: "person",
          personId: (funded.payer as { personId: EntityId }).personId,
        },
        openedAt: law.currentDate,
        openingBalance: money(500000, "USD"),
        provenance: {
          kind: "authored",
          note: "Known fictional test cash for one payer; not an observed balance.",
        },
      });
      law = advanceTo(law, makeIsoDate(addDays(policy.effectiveAt, 35)));
      const collections = law.history.taxCollections ?? [];
      const paid = collections.filter((row) => row.status !== "blocked");
      process.stderr.write(
        `COLLECTIONS ${collections.length} (paid ${paid.length}, blocked ${collections.length - paid.length}); exposures ${(law.history.lawExposures ?? []).filter((row) => row.channel === "tax-payment").length}\n`,
      );
      process.stderr.write(
        `BLOCKED ${JSON.stringify(collections.reduce((a: Record<string, number>, c) => ({ ...a, [c.status + ":" + c.reason]: (a[c.status + ":" + c.reason] ?? 0) + 1 }), {}))} positions-for-payers ${bases.filter((b) => law.history.resourcePositions.some((p) => p.owner.kind === "person" && b.payer.kind === "person" && p.owner.personId === b.payer.personId)).length}/${bases.length}\n`,
      );
      expect(collections.length).toBe(bases.length);
      const fundedCollection = collections.find(
        (row) =>
          row.assessmentId ===
          law.history.taxAssessments!.find((a) => a.baseId === funded.id)!.id,
      )!;
      expect(fundedCollection.status).not.toBe("blocked");
      expect(fundedCollection.transferredAmount.minorUnits).toBe(
        law.history.taxAssessments!.find((a) => a.baseId === funded.id)!
          .taxAmount.minorUnits,
      );
      expect(collections.filter((row) => row.status === "blocked").length).toBe(
        bases.length - paid.length,
      );

      // Saved and reloaded, the same law, bases and assessments are read back.
      const reopened = deserializeWorld(serializeWorld(law));
      expect(reopened.history.taxBases).toEqual(law.history.taxBases);
      expect(reopened.history.taxAssessments).toEqual(
        law.history.taxAssessments,
      );
    },
  );
});
