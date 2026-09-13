import { describe, expect, it } from "vitest";
import { civilAuthorityFixture } from "../../tests/e2e/support/civil-authority-world";
import {
  generatedDisciplineNoticePreview,
  generatedDisciplineReasons,
  personnelEvidenceOptions,
} from "./civil-personnel-evidence";

describe("civil personnel evidence adapter", () => {
  it("offers only a known dated record tagged for the selected cause", () => {
    const fixture = civilAuthorityFixture();
    const informal = personnelEvidenceOptions(
      fixture.world,
      fixture.incumbencyId,
      { kind: "informal-resolution" },
    );
    const insubordination = personnelEvidenceOptions(
      fixture.world,
      fixture.incumbencyId,
      { kind: "discipline", ground: "insubordination" },
    );
    const performance = personnelEvidenceOptions(
      fixture.world,
      fixture.incumbencyId,
      { kind: "discipline", ground: "substandard-performance" },
    );

    expect(informal).toHaveLength(1);
    expect(insubordination).toStrictEqual(informal);
    expect(performance).toStrictEqual([]);
  });

  it("does not expose another authority's limited record", () => {
    const fixture = civilAuthorityFixture(
      "2026-09-14",
      "US-MN",
      "otherDirector",
    );
    expect(
      personnelEvidenceOptions(fixture.world, fixture.incumbencyId, {
        kind: "discipline",
        ground: "insubordination",
      }),
    ).toStrictEqual([]);
  });

  it("generates the reasons and preview from the selected record", () => {
    const fixture = civilAuthorityFixture();
    const evidence = personnelEvidenceOptions(
      fixture.world,
      fixture.incumbencyId,
      { kind: "discipline", ground: "insubordination" },
    )[0]!;

    expect(generatedDisciplineReasons("insubordination", evidence)).toContain(
      `${evidence.occurredAt} states: ${evidence.summary}`,
    );
    expect(
      generatedDisciplineNoticePreview(
        "Records specialist",
        "discharge",
        "insubordination",
        evidence,
      ),
    ).toBe(
      `Discharge notice for Records specialist. Cause: Insubordination. Supporting record, ${evidence.occurredAt}: ${evidence.summary}`,
    );
  });
});
