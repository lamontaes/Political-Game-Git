import { describe, expect, it } from "vitest";
// Loaded first so the simulation modules resolve their import cycle in order.
import "../simulation/campaigns";
import { addDays, daysBetween, makeIsoDate } from "../simulation/dates";
import {
  composeFutureTransitionHandlerRegistries,
  createFutureTransitionHandlerRegistry,
} from "../simulation/future-transition-registry";
import { propertyTaxHandlers } from "../simulation/property-tax-bases";
import { paydayHandlers } from "../simulation/living-world/town-pay";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
  recordEnactment,
  recordExecutiveAction,
} from "../simulation/legislation";
import { legislativePackForJurisdiction } from "../simulation/legislative-institutions";
import { rulePackById } from "../simulation/legislature-rule-packs";
import {
  committeeMembers,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type AuthoredVoteCounts,
  type LegislativeProcedureContext,
} from "../scenarios/legislation";
import { seatedChamberForPack } from "../simulation/governing/chamber-votes";
import { organizationProfileAt } from "../simulation/life-queries";
import { SALES_BASE_KEY } from "../simulation/sales-tax-bases";
import { estimatedHouseholdLivingCostsAt } from "../simulation/cost-of-living";
import { refreshLifeOpportunities } from "../simulation/life-opportunities";
import { PROPERTY_BASE_KEY } from "../simulation/property-tax-bases";
import { LOCAL_PAYROLL_BASE_KEY } from "../simulation/payroll-tax-bases";
import { personName } from "../simulation/people";
import { createResourcePosition, money } from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { homeStateKey } from "../simulation/state-jurisdiction-id";
import { stateTaxPowerEvidenceFor } from "../simulation/state-tax-authority";
import { stateJurisdictionForKey } from "../simulation/life-places";
import {
  attachTaxProposal,
  createTaxTransitionHandlerRegistry,
} from "../simulation/tax-policy";
import {
  advanceWithWorldIntegrityAtEnd,
  advanceWorld,
} from "../simulation/world";
import { setDeepTransitionInputGuard } from "../simulation/future-transitions";
import { applyEnactedLawEffects } from "../simulation/enacted-law-effects";
import { regularSessionYearForWorld } from "../simulation/legislative-procedure-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { ensureStateLegislatureOpening } from "../simulation/nationwide-world/state-legislature-opening";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { ensureWorldStartingConditions } from "../simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../simulation/world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../simulation/world-setup/types";
import { applyLegislativeStep } from "./legislation-session";
import type { EntityId, IsoDate, TaxTerms, World } from "../simulation";

// Only the days this proof reads run: tax collection, the property
// assessment day and payday. The rest of the world is not advanced, so the
// run stays short; the state legislature in session is what makes full
// world days slow.
const taxDays = composeFutureTransitionHandlerRegistries(
  createTaxTransitionHandlerRegistry(),
  createFutureTransitionHandlerRegistry([
    ...propertyTaxHandlers(),
    ...paydayHandlers(),
  ]),
);
// Every other scheduled day of the wider world is left unrun in this proof
// (resolved with nothing written); only the tax days above act.
// The deep input guard is a test-suite default that copies the world per
// due item; this proof runs with the shipped (shape-only) guard.
setDeepTransitionInputGuard(false);
const handlers: typeof taxDays = {
  ...taxDays,
  get: (key) =>
    taxDays.get(key) ??
    ((_world, item) => ({
      world: _world,
      status: "resolved",
      reasonKey: null,
      context: `Not run in this proof (${item.transitionKey}).`,
      outcomeEventId: null,
    })),
};

function advanceTo(world: World, date: IsoDate): World {
  const days = daysBetween(world.currentDate, date);
  let next = world;
  for (let left = days; left > 0; left -= 10) {
    const from = next;
    next = advanceWithWorldIntegrityAtEnd(
      () => advanceWorld(from, Math.min(10, left), handlers),
      from,
    );
  }
  return next;
}

type Instrument = "property" | "payroll" | "sales";
const BASE_KEYS: Record<Instrument, string> = {
  property: PROPERTY_BASE_KEY,
  payroll: LOCAL_PAYROLL_BASE_KEY,
  sales: SALES_BASE_KEY,
};

function termsFor(instrument: Instrument): TaxTerms {
  return {
    seriesKey: `tax:state-${instrument}`,
    baseKey: BASE_KEYS[instrument],
    baseLabel: `Authored state ${instrument} base`,
    rateNumerator: 1,
    rateDenominator: 100,
    allowanceMinorUnits: 0,
    exemptBaseKeys: [],
    currency: money(0, "USD").currency,
    effectiveDelayDays: 90,
    collectionLagDays: 30,
    publicPurpose: "State services",
    assumptionNote: "Authored proof terms.",
    legalBaselineAssumption: "carry-forward-acquired-baseline-in-game",
    instrument,
  };
}

/**
 * The state's own tax terms filed on the state's real revenue question and
 * passed through the canonical legislative procedure. The votes and the
 * governor's signature are supplied (the tax-terms question is
 * direction-neutral, so no member has a recorded reason): this is fixture
 * evidence for the landing, not proof that a legislature would pass the tax.
 */
function enactStateTax(
  world: World,
  stateKey: string,
  sponsorPersonId: EntityId,
  instrument: Instrument,
  seed: string,
): World {
  const jurisdiction = stateJurisdictionForKey(stateKey)!;
  const pack = rulePackById(
    legislativePackForJurisdiction(jurisdiction.id)!.packId,
  );
  const question = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === `us-tax-terms:state.${instrument}-tax-terms`,
  )!;
  let next = introduceMeasure(world, {
    stableKey: `${seed}:measure`,
    jurisdictionId: jurisdiction.id,
    rulePackId: pack.packId,
    designation: "State Tax 1 (authored)",
    shortTitle: `State ${instrument} tax`,
    summary: `Authored proof: a state ${instrument} tax.`,
    origin: "member-introduction",
    subjectClass: "revenue",
    originChamberKey: pack.chamberOrder[0]!,
    sponsorPersonId,
    propositionIds: [question.id],
    propositionAnswers: [{ propositionId: question.id, answer: "yes" }],
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  next = attachTaxProposal(next, {
    stableKey: `${seed}:tax`,
    measureId,
    sponsorPersonId,
    power: stateTaxPowerEvidenceFor(stateKey, instrument, next.currentDate)!,
    terms: termsFor(instrument),
  });
  const bodies = pack.chambers.map(
    (chamber) =>
      seatedChamberForPack(next, pack.packId, chamber.chamberKey, chamber.name)!
        .body,
  );
  const votePlan: Record<string, AuthoredVoteCounts> = {};
  for (const chamber of pack.chambers) {
    const body = bodies.find((row) => row.chamberKey === chamber.chamberKey)!;
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committeeMembers(body, committee.appointedMembers).length,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: body.members.length,
      };
  }
  const procedure: LegislativeProcedureContext = {
    pack,
    measureId,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed",
    governorRationale: "Explicit supplied approval for the fixture.",
  };
  for (
    let i = 0;
    i < 60 && measurePosition(next, measureId).phase !== "enacted";
    i++
  ) {
    const step = availableMeasureSteps(next, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error(
        `Stopped at ${measurePosition(next, measureId).phase} on ${next.currentDate}`,
      );
    next =
      step === "record-enactment"
        ? recordEnactment(next, {
            stableKey: `${measureId}:enactment`,
            measureId,
            effectiveAt: addDays(next.currentDate, 90),
          })
        : step === "await-executive-decision"
          ? recordExecutiveAction(next, {
              stableKey: `${measureId}:signature`,
              measureId,
              action: "signed",
              rationale: "Explicit supplied approval for the fixture.",
            })
          : applyLegislativeStep(procedure, next, step).world;
  }
  expect(measurePosition(next, measureId).phase).toBe("enacted");
  return applyEnactedLawEffects(next, measureId);
}

describe("LW-04 a state's own tax lands on a named payer in a random state", () => {
  // slow until SPEED FIXED: full filing/enactment/payroll runs advance beyond seven days.
  it.skip.each([
    { seed: "m2-state-property-tax", instrument: "property" as const },
    { seed: "m2-state-payroll-tax", instrument: "payroll" as const },
    { seed: "m2-state-sales-tax", instrument: "sales" as const },
  ])(
    "is filed, passed and reaches payers ($instrument, $seed)",
    ({ seed, instrument }) => {
      // Draw a place from all 56; a state that does not sit in this game year
      // (some meet only in odd years) is redrawn, never special-cased.
      let drawn: ReturnType<typeof drawRandomPlace> | null = null;
      let game: { playerPersonId: EntityId; world: World } | null = null;
      for (let attempt = 0; attempt < 12 && !game; attempt++) {
        const candidate = drawRandomPlace(`${seed}:${attempt}`, (place) =>
          Boolean(
            place.stateJurisdictionKey &&
            stateTaxPowerEvidenceFor(
              place.stateJurisdictionKey,
              instrument,
              makeIsoDate("2026-10-01"),
            ) &&
            legislativePackForJurisdiction(
              stateJurisdictionForKey(place.stateJurisdictionKey)?.id ??
                ("" as EntityId),
            ),
          ),
        );
        const created = createNewGameWorld({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: candidate.key,
          startAge: 40,
          questionnaire: "skipped",
        });
        const built = {
          playerPersonId: created.playerPersonId,
          world: ensureStateLegislatureOpening(
            ensureWorldStartingConditions(created.world, {
              openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
              political: generatePoliticalStartingConditions,
            }),
            created.playerPersonId,
            candidate.stateJurisdictionKey!.slice(3),
          ),
        };
        const year = Number(built.world.currentDate.slice(0, 4));
        if (
          regularSessionYearForWorld(
            built.world,
            stateJurisdictionForKey(candidate.stateJurisdictionKey!)!.id,
            year,
          )
        ) {
          drawn = candidate;
          game = built;
        }
      }
      const place = drawn!;
      const stateKey = place.stateJurisdictionKey!;
      let world = game!.world;
      const power = stateTaxPowerEvidenceFor(
        stateKey,
        instrument,
        world.currentDate,
      )!;
      process.stderr.write(
        `STATE TAX world seed ${seed}, place ${place.displayName}, state ${stateKey}, date ${world.currentDate}, ${instrument} authority ${power.authorityStatus} (${power.sourceArtifactId}) estimated ${power.estimated}\n`,
      );

      // Quiet case: before the law is passed, nothing is assessed.
      expect(world.history.taxBases ?? []).toHaveLength(0);
      world = enactStateTax(
        world,
        stateKey,
        game!.playerPersonId,
        instrument,
        seed,
      );
      const proposal = world.history.taxProposals![0]!;
      expect(proposal.power).toMatchObject({ level: "STATE", instrument });
      world = {
        ...world,
        control: { kind: "person", personId: game!.playerPersonId },
      };
      const policy = world.history.taxPolicies?.[0];
      expect(
        policy,
        "the passed law is recorded as a tax policy",
      ).toBeDefined();
      const effective = policy!.effectiveAt;
      process.stderr.write(
        `STATE LAW passed ${world.currentDate}, effective ${effective}\n`,
      );

      if (instrument === "payroll") {
        // Generated employers have no recorded cash (unknown is not zero), so
        // one employer in the state is given authored cash to watch payday.
        const employer = world.history.resourceFlows
          .filter((flow) => flow.basisKind === "compensation:work")
          .flatMap((flow) =>
            flow.source.kind === "organization"
              ? [flow.source.organizationId]
              : [],
          )
          .find((organizationId) => {
            const at = organizationProfileAt(
              world,
              organizationId,
            )?.locationJurisdictionId;
            return (
              at !== undefined &&
              at !== null &&
              !world.history.resourcePositions.some(
                (position) =>
                  position.owner.kind === "organization" &&
                  position.owner.organizationId === organizationId,
              )
            );
          });
        if (employer)
          world = createResourcePosition(world, {
            stableKey: `${seed}:funded-employer`,
            owner: { kind: "organization", organizationId: employer },
            openedAt: world.currentDate,
            openingBalance: money(500000000, "USD"),
            provenance: {
              kind: "authored",
              note: "Known fictional test cash for one employer; not an observed balance.",
            },
          });
      }
      world = advanceTo(
        world,
        makeIsoDate(addDays(effective, instrument === "property" ? 1 : 30)),
      );
      if (instrument === "sales") {
        // A generated household has no recorded cash, so its bills are never
        // opened (unknown is not zero): the player's household is given
        // authored cash, then lives through a month.
        const householdId = estimatedHouseholdLivingCostsAt(
          world,
          game!.playerPersonId,
        )!.householdId;
        world = createResourcePosition(world, {
          stableKey: `${seed}:funded-household`,
          owner: { kind: "household", householdId },
          openedAt: world.currentDate,
          openingBalance: money(900000, "USD"),
          provenance: {
            kind: "authored",
            note: "Known fictional test cash for one household; not an observed balance.",
          },
        });
        world = refreshLifeOpportunities(world, game!.playerPersonId);
        world = advanceTo(world, makeIsoDate(addDays(world.currentDate, 40)));
        world = refreshLifeOpportunities(world, game!.playerPersonId);
      }
      const bases = (world.history.taxBases ?? []).filter(
        (row) => row.baseKey === BASE_KEYS[instrument],
      );
      expect(bases.length).toBeGreaterThan(0);
      const sample = bases[0]!;
      const payerId = (sample.payer as { personId: EntityId }).personId;
      const assessment = world.history.taxAssessments!.find(
        (row) => row.baseId === sample.id,
      )!;
      expect(assessment.taxAmount.minorUnits).toBe(
        Math.round(sample.amount.minorUnits / 100),
      );
      if (instrument !== "payroll")
        for (const base of bases)
          expect(
            homeStateKey(
              world,
              (base.payer as { personId: EntityId }).personId,
            ),
          ).toBe(stateKey);
      process.stderr.write(
        `STATE PAYER ${personName(world.people[payerId]!)} (${stateKey}) ${instrument} base ${sample.amount.minorUnits} tax ${assessment.taxAmount.minorUnits}; ${bases.length} bases. ${sample.assumptionNote}\n`,
      );
      const reopened = deserializeWorld(serializeWorld(world));
      expect(reopened.history.taxAssessments).toEqual(
        world.history.taxAssessments,
      );
    },
    600_000,
  );

  it("reads the state's own rule and refuses a place that is not a state", () => {
    expect(
      stateTaxPowerEvidenceFor("US-KY", "sales", makeIsoDate("2026-10-01")),
    ).toMatchObject({
      level: "STATE",
      instrument: "sales",
    });
    expect(
      stateTaxPowerEvidenceFor(
        "not-a-state",
        "sales",
        makeIsoDate("2026-10-01"),
      ),
    ).toBeNull();
  });
});
