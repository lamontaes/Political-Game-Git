import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { recordEvidenceArtifact } from "../evidence";
import type { EvidenceAccess, World } from "../types";
import { advanceInquiry, openInquiry } from "./inquiries";

const SIMULATED = { kind: "simulated", sourceEntityIds: [] } as const;

function addArtifact(
  world: World,
  subjectId: string,
  key: string,
  access: EvidenceAccess,
  evidenceKind: `${string}:${string}`,
): World {
  return recordEvidenceArtifact(world, {
    stableKey: key,
    evidenceKind,
    createdAt: world.currentDate,
    recordedAt: world.currentDate,
    relatedEntityIds: [subjectId],
    access,
    description: `${access} ${key} record`,
    provenance: SIMULATED,
  });
}

describe("inquiry records and dated steps", () => {
  it("finds existing in-scope artifacts only when step hours reach them", () => {
    let world = createDemoWorld("b15-p1-us-ky");
    const investigatorPersonId = world.personOrder[0]!;
    const subjectEntityId = world.personOrder[1]!;
    world = addArtifact(
      world,
      subjectEntityId,
      "inquiry:public-filing",
      "public",
      "record:public-filing",
    );
    world = addArtifact(
      world,
      subjectEntityId,
      "inquiry:bank-record",
      "restricted",
      "record:bank-payment",
    );
    world = addArtifact(
      world,
      subjectEntityId,
      "inquiry:private-note",
      "private",
      "record:private-note",
    );

    const opened = openInquiry(world, {
      stableKey: "inquiry:committee-payment",
      investigatorPersonId,
      subjectEntityId,
      cause: "investigator-goal",
      causeRecordId: null,
      authorityScope: {
        bodyKind: "legislative-committee",
        records: "public-plus-compelled",
        people: "willing-plus-compelled",
        compelledEvidenceKinds: ["record:bank-payment"],
        basis: "Fixture authority row compels the named bank-payment kind.",
        estimated: false,
      },
      openedAt: world.currentDate,
    });
    expect(opened.inquiry.hoursBudget).toEqual({ minimum: 32, maximum: 40 });

    const first = advanceInquiry(opened.world, {
      stableKey: "inquiry:committee-payment:step:1",
      inquiryId: opened.inquiry.id,
      at: world.currentDate,
      hours: 2,
    });
    expect(first.step.artifactIdsRead).toHaveLength(1);
    expect(first.world.history.evidenceDiscoveries).toHaveLength(1);

    const second = advanceInquiry(first.world, {
      stableKey: "inquiry:committee-payment:step:2",
      inquiryId: opened.inquiry.id,
      at: world.currentDate,
      hours: 2,
    });
    expect(second.step.artifactIdsRead).toHaveLength(1);
    expect(second.world.history.evidenceDiscoveries).toHaveLength(2);
    expect(
      second.world.history.evidenceDiscoveries.map(
        (discovery) => discovery.evidenceArtifactId,
      ),
    ).not.toContain(
      second.world.history.evidenceArtifacts.find(
        (artifact) => artifact.stableKey === "inquiry:private-note",
      )!.id,
    );
  });

  it("keeps nonpublic records outside a public-only scope", () => {
    let world = createDemoWorld("b15-p1-us-pr");
    const investigatorPersonId = world.personOrder[0]!;
    const subjectEntityId = world.personOrder[1]!;
    world = addArtifact(
      world,
      subjectEntityId,
      "inquiry:restricted-filing",
      "restricted",
      "record:bank-payment",
    );
    const opened = openInquiry(world, {
      stableKey: "inquiry:reporter-records",
      investigatorPersonId,
      subjectEntityId,
      cause: "investigator-goal",
      causeRecordId: null,
      authorityScope: {
        bodyKind: "reporter",
        records: "public-only",
        people: "willing-only",
        compelledEvidenceKinds: [],
        basis: "Reporter fixture row permits public records only.",
        estimated: false,
      },
      openedAt: world.currentDate,
    });
    const advanced = advanceInquiry(opened.world, {
      stableKey: "inquiry:reporter-records:step:1",
      inquiryId: opened.inquiry.id,
      at: world.currentDate,
      hours: 8,
    });
    expect(advanced.step.artifactIdsRead).toEqual([]);
    expect(advanced.step.discoveryIds).toEqual([]);
  });

  it("refuses steps beyond the investigator's recorded work time", () => {
    const world = createDemoWorld("b15-p1-hours");
    const opened = openInquiry(world, {
      stableKey: "inquiry:hours",
      investigatorPersonId: world.personOrder[0]!,
      subjectEntityId: world.personOrder[1]!,
      cause: "investigator-goal",
      causeRecordId: null,
      authorityScope: {
        bodyKind: "campaign-researcher",
        records: "public-only",
        people: "willing-only",
        compelledEvidenceKinds: [],
        basis: "Campaign researcher fixture row permits public records only.",
        estimated: false,
      },
      openedAt: world.currentDate,
    });
    expect(() =>
      advanceInquiry(opened.world, {
        stableKey: "inquiry:hours:step:1",
        inquiryId: opened.inquiry.id,
        at: world.currentDate,
        hours: 41,
      }),
    ).toThrow("work-time budget");
  });
});
