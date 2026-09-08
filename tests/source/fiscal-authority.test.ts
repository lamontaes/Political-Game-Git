/**
 * The state and local fiscal authority compiler.
 *
 * The domain ships no production records — the gate explains why — so these
 * tests are what demonstrate that the compiler is real. They exercise it
 * through the same capability boundary every other domain uses, on the cases
 * that decide whether a fiscal corpus is honest: the three different ways a
 * government may lack a tax, a limitation that has been ratified and does not
 * yet apply, an enabling chapter read and found empty, a conflict that cannot
 * be represented from one artifact, and a balanced-budget framework that is
 * only three quarters researched.
 *
 * They also pin the two boundaries 92N states in its own header — observation
 * is not authority, and no fiscal verdicts — as permanent validation errors.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  FISCAL_AUTHORITY_PRODUCTION_GATE,
  FISCAL_FIELD_SCHEMA,
  FISCAL_MATRIX_COLUMNS,
  FISCAL_RULE_DEPENDENCIES,
  FISCAL_RULE_FIELDS,
  TAX_INSTRUMENTS,
  classifyBalancedBudget,
  compileFiscalAuthorityFixture,
  fiscalRule,
  instrumentPermission,
  isFiscalRule,
  isTaxInstrumentAuthority,
  openFiscalAuthorityFixture,
  parseFiscalMatrix,
  presentRuleValue,
  sourceDomain,
  statesCovered,
  taxInstrumentAuthorization,
  validateFiscalAuthorityCorpus,
} from "../../src/source/domains/state-local-fiscal-authority/index";
import type { FiscalAuthorityRecord } from "../../src/source/domains/state-local-fiscal-authority/index";
import { isClean } from "../../src/source/core/index";

const REPO = resolve(import.meta.dirname, "../..");
const FIXTURE =
  "fixtures/source/state-local-fiscal-authority/mixed-fiscal-regimes.json";

function compiled() {
  return compileFiscalAuthorityFixture(openFiscalAuthorityFixture(FIXTURE));
}

function record(id: string): FiscalAuthorityRecord {
  const found = compiled().records.find((entry) => entry.recordId === id);
  expect(found, id).toBeDefined();
  return found as FiscalAuthorityRecord;
}

/** Compile the fixture with extra rows appended, through the real boundary. */
function withRows(
  rows: readonly (readonly string[])[],
): ReturnType<typeof compileFiscalAuthorityFixture> {
  const fixture = JSON.parse(readFileSync(resolve(REPO, FIXTURE), "utf-8")) as {
    artifacts: { matrixTsv: string };
  };
  const extra = rows.map((row) => `${row.join("\t")}\n`).join("");
  const path = resolve(
    REPO,
    "fixtures/source/state-local-fiscal-authority/probe.json",
  );
  writeFileSync(
    path,
    JSON.stringify({
      __fixture: true,
      fixtureId: "state-local-fiscal-authority/probe",
      artifacts: { matrixTsv: `${fixture.artifacts.matrixTsv}${extra}` },
    }),
  );
  try {
    return compileFiscalAuthorityFixture(
      openFiscalAuthorityFixture(
        "fixtures/source/state-local-fiscal-authority/probe.json",
      ),
    );
  } finally {
    rmSync(path, { force: true });
  }
}

/** Compile a probe corpus made only of the given rows, with no fixture behind it. */
function onlyRows(
  rows: readonly (readonly string[])[],
): ReturnType<typeof compileFiscalAuthorityFixture> {
  const tsv = [
    FISCAL_MATRIX_COLUMNS.join("\t"),
    ...rows.map((entry) => entry.join("\t")),
  ].join("\n");
  const path = resolve(
    REPO,
    "fixtures/source/state-local-fiscal-authority/isolated-probe.json",
  );
  writeFileSync(
    path,
    JSON.stringify({
      __fixture: true,
      fixtureId: "state-local-fiscal-authority/isolated-probe",
      artifacts: { matrixTsv: `${tsv}\n` },
    }),
  );
  try {
    return compileFiscalAuthorityFixture(
      openFiscalAuthorityFixture(
        "fixtures/source/state-local-fiscal-authority/isolated-probe.json",
      ),
    );
  } finally {
    rmSync(path, { force: true });
  }
}

/** A row builder that keeps the column order in one place. */
function row(fields: Partial<Record<string, string>>): readonly string[] {
  const valueKind =
    fields.value_kind ??
    (fields.record_kind === "TAX_INSTRUMENT"
      ? "ENUM"
      : (FISCAL_FIELD_SCHEMA[fields.subject as keyof typeof FISCAL_FIELD_SCHEMA]
          ?.kind ?? ""));
  const complete: Partial<Record<string, string>> = {
    value_kind: valueKind,
    authority_artifact_kind: "ENACTED_STATUTE",
    authority_artifact_id: "fixture:probe:statute",
    authority_lineage: "FIRST_PARTY_LEGAL_ARTIFACT",
    searched_scope: "",
    ...fields,
  };
  return FISCAL_MATRIX_COLUMNS.map((column) => complete[column] ?? "");
}

const CITED = {
  authority_type: "Fixture Statute",
  legal_locator: "s 1-1",
  effective_date: "2020-01-01",
  direct_derived: "DIRECT",
  review_required: "false",
  authority_url: "https://fixture.invalid/statutes",
  paraphrase: "A probe row.",
};

const DEPENDENCY_CASES = [
  ["LOCAL_OPTION_SALES_TAX_MAX_RATE_PERCENT", "GENERAL_SALES_TAX", "2"],
  [
    "LOCAL_OPTION_SALES_TAX_VOTER_REFERENDUM_REQUIRED",
    "GENERAL_SALES_TAX",
    "true",
  ],
  ["LOCAL_OPTION_SALES_TAX_EARMARK", "GENERAL_SALES_TAX", "Roads"],
  ["LOCAL_INCOME_TAX_TYPE", "PAYROLL_OR_OCCUPATIONAL_TAX", "PAYROLL_TAX"],
  ["LOCAL_INCOME_TAX_MAX_RATE_PERCENT", "PAYROLL_OR_OCCUPATIONAL_TAX", "2"],
  [
    "LOCAL_INCOME_TAX_VOTER_REFERENDUM_REQUIRED",
    "PAYROLL_OR_OCCUPATIONAL_TAX",
    "false",
  ],
] as const;

describe("the fiscal authority compiler", () => {
  it("compiles a fixture matrix end to end", () => {
    const corpus = compiled();
    expect(corpus.corpus.inputClass).toBe("fixture");
    expect(corpus.records.length).toBeGreaterThan(60);
    expect(corpus.corpus.coverage.isCompleteUniverse).toBe(false);
    expect(statesCovered(corpus.records)).toEqual([
      "VV",
      "WW",
      "XX",
      "YY",
      "ZZ",
    ]);
  });

  it("compiles deterministically, in record id order", () => {
    const first = compiled();
    const second = compiled();
    expect(second.corpus.canonicalSha256).toBe(first.corpus.canonicalSha256);
    const ids = first.records.map((entry) => entry.recordId);
    expect(ids).toEqual([...ids].sort());
  });

  it("covers the whole normalized field surface the research carries", () => {
    // Every declared field and instrument is reachable, and the two vocabularies
    // do not overlap: an instrument's availability is never also a rule.
    expect(FISCAL_RULE_FIELDS.length).toBeGreaterThan(35);
    expect(TAX_INSTRUMENTS).toHaveLength(8);
    for (const field of FISCAL_RULE_FIELDS) {
      expect(FISCAL_FIELD_SCHEMA[field], field).toBeDefined();
    }
    const overlap = FISCAL_RULE_FIELDS.filter((field) =>
      (TAX_INSTRUMENTS as readonly string[]).includes(field),
    );
    expect(overlap).toEqual([]);
  });
});

describe("the three ways a government may lack a tax stay apart", () => {
  it("keeps a constitutional bar, a statutory preemption and an empty grant distinct", () => {
    const prohibited = record("ZZ:STATE:TAX:GROSS_RECEIPTS_TAX");
    const preempted = record("XX:MUNICIPALITY:TAX:INDIVIDUAL_INCOME_TAX");
    const ungranted = record("ZZ:STATE:TAX:SEVERANCE_TAX");
    for (const entry of [prohibited, preempted, ungranted]) {
      expect(isTaxInstrumentAuthority(entry)).toBe(true);
    }
    if (
      isTaxInstrumentAuthority(prohibited) &&
      isTaxInstrumentAuthority(preempted) &&
      isTaxInstrumentAuthority(ungranted)
    ) {
      expect(prohibited.authorization.state).toBe("KNOWN");
      if (prohibited.authorization.state === "KNOWN")
        expect(prohibited.authorization.value).toBe(
          "CONSTITUTIONALLY_PROHIBITED",
        );
      if (preempted.authorization.state === "KNOWN")
        expect(preempted.authorization.value).toBe("STATUTORILY_PREEMPTED");
      if (ungranted.authorization.state === "KNOWN")
        expect(ungranted.authorization.value).toBe("NO_ENABLING_AUTHORITY");
    }
  });

  it("answers UNESTABLISHED, never BARRED, for an instrument nobody researched", () => {
    const records = compiled().records;
    expect(
      taxInstrumentAuthorization(
        records,
        "ZZ",
        "STATE",
        "TRANSIENT_LODGING_TAX",
      ),
    ).toBeNull();
    expect(
      instrumentPermission(records, "ZZ", "STATE", "TRANSIENT_LODGING_TAX"),
    ).toBe("UNESTABLISHED");
    expect(
      instrumentPermission(records, "ZZ", "STATE", "GROSS_RECEIPTS_TAX"),
    ).toBe("BARRED");
    expect(
      instrumentPermission(records, "ZZ", "STATE", "GENERAL_SALES_TAX"),
    ).toBe("PERMITTED");
  });
});

describe("unresolved fiscal facts carry no value", () => {
  it("leaves no value key on a rule nobody established", () => {
    for (const id of [
      "ZZ:STATE:RULE:DEBT_SERVICE_RATIO_CAP_PERCENT",
      "ZZ:STATE:RULE:GO_DEBT_LEGISLATIVE_SUPERMAJORITY",
      "ZZ:STATE:RULE:REVENUE_OR_SPENDING_GROWTH_LIMIT",
    ]) {
      const entry = record(id);
      if (isFiscalRule(entry)) {
        expect(entry.rule.state, id).not.toBe("KNOWN");
        expect(entry.rule, id).not.toHaveProperty("value");
      }
    }
  });

  it("distinguishes an authority read and silent from nobody having looked", () => {
    const silent = record(
      "VV:SCHOOL_DISTRICT:RULE:ASSESSMENT_GROWTH_CAP_PERCENT",
    );
    const unlooked = record("ZZ:STATE:RULE:DEBT_SERVICE_RATIO_CAP_PERCENT");
    if (isFiscalRule(silent))
      expect(silent.rule.state).toBe("NO_REQUIREMENT_FOUND");
    if (isFiscalRule(unlooked)) expect(unlooked.rule.state).toBe("UNKNOWN");
  });

  it("distinguishes a level that does not exist from a fact nobody found", () => {
    const abolished = record("VV:COUNTY:TAX:PROPERTY_TAX");
    if (isTaxInstrumentAuthority(abolished)) {
      expect(abolished.authorization.state).toBe("NOT_APPLICABLE");
      if (abolished.authorization.state === "NOT_APPLICABLE")
        expect(abolished.authorization.reason).toMatch(/abolished/);
    }
  });

  it("keeps a ratified limitation that does not yet apply out of present truth", () => {
    const cap = record("WW:COUNTY:RULE:ASSESSMENT_GROWTH_CAP_PERCENT");
    if (isFiscalRule(cap)) {
      expect(cap.rule.state).toBe("NOT_YET_OPERATIVE");
      if (cap.rule.state === "NOT_YET_OPERATIVE")
        expect(cap.rule.operativeFrom).toBe("2027-01-01");
    }
    expect(
      presentRuleValue(
        compiled().records,
        "WW",
        "COUNTY",
        "ASSESSMENT_GROWTH_CAP_PERCENT",
      ),
    ).toBeNull();
  });

  it("refuses to synthesise a conflict it cannot represent", () => {
    const conflicted = record(
      "VV:SCHOOL_DISTRICT:RULE:LOCAL_GO_BOND_VOTER_HURDLE",
    );
    if (isFiscalRule(conflicted)) {
      expect(conflicted.rule.state).toBe("UNKNOWN");
      if (conflicted.rule.state === "UNKNOWN")
        expect(conflicted.rule.reason).toMatch(/two distinct artifacts/);
    }
    expect(
      validateFiscalAuthorityCorpus(compiled()).findings.some(
        (finding) => finding.code === "fiscal/conflict-not-representable",
      ),
    ).toBe(true);
  });
});

describe("the balanced-budget classification is derived and refuses a partial reading", () => {
  it("classifies a state whose four stages are all established", () => {
    const classification = classifyBalancedBudget(compiled().records, "ZZ");
    expect(classification.state).toBe("COMPLETE");
    if (classification.state === "COMPLETE") {
      expect(classification.stagesEnforced).toEqual([1, 2, 3, 4]);
      expect(classification.highestStage).toBe(4);
    }
  });

  it("refuses to classify a state with an unresolved stage, and names the gap", () => {
    const classification = classifyBalancedBudget(compiled().records, "YY");
    expect(classification.state).toBe("INCOMPLETE");
    if (classification.state === "INCOMPLETE") {
      expect(classification).not.toHaveProperty("highestStage");
      expect(classification.stagesEnforced).toEqual([1, 2]);
      expect(classification.missing).toEqual([
        {
          stage: 4,
          field: "DEFICIT_CARRYOVER_PROHIBITED",
          recordState: "UNKNOWN",
        },
      ]);
    }
    expect(
      validateFiscalAuthorityCorpus(compiled()).findings.some(
        (finding) =>
          finding.code === "fiscal/partial-balanced-budget-framework" &&
          finding.message.startsWith("YY"),
      ),
    ).toBe(true);
  });

  it("treats a researched absence of a mandate as a fact, not a gap", () => {
    const signs = fiscalRule(
      compiled().records,
      "YY",
      "STATE",
      "GOVERNOR_SIGNS_BALANCED",
    );
    expect(signs?.rule.state).toBe("KNOWN");
    if (signs && signs.rule.state === "KNOWN")
      expect(signs.rule.value).toBe(false);
  });

  it("says nothing about a state the corpus does not cover", () => {
    const classification = classifyBalancedBudget(compiled().records, "XX");
    expect(classification.state).toBe("INCOMPLETE");
    if (classification.state === "INCOMPLETE") {
      expect(classification.missing).toHaveLength(4);
      expect(
        classification.missing.every((gap) => gap.recordState === null),
      ).toBe(true);
    }
    // A state with nothing researched is a coverage fact, not a defect.
    expect(
      validateFiscalAuthorityCorpus(compiled()).findings.some(
        (finding) =>
          finding.code === "fiscal/partial-balanced-budget-framework" &&
          finding.message.startsWith("XX"),
      ),
    ).toBe(false);
  });
});

describe("the matrix reader refuses a shape it cannot transcribe", () => {
  it("rejects a matrix whose tab delimiters did not survive transport", () => {
    const spaceSeparated = `${FISCAL_MATRIX_COLUMNS.join(" ")}\nZZ STATE FISCAL_RULE LINE_ITEM_VETO_AVAILABLE KNOWN true\n`;
    expect(() =>
      parseFiscalMatrix(Buffer.from(spaceSeparated, "utf-8")),
    ).toThrow(/tab characters did not survive transport/);
  });

  it("rejects a matrix whose columns are not the declared schema", () => {
    const wrong = "state\tlevel\n" + "ZZ\tSTATE\n";
    expect(() => parseFiscalMatrix(Buffer.from(wrong, "utf-8"))).toThrow(
      /has 2|declares "record_kind"/,
    );
  });
});

describe("the normalizer refuses what it cannot transcribe honestly", () => {
  it.each([
    ["status", { status: "MYSTERY" }, /status.*closed vocabulary/i],
    ["blank status", { status: "" }, /status.*closed vocabulary/i],
    ["case-drifted status", { status: "known" }, /status.*closed vocabulary/i],
    [
      "whitespace-smuggled status",
      { status: " KNOWN " },
      /status.*closed vocabulary/i,
    ],
    [
      "blank derivation",
      { direct_derived: "" },
      /direct_derived.*DIRECT.*DERIVED/i,
    ],
    [
      "malformed derivation",
      { direct_derived: "DIRECTISH" },
      /direct_derived.*DIRECT.*DERIVED/i,
    ],
    [
      "blank review flag",
      { review_required: "" },
      /review_required.*true.*false/i,
    ],
    [
      "case-drifted review flag",
      { review_required: "FALSE" },
      /review_required.*true.*false/i,
    ],
    [
      "whitespace-smuggled review flag",
      { review_required: " false " },
      /review_required.*true.*false/i,
    ],
    [
      "case-drifted derivation",
      { direct_derived: "derived" },
      /direct_derived.*DIRECT.*DERIVED/i,
    ],
    [
      "whitespace-smuggled derivation",
      { direct_derived: " DIRECT " },
      /direct_derived.*DIRECT.*DERIVED/i,
    ],
    [
      "invalid review flag",
      { review_required: "no" },
      /review_required.*true.*false/i,
    ],
  ])("rejects %s control vocabulary", (_label, override, message) => {
    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "QQ",
          level: "STATE",
          record_kind: "FISCAL_RULE",
          subject: "LINE_ITEM_VETO_AVAILABLE",
          status: "KNOWN",
          value: "true",
          ...override,
        }),
      ]),
    ).toThrow(message);
  });

  it.each([
    ["NOMINAL_MILLAGE_CAP_MILLS", "PERCENT", "2", "MILLS"],
    ["LOCAL_OPTION_SALES_TAX_MAX_RATE_PERCENT", "MILLS", "2", "PERCENT"],
    ["RESERVE_CAP_PERCENT_OF_GENERAL_FUND", "MONEY", "2000000", "PERCENT"],
  ])(
    "rejects %s carrying mismatched %s units even when the scalar parses",
    (field, valueKind, value, expectedKind) => {
      const level = field.startsWith("RESERVE_") ? "STATE" : "MUNICIPALITY";
      expect(() =>
        withRows([
          row({
            ...CITED,
            state: "QQ",
            level,
            record_kind: "FISCAL_RULE",
            subject: field,
            status: "KNOWN",
            value,
            value_kind: valueKind,
          }),
        ]),
      ).toThrow(new RegExp(`value kind.*${valueKind}.*${expectedKind}`, "i"));
    },
  );

  it("refuses a percentage that arrived in a millage column", () => {
    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "QQ",
          level: "MUNICIPALITY",
          record_kind: "FISCAL_RULE",
          subject: "NOMINAL_MILLAGE_CAP_MILLS",
          status: "KNOWN",
          value: "1000",
        }),
      ]),
    ).toThrow(/mills\. A percentage in a millage column/);
  });

  it("refuses a boolean spelled as a word", () => {
    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "QQ",
          level: "STATE",
          record_kind: "FISCAL_RULE",
          subject: "LINE_ITEM_VETO_AVAILABLE",
          status: "KNOWN",
          value: "yes",
        }),
      ]),
    ).toThrow(/is not a boolean/);
  });

  it("refuses a value outside a closed vocabulary", () => {
    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "QQ",
          level: "STATE",
          record_kind: "FISCAL_RULE",
          subject: "EXECUTIVE_BUDGET_MANDATE_TYPE",
          status: "KNOWN",
          value: "CUSTOMARY",
        }),
      ]),
    ).toThrow(/outside this field's closed vocabulary/);
  });

  it("refuses a state-level rule filed under a local level, and the reverse", () => {
    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "QQ",
          level: "MUNICIPALITY",
          record_kind: "FISCAL_RULE",
          subject: "RESERVE_CAP_PERCENT_OF_GENERAL_FUND",
          status: "KNOWN",
          value: "10",
        }),
      ]),
    ).toThrow(/is a state-level rule and this row files it under MUNICIPALITY/);

    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "QQ",
          level: "STATE",
          record_kind: "FISCAL_RULE",
          subject: "LOCAL_GO_BOND_VOTER_HURDLE",
          status: "KNOWN",
          value: "SIMPLE_MAJORITY",
        }),
      ]),
    ).toThrow(/is a local-level rule and this row files it under STATE/);

    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "QQ",
          level: "STATE",
          record_kind: "FISCAL_RULE",
          subject: "FISCAL_HOME_RULE_SCOPE",
          status: "KNOWN",
          value: "PREEMPTED_BY_STATE",
        }),
      ]),
    ).toThrow(/FISCAL_HOME_RULE_SCOPE.*local-level.*STATE/);
  });

  it("enforces every field's declared government-level scope", () => {
    const levels = [
      "STATE",
      "COUNTY",
      "MUNICIPALITY",
      "CONSOLIDATED_CITY_COUNTY",
      "SCHOOL_DISTRICT",
      "SPECIAL_DISTRICT",
    ] as const;

    for (const field of FISCAL_RULE_FIELDS) {
      const schema = FISCAL_FIELD_SCHEMA[field];
      for (const level of levels) {
        const allowed =
          schema.scope === "ANY" ||
          (schema.scope === "STATE" && level === "STATE") ||
          (schema.scope === "LOCAL" && level !== "STATE");
        const compile = () =>
          onlyRows([
            row({
              ...CITED,
              state: "QQ",
              level,
              record_kind: "FISCAL_RULE",
              subject: field,
              status: "UNKNOWN",
              value: "",
            }),
          ]);
        if (allowed) {
          expect(compile, `${field} should allow ${level}`).not.toThrow();
        } else {
          expect(compile, `${field} should reject ${level}`).toThrow(
            /state-level|local-level/,
          );
        }
      }
    }
  });

  it("refuses a value on a status that carries none, and a status with no value", () => {
    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "QQ",
          level: "STATE",
          record_kind: "FISCAL_RULE",
          subject: "LINE_ITEM_VETO_AVAILABLE",
          status: "UNKNOWN",
          value: "true",
        }),
      ]),
    ).toThrow(/carries no value, but the row supplies/);

    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "QQ",
          level: "STATE",
          record_kind: "FISCAL_RULE",
          subject: "LINE_ITEM_VETO_AVAILABLE",
          status: "KNOWN",
          value: "",
        }),
      ]),
    ).toThrow(/needs a value and the row supplies none/);
  });

  it("refuses HISTORICAL and SUPPRESSED rather than inventing what they need", () => {
    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "QQ",
          level: "STATE",
          record_kind: "FISCAL_RULE",
          subject: "LINE_ITEM_VETO_AVAILABLE",
          status: "HISTORICAL",
          value: "true",
        }),
      ]),
    ).toThrow(/HISTORICAL needs a closed interval/);

    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "QQ",
          level: "STATE",
          record_kind: "FISCAL_RULE",
          subject: "LINE_ITEM_VETO_AVAILABLE",
          status: "SUPPRESSED",
          value: "true",
        }),
      ]),
    ).toThrow(/A legal authority does not suppress/);
  });

  it("refuses an authorization token it does not model", () => {
    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "QQ",
          level: "STATE",
          record_kind: "TAX_INSTRUMENT",
          subject: "GENERAL_SALES_TAX",
          status: "KNOWN",
          value: "PROBABLY_FINE",
        }),
      ]),
    ).toThrow(/is not a tax authorization status/);
  });

  it("refuses two readings of the same provision as one record", () => {
    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "ZZ",
          level: "STATE",
          record_kind: "FISCAL_RULE",
          subject: "LINE_ITEM_VETO_AVAILABLE",
          status: "KNOWN",
          value: "false",
        }),
      ]),
    ).toThrow(/yields "ZZ:STATE:RULE:LINE_ITEM_VETO_AVAILABLE" twice/);
  });

  it("cannot make a rule KNOWN without a date to place it in a fiscal year", () => {
    const corpus = withRows([
      row({
        ...CITED,
        state: "QQ",
        level: "STATE",
        record_kind: "FISCAL_RULE",
        subject: "LINE_ITEM_VETO_AVAILABLE",
        status: "KNOWN",
        value: "true",
        effective_date: "",
      }),
    ]);
    const entry = corpus.records.find(
      (candidate) =>
        candidate.recordId === "QQ:STATE:RULE:LINE_ITEM_VETO_AVAILABLE",
    );
    expect(entry && isFiscalRule(entry) && entry.rule.state).toBe("UNKNOWN");
  });
});

describe("92N's own boundaries are permanent validation errors", () => {
  it("refuses a prohibition that names no provision", () => {
    const corpus = withRows([
      row({
        ...CITED,
        state: "QQ",
        level: "MUNICIPALITY",
        record_kind: "TAX_INSTRUMENT",
        subject: "INDIVIDUAL_INCOME_TAX",
        status: "KNOWN",
        value: "CONSTITUTIONALLY_PROHIBITED",
        legal_locator: "",
      }),
    ]);
    const report = validateFiscalAuthorityCorpus(corpus);
    expect(
      report.findings.some(
        (finding) => finding.code === "fiscal/prohibition-without-provision",
      ),
    ).toBe(true);
    expect(isClean(report)).toBe(false);
  });

  it("refuses an absence of authority that names no scope searched", () => {
    expect(() =>
      withRows([
        row({
          ...CITED,
          state: "QQ",
          level: "MUNICIPALITY",
          record_kind: "TAX_INSTRUMENT",
          subject: "GENERAL_SALES_TAX",
          status: "KNOWN",
          value: "NO_ENABLING_AUTHORITY",
          paraphrase: "",
        }),
      ]),
    ).toThrow(/requires searched_scope JSON/);
  });

  it("refuses free prose as proof of a no-enabling-authority search", () => {
    expect(() =>
      onlyRows([
        row({
          ...CITED,
          state: "QQ",
          level: "MUNICIPALITY",
          record_kind: "TAX_INSTRUMENT",
          subject: "GENERAL_SALES_TAX",
          status: "KNOWN",
          value: "NO_ENABLING_AUTHORITY",
          paraphrase: "A probe row.",
        }),
      ]),
    ).toThrow(/free prose is not proof/);
  });

  it("accepts a structured searched scope tied to the row and its evidence identity", () => {
    const searchedScope = JSON.stringify({
      authorityKinds: ["ENACTED_STATUTE"],
      evidenceArtifactIds: ["fixture:probe:statute"],
      instrument: "GENERAL_SALES_TAX",
      jurisdictionStateUsps: "QQ",
      level: "MUNICIPALITY",
    });
    const corpus = onlyRows([
      row({
        ...CITED,
        state: "QQ",
        level: "MUNICIPALITY",
        record_kind: "TAX_INSTRUMENT",
        subject: "GENERAL_SALES_TAX",
        status: "KNOWN",
        value: "NO_ENABLING_AUTHORITY",
        searched_scope: searchedScope,
      }),
    ]);
    const entry = corpus.records[0];
    expect(entry && isTaxInstrumentAuthority(entry)).toBe(true);
    if (entry && isTaxInstrumentAuthority(entry)) {
      expect(entry.searchedScope?.instrument).toBe("GENERAL_SALES_TAX");
      expect(entry.searchedScope?.evidenceArtifactIds).toEqual([
        "fixture:probe:statute",
      ]);
    }
  });

  it.each([
    [
      "jurisdiction",
      { jurisdictionStateUsps: "RR" },
      /jurisdiction must be QQ/,
    ],
    ["government level", { level: "COUNTY" }, /level must be MUNICIPALITY/],
    [
      "instrument family",
      { instrument: "PROPERTY_TAX" },
      /instrument must be GENERAL_SALES_TAX/,
    ],
    [
      "legal-artifact family",
      { authorityKinds: ["STATE_CONSTITUTION"] },
      /does not include the cited ENACTED_STATUTE/,
    ],
    [
      "evidence identity",
      { evidenceArtifactIds: ["fixture:probe:other"] },
      /does not include cited artifact/,
    ],
  ])("rejects searched scope with mismatched %s", (_label, override, error) => {
    const searchedScope = JSON.stringify({
      authorityKinds: ["ENACTED_STATUTE"],
      evidenceArtifactIds: ["fixture:probe:statute"],
      instrument: "GENERAL_SALES_TAX",
      jurisdictionStateUsps: "QQ",
      level: "MUNICIPALITY",
      ...override,
    });
    expect(() =>
      onlyRows([
        row({
          ...CITED,
          state: "QQ",
          level: "MUNICIPALITY",
          record_kind: "TAX_INSTRUMENT",
          subject: "GENERAL_SALES_TAX",
          status: "KNOWN",
          value: "NO_ENABLING_AUTHORITY",
          searched_scope: searchedScope,
        }),
      ]),
    ).toThrow(error);
  });

  it.each([
    ["generic statistical source", "Statistical Report", "Table 2"],
    ["renamed statistical source", "Official Revenue Compendium", "s 1-1"],
    ["citation-looking prose", "State Code Survey", "art. IV, s 2"],
  ])(
    "refuses %s without positive legal-artifact identity",
    (_label, authorityType, locator) => {
      expect(() =>
        onlyRows([
          row({
            ...CITED,
            state: "QQ",
            level: "MUNICIPALITY",
            record_kind: "TAX_INSTRUMENT",
            subject: "GENERAL_SALES_TAX",
            status: "KNOWN",
            value: "STATUTORILY_PREEMPTED",
            authority_type: authorityType,
            authority_artifact_kind: "STATISTICAL_REPORT",
            authority_artifact_id: "fixture:probe:observations",
            authority_lineage: "OBSERVATIONAL_SOURCE",
            legal_locator: locator,
            authority_url: "https://fixture.invalid/renamed-observations",
          }),
        ]),
      ).toThrow(/positive legal-artifact vocabulary/);
    },
  );

  it("refuses a fiscal verdict smuggled in as the name of a fund", () => {
    const corpus = withRows([
      row({
        ...CITED,
        state: "QQ",
        level: "STATE",
        record_kind: "FISCAL_RULE",
        subject: "RESERVE_FUND_NAME",
        status: "KNOWN",
        value: "Overall Fiscal Health Index",
      }),
    ]);
    expect(
      validateFiscalAuthorityCorpus(corpus).findings.some(
        (finding) => finding.code === "fiscal/fabricated-fiscal-score",
      ),
    ).toBe(true);
  });

  it("covers every declared tax-rule dependency with an adversarial case", () => {
    expect(Object.keys(FISCAL_RULE_DEPENDENCIES).sort()).toEqual(
      DEPENDENCY_CASES.map(([field]) => field).sort(),
    );
  });

  it.each(DEPENDENCY_CASES)(
    "refuses known %s when its %s authority is barred",
    (field, instrument, value) => {
      const corpus = onlyRows([
        row({
          ...CITED,
          state: "QQ",
          level: "MUNICIPALITY",
          record_kind: "TAX_INSTRUMENT",
          subject: instrument,
          status: "KNOWN",
          value: "STATUTORILY_PREEMPTED",
        }),
        row({
          ...CITED,
          state: "QQ",
          level: "MUNICIPALITY",
          record_kind: "FISCAL_RULE",
          subject: field,
          status: "KNOWN",
          value,
        }),
      ]);
      expect(
        validateFiscalAuthorityCorpus(corpus).findings.some(
          (finding) => finding.code === "fiscal/limit-on-barred-instrument",
        ),
      ).toBe(true);
    },
  );

  it("refuses a known dependent rule without known permissive authority", () => {
    const corpus = onlyRows([
      row({
        ...CITED,
        state: "QQ",
        level: "MUNICIPALITY",
        record_kind: "FISCAL_RULE",
        subject: "LOCAL_OPTION_SALES_TAX_MAX_RATE_PERCENT",
        status: "KNOWN",
        value: "2",
      }),
    ]);
    expect(
      validateFiscalAuthorityCorpus(corpus).findings.some(
        (finding) =>
          finding.code === "fiscal/dependent-rule-without-known-authority",
      ),
    ).toBe(true);
  });

  it("preserves local level when detecting a universal municipality rule", () => {
    const states = ["AA", "BB", "CC", "DD", "EE"];
    const corpus = onlyRows(
      states.flatMap((state, index) => [
        row({
          ...CITED,
          state,
          level: "MUNICIPALITY",
          record_kind: "TAX_INSTRUMENT",
          subject: "GENERAL_SALES_TAX",
          status: "KNOWN",
          value: "AUTHORIZED",
        }),
        row({
          ...CITED,
          state,
          level: "SPECIAL_DISTRICT",
          record_kind: "TAX_INSTRUMENT",
          subject: "GENERAL_SALES_TAX",
          status: "KNOWN",
          value:
            index % 2 === 0
              ? "STATUTORILY_PREEMPTED"
              : "AUTHORIZED_WITH_VOTER_APPROVAL",
        }),
      ]),
    );
    expect(
      validateFiscalAuthorityCorpus(corpus).findings.some(
        (finding) =>
          finding.code === "fiscal/universal-tax-model" &&
          finding.message.includes("MUNICIPALITY"),
      ),
    ).toBe(true);
  });

  it("refuses one local sales tax answer applied to every state", () => {
    const uniform = ["AA", "BB", "CC", "DD", "EE", "FF"].flatMap((state) => [
      row({
        ...CITED,
        state,
        level: "MUNICIPALITY",
        record_kind: "TAX_INSTRUMENT",
        subject: "GENERAL_SALES_TAX",
        status: "KNOWN",
        value: "AUTHORIZED",
      }),
    ]);
    const report = validateFiscalAuthorityCorpus(onlyRows(uniform));
    expect(
      report.findings.some(
        (finding) => finding.code === "fiscal/universal-tax-model",
      ),
    ).toBe(true);
    expect(isClean(report)).toBe(false);
  });

  it("does not confuse legitimate within-state level differences with universality", () => {
    const states = ["AA", "BB", "CC", "DD", "EE"];
    const values = [
      "AUTHORIZED",
      "AUTHORIZED_WITH_VOTER_APPROVAL",
      "AUTHORIZED_LIMITED_CLASS",
      "STATUTORILY_PREEMPTED",
      "CONSTITUTIONALLY_PROHIBITED",
    ];
    const corpus = onlyRows(
      states.flatMap((state, index) => [
        row({
          ...CITED,
          state,
          level: "MUNICIPALITY",
          record_kind: "TAX_INSTRUMENT",
          subject: "GENERAL_SALES_TAX",
          status: "KNOWN",
          value: values[index],
        }),
        row({
          ...CITED,
          state,
          level: "COUNTY",
          record_kind: "TAX_INSTRUMENT",
          subject: "GENERAL_SALES_TAX",
          status: "KNOWN",
          value: values[(index + 1) % values.length],
        }),
      ]),
    );
    expect(
      validateFiscalAuthorityCorpus(corpus).findings.some(
        (finding) => finding.code === "fiscal/universal-tax-model",
      ),
    ).toBe(false);
  });

  it("leaves the fixture corpus free of errors, warnings and all", () => {
    const report = validateFiscalAuthorityCorpus(compiled());
    expect(isClean(report)).toBe(true);
    expect(
      report.findings.some(
        (finding) => finding.code === "fiscal/awaiting-normalization-review",
      ),
    ).toBe(true);
    expect(
      report.findings.every((finding) => finding.severity !== "error"),
    ).toBe(true);
  });
});

describe("the production gate", () => {
  it("refuses to compile production records, and says why", () => {
    expect(() =>
      sourceDomain.compileProduction({ domain: "x", artifacts: [] }),
    ).toThrow(/compiles no production corpus/);
    expect(sourceDomain.productionGate).toBe(FISCAL_AUTHORITY_PRODUCTION_GATE);
    expect(FISCAL_AUTHORITY_PRODUCTION_GATE).toMatch(/research synthesis/);
    expect(FISCAL_AUTHORITY_PRODUCTION_GATE).toMatch(/source:acquire/);
  });

  it("declares an empty acquisition plan rather than a speculative one", () => {
    expect(sourceDomain.acquisitionPlan.requests).toEqual([]);
    expect(sourceDomain.domain).toBe("state-local-fiscal-authority");
  });
});
