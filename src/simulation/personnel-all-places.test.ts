import { describe, expect, it } from "vitest";
import { civilAuthorityFixture } from "../../tests/e2e/support/civil-authority-world";
import { assessPersonnelAction } from "./civil-personnel";
import { PERSONNEL_JURISDICTION_RULES } from "./civil-personnel-rules";
import {
  assessPersonnelDiscipline,
  issuePersonnelDiscipline,
  recordInformalResolutionAttempt,
} from "./civil-personnel-actions";
import { workStatusAt } from "./life-queries";
import { deserializeWorld, serializeWorld } from "./index";

const context = {
  employerLevel: "state",
  civilClass: "classified",
  tenure: "permanent",
  bargainingCoverage: "unknown",
  collectiveAgreement: "not-covered",
} as const;
describe("personnel procedures share the 56-place reader", () => {
  it("reads a nonblank rule and preserves employee qualifications in every place", () => {
    expect(PERSONNEL_JURISDICTION_RULES).toHaveLength(56);
    for (const row of PERSONNEL_JURISDICTION_RULES) {
      expect(
        assessPersonnelAction(
          { ...context, jurisdictionKey: row.jurisdictionKey },
          "2026-09-14",
          "remove",
        ).status,
      ).toBe("available");
      expect(
        assessPersonnelAction(
          {
            ...context,
            jurisdictionKey: row.jurisdictionKey,
            civilClass: "unknown",
          },
          "2026-09-14",
          "remove",
        ).status,
      ).toBe("blocked");
      if (row.estimatedFrom !== null)
        expect(row.estimatedFrom.length).toBeGreaterThan(0);
    }
  });
  it.each(PERSONNEL_JURISDICTION_RULES)(
    "records a named employee's discharge and its source in $jurisdictionKey",
    (row) => {
      const f = civilAuthorityFixture(
        "2026-09-14",
        row.jurisdictionKey,
        "director",
        "p2-personnel",
      );
      expect(
        assessPersonnelDiscipline(
          f.world,
          f.otherDirector,
          f.incumbencyId,
          "discipline",
        ).available,
      ).toBe(false);
      const meeting = recordInformalResolutionAttempt(f.world, {
        incumbencyId: f.incumbencyId,
        note: "Recorded refusal to perform assigned work.",
      });
      if (!meeting.ok) throw Error(meeting.reason);
      const result = issuePersonnelDiscipline(meeting.world, {
        incumbencyId: f.incumbencyId,
        action: "discharge",
        ground: "insubordination",
        reasons: "Repeated refusal of the recorded written directive.",
      });
      if (!result.ok) throw Error(result.reason);
      const saved = deserializeWorld(serializeWorld(result.world));
      const action = saved.history.personnelRecords?.find(
        (record) => record.id === result.recordId,
      );
      expect(action).toMatchObject({
        kind: "disciplinary-action",
        jurisdictionKey: row.jurisdictionKey,
        estimatedFrom: row.estimatedFrom,
      });
      const employment = saved.history.personnelRecords?.find(
        (record) => record.id === f.incumbencyId,
      );
      if (employment?.kind !== "incumbency")
        throw Error("Missing canonical employment");
      expect(workStatusAt(saved, employment.workRelationshipId)?.status).toBe(
        "ended",
      );
    },
  );
});
