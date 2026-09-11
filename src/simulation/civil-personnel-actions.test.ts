import { describe, expect, it } from "vitest";
import {
  asPerson,
  civilAuthorityFixture,
} from "../../tests/e2e/support/civil-authority-world";
import { advanceWorld, deserializeWorld, serializeWorld } from "./index";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import {
  appealDecisionFor,
  assessMinnesotaDiscipline,
  assessMinnesotaReinstatement,
  establishPersonnelDesignation,
  executiveOfficeStaffBoundary,
  fileNoticeWithCommissioner,
  issueMinnesotaDiscipline,
  offerMinnesotaReinstatement,
  personnelAppealsFor,
  personnelAuthority,
  personnelMatters,
  personnelOfferResponses,
  personnelProcedures,
  produceCommissionerSettlementDecision,
  produceDischargedEmployeeAppealChoice,
  produceReinstatementResponse,
  recordInformalResolutionAttempt,
  reinstatementOpportunities,
  type PersonnelResult,
} from "./civil-personnel-actions";
import { workItemState } from "./time-work";
import { createOrganization } from "./life";
import { makeIsoDate } from "./dates";
import { workStatusAt } from "./life-queries";
import type { EntityId, World } from "./types";

const handlers = createCampaignElectionTransitionRegistry();

function ok(result: PersonnelResult): { world: World; id: EntityId } {
  if (!result.ok) throw new Error(result.reason);
  return { world: result.world, id: result.recordId };
}

function reload(world: World): World {
  return deserializeWorld(serializeWorld(world));
}

/** Director perspective up to a recorded discharge. */
function discharged(seed?: string) {
  const f = civilAuthorityFixture("2026-09-14", "US-MN", "director", seed);
  let world = ok(
    recordInformalResolutionAttempt(f.world, {
      incumbencyId: f.incumbencyId,
      note: "Discussed three refusals to follow the retention procedure.",
    }),
  ).world;
  const action = ok(
    issueMinnesotaDiscipline(world, {
      incumbencyId: f.incumbencyId,
      action: "discharge",
      ground: "insubordination",
      reasons: "Refused three written directives on records retention.",
    }),
  );
  world = action.world;
  return { f, world, actionId: action.id };
}

describe("CIVIL-AUTHORITY13 sourced procedures", () => {
  it("projects only verified, dated procedures from the pinned text", () => {
    const procedures = personnelProcedures();
    expect(procedures).toHaveLength(19);
    for (const procedure of procedures) {
      expect(procedure.validity).toEqual({
        state: "CURRENT_OBSERVATION",
        observedOn: "2026-09-06",
      });
      expect(procedure.citation.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(procedure.excerpts.length).toBeGreaterThan(0);
    }
    const notice = procedures.find((p) => p.key === "mn-discipline-notice")!;
    expect(notice.terms).toEqual({
      appealWithinCalendarDays: 30,
      commissionerFilingWithinCalendarDays: 10,
    });
  });
});

describe("CIVIL-AUTHORITY13 Minnesota discipline by the actually designated authority", () => {
  it("runs meeting, discharge, notice, filing, NPC appeal and NPC commissioner decision with history and reload", () => {
    const f = civilAuthorityFixture(
      "2026-09-14",
      "US-MN",
      "director",
      "civil-authority13-b",
    );
    const before = serializeWorld(f.world);
    expect(personnelMatters(f.world).length).toBeGreaterThan(0);
    expect(serializeWorld(f.world)).toBe(before); // reads never write

    const meeting = ok(
      recordInformalResolutionAttempt(f.world, {
        incumbencyId: f.incumbencyId,
        note: "Discussed three refusals to follow the retention procedure.",
      }),
    );
    // A real 30-minute meeting on the canonical clock.
    expect(meeting.world.currentMoment.minuteOfDay).toBe(
      f.world.currentMoment.minuteOfDay + 30,
    );
    const action = ok(
      issueMinnesotaDiscipline(meeting.world, {
        incumbencyId: f.incumbencyId,
        action: "discharge",
        ground: "insubordination",
        reasons: "Refused three written directives on records retention.",
      }),
    );
    let world = action.world;
    const record = world.history.personnelRecords!.find(
      (r) => r.id === action.id,
    )!;
    expect(record).toMatchObject({
      kind: "disciplinary-action",
      actorPersonId: f.director,
      appealDeadline: "2026-10-14",
      commissionerFilingDeadline: "2026-09-24",
    });
    if (record.kind !== "disciplinary-action") throw new Error("wrong kind");
    // Employment really ends through the LIFE writer; the notice is real
    // evidence the employee has received and knows about.
    const work = world.history.workRelationships.find(
      (w) => w.personId === f.employee && w.organizationId === f.agencyId,
    )!;
    expect(workStatusAt(world, work.id)!.status).toBe("ended");
    const notice = world.history.evidenceArtifacts.find(
      (e) => e.id === record.noticeEvidenceId,
    )!;
    expect(notice.description).toContain("Bureau of Mediation Services");
    expect(notice.description).toContain("2026-10-14");
    expect(
      world.history.evidenceDiscoveries.some(
        (d) => d.personId === f.employee && d.evidenceArtifactId === notice.id,
      ),
    ).toBe(true);
    expect(workItemState(world, record.workItemId!).status).toBe("active");

    world = reload(world);
    const filed = ok(
      fileNoticeWithCommissioner(world, { actionId: action.id }),
    );
    world = filed.world;
    expect(workItemState(world, record.workItemId!).status).toBe("completed");
    expect(fileNoticeWithCommissioner(world, { actionId: action.id }).ok).toBe(
      false,
    );

    world = ok(
      produceDischargedEmployeeAppealChoice(world, { actionId: action.id }),
    ).world;
    expect(appealDecisionFor(world, action.id)).toBe("appealed");
    const appeal = personnelAppealsFor(world)[0]!;
    expect(appeal.personId).toBe(f.employee);
    expect(appeal.decisionTraceId).not.toBeNull();
    // Checking again never rerolls the employee's decision.
    expect(
      produceDischargedEmployeeAppealChoice(world, { actionId: action.id }).ok,
    ).toBe(false);

    world = reload(world);
    world = ok(
      produceCommissionerSettlementDecision(world, { appealId: appeal.id }),
    ).world;
    const decision = world.history.personnelRecords!.at(-1)!;
    expect(decision).toMatchObject({
      kind: "settlement-decision",
      actorPersonId: f.commissioner,
      decision: "settlement-not-directed",
    });
    expect(
      produceCommissionerSettlementDecision(world, { appealId: appeal.id }).ok,
    ).toBe(false);
    const view = personnelMatters(world).find((v) => v.id === action.id)!;
    expect(view.facts.join(" ")).toContain(
      "No one has decided it on the merits",
    );
    const arbitration = view.steps.find((s) => s.key === "arbitration")!;
    expect(arbitration.available).toBe(false);
    expect(arbitration.reason).toContain("§ 43A.33, subd. 3(d)");

    const restored = reload(world);
    expect(restored.history.personnelRecords).toEqual(
      world.history.personnelRecords,
    );
    expect(restored.history.decisionTraces).toEqual(
      world.history.decisionTraces,
    );
  });

  it("keeps a declined appeal final and a directed settlement without invented terms", () => {
    const declined = discharged("civil-authority13-f");
    const after = ok(
      produceDischargedEmployeeAppealChoice(declined.world, {
        actionId: declined.actionId,
      }),
    ).world;
    expect(appealDecisionFor(after, declined.actionId)).toBe("declined");
    expect(personnelAppealsFor(after)).toHaveLength(0);

    const directed = discharged("civil-authority13-c");
    let world = ok(
      produceDischargedEmployeeAppealChoice(directed.world, {
        actionId: directed.actionId,
      }),
    ).world;
    const appeal = personnelAppealsFor(world)[0]!;
    world = ok(
      produceCommissionerSettlementDecision(world, { appealId: appeal.id }),
    ).world;
    const view = personnelMatters(world).find(
      (v) => v.id === directed.actionId,
    )!;
    expect(view.facts.join(" ")).toContain("Its terms are not represented");
  });

  it("refuses wrong authority: relatives, other agencies' directors and a statutory office are not this employer's appointing authority", () => {
    const f = civilAuthorityFixture();
    for (const personId of [
      f.relative,
      f.otherDirector,
      f.commissioner,
      f.employee,
    ]) {
      expect(
        personnelAuthority(f.world, personId, "appointing-authority", {
          organizationId: f.agencyId,
          jurisdictionKey: "US-MN",
        }).ok,
      ).toBe(false);
    }
    const other = civilAuthorityFixture("2026-09-14", "US-MN", "otherDirector");
    const result = recordInformalResolutionAttempt(other.world, {
      incumbencyId: other.incumbencyId,
      note: "A meeting with another agency's employee.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.reason).toContain("appointing-authority role");
  });

  it("tells someone without authority nothing about the employee's class or coverage", () => {
    const f = civilAuthorityFixture();
    for (const incumbencyId of [
      f.coveredIncumbencyId,
      f.probationIncumbencyId,
    ]) {
      const assessment = assessMinnesotaDiscipline(
        f.world,
        f.relative,
        incumbencyId,
        "discipline",
      );
      expect(assessment.available).toBe(false);
      if (!assessment.available) {
        expect(assessment.reason).toContain("appointing-authority role");
        expect(assessment.reason).not.toContain("43A.33");
      }
    }
  });

  it("refuses a charter for a real (non-authored) organization and a statute that names no such power", () => {
    const f = civilAuthorityFixture();
    // An authored cooperative is fiction but not a public agency, and a
    // source-recorded agency is a real institution; neither can be chartered.
    const cooperative = f.world.history.organizations[0]!;
    const real = createOrganization(f.world, {
      stableKey: "real-agency",
      formedAt: f.world.currentDate,
      provenance: {
        kind: "source-record",
        reference: "real institution",
        asOf: makeIsoDate("2026-09-06"),
      },
      initialProfile: {
        name: "A real state agency",
        classification: "service:state-agency",
        locationJurisdictionId: f.world.jurisdictionOrder[0]!,
      },
    });
    for (const [world, organizationId] of [
      [f.world, cooperative.id],
      [real, real.history.organizations.at(-1)!.id],
    ] as const) {
      const charter = establishPersonnelDesignation(world, {
        stableKey: "bad-charter",
        organizationId,
        roleKind: "leader:agency-director",
        power: "appointing-authority",
        jurisdictionKey: "US-MN",
        basis: { kind: "authored-charter", note: "Attempted self-grant." },
      });
      expect(charter.ok).toBe(false);
    }
    const statute = establishPersonnelDesignation(f.world, {
      stableKey: "bad-statute",
      organizationId: f.agencyId,
      roleKind: "leader:agency-director",
      power: "appointing-authority",
      jurisdictionKey: "US-MN",
      basis: { kind: "statute", procedureKey: "mn-reinstatement" },
    });
    expect(statute.ok).toBe(false);
  });

  it("refuses wrong class and tenure, and keeps bargaining distinct from tenure", () => {
    const f = civilAuthorityFixture();
    const covered = recordInformalResolutionAttempt(f.world, {
      incumbencyId: f.coveredIncumbencyId,
      note: "Attempted meeting.",
    });
    expect(covered.ok).toBe(false);
    if (!covered.ok)
      expect(covered.reason).toContain(
        "collective bargaining agreement governs",
      );
    const probation = recordInformalResolutionAttempt(f.world, {
      incumbencyId: f.probationIncumbencyId,
      note: "Attempted meeting.",
    });
    expect(probation.ok).toBe(false);
    if (!probation.ok) expect(probation.reason).toContain("subd. 3(c)");
    // Merit protection without any bargaining finding still proceeds: the
    // permanent employee's bargaining coverage is unknown.
    const job = f.world.history.personnelRecords!.find(
      (r) => r.id === f.specialistPositionId,
    )!;
    expect(job).toMatchObject({
      bargainingCoverage: "unknown",
      agreementCoverage: "not-covered",
    });
    expect(
      recordInformalResolutionAttempt(f.world, {
        incumbencyId: f.incumbencyId,
        note: "Discussed the procedure.",
      }).ok,
    ).toBe(true);
  });

  it("refuses wrong date and wrong jurisdiction without writing", () => {
    const early = civilAuthorityFixture("2026-09-01");
    const before = serializeWorld(early.world);
    const result = recordInformalResolutionAttempt(early.world, {
      incumbencyId: early.incumbencyId,
      note: "Discussed the procedure.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("2026-09-06");
    expect(serializeWorld(early.world)).toBe(before);

    const alaska = civilAuthorityFixture("2026-09-14", "US-AK");
    const ak = recordInformalResolutionAttempt(alaska.world, {
      incumbencyId: alaska.incumbencyId,
      note: "Discussed the procedure.",
    });
    expect(ak.ok).toBe(false);
    if (!ak.ok) expect(ak.reason).toContain("AS 39.25.150(15)-(16)");
  });

  it("requires the informal attempt, a named just cause and a supported action", () => {
    const f = civilAuthorityFixture();
    const skipped = issueMinnesotaDiscipline(f.world, {
      incumbencyId: f.incumbencyId,
      action: "discharge",
      ground: "insubordination",
      reasons: "No meeting was held.",
    });
    expect(skipped.ok).toBe(false);
    if (!skipped.ok) expect(skipped.reason).toContain("informal resolution");
    const met = ok(
      recordInformalResolutionAttempt(f.world, {
        incumbencyId: f.incumbencyId,
        note: "Discussed the procedure.",
      }),
    ).world;
    const unnamed = issueMinnesotaDiscipline(met, {
      incumbencyId: f.incumbencyId,
      action: "discharge",
      ground: "personality-conflict" as "insubordination",
      reasons: "They are difficult.",
    });
    expect(unnamed.ok).toBe(false);
    const suspension = issueMinnesotaDiscipline(met, {
      incumbencyId: f.incumbencyId,
      action: "suspension" as "discharge",
      ground: "insubordination",
      reasons: "Refused directives.",
    });
    expect(suspension.ok).toBe(false);
    // A reprimand consumes its meeting; a later discharge needs a new attempt.
    const reprimand = ok(
      issueMinnesotaDiscipline(met, {
        incumbencyId: f.incumbencyId,
        action: "reprimand",
        ground: "substandard-performance",
        reasons: "Two audits found misfiled records.",
      }),
    ).world;
    expect(
      issueMinnesotaDiscipline(reprimand, {
        incumbencyId: f.incumbencyId,
        action: "discharge",
        ground: "substandard-performance",
        reasons: "Another audit.",
      }).ok,
    ).toBe(false);
  });

  it("records a late filing as late and closes the NPC appeal window after 30 calendar days", () => {
    const { world, actionId } = discharged();
    const late = advanceWorld(world, 31, handlers);
    const filing = ok(fileNoticeWithCommissioner(late, { actionId })).world;
    expect(filing.history.personnelRecords!.at(-1)).toMatchObject({
      kind: "commissioner-filing",
      timely: false,
    });
    const appeal = produceDischargedEmployeeAppealChoice(filing, { actionId });
    expect(appeal.ok).toBe(false);
    if (!appeal.ok) expect(appeal.reason).toContain("2026-10-14");
  });
});

describe("CIVIL-AUTHORITY13 Minnesota direct reinstatement", () => {
  it("reinstates a former class employee with consent, probation where established, and reload", () => {
    const f = civilAuthorityFixture("2026-09-14", "US-MN", "otherDirector");
    const opportunities = reinstatementOpportunities(f.world);
    const open = opportunities.find(
      (o) => o.position.id === f.otherSpecialistPositionId,
    )!;
    expect(open.candidates.map((c) => c.personId)).toEqual([f.formerEmployee]);
    expect(open.candidates[0]!.probationAllowed).toBe(true);
    const offer = ok(
      offerMinnesotaReinstatement(f.world, {
        positionId: f.otherSpecialistPositionId,
        personId: f.formerEmployee,
        probation: "required",
      }),
    );
    // An offer is not an appointment.
    expect(
      offer.world.history.workRelationships.filter(
        (w) =>
          w.personId === f.formerEmployee &&
          w.organizationId === f.otherAgencyId,
      ),
    ).toHaveLength(0);
    let world = reload(offer.world);
    world = ok(
      produceReinstatementResponse(world, { offerId: offer.id }),
    ).world;
    const response = personnelOfferResponses(world)[0]!;
    expect(response.response).toBe("accepted");
    expect(response.decisionTraceId).not.toBeNull();
    const work = world.history.workRelationships.find(
      (w) => w.id === response.workRelationshipId,
    )!;
    expect(work).toMatchObject({
      personId: f.formerEmployee,
      organizationId: f.otherAgencyId,
      kind: "employment:civil-service",
    });
    expect(workStatusAt(world, work.id)!.status).toBe("active");
    expect(world.history.personnelRecords!.at(-1)).toMatchObject({
      kind: "incumbency",
      tenure: "probationary",
      workRelationshipId: work.id,
    });
    // No pay is invented: the plan rate is not represented.
    expect(
      world.history.resourceFlows.filter(
        (flow) =>
          flow.basisReference.kind === "work" &&
          flow.basisReference.workRelationshipId === work.id,
      ),
    ).toHaveLength(0);
    expect(produceReinstatementResponse(world, { offerId: offer.id }).ok).toBe(
      false,
    );
    const restored = reload(world);
    expect(restored.history.personnelRecords).toEqual(
      world.history.personnelRecords,
    );
  });

  it("persists a declined answer without employment", () => {
    const f = civilAuthorityFixture(
      "2026-09-14",
      "US-MN",
      "otherDirector",
      "civil-authority13-f",
    );
    const offer = ok(
      offerMinnesotaReinstatement(f.world, {
        positionId: f.otherSpecialistPositionId,
        personId: f.formerEmployee,
        probation: "not-required",
      }),
    );
    const world = ok(
      produceReinstatementResponse(offer.world, { offerId: offer.id }),
    ).world;
    expect(personnelOfferResponses(world)[0]).toMatchObject({
      response: "declined",
      workRelationshipId: null,
    });
  });

  it("refuses relatives, lapsed service, occupied positions, self-appointment and unestablished probation", () => {
    const f = civilAuthorityFixture("2026-09-14", "US-MN", "otherDirector");
    const cases: [EntityId, EntityId, string][] = [
      [
        f.otherSpecialistPositionId,
        f.relative,
        "former permanent or probationary",
      ],
      [f.otherSpecialistPositionId, f.lapsedEmployee, "within four years"],
      [
        f.otherSpecialistPositionId,
        f.otherDirector,
        "cannot reinstate themselves",
      ],
      [f.specialistPositionId, f.formerEmployee, "appointing-authority role"],
    ];
    for (const [positionId, personId, reason] of cases) {
      const result = assessMinnesotaReinstatement(
        f.world,
        f.otherDirector,
        positionId,
        personId,
      );
      expect(result.available).toBe(false);
      if (!result.available) expect(result.reason).toContain(reason);
    }
    // The relative of the first director gains nothing from kinship either.
    const kin = civilAuthorityFixture();
    const vacated = discharged().world;
    expect(
      assessMinnesotaReinstatement(
        vacated,
        kin.director,
        kin.specialistPositionId,
        kin.relative,
      ).available,
    ).toBe(false);
    // Same appointing authority: probation on reinstatement is not established.
    const same = assessMinnesotaReinstatement(
      vacated,
      kin.director,
      kin.specialistPositionId,
      kin.formerEmployee,
    );
    expect(same.available).toBe(true);
    if (same.available) expect(same.probationAllowed).toBe(false);
    expect(
      offerMinnesotaReinstatement(vacated, {
        positionId: kin.specialistPositionId,
        personId: kin.formerEmployee,
        probation: "required",
      }).ok,
    ).toBe(false);
  });
});

describe("CIVIL-AUTHORITY13 EXEC staffing boundary", () => {
  it("reports sourced governor-office classes without granting staffing power", () => {
    const mn = executiveOfficeStaffBoundary("US-MN", makeIsoDate("2026-09-14"));
    expect(mn).toMatchObject({ state: "known", civilClass: "unclassified" });
    if (mn.state === "known")
      expect(mn.unestablished.join(" ")).toContain("appoint");
    expect(
      executiveOfficeStaffBoundary("US-AK", makeIsoDate("2026-09-14")),
    ).toMatchObject({ state: "known", civilClass: "exempt" });
    expect(
      executiveOfficeStaffBoundary("US-MN", makeIsoDate("2026-01-05")).state,
    ).toBe("unknown");
    expect(
      executiveOfficeStaffBoundary("US-KY", makeIsoDate("2026-09-14")).state,
    ).toBe("unknown");
  });
});

describe("CIVIL-AUTHORITY13 persistence integrity", () => {
  it("rejects tampered personnel history on load", () => {
    const { world } = discharged();
    const snapshot = JSON.parse(serializeWorld(world));
    const records = snapshot.world.history.personnelRecords;
    const action = records.find(
      (r: { kind: string }) => r.kind === "disciplinary-action",
    );
    action.appealDeadline = null;
    expect(() => deserializeWorld(JSON.stringify(snapshot))).toThrow();

    const second = JSON.parse(serializeWorld(world));
    const designation = second.world.history.personnelRecords.find(
      (r: { kind: string; basis: { kind: string } }) =>
        r.kind === "authority-designation" && r.basis.kind === "statute",
    );
    designation.basis = { kind: "statute", procedureKey: "mn-reinstatement" };
    expect(() => deserializeWorld(JSON.stringify(second))).toThrow();
  });

  it("control switching cannot stand in for another person's decision", () => {
    const { world } = discharged();
    // The director's open Work belongs to the director; the world refuses a
    // quiet hand-off to the discharged employee.
    expect(() => reload(asPerson(world, discharged().f.employee))).toThrow();
  });
});
