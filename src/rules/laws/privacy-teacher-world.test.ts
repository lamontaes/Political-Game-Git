import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  createOrganization,
  createWorkRelationship,
} from "../../simulation/life";
import { createWorkCompensation, money } from "../../simulation/resources";
import {
  organizationProfileAt,
  workRoleAt,
  workStatusAt,
} from "../../simulation/life-queries";
import { resourceFlowTermsAt } from "../../simulation/resource-queries";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../simulation/national-election-geography";
import { makeIsoDate } from "../../simulation/dates";
import { createStableId } from "../../simulation/ids";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../../simulation/life-places";
import { lawInForce as nativeLaw } from "../../simulation/governing/law-in-force";
import { readFinalEnactedLawTerm } from "../../simulation/governing/final-law-term-query";
import * as nativeTeacher from "../../simulation/teacher-salary-floor";
import { dataPrivacyInitialCostOn as nativePrivacy } from "../../simulation/federal-data-privacy-law";
import {
  dataPrivacyInitialCostOn,
  NATIONAL_DATA_PRIVACY_QUESTION,
  type PrivacyFacts,
} from "./privacy-cost";
import {
  recordedTeacherSalaryMedian,
  requestedTeacherSalaryFloor,
  teacherSalaryFloorAt,
  TEACHER_SALARY_FLOOR_QUESTION,
  type TeacherFacts,
} from "./teacher-floor";
import { lawFacts } from "./test-support/law-facts";
import { finalTermReceiptKey } from "./tax-law-schedules";
import privacyCosts from "../../../data/research/money/privacy-law-compliance-cost-ccpa-2019.json";
import type {
  World,
  EntityId,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
  LegislativeProvisionRecord,
  PrincipleRecord,
} from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Controlled native employer/work/compensation facts for read-only law mathematics.",
};
function savedLaw(
  world: World,
  questionKey: string,
  jurisdictionId: EntityId,
  amount: number | null,
): World {
  const q = Object.values(world.policyCatalog.propositions).find(
    (q) => q.stableKey === questionKey,
  )!;
  const seq = world.history.nextSequence;
  const key = "rules2:" + questionKey;
  const measure = {
    id: createStableId("legislative-measure", world.id + key),
    stableKey: key,
    sequence: seq,
    jurisdictionId,
    rulePackId:
      jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id
        ? "US:congress"
        : "fixture:state",
    designation: "HB 910",
    shortTitle: "Authored saved law",
    summary: "Explicit saved-law reader control; no ordinary enactment claim.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: makeIsoDate("2026-01-01"),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [q.id],
    propositionAnswers: [{ propositionId: q.id, answer: "yes" }],
  } as LegislativeMeasureRecord;
  const provision = {
    id: createStableId("legislative-provision", world.id + key + ":terms"),
    stableKey: key + ":terms",
    sequence: seq + 1,
    measureId: measure.id,
    provisionKey: key + ":floor",
    sectionNumber: 1,
    heading: "Authored numeric target",
    text: "Explicit adopted numeric control.",
    filedAt: makeIsoDate("2026-01-01"),
    supersedesProvisionId: null,
    ...(amount === null
      ? {}
      : {
          lawTerms: [
            { questionKey, key: "floor", unit: "minor", value: amount },
          ],
        }),
  } as unknown as LegislativeProvisionRecord;
  const enactment = {
    id: createStableId("legislative-enactment", world.id + key + ":enactment"),
    stableKey: key + ":enactment",
    sequence: seq + 2,
    measureId: measure.id,
    resolvedAt: makeIsoDate("2026-01-02"),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: makeIsoDate("2026-01-03"),
    outcomeEventId: createStableId("event", world.id + key + ":event"),
  } as LegislativeEnactmentRecord;
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: seq + 3,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeProvisions: [
        ...(world.history.legislativeProvisions ?? []),
        provision,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}
function work(
  world: World,
  organizationId: EntityId,
  personId: EntityId,
  jurisdictionId: EntityId,
  key: string,
  teacher: boolean,
) {
  let next = createWorkRelationship(world, {
    stableKey: key,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Authored saved worker",
      occupationClassification: teacher
        ? "profession:teacher"
        : "profession:policy-analysis",
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 40 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  if (teacher)
    next = createWorkCompensation(next, {
      stableKey: key + ":salary",
      workRelationshipId: next.history.workRelationships.at(-1)!.id,
      startsAt: next.currentDate,
      amount: money(
        200000 + (next.history.workRelationships.length % 3) * 1000,
        "USD",
      ),
      cadenceKind: "schedule:town-weekly",
      restrictionKind: null,
      jurisdictionId,
      provenance,
    });
  return next;
}
describe("laws: native privacy applicability and teacher salary/floor readers", () => {
  it.each(Object.keys(STATES))(
    "matches real dated employees, flow medians and law terms in %s",
    (usps) => {
      const base = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2-law-privacy-teacher:" + usps,
      });
      let world = ensureNationalElectionJurisdiction(base.world);
      world = createOrganization(world, {
        stableKey: "rules2:school",
        formedAt: world.currentDate,
        provenance,
        initialProfile: {
          name: "Authored public school",
          classification: "service:school",
          locationJurisdictionId: base.jurisdictionId,
        },
      });
      const school = world.history.organizations.at(-1)!.id;
      for (const [i, person] of world.personOrder.entries())
        world = work(
          world,
          school,
          person,
          base.jurisdictionId,
          "rules2:teacher:" + i,
          true,
        );
      world = createOrganization(world, {
        stableKey: "rules2:firm",
        formedAt: world.currentDate,
        provenance,
        initialProfile: {
          name: "Authored private firm",
          classification: "sector:private",
          locationJurisdictionId: base.jurisdictionId,
        },
      });
      const firm = world.history.organizations.at(-1)!.id;
      for (const [i, person] of [...world.personOrder, base.personId].entries())
        world = work(
          world,
          firm,
          person,
          base.jurisdictionId,
          "rules2:employee:" + i,
          false,
        );
      world = savedLaw(
        savedLaw(
          world,
          NATIONAL_DATA_PRIVACY_QUESTION,
          NATIONAL_ELECTION_JURISDICTION.id,
          null,
        ),
        TEACHER_SALARY_FLOOR_QUESTION,
        base.stateJurisdictionId,
        2000000,
      );
      const teacherQ = Object.values(world.policyCatalog.propositions).find(
        (q) => q.stableKey === TEACHER_SALARY_FLOOR_QUESTION,
      )!;
      const principleControls = (teacherQ.principles ?? []).map(
        (bearing, i) =>
          ({
            id: createStableId("principle", world.id + ":principle:" + i),
            sequence: world.history.nextSequence + i,
            personId: base.personId,
            principleId: bearing.principleId,
            formedAt: world.currentDate,
            stance:
              bearing.bearing === "consistent-with" ? "endorses" : "rejects",
            strength: 1,
          }) as PrincipleRecord,
      );
      world = {
        ...world,
        history: {
          ...world.history,
          nextSequence: world.history.nextSequence + principleControls.length,
          principles: [...world.history.principles, ...principleControls],
        },
      };
      const dates = [
        world.currentDate,
        makeIsoDate("2026-01-02"),
        makeIsoDate("2026-07-01"),
      ];
      const qs = Object.values(world.policyCatalog.propositions).filter((q) =>
        [
          TEACHER_SALARY_FLOOR_QUESTION,
          NATIONAL_DATA_PRIVACY_QUESTION,
        ].includes(q.stableKey),
      );
      const raw = lawFacts(
        world,
        qs.map((q) => q.id),
        dates,
        [undefined],
      );
      const profiles = new Map(
        world.history.organizations.map((o) => [
          o.id,
          organizationProfileAt(world, o.id),
        ]),
      );
      const statuses = new Map(
        world.history.workRelationships.map((w) => [
          w.id,
          workStatusAt(world, w.id),
        ]),
      );
      const roles = new Map(
        world.history.workRelationships.map((w) => [
          w.id,
          workRoleAt(world, w.id),
        ]),
      );
      const finalTerms = new Map();
      for (const id of [base.jurisdictionId, base.stateJurisdictionId])
        for (const date of dates) {
          const law = nativeLaw(world, id, teacherQ.id, date);
          if (law) {
            const query = {
              questionKey: TEACHER_SALARY_FLOOR_QUESTION,
              termKey: "floor",
              unit: "minor" as const,
              onDate: date,
            };
            finalTerms.set(
              finalTermReceiptKey(law.measureId, query),
              readFinalEnactedLawTerm(world, law, query),
            );
          }
        }
      const teacher: TeacherFacts = {
        ...raw,
        workRelationships: world.history.workRelationships,
        flows: world.history.resourceFlows,
        statuses,
        roles,
        profiles,
        flowTerms: new Map(
          world.history.resourceFlows.map((f) => [
            f.id,
            resourceFlowTermsAt(world, f.id),
          ]),
        ),
        jurisdictionStateKeys: new Map(
          world.jurisdictionOrder.flatMap((id) => {
            const key =
              stateKeyForJurisdiction(world.jurisdictions[id]!) ??
              lifePlaceByJurisdictionId(id)?.stateJurisdictionKey;
            return key ? [[id, key] as const] : [];
          }),
        ),
        leanings: {
          onDate: world.currentDate,
          policyCatalog: world.policyCatalog,
          principles: world.history.principles,
        },
        finalTerms,
      };
      expect(recordedTeacherSalaryMedian(teacher, base.jurisdictionId)).toEqual(
        nativeTeacher.recordedTeacherSalaryMedian(world, base.jurisdictionId),
      );
      expect(
        recordedTeacherSalaryMedian(teacher, base.jurisdictionId),
      ).not.toBeNull();
      expect(
        requestedTeacherSalaryFloor(
          teacher,
          base.jurisdictionId,
          base.personId,
        ),
      ).toEqual(
        nativeTeacher.requestedTeacherSalaryFloor(
          world,
          base.jurisdictionId,
          base.personId,
        ),
      );
      for (const date of dates)
        expect(
          teacherSalaryFloorAt(teacher, base.jurisdictionId, date, null),
        ).toEqual(
          nativeTeacher.teacherSalaryFloorAt(
            world,
            base.jurisdictionId,
            date,
            null,
          ),
        );
      for (const revenue of [25000000, 25000001, 30000000, NaN]) {
        // The saved books are an explicit revenue input, not an ordinary business forecast or ledger claim.
        const businesses = {
          [firm]: {
            organizationId: firm,
            openedAt: world.currentDate,
            annualRevenue: revenue,
          },
        } as unknown as PrivacyFacts["businesses"];
        const saved = {
          ...world,
          townFinances: { businesses } as unknown as NonNullable<
            World["townFinances"]
          >,
        };
        const facts: PrivacyFacts = {
          ...raw,
          people: world.people,
          businesses,
          workRelationships: world.history.workRelationships,
          profiles,
          statuses,
          roles,
          costs: privacyCosts,
        };
        expect(
          dataPrivacyInitialCostOn(facts, world.currentDate, firm),
        ).toEqual(nativePrivacy(saved, world.currentDate, firm));
        if (revenue > 25000000)
          expect(
            dataPrivacyInitialCostOn(facts, world.currentDate, firm),
          ).not.toBeNull();
      }
    },
  );
});
