import { afterAll, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { makeIsoDate, addDays } from "../dates";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { SeededRng, pickDistinct } from "../rng";
import { serializeWorld, deserializeWorld } from "../serialization";
import { stateJurisdictionForKey } from "../life-places";
import {
  legislativeProcedureForJurisdiction,
  legislativeRulePackForWorld,
} from "../legislative-procedure-world";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
  recordEnactment,
} from "../legislation";
import { recordFiledProvision } from "../legislative-politics";
import {
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
} from "../legislation-scenarios";
import { seatsForChamber } from "../legislature-game-profile";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { recordGovernorDecisionOnMeasure } from "../governing/legislative-clock";
import { assertWorldIntegrity } from "../world";
import * as lifePlaces from "../life-places";
import * as simulation from "../index";
import { createLawConsequenceRegistry } from "../law-consequence-registry";
import { personName } from "../people";
import { validateLawConsequences } from "../law-consequence-validation";
import type {
  EntityId,
  World,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
} from "../types";
import {
  mandatoryJailUnderLaw,
  type CourtCase,
} from "../justice/court-reasoning";
import {
  referForProsecution,
  advanceProsecutions,
  PROSECUTION_CHARGED_EVENT,
} from "../justice/prosecution";
import {
  PROSECUTION_SENTENCED_EVENT,
  SENTENCE_MONTHS_TAG,
} from "../justice/jail-terms";
import {
  custodyFloorAt,
  MINIMUM_CUSTODY_QUESTION,
  legalOutcomeRegistration,
  assertLegalOutcomeConsequenceIntegrity,
  minimumCustodyRow,
} from "./legal-outcome";

import { sourcedCustodyBoundsForCase } from "../justice/sentencing-term";
import { sentencingRangeForCase } from "../justice/sentencing-ranges";

const propositionId = "proposition_test_minimums" as EntityId;
const cashBailQuestion =
  "us-policy-positions:justice-public-safety.end-cash-bail";
const places = Object.keys(
  startingLaw.questions[cashBailQuestion].answers,
).sort();
const namedProofs: unknown[] = [];
afterAll(() => {
  const target = process.env.G10_PROOF_REPORT_PATH;
  if (target) writeFileSync(target, JSON.stringify(namedProofs, null, 2));
});

describe("recorded floors reach saved sentences", () => {
  const rng = new SeededRng("team9-g10-floor-five-20260930");
  const states = pickDistinct(rng, lifePlaceStateIdentities(), 5);
  it.each(states)(
    "saves the actual defendant's sentence and stamp in $jurisdictionKey",
    (state) => {
      const place =
        searchLifePlaces("", 5000, {
          stateJurisdictionKey: state.jurisdictionKey,
          scope: "locality",
        })[0] ??
        searchLifePlaces("", 5, {
          stateJurisdictionKey: state.jurisdictionKey,
          scope: "state",
        })[0]!;
      const seed = `team9-g10-floor:${state.jurisdictionKey}`;
      // Only the fixture's opening input date changes. All people, activities,
      // judicial offices and due records are produced at that date by the real
      // opening writer; no existing save or due item is moved across a year.
      const sittingDate = makeIsoDate("2027-01-05");
      const lookup = lifePlaces.lifePlaceByKey;
      const requirePlace = simulation.requireLifePlace;
      const constructorPlace = vi
        .spyOn(simulation, "requireLifePlace")
        .mockImplementation((key) => {
          const found = requirePlace(key);
          return found.key === place.key
            ? {
                ...found,
                context: {
                  ...found.context,
                  initialMoment: {
                    ...found.context.initialMoment,
                    date: sittingDate,
                  },
                },
              }
            : found;
        });
      const placeInput = vi
        .spyOn(simulation, "lifePlaceByKey")
        .mockImplementation((key) => {
          const found = lookup(key);
          return found?.key === place.key
            ? {
                ...found,
                context: {
                  ...found.context,
                  initialMoment: {
                    ...found.context.initialMoment,
                    date: sittingDate,
                  },
                },
              }
            : found;
        });
      let game;
      try {
        game = generateOpeningLife(
          prepareOpeningLife({
            ...DEFAULT_NEW_GAME_SETUP,
            seed,
            placeKey: place.key,
            startAge: 40,
            questionnaire: "skipped",
          }),
        ).game!;
      } finally {
        placeInput.mockRestore();
        constructorPlace.mockRestore();
      }
      const personId = game.playerPersonId;
      expect(game.world.currentDate).toBe(sittingDate);
      const actualPropositionId = Object.values(
        game.world.policyCatalog.propositions,
      ).find((entry) => entry.stableKey === MINIMUM_CUSTODY_QUESTION)!.id;
      let world = game.world;
      const venue = stateJurisdictionForKey(state.jurisdictionKey)!.id;
      const profile = legislativeProcedureForJurisdiction(world, venue)!;
      const pack = legislativeRulePackForWorld(
        world,
        profile.baselinePack.packId,
      );
      world = introduceMeasure(world, {
        stableKey: "g10:canonical-floor",
        jurisdictionId: venue,
        rulePackId: pack.packId,
        designation: "G10 Fictional Test Bill",
        shortTitle: "Fictional custody floor fixture",
        summary: "Authored test terms, not current law.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        sponsorPersonId: personId,
        propositionIds: [actualPropositionId],
        propositionAnswers: [
          { propositionId: actualPropositionId, answer: "yes" },
        ],
      });
      const measured = world.history.legislativeMeasures!.at(-1)!;
      world = recordFiledProvision(world, {
        stableKey: "g10:canonical-floor:terms",
        measureId: measured.id,
        provisionKey: "minimum-custody",
        sectionNumber: 1,
        heading: "Fictional minimum custody and covered offense",
        text: "For the fictional robbery fixture, the custody minimum is 120 months.",
        beneficiary: {
          kind: "general-application",
          appliesToLabel: "defendants convicted of the covered offense",
        },
        applicationScope: { jurisdictionId: venue, segmentKey: null },
        lawTerms: [
          {
            questionKey: MINIMUM_CUSTODY_QUESTION,
            key: "floor",
            value: 120,
            unit: "months",
          },
        ],
        lawCategories: [
          {
            questionKey: MINIMUM_CUSTODY_QUESTION,
            key: "coverage",
            values: ["robbery"],
          },
        ],
      });
      const bodies = pack.chambers.map((chamber) =>
        seatBodyForPack(
          chamber.chamberKey,
          chamber.name,
          seatsForChamber(pack, chamber.chamberKey)!.seats,
          [],
          pack.structure === "unicameral",
        ),
      );
      const votePlan: Record<string, { yea: number }> = {};
      for (const chamber of pack.chambers) {
        const body = bodies.find(
          (entry) => entry.chamberKey === chamber.chamberKey,
        )!;
        for (const committee of chamber.committees)
          votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
            yea: Math.min(body.members.length, committee.appointedMembers),
          };
        for (const stage of chamber.floorStages)
          votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
            yea: body.members.length,
          };
      }
      const procedure: LegislativeProcedureContext = {
        pack,
        measureId: measured.id,
        bodies,
        committeeMemberCount: null,
        votePlan,
        governorAction: "signed",
        governorRationale: "Fictional unanimous fixture decisions.",
      };
      for (
        let guard = 0;
        guard < 40 &&
        measurePosition(world, measured.id).phase !== "awaiting-enactment";
        guard++
      ) {
        if (
          measurePosition(world, measured.id).phase === "awaiting-executive"
        ) {
          world = recordGovernorDecisionOnMeasure(
            world,
            measured.id,
            "signed",
            "Authored test approval: the governor signs the minimum-custody act.",
          );
          continue;
        }
        const step = availableMeasureSteps(world, measured.id).find(
          (key) => key !== "offer-amendment",
        );
        if (!step)
          throw new Error(
            `No canonical next step: ${measurePosition(world, measured.id).phase}`,
          );
        world = applyLegislativeStep(procedure, world, step).world;
      }
      expect(measurePosition(world, measured.id).phase).toBe(
        "awaiting-enactment",
      );
      world = recordEnactment(world, {
        stableKey: "g10:canonical-floor:enacted",
        measureId: measured.id,
        effectiveAt: world.currentDate,
      });
      expect(measurePosition(world, measured.id).phase).toBe("enacted");
      assertWorldIntegrity(world);
      const referred = referForProsecution(world, {
        stableKey: "g10-floor-fixture",
        subjectPersonId: personId,
        jurisdictionId: venue,
        offenseKey: "crime:robbery",
        referredBy: { kind: "police", label: "police", personId: null },
        basisEventIds: [],
        evidence: "documentary",
        standingFindings: 6,
      });
      const due: World = {
        ...referred.world,
        history: {
          ...referred.world.history,
          events: referred.world.history.events.map((entry) =>
            entry.id === referred.referralId
              ? { ...entry, occurredAt: addDays(world.currentDate, -200) }
              : entry,
          ),
        },
      };
      const charged = advanceProsecutions(due);
      const trialDue: World = {
        ...charged,
        history: {
          ...charged.history,
          events: charged.history.events.map((entry) =>
            entry.type === PROSECUTION_CHARGED_EVENT &&
            entry.involvedEntityIds.includes(personId)
              ? { ...entry, occurredAt: addDays(world.currentDate, -120) }
              : entry,
          ),
        },
      };
      const sentenced = advanceProsecutions(trialDue);
      const event = sentenced.history.events.find(
        (entry) =>
          entry.type === PROSECUTION_SENTENCED_EVENT &&
          entry.participants.some(
            (p) => p.role === "focus:defendant" && p.personId === personId,
          ),
      );
      expect(event, `${seed}, person ${personId}`).toBeDefined();
      expect(event!.tags).toContain(`${SENTENCE_MONTHS_TAG}120`);
      const resolved = legalOutcomeRegistration.resolve(
        sentenced,
        minimumCustodyRow,
        {
          onDate: world.currentDate,
          activity: "case-stage",
          activityId: event!.id,
          subjectIds: [personId],
          questionKey: MINIMUM_CUSTODY_QUESTION,
        },
      );
      expect(resolved).toHaveLength(1);
      const applied = legalOutcomeRegistration.apply(sentenced, resolved[0]!);
      expect(applied.history.events).toBe(sentenced.history.events);
      expect(applied.history.nextSequence).toBe(
        sentenced.history.nextSequence + 1,
      );
      assertLegalOutcomeConsequenceIntegrity(applied);
      const reloaded = deserializeWorld(serializeWorld(applied));
      assertLegalOutcomeConsequenceIntegrity(reloaded);
      expect(legalOutcomeRegistration.apply(reloaded, resolved[0]!)).toBe(
        reloaded,
      );
      expect(advanceProsecutions(reloaded).history.events).toEqual(
        applied.history.events,
      );
      const saved = reloaded.history.events.find(
        (entry) => entry.id === event!.id,
      )!;
      expect(saved.summary).toContain("120 months");
      expect(saved).toEqual(event);
      expect(saved).not.toHaveProperty("lawEffectStamps");
      const consequence = reloaded.history.legalOutcomeConsequences!.find(
        (record) => record.sentenceEventId === event!.id,
      )!;
      expect(consequence.subjectPersonId).toBe(personId);
      expect(consequence.minimumMonths).toBe(120);
      expect(consequence.effectKind).toBe("minimum-custody-months");
      expect(consequence.lawEffectStamps[0]!.effectKind).toBe("legal-outcome");
      expect(consequence).toHaveProperty(
        "lawEffectStamps.0.governingLawKey",
        measured.id,
      );
      namedProofs.push({
        seed,
        place: state.jurisdictionKey,
        personId,
        name: personName(reloaded.people[personId]!),
        sentenceId: saved.id,
        months: 120,
        measureId: measured.id,
        summary: saved.summary,
        consequenceId: consequence.id,
        stamps: consequence.lawEffectStamps,
      });
    },
    120_000,
  );
});

// Authored fixture terms exercise the mechanism; they are not 2026 legal values.
function fixture(place: string, floor: number | null = 120) {
  const jurisdictionId = stateJurisdictionForKey(place)!.id;
  const currentDate = makeIsoDate("2026-07-02");
  const measure: LegislativeMeasureRecord = {
    id: "legislative-measure_test_floor" as EntityId,
    stableKey: "test:floor",
    sequence: 1,
    jurisdictionId,
    rulePackId: "test",
    designation: "HB 1",
    shortTitle: "Fixture floor",
    summary: "Authored fixture",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: makeIsoDate("2026-01-05"),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [propositionId],
    propositionAnswers: [{ propositionId, answer: "yes" }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: "legislative-enactment_test_floor" as EntityId,
    stableKey: "test:floor:enacted",
    sequence: 3,
    measureId: measure.id,
    resolvedAt: makeIsoDate("2026-02-01"),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: makeIsoDate("2026-07-01"),
    outcomeEventId: "event_test_floor" as EntityId,
  };
  const world = {
    currentDate,
    policyCatalog: {
      propositionOrder: [propositionId],
      propositions: {
        [propositionId]: {
          id: propositionId,
          stableKey: MINIMUM_CUSTODY_QUESTION,
          parameters: [
            {
              key: "coverage",
              value: "covered-offense-categories",
              allowedValues: ["assault", "robbery", "burglary", "vandalism"],
            },
          ],
        },
      },
    },
    history: {
      events: [],
      legislativeMeasures: [measure],
      legislativeEnactments: [enactment],
      legislativeProvisions:
        floor === null
          ? []
          : [
              {
                id: "legislative-provision_test_floor" as EntityId,
                stableKey: "test:floor:provision",
                sequence: 2,
                measureId: measure.id,
                provisionKey: "minimum-custody",
                sectionNumber: 1,
                heading: "Controlled floor",
                text: "Fictional controlled terms.",
                beneficiary: {
                  kind: "general-application",
                  appliesToLabel: "covered defendants",
                },
                applicationScope: { jurisdictionId, segmentKey: null },
                fiscalExposureLabel: null,
                fiscalExposureMinorUnits: null,
                recordedAt: measure.introducedAt,
                supersedesProvisionId: null,
                originAmendmentId: null,
                eventId: "event_test_provision" as EntityId,
                lawTerms: [
                  {
                    questionKey: MINIMUM_CUSTODY_QUESTION,
                    key: "floor",
                    value: floor,
                    unit: "months",
                  },
                ],
                lawCategories: [
                  {
                    questionKey: MINIMUM_CUSTODY_QUESTION,
                    key: "coverage",
                    values: ["robbery"],
                  },
                ],
              },
            ],
    },
  } as unknown as World;
  const courtCase: CourtCase = {
    caseKey: "test:case",
    defendantId: "person_test" as EntityId,
    offenseKey: "crime:robbery",
    offenseLabel: "robbery",
    evidence: "documentary",
    standingFindings: 1,
    venueJurisdictionId: jurisdictionId,
    stateKey: place,
  };
  return { world, courtCase, measure, enactment };
}

describe("recorded custody floors through the existing sentence writer", () => {
  it("validates the exported row against the shared registry contract", () => {
    const registry = createLawConsequenceRegistry([legalOutcomeRegistration]);
    expect(
      validateLawConsequences([minimumCustodyRow], registry.capabilities),
    ).toEqual([]);
  });
  it("uses the saved court venue and case-stage date, including after repeal", () => {
    const { world, courtCase, measure, enactment } = fixture(places[0]!);
    const other = fixture(places[1]!);
    const event = {
      id: "event_unit_sentence" as EntityId,
      type: PROSECUTION_SENTENCED_EVENT,
      occurredAt: world.currentDate,
      jurisdictionId: courtCase.venueJurisdictionId,
      participants: [
        { role: "focus:defendant", personId: courtCase.defendantId },
      ],
      tags: ["justice.offense:crime:robbery", `${SENTENCE_MONTHS_TAG}120`],
    } as unknown as World["history"]["events"][number];
    const afterRepeal = {
      ...world,
      currentDate: makeIsoDate("2026-08-01"),
      people: {
        [courtCase.defendantId]: {
          homeJurisdictionId: other.courtCase.venueJurisdictionId,
        },
      },
      history: {
        ...world.history,
        events: [event],
        legislativeMeasures: [
          measure,
          {
            ...measure,
            id: "legislative-measure_test_repeal" as EntityId,
            sequence: 4,
            propositionAnswers: [{ propositionId, answer: "no" }],
          },
        ],
        legislativeEnactments: [
          enactment,
          {
            ...enactment,
            id: "legislative-enactment_test_repeal" as EntityId,
            measureId: "legislative-measure_test_repeal" as EntityId,
            sequence: 5,
            effectiveAt: makeIsoDate("2026-08-01"),
          },
        ],
      },
    } as unknown as World;
    const context = {
      onDate: event.occurredAt,
      activity: "case-stage" as const,
      activityId: event.id,
      subjectIds: [courtCase.defendantId],
      questionKey: MINIMUM_CUSTODY_QUESTION,
    };
    expect(custodyFloorAt(afterRepeal, courtCase)).toBeNull();
    const resolved = legalOutcomeRegistration.resolve(
      afterRepeal,
      minimumCustodyRow,
      context,
    );
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.jurisdictionId).toBe(event.jurisdictionId);
    expect(resolved[0]!.law.measureId).toBe(measure.id);
    expect(legalOutcomeRegistration.apply(afterRepeal, resolved[0]!)).toBe(
      afterRepeal,
    );
    const absentVenue = {
      ...afterRepeal,
      history: {
        ...afterRepeal.history,
        events: [{ ...event, jurisdictionId: null }],
      },
    };
    expect(
      legalOutcomeRegistration.resolve(absentVenue, minimumCustodyRow, context),
    ).toEqual([]);
  });
  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses invalid recorded custody months %s",
    (floor) => {
      const { world, courtCase } = fixture(places[0]!, floor);
      expect(custodyFloorAt(world, courtCase)).toBeNull();
    },
  );
  it("refuses conflicting final sections without an explicit priority", () => {
    const { world, courtCase } = fixture(places[0]!);
    const provision = world.history.legislativeProvisions![0]!;
    const ambiguous = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: [
          provision,
          {
            ...provision,
            id: "legislative-provision_second" as EntityId,
            provisionKey: "another-floor",
            lawTerms: [
              {
                questionKey: MINIMUM_CUSTODY_QUESTION,
                key: "floor",
                value: 240,
                unit: "months" as const,
              },
            ],
          },
        ],
      },
    };
    expect(custodyFloorAt(ambiguous, courtCase)).toBeNull();
  });
  it("does not infer coverage from a numeric floor alone", () => {
    const { world, courtCase } = fixture(places[0]!);
    const absent = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: world.history.legislativeProvisions!.map(
          (provision) => ({ ...provision, lawCategories: undefined }),
        ),
      },
    };
    expect(custodyFloorAt(absent, courtCase)).toBeNull();
  });
  it("honors an explicitly empty final coverage list", () => {
    const { world, courtCase } = fixture(places[0]!);
    const empty = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: world.history.legislativeProvisions!.map(
          (provision) => ({
            ...provision,
            lawCategories: [
              {
                questionKey: MINIMUM_CUSTODY_QUESTION,
                key: "coverage",
                values: [],
              },
            ],
          }),
        ),
      },
    };
    expect(custodyFloorAt(empty, courtCase)).toBeNull();
  });
  it("covers all 56 jurisdictions", () => expect(places).toHaveLength(56));
  it.each(places)(
    "enforces recorded months and preserves sourced bounds after repeal in %s",
    (place) => {
      const { world, courtCase, measure, enactment } = fixture(place);
      expect(custodyFloorAt(world, courtCase)?.months).toBe(120);
      expect(mandatoryJailUnderLaw(world, courtCase)).toContain("120 months");
      const range = sentencingRangeForCase(courtCase)!;
      expect(range).not.toBeNull();
      const bounds = sourcedCustodyBoundsForCase(world, courtCase);
      if (range.maxMonths !== null && range.maxMonths < 120) {
        expect(bounds).toBeNull(); // Conflicting floor/ceiling is not permission.
      } else {
        expect(bounds?.minimumMonths).toBe(Math.max(120, range.minMonths));
        expect(bounds?.range).toEqual(range);
      }
      const uncovered = { ...courtCase, offenseKey: "crime:vandalism" };
      expect(custodyFloorAt(world, uncovered)).toBeNull();
      expect(sourcedCustodyBoundsForCase(world, uncovered)).toBeNull();
      // No saved vandalism grade means no numerical charge-grade default.
      const absent = fixture(place, null);
      expect(custodyFloorAt(absent.world, absent.courtCase)).toBeNull();
      expect(
        sourcedCustodyBoundsForCase(absent.world, absent.courtCase)
          ?.minimumMonths,
      ).toBe(range.minMonths);
      const zero = fixture(place, 0);
      expect(custodyFloorAt(zero.world, zero.courtCase)?.months).toBe(0);
      expect(mandatoryJailUnderLaw(zero.world, zero.courtCase)).toBeNull();
      const repealed: World = {
        ...world,
        currentDate: makeIsoDate("2026-08-01"),
        history: {
          ...world.history,
          legislativeMeasures: [
            measure,
            {
              ...measure,
              id: "legislative-measure_test_repeal" as EntityId,
              sequence: 4,
              propositionAnswers: [{ propositionId, answer: "no" }],
            },
          ],
          legislativeEnactments: [
            enactment,
            {
              ...enactment,
              id: "legislative-enactment_test_repeal" as EntityId,
              measureId: "legislative-measure_test_repeal" as EntityId,
              sequence: 5,
              effectiveAt: makeIsoDate("2026-08-01"),
            },
          ],
        },
      };
      expect(custodyFloorAt(repealed, courtCase)).toBeNull();
      expect(
        sourcedCustodyBoundsForCase(repealed, courtCase)?.minimumMonths,
      ).toBe(range.minMonths);
    },
  );
});
