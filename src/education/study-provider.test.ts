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
} from "../simulation/index";
import { resourcePositionAt } from "../simulation/resource-queries";
import { educationEnrollmentStateAt } from "../simulation/life-queries";
import {
  applyForEducation,
  pendingEducationOffers,
  respondToEducationOffer,
  educationOptionReason,
} from "./study-provider";
import {
  scheduleLifePathSession,
  performLifePathSession,
  changeLifePathStatus,
  hasLifePathCredential,
  pathForRelationship,
  enterLifePath,
} from "../simulation/life-paths2";
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
  it("keeps request, choice, attendance, fees, interruption, reload and earned completion separate", () => {
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
    expect(pathForRelationship(w, e.id)?.sessionCostMinor).toBe(2500);
    w = scheduleLifePathSession(w, e.id).world;
    w = performLifePathSession(
      w,
      w.history.scheduledActivities.at(-1)!.id,
    ).world;
    expect(balance(w)).toBe(start - 2500);
    w = changeLifePathStatus(w, e.id, "pause").world;
    expect(scheduleLifePathSession(w, e.id).ok).toBe(false);
    w = deserializeWorld(serializeWorld(w));
    w = changeLifePathStatus(w, e.id, "return").world;
    for (let i = 1; i < 8; i++) {
      w = scheduleLifePathSession(w, e.id).world;
      const r = performLifePathSession(
        w,
        w.history.scheduledActivities.at(-1)!.id,
      );
      expect(r.ok).toBe(true);
      w = r.world;
    }
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
    expect(pathForRelationship(saved, enrollment.id)?.sessionCostMinor).toBe(
      2500,
    );
    const artifacts = saved.history.evidenceArtifacts.map((a) =>
      a.evidenceKind === "education:accepted-study-terms-v1"
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
    expect(scheduleLifePathSession(unsupported, enrollment.id).ok).toBe(false);
    expect(scheduleLifePathSession(unsupported, enrollment.id).world).toBe(
      unsupported,
    );
    expect(
      hasLifePathCredential(
        unsupported,
        enrollment.personId,
        enrollment.programKind,
      ),
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
});
