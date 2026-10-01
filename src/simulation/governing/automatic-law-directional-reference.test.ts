import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import startingLaws from "../../../data/research/laws/starting-law-2026.json";
import { createWorld, assertWorldIntegrity } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { createLegislativeScenario } from "../legislation-scenarios";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import {
  ensureStateLegislatureOpening,
  stateLegislators,
} from "../nationwide-world/state-legislature-opening";
import {
  CHIEF_EXECUTIVE_JURISDICTIONS,
  US_STATE_USPS,
} from "../nationwide-world/state-executive-candidacy-packs";
import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { introduceMeasure } from "../legislation";
import { recordFiledProvision } from "../legislative-politics";
import { createFormationContext, recordPrinciples } from "../politics";
import { serializeWorld, deserializeWorld } from "../serialization";
import { SeededRng, pickDistinct } from "../rng";
import { personName } from "../people";
import {
  sponsorRequestedLawTerm,
  recordSponsorRequestedLawTerm,
  type SponsorLawTermRequest,
} from "./automatic-legislation";
import type { EntityId, World } from "../types";

// All numbers and legal text are explicit process-only controls, not researched sentences.
const seed = "g2-nearest-directional-reference";
const places = pickDistinct(new SeededRng(seed), US_STATE_USPS, 5);
const questionKey =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";
const termKey = "covered-offense-minimum-months";
let opening: World;
let questionId: EntityId;
const sponsors = new Map<string, EntityId>();
const proof: unknown[] = [];
const jurisdiction = (place: string) =>
  stateJurisdictionForKey(`US-${place}`)!.id;
function file(start: World, place: string, key: string, value?: number) {
  const pack = legislativePackForJurisdiction(jurisdiction(place))!;
  const stableKey = `directional:${place}:${key}`;
  let next = introduceMeasure(start, {
    stableKey,
    jurisdictionId: jurisdiction(place),
    rulePackId: pack.packId,
    designation: `HB ${1 + (start.history.legislativeMeasures?.length ?? 0)}`,
    shortTitle: "Controlled covered-offense request",
    summary: "Fictional numeric text testing an existing saved reference.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: sponsors.get(place)!,
    originChamberKey: pack.chamberOrder[0]!,
    propositionIds: [questionId],
    propositionAnswers: [{ propositionId: questionId, answer: "yes" }],
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  if (value !== undefined)
    next = recordFiledProvision(next, {
      stableKey: `${stableKey}:minimum`,
      measureId,
      provisionKey: "covered-offense-minimum",
      sectionNumber: 1,
      heading: "Controlled covered-offense minimum",
      text: `The fictional covered-offense minimum is ${value} months.`,
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "the fictional covered offense",
      },
      applicationScope: {
        jurisdictionId: jurisdiction(place),
        segmentKey: null,
      },
      lawTerms: [{ questionKey, key: termKey, value, unit: "months" }],
    });
  return { world: next, measureId };
}
function strength(start: World, place: string, oppose = false) {
  return recordPrinciples(
    start,
    start.policyCatalog.propositions[questionId]!.principles!.map(
      (bearing) => ({
        stableKey: `directional:${place}:${oppose}:${bearing.principleId}`,
        personId: sponsors.get(place)!,
        principleId: bearing.principleId,
        formedAt: start.currentDate,
        stance:
          (bearing.bearing === "consistent-with") !== oppose
            ? "endorses"
            : "rejects",
        strength: 1,
        conviction: "settled",
        flexibility: "firm",
        qualification: null,
        formation: createFormationContext("experience:life", {
          note: "Controlled recorded sponsor reasons; no invented increment.",
        }),
        supersedesPrincipleRecordId: null,
      }),
    ),
  );
}
beforeAll(() => {
  const scenario = createLegislativeScenario("kentucky");
  const catalog = createProductionPolicyCatalog();
  questionId = Object.values(catalog.propositions).find(
    (row) => row.stableKey === questionKey,
  )!.id;
  opening = createWorld({
    seed: scenario.world.seed,
    currentDate: makeIsoDate("2027-02-01"),
    people: scenario.world.personOrder.map((id) => scenario.world.people[id]!),
    jurisdictions: CHIEF_EXECUTIVE_JURISDICTIONS.map((place) =>
      stateJurisdictionForKey(`US-${place}`)!,
    ),
    policyCatalog: catalog,
  });
  opening = ensureWorldStartingConditions(opening, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  });
  for (const place of places) {
    const pack = legislativePackForJurisdiction(jurisdiction(place))!;
    opening = ensureStateLegislatureOpening(
      opening,
      opening.personOrder[0]!,
      place,
    );
    const member = stateLegislators(opening, `${pack.packId}:candidacy`).find(
      (row) => row.officeKey.endsWith(`:${pack.chamberOrder[0]}`),
    )!;
    sponsors.set(place, member.personId);
  }
}, 30000);
afterAll(() => {
  if (process.env.TEAM1_DIRECTIONAL_REFERENCE_PROOF_PATH)
    writeFileSync(
      process.env.TEAM1_DIRECTIONAL_REFERENCE_PROOF_PATH,
      JSON.stringify(proof, null, 2) + "\n",
    );
});

describe("nearest recorded numeric references", () => {
  it.each(places)(
    "selects and saves exact directional references in %s",
    (place) => {
      type Row = {
        answer: string;
        operativeAt?: string;
        lawTerms?: {
          questionKey: string;
          key: string;
          value: number;
          unit: string;
        }[];
        phases?: Row[];
      };
      const questions = startingLaws.questions as unknown as Record<
        string,
        { answers: Record<string, Row> }
      >;
      const previousQuestion = questions[questionKey];
      const fixture = { answers: { ...previousQuestion?.answers } };
      questions[questionKey] = fixture;
      const source = places[(places.indexOf(place) + 1) % places.length]!;
      const terms = (value: number, unit = "months") => [
        { questionKey, key: termKey, value, unit },
      ];
      const targetKey = `US-${place}`;
      const sourceKey = `US-${source}`;
      try {
        fixture.answers[targetKey] = {
          answer: "yes",
          operativeAt: "2026-01-01",
          lawTerms: terms(60),
        };
        fixture.answers[sourceKey] = {
          answer: "yes",
          operativeAt: "2026-01-01",
        };
        const requested = file(opening, place, "request");
        const input: SponsorLawTermRequest = {
          measureId: requested.measureId,
          questionKey,
          termKey,
          unit: "months",
          supportDirection: "raise",
          basis: "term",
        };
        const without = strength(requested.world, place);
        expect(sponsorRequestedLawTerm(without, input)).toBeNull();
        let start = requested.world;
        for (const value of [36, 48, 72, 84])
          start = file(start, place, `reference:${value}`, value).world;
        const raised = strength(start, place);
        expect(sponsorRequestedLawTerm(raised, input)?.value).toBe(72);
        expect(
          sponsorRequestedLawTerm(strength(start, place, true), input)?.value,
        ).toBe(48);
        fixture.answers[sourceKey] = {
          answer: "yes",
          operativeAt: "2026-01-01",
          lawTerms: terms(66),
          phases: [
            { answer: "yes", operativeAt: "2028-01-01", lawTerms: terms(80) },
          ],
        };
        const term = sponsorRequestedLawTerm(raised, input)!;
        expect(term.value).toBe(66);
        expect(term.referenceMeasureId).toBe(
          `starting-law:${sourceKey}:${questionKey}`,
        );
        expect(term.referenceProvisionId).toBeNull();
        expect(term.referenceOperativeAt).toBe("2026-01-01");
        expect(term.sourceRecordIds).toContain(
          `starting-law:${targetKey}:${questionKey}`,
        );
        expect(term.sourceRecordIds).toContain(term.referenceMeasureId);
        const writer = {
          ...input,
          provision: {
            stableKey: `${requested.measureId}:requested-term`,
            provisionKey: "requested-minimum",
            sectionNumber: 1,
            heading: "Requested covered-offense minimum",
            beneficiary: {
              kind: "general-application" as const,
              appliesToLabel: "the fictional covered offense",
            },
            applicationScope: {
              jurisdictionId: jurisdiction(place),
              segmentKey: null,
            },
          },
          renderText: (value: { value: number }) =>
            `The fictional covered-offense minimum is ${value.value} months.`,
        };
        const written = recordSponsorRequestedLawTerm(raised, writer);
        expect(written.provision?.lawTerms).toEqual(terms(66));
        const event = written.world.history.events.find(
          (row) =>
            row.stableKey ===
            `${writer.provision.stableKey}:requested-term-reason`,
        )!;
        expect(event.participants[0]!.personId).toBe(sponsors.get(place));
        expect(event.tags).toContain("reference-operative-at:2026-01-01");
        expect(event.tags).toContain(
          `source-record:${term.referenceMeasureId}`,
        );
        assertWorldIntegrity(written.world);
        const saved = serializeWorld(written.world);
        const loaded = deserializeWorld(saved);
        expect(serializeWorld(loaded)).toBe(saved);
        expect(recordSponsorRequestedLawTerm(loaded, writer).world).toBe(
          loaded,
        );
        proof.push({
          placeSelectionSeed: seed,
          worldSeed: raised.seed,
          place,
          source,
          sponsorPersonId: sponsors.get(place),
          sponsorName: personName(raised.people[sponsors.get(place)!]!),
          requestMeasureId: requested.measureId,
          provisionId: written.provision!.id,
          eventId: event.id,
          term,
          futurePhaseExcluded: true,
          repeatAndSaveContinue: true,
          limits:
            "Fictional process-only terms and explicit saved principles. No natural filing, passage, punishment or cost claim.",
        });
        fixture.answers[sourceKey] = {
          answer: "yes",
          operativeAt: "2026-01-01",
          lawTerms: terms(66, "years"),
        };
        expect(sponsorRequestedLawTerm(without, input)).toBeNull();
        const refused = recordSponsorRequestedLawTerm(without, writer);
        expect(refused.provision).toBeNull();
        expect(refused.refusalReason).toContain("exact directional reference");
        const refusalEvent = refused.world.history.events.find(
          (row) =>
            row.stableKey ===
            `${writer.provision.stableKey}:requested-term-refusal`,
        )!;
        expect(refusalEvent.summary).toBe(refused.refusalReason);
        expect(refusalEvent.participants[0]!.personId).toBe(
          sponsors.get(place),
        );
        expect(refused.world.history.legislativeProvisions).toEqual(
          without.history.legislativeProvisions,
        );
        const refusalSave = serializeWorld(refused.world);
        const refusalReload = deserializeWorld(refusalSave);
        expect(serializeWorld(refusalReload)).toBe(refusalSave);
        expect(recordSponsorRequestedLawTerm(refusalReload, writer).world).toBe(
          refusalReload,
        );
        fixture.answers[targetKey] = {
          answer: "yes",
          operativeAt: "2026-01-01",
        };
        expect(sponsorRequestedLawTerm(raised, input)).toBeNull();
      } finally {
        if (previousQuestion) questions[questionKey] = previousQuestion;
        else delete questions[questionKey];
      }
    },
  );
});
