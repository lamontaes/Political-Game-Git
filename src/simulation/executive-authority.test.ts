import { describe, expect, it } from "vitest";

import {
  assertExecutiveAuthorityPackIntegrity,
  isGenericCitation,
  isPluralExecutive,
  resolvePresentmentAuthority,
  type ExecutiveAuthorityRulePack,
} from "./executive-authority-rules";
import {
  ALASKA_EXECUTIVE_PACK,
  EXECUTIVE_AUTHORITY_RULE_PACKS,
  ILLINOIS_EXECUTIVE_PACK,
  KENTUCKY_EXECUTIVE_PACK,
  MINNESOTA_EXECUTIVE_PACK,
  NEBRASKA_EXECUTIVE_PACK,
  UNRESEARCHED_JURISDICTIONS,
  US_FEDERAL_EXECUTIVE_PACK,
  executiveRulePackById,
  executiveRulePackForJurisdiction,
} from "./executive-authority-rule-packs";
import {
  ALASKA_RULE_PACK,
  KENTUCKY_RULE_PACK,
  NEBRASKA_RULE_PACK,
  rulePackById,
} from "./legislature-rule-packs";
import {
  isKnown,
  knownValueOrNull,
  type RuleSourceRef,
  type RuleValue,
} from "./legislature-rules";

// ---------------------------------------------------------------------------
// Walkers — these tests check properties of *every* value in *every* pack, so
// a later pack cannot quietly reintroduce a defect this repair removed.
// ---------------------------------------------------------------------------

interface WalkedRule {
  readonly packId: string;
  readonly path: string;
  readonly rule: RuleValue<unknown>;
}

function looksLikeRuleValue(candidate: unknown): candidate is RuleValue<unknown> {
  if (typeof candidate !== "object" || candidate === null) {
    return false;
  }
  const kind = (candidate as { kind?: unknown }).kind;
  return kind === "known" || kind === "unknown" || kind === "not-applicable";
}

/** Every RuleValue anywhere in a pack, with the path it was found at. */
function walkRules(pack: ExecutiveAuthorityRulePack): WalkedRule[] {
  const found: WalkedRule[] = [];
  const visit = (node: unknown, path: string): void => {
    if (looksLikeRuleValue(node)) {
      found.push({ packId: pack.packId, path, rule: node });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    if (typeof node === "object" && node !== null) {
      for (const [key, value] of Object.entries(node)) {
        visit(value, path.length === 0 ? key : `${path}.${key}`);
      }
    }
  };
  visit(pack, "");
  return found;
}

const ALL_RULES: readonly WalkedRule[] = EXECUTIVE_AUTHORITY_RULE_PACKS.flatMap(
  (pack) => walkRules(pack),
);

const STATE_PACKS = [
  KENTUCKY_EXECUTIVE_PACK,
  NEBRASKA_EXECUTIVE_PACK,
  ALASKA_EXECUTIVE_PACK,
  MINNESOTA_EXECUTIVE_PACK,
  ILLINOIS_EXECUTIVE_PACK,
] as const;

function ruleAt(
  pack: ExecutiveAuthorityRulePack,
  path: string,
): RuleValue<unknown> {
  const walked = walkRules(pack).find((entry) => entry.path === path);
  if (!walked) {
    throw new Error(`No rule value at '${path}' in '${pack.packId}'.`);
  }
  return walked.rule;
}

function noteOf(rule: RuleValue<unknown>): string {
  return rule.kind === "known" ? "" : rule.note;
}

describe("executive-authority pack integrity", () => {
  it("every registered pack is internally coherent and fully sourced", () => {
    expect(EXECUTIVE_AUTHORITY_RULE_PACKS.length).toBe(6);
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      expect(() => assertExecutiveAuthorityPackIntegrity(pack)).not.toThrow();
      expect(pack.sources.length).toBeGreaterThan(0);
    }
  });

  it("has unique pack ids and jurisdiction keys", () => {
    const packIds = EXECUTIVE_AUTHORITY_RULE_PACKS.map((pack) => pack.packId);
    const jurisdictionKeys = EXECUTIVE_AUTHORITY_RULE_PACKS.map(
      (pack) => pack.jurisdictionKey,
    );
    expect(new Set(packIds).size).toBe(packIds.length);
    expect(new Set(jurisdictionKeys).size).toBe(jurisdictionKeys.length);
  });

  it("resolves packs by id and jurisdiction, and rejects the unknown", () => {
    expect(executiveRulePackById("us-ak-governor-v1")).toBe(
      ALASKA_EXECUTIVE_PACK,
    );
    expect(executiveRulePackForJurisdiction("US-IL")).toBe(
      ILLINOIS_EXECUTIVE_PACK,
    );
    expect(executiveRulePackForJurisdiction("US-XX")).toBeNull();
    expect(() => executiveRulePackById("nope")).toThrow(/No executive/);
  });

  it("rejects a pack that claims a plural branch but lists no officers", () => {
    const broken: ExecutiveAuthorityRulePack = {
      ...ALASKA_EXECUTIVE_PACK,
      office: {
        ...ALASKA_EXECUTIVE_PACK.office,
        branchStructure: {
          kind: "known",
          value: "plural",
          source: ALASKA_EXECUTIVE_PACK.office.source,
        },
      },
      pluralExecutive: [],
    };
    expect(() => assertExecutiveAuthorityPackIntegrity(broken)).toThrow(
      /plural executive but lists no independent officers/,
    );
  });
});

// ---------------------------------------------------------------------------
// (1) Unsupported fields stay unknown, across all six jurisdictions.
// ---------------------------------------------------------------------------

describe("executive-authority: unsupported fields stay unknown", () => {
  // The exact fields this repair holds at unknown, per jurisdiction, because no
  // exact operative authority was read that establishes the precise tuple.
  const HELD_UNKNOWN: ReadonlyArray<
    readonly [ExecutiveAuthorityRulePack, readonly string[]]
  > = [
    [
      US_FEDERAL_EXECUTIVE_PACK,
      [
        "presentment.legislativeRulePackId",
        "removal.mode",
        "specialSession.agendaLimitedToCall",
        "executiveDirective.hasDirectiveAuthority",
        "executiveDirective.authorityBasis",
        "reorganization.executiveMayReorganize",
        "reorganization.legislativeDisapprovalAvailable",
        "reorganization.sunset",
        "emergencyDeclaration.executiveMayDeclare",
        "emergencyDeclaration.initialDurationDays",
        "emergencyDeclaration.extension",
        "emergencyDeclaration.legislativeTermination",
        "budgetSubmission.executiveMustSubmit",
        "budgetSubmission.submissionDeadline",
        "administrative.supervisoryAuthority",
      ],
    ],
    [
      KENTUCKY_EXECUTIVE_PACK,
      [
        "appointment.executiveAppoints",
        "appointment.legislativeConfirmationRequired",
        "appointment.confirmingBody",
        "clemency.model",
        "clemency.scope",
      ],
    ],
    [
      NEBRASKA_EXECUTIVE_PACK,
      [
        "appointment.executiveAppoints",
        "appointment.legislativeConfirmationRequired",
        "appointment.confirmingBody",
        "clemency.model",
        "clemency.scope",
      ],
    ],
    [
      ALASKA_EXECUTIVE_PACK,
      ["reorganization.sunset", "clemency.model", "clemency.scope"],
    ],
    [
      MINNESOTA_EXECUTIVE_PACK,
      [
        "presentment.legislativeRulePackId",
        "appointment.executiveAppoints",
        "appointment.legislativeConfirmationRequired",
        "appointment.confirmingBody",
        "clemency.model",
        "clemency.scope",
      ],
    ],
    [
      ILLINOIS_EXECUTIVE_PACK,
      [
        "presentment.legislativeRulePackId",
        "appointment.executiveAppoints",
        "appointment.legislativeConfirmationRequired",
        "appointment.confirmingBody",
        "clemency.model",
        "clemency.scope",
      ],
    ],
  ];

  it.each(HELD_UNKNOWN)("holds %o unsupported fields at unknown", (pack, paths) => {
    for (const path of paths) {
      const rule = ruleAt(pack, path);
      expect(`${pack.packId}:${path}:${rule.kind}`).toBe(
        `${pack.packId}:${path}:unknown`,
      );
      // An unknown must say what is unresolved, not merely be empty.
      expect(noteOf(rule).trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps the nine unresearched dimensions unknown in every state pack", () => {
    for (const pack of STATE_PACKS) {
      expect(pack.executiveDirective.hasDirectiveAuthority.kind).toBe("unknown");
      expect(pack.executiveDirective.authorityBasis.kind).toBe("unknown");
      expect(pack.emergencyDeclaration.executiveMayDeclare.kind).toBe("unknown");
      expect(pack.budgetSubmission.executiveMustSubmit.kind).toBe("unknown");
      expect(pack.administrative.faithfulExecutionDuty.kind).toBe("unknown");
      expect(pack.administrative.supervisoryAuthority.kind).toBe("unknown");
      expect(pack.guard.commandsMilitia.kind).toBe("unknown");
      expect(pack.removal.mode.kind).toBe("unknown");
      expect(pack.specialSession.executiveMayConvene.kind).toBe("unknown");
      expect(pack.specialSession.agendaLimitedToCall.kind).toBe("unknown");
      expect(pack.reorganization.executiveMayReorganize.kind).toBe("unknown");
    }
  });

  it("never reads silence as not-applicable", () => {
    // Nothing in this corpus establishes that an executive concept does not
    // exist at all, so no value may claim it. Silence is unknown.
    const notApplicable = ALL_RULES.filter(
      (entry) => entry.rule.kind === "not-applicable",
    );
    expect(notApplicable.map((entry) => `${entry.packId}:${entry.path}`)).toEqual(
      [],
    );
  });
});

// ---------------------------------------------------------------------------
// (2) An unknown carries no invented value.
// ---------------------------------------------------------------------------

describe("executive-authority: unknown carries no value", () => {
  it("stores no value, source, date or default on any unknown rule", () => {
    const leaked: string[] = [];
    for (const entry of ALL_RULES) {
      if (entry.rule.kind === "known") {
        continue;
      }
      const keys = Object.keys(entry.rule).sort();
      if (keys.join(",") !== "kind,note") {
        leaked.push(`${entry.packId}:${entry.path} -> ${keys.join(",")}`);
      }
      // A note must explain the gap, not smuggle a number or a date into prose
      // that a reader could mistake for a resolved value.
      if (/^\s*(0|null|none|n\/a)\s*$/i.test(entry.rule.note)) {
        leaked.push(`${entry.packId}:${entry.path} -> placeholder note`);
      }
    }
    expect(leaked).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// (3) No generic or template citation supports any known value.
// ---------------------------------------------------------------------------

describe("executive-authority: every known value is pinpointed", () => {
  it("rejects generic citation shapes at the contract seam", () => {
    expect(isGenericCitation("Ky. Const. Sec. 91")).toBe(false);
    expect(isGenericCitation("U.S. Const. Art. II, Sec. 2, cl. 1")).toBe(false);
    expect(isGenericCitation("Kentucky Const. executive article")).toBe(true);
    expect(isGenericCitation("Illinois Const. veto section")).toBe(true);
    expect(isGenericCitation("Alaska Const. executive succession clause")).toBe(
      true,
    );
    // Naming an instrument and a year is not naming a provision.
    expect(isGenericCitation("Alaska Const. (1970 amendment)")).toBe(true);
    expect(isGenericCitation("The Constitution of the State of Illinois")).toBe(
      true,
    );
    expect(isGenericCitation("   ")).toBe(true);
    // Real statutory pinpoints in this corpus must keep passing.
    expect(isGenericCitation("KRS 117.015(2)")).toBe(false);
    expect(isGenericCitation("10 ILCS 5/1A-1")).toBe(false);
    expect(isGenericCitation("Minn. Stat. ch. 10A")).toBe(false);
  });

  it("carries a pinpoint provision on every known value in every pack", () => {
    const offenders: string[] = [];
    for (const entry of ALL_RULES) {
      if (entry.rule.kind !== "known") {
        continue;
      }
      const src: RuleSourceRef = entry.rule.source;
      if (isGenericCitation(src.citation)) {
        offenders.push(`${entry.packId}:${entry.path} -> '${src.citation}'`);
      }
      if (src.sourceTitle.trim().length === 0) {
        offenders.push(`${entry.packId}:${entry.path} -> no source title`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("refuses a pack whose known value rests on a generic citation", () => {
    const broken: ExecutiveAuthorityRulePack = {
      ...KENTUCKY_EXECUTIVE_PACK,
      office: {
        ...KENTUCKY_EXECUTIVE_PACK.office,
        branchStructure: {
          kind: "known",
          value: "plural",
          source: {
            ...KENTUCKY_EXECUTIVE_PACK.office.source,
            citation: "Kentucky Const. executive article",
          },
        },
      },
    };
    expect(() => assertExecutiveAuthorityPackIntegrity(broken)).toThrow(
      /no pinpoint provision/,
    );
  });

  it("never uses a retrieval date as an effective date, and invents no dates", () => {
    // The only date any source carries is the date its text was retrieved, and
    // it is stored as retrievedAt. Nothing here claims an effective date.
    for (const entry of ALL_RULES) {
      if (entry.rule.kind !== "known") {
        continue;
      }
      expect(Object.keys(entry.rule.source)).not.toContain("effectiveDate");
    }
  });
});

// ---------------------------------------------------------------------------
// (4) and (5) Presentment references name packs that actually exist.
// ---------------------------------------------------------------------------

describe("executive-authority: presentment references are real packs", () => {
  it("resolves every known presentment reference in the live registry", () => {
    let checked = 0;
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      const ref = pack.presentment.legislativeRulePackId;
      if (ref.kind !== "known") {
        continue;
      }
      const legislativePack = rulePackById(ref.value);
      expect(legislativePack.packId).toBe(ref.value);
      // And it must be the same jurisdiction, not merely a pack that exists.
      expect(legislativePack.jurisdictionKey).toBe(pack.jurisdictionKey);
      checked += 1;
    }
    // Kentucky, Nebraska and Alaska are the three that have a compiled pack.
    expect(checked).toBe(3);
  });

  it("makes a synthetic federal presentment id impossible to construct", () => {
    // The reference is built by resolving the live registry, so a remembered or
    // invented identifier cannot be turned into a reference at all.
    expect(
      US_FEDERAL_EXECUTIVE_PACK.presentment.legislativeRulePackId.kind,
    ).toBe("unknown");
    expect(() => rulePackById("US_CONGRESS_PRESENTMENT_ARTICLE_I")).toThrow(
      /No legislative rule pack is registered/,
    );
    // No pack anywhere names a federal presentment pack, synthetic or otherwise.
    const refs = EXECUTIVE_AUTHORITY_RULE_PACKS.map((pack) =>
      knownValueOrNull(pack.presentment.legislativeRulePackId),
    ).filter((value): value is string => value !== null);
    expect(refs).toEqual([
      "us-ky-general-assembly-v1",
      "us-ne-legislature-v1",
      "us-ak-legislature-v1",
    ]);
  });

  it("fails closed where no legislative pack has been compiled", () => {
    for (const pack of [
      US_FEDERAL_EXECUTIVE_PACK,
      MINNESOTA_EXECUTIVE_PACK,
      ILLINOIS_EXECUTIVE_PACK,
    ]) {
      expect(pack.presentment.legislativeRulePackId.kind).toBe("unknown");
    }
    expect(() =>
      resolvePresentmentAuthority(MINNESOTA_EXECUTIVE_PACK, KENTUCKY_RULE_PACK),
    ).toThrow(/does not reference a legislative pack/);
  });
});

// ---------------------------------------------------------------------------
// (10) Presentment composition returns the legislature's own object.
// ---------------------------------------------------------------------------

describe("executive-authority: presentment composition, not duplication", () => {
  it("returns the referenced pack's own executive rule, not a copy", () => {
    const kyLegis = rulePackById("us-ky-general-assembly-v1");
    const resolved = resolvePresentmentAuthority(
      KENTUCKY_EXECUTIVE_PACK,
      kyLegis,
    );
    expect(resolved).toBe(KENTUCKY_RULE_PACK.executive);
    expect(knownValueOrNull(resolved.lineItemVeto)).toBe(true);
    expect(resolved.override.kind).toBe("each-chamber");

    const neResolved = resolvePresentmentAuthority(
      NEBRASKA_EXECUTIVE_PACK,
      NEBRASKA_RULE_PACK,
    );
    expect(neResolved).toBe(NEBRASKA_RULE_PACK.executive);
    expect(neResolved.override.kind).toBe("each-chamber");
    if (neResolved.override.kind === "each-chamber") {
      expect(neResolved.override.threshold.numerator).toBe(3);
      expect(neResolved.override.threshold.denominatorParts).toBe(5);
    }

    const akResolved = resolvePresentmentAuthority(
      ALASKA_EXECUTIVE_PACK,
      ALASKA_RULE_PACK,
    );
    expect(akResolved).toBe(ALASKA_RULE_PACK.executive);
    expect(akResolved.override.kind).toBe("joint-session");
  });

  it("stores no copy of presentment or veto in any executive pack", () => {
    const forbidden = [
      "presentmentRequired",
      "actionWindowDaysInSession",
      "actionWindowDaysAfterAdjournment",
      "inactionOutcomeInSession",
      "lineItemVeto",
      "override",
    ];
    for (const entry of ALL_RULES) {
      for (const field of forbidden) {
        expect(entry.path.split(".")).not.toContain(field);
      }
    }
  });

  it("rejects a legislative pack that is not the one referenced", () => {
    expect(() =>
      resolvePresentmentAuthority(KENTUCKY_EXECUTIVE_PACK, NEBRASKA_RULE_PACK),
    ).toThrow(/references legislative pack/);
  });
});

// ---------------------------------------------------------------------------
// (6) (7) (8) Rejected national-matrix values are not carried.
// ---------------------------------------------------------------------------

describe("executive-authority: rejected national-matrix values are absent", () => {
  it("does not collapse Nebraska's clemency into a board-required model", () => {
    // Nebraska's clemency was not read at exact operative precision here, so it
    // is unknown. What it must never be is 'board-required': that is a
    // different institution from a board that holds the power itself, and the
    // rejected matrix conflated the two.
    expect(NEBRASKA_EXECUTIVE_PACK.clemency.model.kind).toBe("unknown");
    expect(knownValueOrNull(NEBRASKA_EXECUTIVE_PACK.clemency.model)).not.toBe(
      "board-required",
    );
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      expect(knownValueOrNull(pack.clemency.model)).not.toBe("board-required");
    }
  });

  it("keeps board-exclusive and board-required as distinct modelled families", () => {
    // The contract must be able to say a board holds the power itself, so that
    // a later verified Nebraska encoding is not forced into the wrong enum.
    const boardExclusive: ExecutiveAuthorityRulePack = {
      ...NEBRASKA_EXECUTIVE_PACK,
      clemency: {
        ...NEBRASKA_EXECUTIVE_PACK.clemency,
        model: {
          kind: "known",
          value: "board-exclusive",
          source: NEBRASKA_EXECUTIVE_PACK.office.source,
        },
      },
    };
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(boardExclusive),
    ).not.toThrow();
  });

  it("retains no three-fifths confirmation semantics for Illinois", () => {
    expect(
      ILLINOIS_EXECUTIVE_PACK.appointment.legislativeConfirmationRequired.kind,
    ).toBe("unknown");
    expect(ILLINOIS_EXECUTIVE_PACK.appointment.confirmingBody.kind).toBe(
      "unknown",
    );
    // No value or note anywhere in the Illinois pack asserts a supermajority
    // confirmation rule.
    const serialized = JSON.stringify(ILLINOIS_EXECUTIVE_PACK);
    expect(serialized).not.toMatch(/three[- ]fifths\s+(vote|majority|of the)/i);
    expect(serialized).not.toMatch(/\b3\/5\b/);
  });

  it("carries no Minnesota clemency mapping at all", () => {
    expect(MINNESOTA_EXECUTIVE_PACK.clemency.model.kind).toBe("unknown");
    expect(MINNESOTA_EXECUTIVE_PACK.clemency.scope.kind).toBe("unknown");
    // The old mapping's source is not cited anywhere in the pack.
    for (const src of MINNESOTA_EXECUTIVE_PACK.sources) {
      expect(src.citation).not.toMatch(/pardon/i);
    }
  });

  it("cites no rejected national-matrix pack identifier anywhere", () => {
    const serialized = JSON.stringify(EXECUTIVE_AUTHORITY_RULE_PACKS);
    expect(serialized).not.toMatch(/US_CONGRESS_PRESENTMENT_ARTICLE_I/);
    expect(serialized).not.toMatch(/\b92K\b/);
  });
});

// ---------------------------------------------------------------------------
// (9) A jointly elected Lieutenant Governor is not an independent officer.
// ---------------------------------------------------------------------------

describe("executive-authority: plural-executive membership", () => {
  it("lists no Lieutenant Governor as an independently elected officer", () => {
    // Every Lieutenant Governor in this six-jurisdiction subset runs jointly
    // with the chief executive. Listing one as independently elected would make
    // a running mate into a rival officer and would contradict the accepted
    // definition of a plural executive.
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      for (const officer of pack.pluralExecutive) {
        expect(`${pack.packId}:${officer.officeLabel}`).not.toMatch(
          /Lieutenant Governor/i,
        );
      }
    }
  });

  it("separates a unitary executive from a plural one, from sourced facts", () => {
    expect(isPluralExecutive(US_FEDERAL_EXECUTIVE_PACK)).toBe(false);
    expect(isPluralExecutive(ALASKA_EXECUTIVE_PACK)).toBe(false);
    expect(US_FEDERAL_EXECUTIVE_PACK.pluralExecutive).toHaveLength(0);
    expect(ALASKA_EXECUTIVE_PACK.pluralExecutive).toHaveLength(0);

    for (const pack of [
      KENTUCKY_EXECUTIVE_PACK,
      NEBRASKA_EXECUTIVE_PACK,
      MINNESOTA_EXECUTIVE_PACK,
      ILLINOIS_EXECUTIVE_PACK,
    ]) {
      expect(isPluralExecutive(pack)).toBe(true);
      expect(pack.pluralExecutive.length).toBeGreaterThan(0);
      for (const officer of pack.pluralExecutive) {
        expect(knownValueOrNull(officer.independentlyElected)).toBe(true);
      }
    }

    const kyOffices = KENTUCKY_EXECUTIVE_PACK.pluralExecutive.map(
      (officer) => officer.officeLabel,
    );
    const ilOffices = ILLINOIS_EXECUTIVE_PACK.pluralExecutive.map(
      (officer) => officer.officeLabel,
    );
    expect(kyOffices).toContain("Commissioner of Agriculture");
    expect(ilOffices).not.toContain("Commissioner of Agriculture");
    expect(ilOffices).toContain("Comptroller");
    expect(kyOffices).not.toContain("Comptroller");
  });
});

// ---------------------------------------------------------------------------
// (11) No score, ideology or probability field was introduced.
// ---------------------------------------------------------------------------

describe("executive-authority: a rule contract, not a rating engine", () => {
  it("introduces no score, ideology, probability or trait field", () => {
    const forbidden =
      /(score|ideolog|probabilit|likelihood|deterrence|legalrisk|confirmabil|competence|loyalty|morale|rating|strength|weight)/i;
    const offenders: string[] = [];
    const visit = (node: unknown, path: string): void => {
      if (Array.isArray(node)) {
        node.forEach((entry, index) => visit(entry, `${path}[${index}]`));
        return;
      }
      if (typeof node === "object" && node !== null) {
        for (const [key, value] of Object.entries(node)) {
          if (forbidden.test(key)) {
            offenders.push(`${path}.${key}`);
          }
          visit(value, path.length === 0 ? key : `${path}.${key}`);
        }
      }
    };
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      visit(pack, pack.packId);
    }
    expect(offenders).toEqual([]);
  });

  it("holds no bare number outside the one field that is a count of days", () => {
    // The contract has exactly one numeric rule — emergency-declaration
    // duration — and it is unknown everywhere in this subset. Nothing else in a
    // pack is a number, which is what keeps it from becoming a rating engine.
    for (const entry of ALL_RULES) {
      if (entry.rule.kind !== "known") {
        continue;
      }
      if (typeof entry.rule.value === "number") {
        expect(entry.path).toBe("emergencyDeclaration.initialDurationDays");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// What the verified record does establish.
// ---------------------------------------------------------------------------

describe("executive-authority: what the verified record establishes", () => {
  it("encodes the federal Article II clauses at their operative precision", () => {
    expect(
      knownValueOrNull(US_FEDERAL_EXECUTIVE_PACK.office.branchStructure),
    ).toBe("unitary");
    expect(
      knownValueOrNull(US_FEDERAL_EXECUTIVE_PACK.appointment.executiveAppoints),
    ).toBe(true);
    expect(
      knownValueOrNull(US_FEDERAL_EXECUTIVE_PACK.appointment.confirmingBody),
    ).toBe("the Senate");
    expect(
      knownValueOrNull(
        US_FEDERAL_EXECUTIVE_PACK.specialSession.executiveMayConvene,
      ),
    ).toBe(true);
    expect(knownValueOrNull(US_FEDERAL_EXECUTIVE_PACK.clemency.model)).toBe(
      "executive-sole",
    );
    expect(
      knownValueOrNull(
        US_FEDERAL_EXECUTIVE_PACK.administrative.faithfulExecutionDuty,
      ),
    ).toBe(true);
    expect(
      knownValueOrNull(US_FEDERAL_EXECUTIVE_PACK.guard.commandsMilitia),
    ).toBe(true);
    // The militia command is bounded by the clause's own words, not widened.
    expect(knownValueOrNull(US_FEDERAL_EXECUTIVE_PACK.guard.scope)).toMatch(
      /actual Service of the United States/,
    );
  });

  it("marks the federal sources as retrieved, pinpointed and verified", () => {
    for (const src of US_FEDERAL_EXECUTIVE_PACK.sources) {
      expect(src.verification).toBe("verified");
      expect(src.sourceUrl).toMatch(/^https:\/\//);
      expect(src.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(src.citation).toMatch(/^U\.S\. Const\. Art\. II/);
      expect(src.note ?? "").toMatch(/^Operative text: /);
    }
  });

  it("keeps Alaska's confirmation regime, the one state fact read exactly", () => {
    expect(
      knownValueOrNull(
        ALASKA_EXECUTIVE_PACK.appointment.legislativeConfirmationRequired,
      ),
    ).toBe(true);
    expect(
      knownValueOrNull(ALASKA_EXECUTIVE_PACK.appointment.confirmingBody),
    ).toMatch(/joint session/);
    // No other state pack claims a general appointment or confirmation rule.
    for (const pack of [
      KENTUCKY_EXECUTIVE_PACK,
      NEBRASKA_EXECUTIVE_PACK,
      MINNESOTA_EXECUTIVE_PACK,
      ILLINOIS_EXECUTIVE_PACK,
    ]) {
      expect(pack.appointment.executiveAppoints.kind).toBe("unknown");
      expect(pack.appointment.legislativeConfirmationRequired.kind).toBe(
        "unknown",
      );
      expect(pack.appointment.confirmingBody.kind).toBe("unknown");
    }
  });

  it("names Wisconsin as an unresearched gap rather than fabricating a pack", () => {
    expect(executiveRulePackForJurisdiction("US-WI")).toBeNull();
    const wisconsin = UNRESEARCHED_JURISDICTIONS.find(
      (entry) => entry.jurisdictionKey === "US-WI",
    );
    expect(wisconsin).toBeDefined();
    expect(wisconsin?.reason).toMatch(/no.*research/i);
  });

  it("still resolves branch structure for every jurisdiction in the subset", () => {
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      expect(isKnown(pack.office.branchStructure)).toBe(true);
    }
  });
});
