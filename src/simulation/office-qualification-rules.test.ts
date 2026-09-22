import { describe, expect, it } from "vitest";

import { createScenarioWorld } from "./demo";
import { LEXINGTON_DEMO_CONTEXT } from "./demo-jurisdiction-context";
import { makeIsoDate } from "./dates";
import {
  OFFICE_QUALIFICATIONS_META,
  QUALIFICATION_SOURCED_STATE_KEYS,
  assessOfficeQualifications,
  officeFamilyForChamberKey,
  officeQualifications,
} from "./office-qualification-rules";

describe("production-compiled office qualification rules", () => {
  it("exposes 69 unique claims across the seven recovered source states", () => {
    expect(OFFICE_QUALIFICATIONS_META.recordCount).toBe(69);
    expect(QUALIFICATION_SOURCED_STATE_KEYS).toEqual([
      "US-MA",
      "US-MN",
      "US-MO",
      "US-NE",
      "US-NJ",
      "US-NV",
      "US-OH",
    ]);
    // New Jersey's legislator rows are dated by the Legislature's own
    // annotation that Art. IV, § I, ¶ 2 took its current words on 1966-12-08.
    const njBefore = officeQualifications(
      "US-NJ",
      "UPPER_CHAMBER",
      makeIsoDate("1966-12-07"),
    );
    const njOn = officeQualifications(
      "US-NJ",
      "LOWER_CHAMBER",
      makeIsoDate("1966-12-08"),
    );
    expect(njBefore.map((row) => [row.field, row.value])).toEqual([
      ["MINIMUM_AGE", 30],
      ["STATE_RESIDENCE", 4],
    ]);
    expect(
      njBefore.every((row) => row.temporalApplicability.state === "UNKNOWN"),
    ).toBe(true);
    expect(njOn.map((row) => [row.field, row.value])).toEqual([
      ["MINIMUM_AGE", 21],
      ["STATE_RESIDENCE", 2],
    ]);
    expect(
      njOn.every((row) => row.temporalApplicability.state === "SUPPORTED"),
    ).toBe(true);
    const ne = officeQualifications(
      "US-NE",
      "UNICAMERAL_CHAMBER",
      makeIsoDate("2026-09-09"),
    );
    expect(new Set(ne.map((row) => row.field)).size).toBe(ne.length);
    expect(
      officeQualifications(
        "US-OH",
        "LOWER_CHAMBER",
        makeIsoDate("2026-09-09"),
      ).find((row) => row.field === "DISTRICT_RESIDENCE"),
    ).toMatchObject({
      sourceState: "KNOWN",
      researchBatch: "31D",
      researchArtifactId: "31D-recovered-qualifications",
      researchArtifactSha256:
        "bc8afda99ae2e9e22180126bc4801fbd9fe5c6f9f3e12f442f8e16ab5de50473",
      derivation: "DIRECT",
    });
  });

  it("maps only explicit chamber keys, never an office display name", () => {
    expect(officeFamilyForChamberKey("legislature")).toBe("UNICAMERAL_CHAMBER");
    expect(officeFamilyForChamberKey("Nebraska Legislature")).toBeNull();
  });

  it("proves a successful age/residence check and a sourced age refusal", () => {
    const world = createScenarioWorld(
      "qualification-production-rules",
      LEXINGTON_DEMO_CONTEXT,
      { peopleCount: 3 },
    );
    const person = world.people[world.personOrder[0]!]!;
    const meets = assessOfficeQualifications({
      person,
      stateJurisdictionKey: "US-NE",
      officeFamily: "UNICAMERAL_CHAMBER",
      stateResidenceSince: makeIsoDate("2000-01-01"),
      districtResidenceSince: makeIsoDate("2000-01-01"),
      onDate: makeIsoDate("2026-09-09"),
    });
    expect(
      meets
        .filter((assessment) =>
          ["MINIMUM_AGE", "DISTRICT_RESIDENCE"].includes(assessment.field),
        )
        .every((assessment) => assessment.verdict === "meets"),
    ).toBe(true);

    const tooYoung = assessOfficeQualifications({
      person: { ...person, birthDate: world.currentDate },
      stateJurisdictionKey: "US-NE",
      officeFamily: "UNICAMERAL_CHAMBER",
      stateResidenceSince: makeIsoDate("2000-01-01"),
      districtResidenceSince: makeIsoDate("2000-01-01"),
      onDate: makeIsoDate("2026-09-09"),
    });
    expect(
      tooYoung.find((assessment) => assessment.field === "MINIMUM_AGE"),
    ).toMatchObject({
      verdict: "fails",
      source: { citation: "Neb. Const. art. III, § 8" },
    });
  });

  it("bounds Ohio and Nevada rules by provision evidence, not transport dates", () => {
    const ohioBefore = officeQualifications(
      "US-OH",
      "GOVERNOR",
      makeIsoDate("1953-11-02"),
    ).find((row) => row.field === "ELECTOR_REQUIREMENT")!;
    const ohioOn = officeQualifications(
      "US-OH",
      "GOVERNOR",
      makeIsoDate("1953-11-03"),
    ).find((row) => row.field === "ELECTOR_REQUIREMENT")!;
    expect(ohioBefore.researchReportedEffectiveDate).toBe("1851-09-01");
    expect(ohioBefore.temporalApplicability.state).toBe("UNKNOWN");
    expect(ohioOn.temporalApplicability.state).toBe("SUPPORTED");

    const nevadaBefore = officeQualifications(
      "US-NV",
      "ATTORNEY_GENERAL",
      makeIsoDate("2021-05-28"),
    );
    const nevadaOn = officeQualifications(
      "US-NV",
      "ATTORNEY_GENERAL",
      makeIsoDate("2021-05-29"),
    );
    expect(
      nevadaBefore.every(
        (row) => row.temporalApplicability.state === "UNKNOWN",
      ),
    ).toBe(true);
    expect(
      nevadaOn.every((row) => row.temporalApplicability.state === "SUPPORTED"),
    ).toBe(true);
    expect(nevadaOn[0]?.researchReportedEffectiveDate).toBe("2021-10-01");
    expect(nevadaOn[0]?.provisionValidity).toMatchObject({
      state: "EXACT_INTERVAL",
      validFrom: "2021-05-29",
      amendmentAnnotations: ["NRS A 2021, 932", "NRS A 2025, 2094"],
    });
  });

  it("dates Nevada's legislator qualifications from 2025 Nev. Stat. ch. 323, not from the page observation", () => {
    const dayBefore = officeQualifications(
      "US-NV",
      "LOWER_CHAMBER",
      makeIsoDate("2025-09-30"),
    );
    const effective = officeQualifications(
      "US-NV",
      "LOWER_CHAMBER",
      makeIsoDate("2025-10-01"),
    );
    const opening = officeQualifications(
      "US-NV",
      "LOWER_CHAMBER",
      makeIsoDate("2026-01-05"),
    );
    expect(dayBefore.map((row) => row.field).sort()).toEqual([
      "MINIMUM_AGE",
      "STATE_RESIDENCE",
    ]);
    for (const row of dayBefore) {
      expect(row.temporalApplicability).toEqual({
        state: "UNKNOWN",
        reason: `NRS 218A.200 is supported from 2025-10-01; its applicability on 2025-09-30 is not established by the acquired evidence.`,
      });
    }
    expect(
      [...effective, ...opening].every(
        (row) => row.temporalApplicability.state === "SUPPORTED",
      ),
    ).toBe(true);
    expect(opening[0]?.provisionValidity).toMatchObject({
      state: "EXACT_INTERVAL",
      validFrom: "2025-10-01",
      validThrough: null,
      basisArtifactId: "nv-2025-chapter-323-ab491",
      basisLocator: "2025 Nev. Stat., ch. 323, §§ 12, 78",
    });
    // The observation date is kept as retrieval metadata, not as the rule's start.
    expect(opening[0]?.sourceRetrievedAt?.slice(0, 10)).toBe("2026-09-09");
  });

  it("meets a term limit only when the caller supplies zero recorded terms", () => {
    const world = createScenarioWorld(
      "qualification-term-limit",
      LEXINGTON_DEMO_CONTEXT,
      { peopleCount: 3 },
    );
    const person = world.people[world.personOrder[0]!]!;
    const base = {
      person,
      stateJurisdictionKey: "US-MO",
      officeFamily: "GOVERNOR" as const,
      stateResidenceSince: makeIsoDate("2000-01-01"),
      districtResidenceSince: null,
      onDate: makeIsoDate("2026-01-05"),
    };
    const limit = (priorTermsInOffice?: number | null) =>
      assessOfficeQualifications({ ...base, priorTermsInOffice }).find(
        (assessment) => assessment.field === "TERM_LIMIT",
      );
    expect(limit()?.verdict).toBe("not-evaluated");
    expect(limit(null)?.verdict).toBe("not-evaluated");
    expect(limit(1)?.verdict).toBe("not-evaluated");
    expect(limit(0)).toMatchObject({
      verdict: "meets",
      source: { stateUsps: "MO", field: "TERM_LIMIT" },
    });
    expect(limit(0)?.reason).toMatch(/No recorded term in this office/);
  });

  /*
   * Minnesota's House asks for six months in the district, and six months is
   * not a number of years. The reader used to accept whole years only, so this
   * row could not be expressed at all and was reported as unevaluated --
   * honest, but it meant a Minnesota House candidate was refused a seat their
   * own Senate would have given them, for a reason that was about our units
   * rather than about them.
   */
  it("assesses a residence requirement the law states in months", () => {
    const world = createScenarioWorld(
      "qualification-months",
      LEXINGTON_DEMO_CONTEXT,
      { peopleCount: 3 },
    );
    const person = world.people[world.personOrder[0]!]!;
    // After the Minnesota rows' own observation date, so this test is about
    // the unit and nothing else.
    const onDate = makeIsoDate("2026-11-03");
    const district = (districtResidenceSince: string) =>
      assessOfficeQualifications({
        person,
        stateJurisdictionKey: "US-MN",
        officeFamily: "LOWER_CHAMBER" as const,
        stateResidenceSince: makeIsoDate("2000-01-01"),
        districtResidenceSince: makeIsoDate(districtResidenceSince),
        onDate,
      }).find((assessment) => assessment.field === "DISTRICT_RESIDENCE");

    // Exactly six months is enough; one day short is not. Neither answer is
    // reachable if six months is rounded to a year or to nothing.
    expect(district("2026-05-03")?.verdict).toBe("meets");
    expect(district("2026-05-04")?.verdict).toBe("fails");

    // The sentence quotes the law's own unit rather than translating it into
    // a half year nobody wrote.
    expect(district("2026-05-04")?.reason).toContain("6 months");
    expect(district("2026-05-04")?.reason).not.toContain("0.5");
    expect(district("2026-05-04")?.reason).not.toContain("year");

    // A requirement stated in years still reads as years on both sides.
    const stateSide = assessOfficeQualifications({
      person,
      stateJurisdictionKey: "US-MN",
      officeFamily: "LOWER_CHAMBER" as const,
      stateResidenceSince: makeIsoDate("2026-10-01"),
      districtResidenceSince: makeIsoDate("2026-05-03"),
      onDate,
    }).find((assessment) => assessment.field === "STATE_RESIDENCE");
    if (stateSide && stateSide.verdict === "fails") {
      expect(stateSide.reason).toMatch(/requires 1 year|requires \d+ years/);
    }
  });

  /*
   * The band is the only place the arithmetic is observable.
   *
   * Every other residence figure in play is either nothing at all or something
   * like 700 days, and 700 days clears six months and a year alike however it
   * is rounded. Ten months is the one duration that separates them: it satisfies
   * a six-month rule and not a one-year rule, so rounding six months up to a
   * year would refuse this character and rounding it down to nothing would admit
   * somebody who arrived yesterday. Ported from the playtesting lane's
   * candidacy-level case so it sits against this implementation too.
   */
  it("admits somebody past a six-month cutoff but short of a year", () => {
    const world = createScenarioWorld(
      "qualification-band",
      LEXINGTON_DEMO_CONTEXT,
      { peopleCount: 3 },
    );
    const person = world.people[world.personOrder[0]!]!;
    const onDate = makeIsoDate("2026-11-03");
    // One character, one residence interval of ten completed months, read
    // against two states whose requirements differ only in unit.
    const tenMonthsAgo = makeIsoDate("2026-01-03");
    const districtIn = (stateJurisdictionKey: string) =>
      assessOfficeQualifications({
        person,
        stateJurisdictionKey,
        officeFamily: "LOWER_CHAMBER" as const,
        stateResidenceSince: makeIsoDate("2000-01-01"),
        districtResidenceSince: tenMonthsAgo,
        onDate,
      }).find((assessment) => assessment.field === "DISTRICT_RESIDENCE");

    // Minnesota asks six months: ten months is past it.
    expect(districtIn("US-MN")?.verdict).toBe("meets");
    // Ohio asks a year: the same ten months is short of it.
    expect(districtIn("US-OH")?.verdict).toBe("fails");
  });

  it("reads a residence requirement written as a compiler token", () => {
    // Ohio's two chambers carry "RESIDENT_1_YEAR" rather than a phrase. Before
    // this was read, the row was unevaluated -- and an unevaluated row is a
    // block, so Ohio refused every candidate on district residence for a
    // reason about our transport rather than about them.
    const world = createScenarioWorld(
      "qualification-token",
      LEXINGTON_DEMO_CONTEXT,
      { peopleCount: 3 },
    );
    const person = world.people[world.personOrder[0]!]!;
    const onDate = makeIsoDate("2026-11-03");
    const district = (districtResidenceSince: string) =>
      assessOfficeQualifications({
        person,
        stateJurisdictionKey: "US-OH",
        officeFamily: "LOWER_CHAMBER" as const,
        stateResidenceSince: makeIsoDate("2000-01-01"),
        districtResidenceSince: makeIsoDate(districtResidenceSince),
        onDate,
      }).find((assessment) => assessment.field === "DISTRICT_RESIDENCE");

    expect(district("2000-01-01")?.verdict).toBe("meets");
    expect(district("2026-10-01")?.verdict).toBe("fails");
    // The token is not shown to a player; the duration it stands for is.
    expect(district("2026-10-01")?.reason).toContain("1 year");
    expect(district("2026-10-01")?.reason).not.toContain("RESIDENT_1_YEAR");
  });

  it("supports Nebraska's seat on an ordinary start, because its amendment history dates the words", () => {
    // These provisions were observed in September 2026, but the Legislature's
    // own page carries each section's amendment history, which is primary
    // material in the locked artifact. So the current words are dated to the
    // year they were last amended — all before 2000 — not left as a bare
    // September observation that an ordinary January 2026 life falls before.
    const onStart = officeQualifications(
      "US-NE",
      "UNICAMERAL_CHAMBER",
      makeIsoDate("2026-01-05"),
    );
    expect(onStart.length).toBeGreaterThan(0);
    expect(
      onStart.every((row) => row.temporalApplicability.state === "SUPPORTED"),
    ).toBe(true);
  });

  it("still does not back-date a provision before the words it dates took effect", () => {
    // The interval has a floor: the earliest amendment among these sections is
    // 1988, so a life reaching the seat in 1970 predates every dated version
    // and the rule is UNKNOWN rather than silently applied.
    const beforeAnyVersion = officeQualifications(
      "US-NE",
      "UNICAMERAL_CHAMBER",
      makeIsoDate("1970-01-05"),
    );
    expect(beforeAnyVersion.length).toBeGreaterThan(0);
    expect(
      beforeAnyVersion.every(
        (row) => row.temporalApplicability.state === "UNKNOWN",
      ),
    ).toBe(true);
  });
});
