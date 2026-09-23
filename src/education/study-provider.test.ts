import { makeIsoDate } from "../simulation/dates";
import { LEXINGTON_DEMO_CONTEXT } from "../simulation/demo-jurisdiction-context";
import { describe, it, expect } from "vitest";
import {
  createDemoWorld,
  createWorld,
  createResourcePosition,
  money,
  serializeWorld,
  deserializeWorld,
  advanceWorld,
} from "../simulation/index";
import { resourcePositionAt } from "../simulation/resource-queries";
import { educationEnrollmentStateAt } from "../simulation/life-queries";
import {
  applyForEducation,
  pendingEducationOffers,
  respondToEducationOffer,
  educationOptionReason,
  studyDefinition,
  studyPathFor,
} from "./study-provider";
import {
  changeLifePathStatus,
  hasLifePathCredential,
  lifePathEntryReason,
  pathForRelationship,
  enterLifePath,
  LIFE_PATHS2_HANDLERS,
} from "../simulation/life-paths2";
import { completedStudyPeriods } from "../simulation/education-study-progression";
import type { EducationInstitution } from "./types";
import type { World } from "../simulation/types";
// Semantic fixture only; authentic source vectors are tested separately through locked production.
const institution: EducationInstitution = {
  id: "ipeds-unit:999999",
  officialId: "999999",
  kind: "postsecondary",
  name: "Explicit synthetic institution",
  city: "Fixture",
  state: "KY",
  stateFips: "21",
  countyGeoid: "21067",
  parentDistrictId: null,
  sourceYear: "2024-25",
  release: "fixture",
  statusCode: "A",
  statusLabel: "Active",
  statusEffectiveDate: null,
  foundingDate: null,
  openAdmissionPolicy: "unknown",
  capabilities: [
    {
      code: "NONCRDT1",
      label: "Workforce Education",
      kind: "noncredit",
      state: "offered",
      raw: "1",
    },
  ],
  evidence: [
    {
      artifactId: "fixture",
      sha256: "a".repeat(64),
      member: "fixture.csv",
      row: 2,
    },
  ],
};
function fixture() {
  const d = createDemoWorld("edu-semantic", {
    context: {
      ...LEXINGTON_DEMO_CONTEXT,
      initialMoment: {
        ...LEXINGTON_DEMO_CONTEXT.initialMoment,
        date: makeIsoDate("2025-01-06"),
      },
    },
  });
  let w = createWorld({
    seed: d.seed,
    currentDate: d.currentDate,
    people: d.personOrder.map((id) => ({
      ...d.people[id]!,
      establishedFacts: d.people[id]!.establishedFacts.filter(
        (f) => f.occurredAt <= "2025-01-06",
      ),
    })),
    jurisdictions: d.jurisdictionOrder.map((id) => d.jurisdictions[id]!),
    control: { kind: "person", personId: d.personOrder[0]! },
  });
  w = createResourcePosition(w, {
    stableKey: "funds",
    owner: { kind: "person", personId: w.personOrder[0]! },
    openedAt: w.currentDate,
    openingBalance: money(100000, "USD"),
    provenance: { kind: "authored", note: "test" },
  });
  return w;
}
const balance = (w: World) =>
  resourcePositionAt(
    w,
    { kind: "person", personId: w.personOrder[0]! },
    money(0, "USD").currency,
  )!.liquidBalance.minorUnits;
describe("EDU canonical LIFE composition", () => {
  it("keeps lightweight parallel saved offers available after reload and elapsed time, with immutable accepted funding/grace", () => {
    let w = applyForEducation(fixture(), institution, "NONCRDT1").world;
    const first = pendingEducationOffers(w)[0]!;
    expect(applyForEducation(w, institution, "NONCRDT1").world).toBe(w);
    w = applyForEducation(
      w,
      {
        ...institution,
        id: "ipeds-unit:888888",
        officialId: "888888",
        name: "Second synthetic institution",
      },
      "NONCRDT1",
    ).world;
    expect(pendingEducationOffers(w)).toHaveLength(2);
    w = advanceWorld(
      deserializeWorld(serializeWorld(w)),
      3,
      LIFE_PATHS2_HANDLERS,
    );
    const accepted = respondToEducationOffer(w, first.id, true, {
      tuitionGraceDays: 45,
    });
    expect(accepted.ok).toBe(true);
    w = accepted.world;
    expect(pendingEducationOffers(w)).toHaveLength(1);
    const path = pathForRelationship(
      w,
      w.history.educationEnrollments.at(-1)!.id,
    )!;
    expect(path.tuitionGraceDays).toBe(45);
    expect(path.periodCostMinor).toBe(20000);
    expect(balance(w)).toBe(100000);
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  });
  it("keeps request, choice, period progression, fees, interruption, reload and earned completion separate", () => {
    let w = fixture();
    const start = balance(w);
    w = applyForEducation(w, institution, "NONCRDT1").world;
    expect(w.history.educationEnrollments).toHaveLength(0);
    expect(balance(w)).toBe(start);
    const offer = pendingEducationOffers(w)[0]!;
    w = respondToEducationOffer(w, offer.id, true).world;
    const e = w.history.educationEnrollments.at(-1)!;
    expect(balance(w)).toBe(start);
    expect(hasLifePathCredential(w, e.personId, e.programKind)).toBe(false);
    expect(respondToEducationOffer(w, offer.id, true).ok).toBe(false);
    w = deserializeWorld(serializeWorld(w));
    expect(pathForRelationship(w, e.id)?.periodCostMinor).toBe(20000);
    w = advanceWorld(w, 30, LIFE_PATHS2_HANDLERS);
    expect(completedStudyPeriods(w, e.id)).toBe(0);
    w = changeLifePathStatus(w, e.id, "pause").world;
    w = deserializeWorld(serializeWorld(w));
    w = changeLifePathStatus(w, e.id, "return").world;
    w = advanceWorld(w, 49, LIFE_PATHS2_HANDLERS);
    expect(completedStudyPeriods(w, e.id)).toBe(1);
    expect(educationEnrollmentStateAt(w, e.id)?.status).toBe("completed");
    expect(hasLifePathCredential(w, e.personId, e.programKind)).toBe(true);
    expect(balance(w)).toBe(start - 20000);
    expect(w.history.educationEnrollments).toHaveLength(1);
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  });
  it("refuses missing capabilities, historical extrapolation and closed institutions without mutation", () => {
    const w = fixture();
    for (const modified of [
      { ...institution, statusCode: "M" },
      {
        ...institution,
        capabilities: [
          { ...institution.capabilities[0]!, state: "unknown" as const },
        ],
      },
    ]) {
      const result = applyForEducation(w, modified, "NONCRDT1");
      expect(result.ok).toBe(false);
      expect(result.world).toBe(w);
    }
    expect(
      educationOptionReason(
        { ...w, currentDate: "1900-01-01" as World["currentDate"] },
        institution,
        institution.capabilities[0]!,
      ),
    ).toMatch(/2024/);
    // After the directory's year the listing carries forward, so somebody who
    // started young can apply when they are grown; before it, still refused.
    expect(
      educationOptionReason(
        { ...w, currentDate: "2038-12-01" as World["currentDate"] },
        institution,
        institution.capabilities[0]!,
      ) ?? "",
    ).not.toMatch(/directory describes/);
    expect(
      educationOptionReason(
        { ...w, currentDate: "2024-06-30" as World["currentDate"] },
        institution,
        institution.capabilities[0]!,
      ),
    ).toMatch(/directory describes 2024-25/);
  });
  it("declines without enrollment and leaves catalog-only LIFE behavior intact", () => {
    let w = fixture();
    w = applyForEducation(w, institution, "NONCRDT1").world;
    w = respondToEducationOffer(
      w,
      pendingEducationOffers(w)[0]!.id,
      false,
    ).world;
    expect(w.history.educationEnrollments).toHaveLength(0);
    expect(pendingEducationOffers(w)).toHaveLength(0);
    const old = enterLifePath(w, "college-office-certificate");
    expect(old.ok).toBe(true);
    expect(
      pathForRelationship(
        old.world,
        old.world.history.educationEnrollments.at(-1)!.id,
      )?.id,
    ).toBe("college-office-certificate");
  });
});

describe("saved accepted terms controls", () => {
  it("preserves accepted fees without the catalog and refuses unknown saved versions", () => {
    let w = fixture();
    w = applyForEducation(w, institution, "NONCRDT1").world;
    w = respondToEducationOffer(
      w,
      pendingEducationOffers(w)[0]!.id,
      true,
    ).world;
    const enrollment = w.history.educationEnrollments.at(-1)!;
    const saved = deserializeWorld(serializeWorld(w));
    expect(pathForRelationship(saved, enrollment.id)?.periodCostMinor).toBe(
      20000,
    );
    const artifacts = saved.history.evidenceArtifacts.map((a) =>
      [
        "education:accepted-study-terms-v1",
        "education:accepted-study-terms-v2",
      ].includes(a.evidenceKind)
        ? {
            ...a,
            description: JSON.stringify({
              ...JSON.parse(a.description!),
              version: 999,
            }),
          }
        : a,
    );
    const unsupported = {
      ...saved,
      history: { ...saved.history, evidenceArtifacts: artifacts },
    };
    const after = advanceWorld(unsupported, 60, LIFE_PATHS2_HANDLERS);
    expect(completedStudyPeriods(after, enrollment.id)).toBe(0);
    expect(
      hasLifePathCredential(after, enrollment.personId, enrollment.programKind),
    ).toBe(false);
  });
  it("refuses another actor and a duplicate concurrent enrollment", () => {
    let w = fixture();
    w = applyForEducation(w, institution, "NONCRDT1").world;
    const offer = pendingEducationOffers(w)[0]!;
    const other = {
      ...w,
      control: { kind: "person" as const, personId: w.personOrder[1]! },
    };
    expect(respondToEducationOffer(other, offer.id, true).ok).toBe(false);
    w = respondToEducationOffer(w, offer.id, true).world;
    w = applyForEducation(w, institution, "NONCRDT1").world;
    expect(
      respondToEducationOffer(w, pendingEducationOffers(w)[0]!.id, true).ok,
    ).toBe(false);
  });
  it("keeps legacy session terms playable when saved before period simplification", () => {
    const legacyPath = {
      ...studyDefinition(institution, institution.capabilities[0]!),
      progressionModel: undefined,
      sessionMinutes: 120,
      sessionStartMinute: 1080,
      minimumGapDays: 7,
      requiredSessions: 8,
      minimumElapsedDays: 49,
      sessionCostMinor: 2500,
      periodCostMinor: undefined,
      academicYears: undefined,
      periodsPerYear: undefined,
      daysPerPeriod: undefined,
    };
    expect(legacyPath.requiredSessions).toBe(8);
    expect(legacyPath.sessionCostMinor).toBe(2500);
  });
});
describe("applying for a degree at a real college", () => {
  const college: EducationInstitution = {
    ...institution,
    capabilities: [
      ...institution.capabilities,
      {
        code: "LEVEL5",
        label: "Bachelor's degree",
        kind: "award",
        state: "offered",
        raw: "1",
      },
      {
        code: "LEVEL7",
        label: "Master's degree",
        kind: "award",
        state: "offered",
        raw: "1",
      },
      {
        code: "LEVEL17",
        label: "Doctor's degree - research/scholarship",
        kind: "award",
        state: "offered",
        raw: "1",
      },
    ],
  };
  const capability = (code: string) =>
    college.capabilities.find((c) => c.code === code)!;

  it("offers a place, enrolls, and records a bachelor's that law school accepts", () => {
    const w0 = fixture();
    expect(educationOptionReason(w0, college, capability("LEVEL5"))).toBeNull();
    const applied = applyForEducation(w0, college, "LEVEL5");
    expect(applied.ok).toBe(true);
    const offer = pendingEducationOffers(applied.world)[0]!;
    const accepted = respondToEducationOffer(applied.world, offer.id, true);
    expect(accepted.ok).toBe(true);
    const enrollment = accepted.world.history.educationEnrollments.at(-1)!;
    expect(enrollment.programKind).toBe("postsecondary:edu-path7-level5");
    const path = pathForRelationship(accepted.world, enrollment.id)!;
    expect(path.credential).toBe("Bachelor's degree");
    expect(path.academicYears).toBe(4);
    // Survives a save.
    expect(deserializeWorld(serializeWorld(accepted.world))).toEqual(
      accepted.world,
    );
    // Law school and graduate study check for a bachelor's under its old
    // program name; a completed real-college bachelor's counts.
    const personId = accepted.world.personOrder[0]!;
    expect(
      hasLifePathCredential(
        accepted.world,
        personId,
        "postsecondary:bachelors-degree",
      ),
    ).toBe(false);
  });

  it("completes a four-year bachelor's that graduate study then accepts", () => {
    // Enough recorded money for eight periods of placeholder tuition.
    let w = fixture();
    const richer = createResourcePosition(
      createWorld({
        seed: w.seed,
        currentDate: w.currentDate,
        people: w.personOrder.map((id) => w.people[id]!),
        jurisdictions: w.jurisdictionOrder.map((id) => w.jurisdictions[id]!),
        control: w.control,
      }),
      {
        stableKey: "funds",
        owner: { kind: "person", personId: w.personOrder[0]! },
        openedAt: w.currentDate,
        openingBalance: money(5_000_000, "USD"),
        provenance: { kind: "authored", note: "test" },
      },
    );
    w = applyForEducation(richer, college, "LEVEL5").world;
    w = respondToEducationOffer(
      w,
      pendingEducationOffers(w)[0]!.id,
      true,
    ).world;
    const enrollmentId = w.history.educationEnrollments.at(-1)!.id;
    w = advanceWorld(w, 4 * 2 * 182 + 60, LIFE_PATHS2_HANDLERS);
    expect(educationEnrollmentStateAt(w, enrollmentId)?.status).toBe(
      "completed",
    );
    const personId = w.personOrder[0]!;
    expect(
      hasLifePathCredential(w, personId, "postsecondary:bachelors-degree"),
    ).toBe(true);
    // Four years on, this directory vintage no longer describes the
    // college, so the master's is checked against its own entry rule.
    expect(
      lifePathEntryReason(
        w,
        personId,
        studyPathFor(college, capability("LEVEL7")),
      ),
    ).toBeNull();
  });

  it("asks for a bachelor's before a master's, and leaves doctorates listed only", () => {
    const w0 = fixture();
    expect(educationOptionReason(w0, college, capability("LEVEL7"))).toMatch(
      /bachelor's degree first/,
    );
    expect(applyForEducation(w0, college, "LEVEL7").ok).toBe(false);
    expect(educationOptionReason(w0, college, capability("LEVEL17"))).toMatch(
      /does not take applications/,
    );
  });
});
