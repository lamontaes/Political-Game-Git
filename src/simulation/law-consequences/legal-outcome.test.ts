import { describe, expect, it } from "vitest";
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
import { legislativeProcedureForJurisdiction } from "../legislative-procedure-world";
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
  sentenceMonthsForCase,
  termMonths,
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
  minimumCustodyRow,
} from "./legal-outcome";

const propositionId = "proposition_test_minimums" as EntityId;
const cashBailQuestion =
  "us-policy-positions:justice-public-safety.end-cash-bail";
const places = Object.keys(
  startingLaw.questions[cashBailQuestion].answers,
).sort();

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
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
          startAge: 40,
          questionnaire: "skipped",
        }),
      ).game!;
      const personId = game.playerPersonId;
      const jurisdictionId = game.world.people[personId]!.homeJurisdictionId;
      const actualPropositionId = Object.values(
        game.world.policyCatalog.propositions,
      ).find((entry) => entry.stableKey === MINIMUM_CUSTODY_QUESTION)!.id;
      const terms = fixture(state.jurisdictionKey);
      const measured = {
        ...terms.measure,
        sequence: game.world.history.nextSequence,
        rulePackId: legislativeProcedureForJurisdiction(
          game.world,
          terms.measure.jurisdictionId,
        )!.baselinePack.packId,
        jurisdictionId: terms.measure.jurisdictionId,
        propositionIds: [actualPropositionId],
        propositionAnswers: [
          { propositionId: actualPropositionId, answer: "yes" as const },
        ],
      };
      const world: World = {
        ...game.world,
        history: {
          ...game.world.history,
          nextSequence: game.world.history.nextSequence + 3,
          legislativeMeasures: [
            ...(game.world.history.legislativeMeasures ?? []),
            measured,
          ],
          legislativeEnactments: [
            ...(game.world.history.legislativeEnactments ?? []),
            {
              ...terms.enactment,
              sequence: game.world.history.nextSequence + 1,
              outcomeEventId: game.world.history.events[0]!.id,
              effectiveAt: addDays(game.world.currentDate, -1),
            },
          ],
          legislativeDraftLineages: [
            ...(game.world.history.legislativeDraftLineages ?? []),
            ...(terms.world.history.legislativeDraftLineages ?? []).map(
              (entry) => ({
                ...entry,
                sequence: game.world.history.nextSequence + 2,
              }),
            ),
          ],
        },
      };
      const referred = referForProsecution(world, {
        stableKey: "g10-floor-fixture",
        subjectPersonId: personId,
        jurisdictionId,
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
      const reloaded = deserializeWorld(serializeWorld(applied));
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
      expect(saved).toHaveProperty(
        "lawEffectStamps.0.governingLawKey",
        measured.id,
      );
    },
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
    sequence: 2,
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
      propositions: {
        [propositionId]: {
          id: propositionId,
          stableKey: MINIMUM_CUSTODY_QUESTION,
        },
      },
    },
    history: {
      events: [],
      legislativeMeasures: [measure],
      legislativeEnactments: [enactment],
      legislativeDraftLineages:
        floor === null
          ? []
          : [
              {
                id: "legislative-draft-lineage_test_floor" as EntityId,
                stableKey: "test:floor:lineage",
                sequence: 3,
                measureId: measure.id,
                familyKey: "test",
                familyVersion: "test",
                variantKey: "test",
                compiledAt: currentDate,
                recordedAt: currentDate,
                provenanceNote:
                  "Authored fixture terms, not a starting-law estimate",
                parameters: [
                  { parameterKey: "floor", kind: "integer", value: floor },
                  {
                    parameterKey: "coverage",
                    kind: "enumerated",
                    value: "crime:robbery",
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
  it("covers all 56 jurisdictions", () => expect(places).toHaveLength(56));
  it.each(places)(
    "enforces recorded months and preserves unbound parity in %s",
    (place) => {
      const { world, courtCase, measure, enactment } = fixture(place);
      expect(custodyFloorAt(world, courtCase)?.months).toBe(120);
      expect(mandatoryJailUnderLaw(world, courtCase)).toContain("120 months");
      expect(sentenceMonthsForCase(world, "jail", courtCase)).toBe(120);
      const uncovered = { ...courtCase, offenseKey: "crime:vandalism" };
      expect(custodyFloorAt(world, uncovered)).toBeNull();
      expect(sentenceMonthsForCase(world, "jail", uncovered)).toBe(
        termMonths("jail", 1),
      );
      const absent = fixture(place, null);
      expect(custodyFloorAt(absent.world, absent.courtCase)).toBeNull();
      expect(
        sentenceMonthsForCase(absent.world, "jail", absent.courtCase),
      ).toBe(termMonths("jail", 1));
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
      expect(sentenceMonthsForCase(repealed, "jail", courtCase)).toBe(
        termMonths("jail", 1),
      );
    },
  );
});
