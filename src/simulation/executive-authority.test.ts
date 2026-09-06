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
  ILLINOIS_RULE_PACK,
  KENTUCKY_RULE_PACK,
  MINNESOTA_RULE_PACK,
  NEBRASKA_RULE_PACK,
  rulePackById,
} from "./legislature-rule-packs";
import {
  isKnown,
  knownValueOrNull,
  notApplicableRule,
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

function looksLikeRuleValue(
  candidate: unknown,
): candidate is RuleValue<unknown> {
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
        "appointment.executiveAppoints",
        "appointment.legislativeConfirmationRequired",
        "appointment.confirmingBody",
        "clemency.model",
        "clemency.scope",
      ],
    ],
  ];

  it.each(HELD_UNKNOWN)(
    "holds %o unsupported fields at unknown",
    (pack, paths) => {
      for (const path of paths) {
        const rule = ruleAt(pack, path);
        expect(`${pack.packId}:${path}:${rule.kind}`).toBe(
          `${pack.packId}:${path}:unknown`,
        );
        // An unknown must say what is unresolved, not merely be empty.
        expect(noteOf(rule).trim().length).toBeGreaterThan(0);
      }
    },
  );

  it("keeps the nine unresearched dimensions unknown in every state pack", () => {
    for (const pack of STATE_PACKS) {
      expect(pack.executiveDirective.hasDirectiveAuthority.kind).toBe(
        "unknown",
      );
      expect(pack.executiveDirective.authorityBasis.kind).toBe("unknown");
      expect(pack.emergencyDeclaration.executiveMayDeclare.kind).toBe(
        "unknown",
      );
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
    expect(
      notApplicable.map((entry) => `${entry.packId}:${entry.path}`),
    ).toEqual([]);
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
    // Kentucky, Nebraska, Alaska, Minnesota and Illinois all have a compiled
    // legislative pack on main; the federal pack does not.
    expect(checked).toBe(5);
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
      "us-mn-legislature-v1",
      "us-il-general-assembly-v1",
    ]);
  });

  it("fails closed where no legislative pack has been compiled", () => {
    // Federal is now the only unresolved reference: Art. I, Sec. 7 presentment
    // still has no compiled pack, and nothing here invents one.
    expect(
      US_FEDERAL_EXECUTIVE_PACK.presentment.legislativeRulePackId.kind,
    ).toBe("unknown");
    expect(
      EXECUTIVE_AUTHORITY_RULE_PACKS.filter(
        (pack) => pack.presentment.legislativeRulePackId.kind !== "known",
      ).map((pack) => pack.packId),
    ).toEqual(["us-federal-executive-v1"]);
    expect(() =>
      resolvePresentmentAuthority(
        US_FEDERAL_EXECUTIVE_PACK,
        KENTUCKY_RULE_PACK,
      ),
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
// Post-#102 reconciliation: Minnesota and Illinois presentment now composes
// against the legislative packs that PR #102 compiled onto main. These tests
// prove the reference is a composition of the live artifact and not a second
// copy of anyone's veto, and that nothing else moved.
// ---------------------------------------------------------------------------

describe("executive-authority: Minnesota and Illinois presentment after #102", () => {
  it("resolves Minnesota to the live accepted MN legislative pack", () => {
    const ref = MINNESOTA_EXECUTIVE_PACK.presentment.legislativeRulePackId;
    expect(ref.kind).toBe("known");
    expect(knownValueOrNull(ref)).toBe("us-mn-legislature-v1");

    const mnLegis = rulePackById("us-mn-legislature-v1");
    expect(mnLegis).toBe(MINNESOTA_RULE_PACK);
    expect(mnLegis.jurisdictionKey).toBe(
      MINNESOTA_EXECUTIVE_PACK.jurisdictionKey,
    );

    // Composition, not duplication: the very same ExecutiveRule object.
    const resolved = resolvePresentmentAuthority(
      MINNESOTA_EXECUTIVE_PACK,
      mnLegis,
    );
    expect(resolved).toBe(MINNESOTA_RULE_PACK.executive);
    expect(resolved.override.kind).toBe("each-chamber");
  });

  it("resolves Illinois to the live accepted IL legislative pack", () => {
    const ref = ILLINOIS_EXECUTIVE_PACK.presentment.legislativeRulePackId;
    expect(ref.kind).toBe("known");
    expect(knownValueOrNull(ref)).toBe("us-il-general-assembly-v1");

    const ilLegis = rulePackById("us-il-general-assembly-v1");
    expect(ilLegis).toBe(ILLINOIS_RULE_PACK);
    expect(ilLegis.jurisdictionKey).toBe(
      ILLINOIS_EXECUTIVE_PACK.jurisdictionKey,
    );

    const resolved = resolvePresentmentAuthority(
      ILLINOIS_EXECUTIVE_PACK,
      ilLegis,
    );
    expect(resolved).toBe(ILLINOIS_RULE_PACK.executive);
    expect(resolved.override.kind).toBe("each-chamber");
  });

  it("leaves Kentucky, Nebraska and Alaska resolving exactly as before", () => {
    const before: readonly [ExecutiveAuthorityRulePack, string][] = [
      [KENTUCKY_EXECUTIVE_PACK, "us-ky-general-assembly-v1"],
      [NEBRASKA_EXECUTIVE_PACK, "us-ne-legislature-v1"],
      [ALASKA_EXECUTIVE_PACK, "us-ak-legislature-v1"],
    ];
    for (const [execPack, packId] of before) {
      expect(knownValueOrNull(execPack.presentment.legislativeRulePackId)).toBe(
        packId,
      );
      const legisPack = rulePackById(packId);
      expect(resolvePresentmentAuthority(execPack, legisPack)).toBe(
        legisPack.executive,
      );
    }
  });

  it("keeps federal presentment unknown with no synthetic pack id", () => {
    const ref = US_FEDERAL_EXECUTIVE_PACK.presentment.legislativeRulePackId;
    expect(ref.kind).toBe("unknown");
    expect(knownValueOrNull(ref)).toBeNull();
    // No compiled federal legislative pack exists to reference.
    for (const id of [
      "us-federal-congress-v1",
      "us-congress-v1",
      "us-us-congress-v1",
    ]) {
      expect(() => rulePackById(id)).toThrow(
        /No legislative rule pack is registered/,
      );
    }
  });

  it("cannot author a presentment reference to a pack that does not exist", () => {
    // presentmentRef resolves the live registry, so an id nobody compiled
    // throws at construction rather than shipping as data.
    for (const synthetic of [
      "us-mn-legislature-v2",
      "US_MN_PRESENTMENT",
      "us-il-general-assembly",
    ]) {
      expect(() => rulePackById(synthetic)).toThrow(
        /No legislative rule pack is registered/,
      );
    }
    // Every reference actually shipped names a pack in the live registry.
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      const value = knownValueOrNull(pack.presentment.legislativeRulePackId);
      if (value === null) {
        continue;
      }
      expect(rulePackById(value).packId).toBe(value);
    }
  });

  it("promotes no executive field other than MN and IL presentment", () => {
    // The reconciliation is bounded: presentment for two states, nothing else.
    // Every other value that was unknown before #102 merged is unknown still.
    const knownPaths = ALL_RULES.filter((entry) => isKnown(entry.rule)).map(
      (entry) => `${entry.packId}:${entry.path}`,
    );
    expect(knownPaths).toContain(
      "us-mn-governor-v1:presentment.legislativeRulePackId",
    );
    expect(knownPaths).toContain(
      "us-il-governor-v1:presentment.legislativeRulePackId",
    );

    // The nine research dimensions 92A did not resolve stay unknown in all
    // five state packs; this reconciliation was not a source-research pass.
    const stillUnknown = [
      "removal.mode",
      "specialSession.executiveMayConvene",
      "directive.executiveOrderAuthority",
      "reorganization.executiveMayReorganize",
      "emergency.executiveMayDeclare",
      "clemency.model",
      "budget.executiveMustSubmit",
      "administration.faithfulExecutionDuty",
      "militia.executiveCommands",
    ];
    for (const pack of STATE_PACKS) {
      for (const path of stillUnknown) {
        expect(knownPaths).not.toContain(`${pack.packId}:${path}`);
      }
    }

    // The only presentment references that are known are the five compiled
    // states — no sixth appeared, and federal did not move.
    expect(
      knownPaths.filter((entry) =>
        entry.endsWith(":presentment.legislativeRulePackId"),
      ),
    ).toEqual([
      "us-ky-governor-v1:presentment.legislativeRulePackId",
      "us-ne-governor-v1:presentment.legislativeRulePackId",
      "us-ak-governor-v1:presentment.legislativeRulePackId",
      "us-mn-governor-v1:presentment.legislativeRulePackId",
      "us-il-governor-v1:presentment.legislativeRulePackId",
    ]);
  });

  it("brings no generic or template citation into the six packs", () => {
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      expect(() => assertExecutiveAuthorityPackIntegrity(pack)).not.toThrow();
      for (const src of pack.sources) {
        expect(isGenericCitation(src.citation)).toBe(false);
      }
    }
    // And the two newly referenced packs carry the legislature's own evidence.
    for (const [execPack, legisPack] of [
      [MINNESOTA_EXECUTIVE_PACK, MINNESOTA_RULE_PACK],
      [ILLINOIS_EXECUTIVE_PACK, ILLINOIS_RULE_PACK],
    ] as const) {
      const ref = execPack.presentment.legislativeRulePackId;
      expect(ref.kind).toBe("known");
      if (ref.kind === "known") {
        expect(ref.source).toBe(legisPack.executive.source);
      }
    }
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
    // No value or note the Illinois EXECUTIVE pack authors asserts a
    // supermajority confirmation rule.
    //
    // The scan deliberately excludes the presentment reference. Since #102 that
    // reference carries the Illinois legislative pack's own source, whose note
    // states the real Ill. Const. art. IV, Sec. 9 veto-override threshold —
    // three-fifths of the members elected. That is an override threshold this
    // pack composes from accepted main, not a confirmation rule this pack
    // asserts, and it is exactly the evidence composition is supposed to carry.
    const serialized = JSON.stringify(ILLINOIS_EXECUTIVE_PACK, (key, value) =>
      key === "presentment" ? undefined : value,
    );
    expect(serialized).not.toMatch(/three[- ]fifths\s+(vote|majority|of the)/i);
    expect(serialized).not.toMatch(/\b3\/5\b/);

    // And the three-fifths text that IS reachable is the override note, reached
    // through the legislative pack rather than restated here.
    const ref = ILLINOIS_EXECUTIVE_PACK.presentment.legislativeRulePackId;
    expect(ref.kind).toBe("known");
    if (ref.kind === "known") {
      expect(ref.source).toBe(ILLINOIS_RULE_PACK.executive.source);
      expect(ref.source?.citation).toMatch(/art\. IV/i);
      expect(ref.source?.note ?? "").toMatch(/three-fifths of the members/i);
    }
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

// ---------------------------------------------------------------------------
// R2 blocker 1 — RuleValue runtime integrity fails closed.
//
// The contract is tested through its public seam, `assertExecutiveAuthority-
// PackIntegrity`: one malformed rule value is injected into an otherwise valid
// pack and the seam must refuse it. `removal.mode` carries no cross-field logic,
// so a failure injected there is the RuleValue check firing and nothing else.
// ---------------------------------------------------------------------------

describe("executive-authority R2: RuleValue runtime integrity fails closed", () => {
  const pinpointed: RuleSourceRef = KENTUCKY_EXECUTIVE_PACK.office.source;

  function withRemovalMode(mode: unknown): ExecutiveAuthorityRulePack {
    return {
      ...KENTUCKY_EXECUTIVE_PACK,
      removal: {
        ...KENTUCKY_EXECUTIVE_PACK.removal,
        mode: mode as typeof KENTUCKY_EXECUTIVE_PACK.removal.mode,
      },
    };
  }

  it("rejects an unknown that smuggles a resolved value", () => {
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode({
          kind: "unknown",
          note: "not researched",
          value: "at-pleasure",
        }),
      ),
    ).toThrow(/only an explanatory note/);
  });

  it("rejects a not-applicable asserted from silence, with no authority", () => {
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode(
          notApplicableRule("removal simply does not apply to this office"),
        ),
      ),
    ).toThrow(/does not accept/);
  });

  it("rejects a malformed known value missing its source", () => {
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode({ kind: "known", value: "at-pleasure" }),
      ),
    ).toThrow(/malformed known value/);
  });

  it("rejects a mixed shape carrying both a value and a note", () => {
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode({
          kind: "known",
          value: "at-pleasure",
          note: "and also unknown",
          source: pinpointed,
        }),
      ),
    ).toThrow(/malformed known value/);
  });

  it("rejects a known value outside the field's closed enum domain", () => {
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode({
          kind: "known",
          value: "whenever-it-likes",
          source: pinpointed,
        }),
      ),
    ).toThrow(/closed domain/);
  });

  it("rejects an invalid branch-structure enum at runtime, not only in the type", () => {
    const broken: ExecutiveAuthorityRulePack = {
      ...KENTUCKY_EXECUTIVE_PACK,
      office: {
        ...KENTUCKY_EXECUTIVE_PACK.office,
        branchStructure: {
          kind: "known",
          value: "monarchy",
          source: pinpointed,
        } as unknown as typeof KENTUCKY_EXECUTIVE_PACK.office.branchStructure,
      },
    };
    expect(() => assertExecutiveAuthorityPackIntegrity(broken)).toThrow(
      /closed domain/,
    );
  });

  it("rejects a known clemency model outside its domain", () => {
    const broken: ExecutiveAuthorityRulePack = {
      ...US_FEDERAL_EXECUTIVE_PACK,
      clemency: {
        ...US_FEDERAL_EXECUTIVE_PACK.clemency,
        model: {
          kind: "known",
          value: "king-decides",
          source: US_FEDERAL_EXECUTIVE_PACK.clemency.source,
        } as unknown as typeof US_FEDERAL_EXECUTIVE_PACK.clemency.model,
      },
    };
    expect(() => assertExecutiveAuthorityPackIntegrity(broken)).toThrow(
      /closed domain/,
    );
  });

  it("rejects a known string value that is empty", () => {
    const broken: ExecutiveAuthorityRulePack = {
      ...ALASKA_EXECUTIVE_PACK,
      appointment: {
        ...ALASKA_EXECUTIVE_PACK.appointment,
        confirmingBody: {
          kind: "known",
          value: "",
          source: ALASKA_EXECUTIVE_PACK.appointment.source,
        } as unknown as typeof ALASKA_EXECUTIVE_PACK.appointment.confirmingBody,
      },
    };
    expect(() => assertExecutiveAuthorityPackIntegrity(broken)).toThrow(
      /empty string/,
    );
  });

  it("still accepts every real pack (valid control)", () => {
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      expect(() => assertExecutiveAuthorityPackIntegrity(pack)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// R2 blocker 2 — a year alone is never a legal pinpoint.
// ---------------------------------------------------------------------------

describe("executive-authority R2: a year alone is never a pinpoint", () => {
  it("rejects a generic title carrying only a year", () => {
    for (const citation of [
      "US CONSTITUTION 1787",
      "U.S. Constitution, 1787",
      "Illinois Constitution 1970",
      "Alaska Const. 1959",
      "Constitution of the State of Nebraska (1875)",
    ]) {
      expect(`${citation} => ${isGenericCitation(citation)}`).toBe(
        `${citation} => true`,
      );
    }
  });

  it("accepts a genuine locator, including a four-digit section after a sign", () => {
    for (const citation of [
      "U.S. Const. Art. II, Sec. 3",
      "Ky. Const. Sec. 88",
      "KRS 117.015(2)",
      "10 ILCS 5/1A-1",
      "Minn. Stat. ch. 10A",
      "42 U.S.C. § 1983",
      "House Rule 39",
    ]) {
      expect(`${citation} => ${isGenericCitation(citation)}`).toBe(
        `${citation} => false`,
      );
    }
  });

  it("refuses a pack whose known value rests on a year-only citation", () => {
    const broken: ExecutiveAuthorityRulePack = {
      ...KENTUCKY_EXECUTIVE_PACK,
      office: {
        ...KENTUCKY_EXECUTIVE_PACK.office,
        branchStructure: {
          kind: "known",
          value: "plural",
          source: {
            ...KENTUCKY_EXECUTIVE_PACK.office.source,
            citation: "Kentucky Constitution 1891",
          },
        },
      },
    };
    expect(() => assertExecutiveAuthorityPackIntegrity(broken)).toThrow(
      /no pinpoint provision/,
    );
  });
});

// ---------------------------------------------------------------------------
// R2 blocker 3 — presentment resolves only against the live registry, never a
// caller-supplied authority object.
// ---------------------------------------------------------------------------

describe("executive-authority R2: presentment resolves only against the live registry", () => {
  it("rejects a fabricated legislative pack whose id merely looks right", () => {
    const fabricated = {
      ...KENTUCKY_RULE_PACK,
      executive: { ...KENTUCKY_RULE_PACK.executive, titleLabel: "FABRICATED" },
    };
    expect(() =>
      resolvePresentmentAuthority(KENTUCKY_EXECUTIVE_PACK, fabricated),
    ).toThrow(/must resolve to the live registered/);
  });

  it("rejects a synthetic, unregistered legislative pack id at resolution", () => {
    const syntheticRef: ExecutiveAuthorityRulePack = {
      ...KENTUCKY_EXECUTIVE_PACK,
      presentment: {
        legislativeRulePackId: {
          kind: "known",
          value: "us-zz-nowhere-v1",
          source: KENTUCKY_EXECUTIVE_PACK.office.source,
        } as unknown as typeof KENTUCKY_EXECUTIVE_PACK.presentment.legislativeRulePackId,
      },
    };
    expect(() =>
      resolvePresentmentAuthority(syntheticRef, KENTUCKY_RULE_PACK),
    ).toThrow(/No legislative rule pack is registered/);
  });

  it("rejects a jurisdiction mismatch even when the id resolves", () => {
    const wrongJurisdiction: ExecutiveAuthorityRulePack = {
      ...KENTUCKY_EXECUTIVE_PACK,
      jurisdictionKey: "US-ZZ",
    };
    const kyLegis = rulePackById("us-ky-general-assembly-v1");
    expect(() =>
      resolvePresentmentAuthority(wrongJurisdiction, kyLegis),
    ).toThrow(/different jurisdictions/);
  });

  it("still returns the registered pack's own executive rule for a real pair", () => {
    const kyLegis = rulePackById("us-ky-general-assembly-v1");
    expect(resolvePresentmentAuthority(KENTUCKY_EXECUTIVE_PACK, kyLegis)).toBe(
      KENTUCKY_RULE_PACK.executive,
    );
  });
});

// ---------------------------------------------------------------------------
// R2B blocker — a not-applicable can no longer be manufactured out of silence.
//
// The prior repair let `not-applicable` through on nothing more than a note
// that *looked* like a citation. That is syntactic decoration, not evidence: a
// free-text note carries no source object, no verification status, and no way
// for a reader to tell an established inapplicability from an absence of
// research. Silence is `unknown`. Until this subsystem has a source-bearing
// representation for an affirmative "the concept does not exist here", the
// executive-authority seam admits only `known` and `unknown`.
// ---------------------------------------------------------------------------

describe("executive-authority R2B: not-applicable cannot be manufactured from silence", () => {
  function withRemovalMode(mode: unknown): ExecutiveAuthorityRulePack {
    return {
      ...KENTUCKY_EXECUTIVE_PACK,
      removal: {
        ...KENTUCKY_EXECUTIVE_PACK.removal,
        mode: mode as typeof KENTUCKY_EXECUTIVE_PACK.removal.mode,
      },
    };
  }

  const REFUSAL = /not-applicable/;

  it("rejects a note that admits the search failed but decorates it with a citation", () => {
    // Adversarial case 1: the cited provision does not establish inapplicability.
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode(
          notApplicableRule("No authority found; see Art. V § 3"),
        ),
      ),
    ).toThrow(REFUSAL);
  });

  it("rejects a plausible section citation carried in prose with no source object", () => {
    // Adversarial case 2: citation-shaped text, no evidence channel at all.
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode(
          notApplicableRule(
            "Ky. Const. Sec. 69 vests the executive power, so removal is inapplicable.",
          ),
        ),
      ),
    ).toThrow(REFUSAL);
  });

  it("rejects a note that borrows an unrelated valid pinpoint from the same pack", () => {
    // Adversarial case 3: the pinpoint is real, and about something else.
    const borrowed = KENTUCKY_EXECUTIVE_PACK.office.source.citation;
    expect(isGenericCitation(borrowed)).toBe(false);
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode(notApplicableRule(`Not applicable — ${borrowed}.`)),
      ),
    ).toThrow(REFUSAL);
  });

  it("rejects a note that argues silence itself proves nonexistence", () => {
    // Adversarial case 4: the inference this contract exists to forbid.
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode(
          notApplicableRule(
            "Ky. Const. Art. III is silent on removal, which establishes that no such power exists.",
          ),
        ),
      ),
    ).toThrow(REFUSAL);
  });

  it("rejects a malformed not-applicable smuggling hidden value and source fields", () => {
    // Adversarial case 5: a mixed shape that would resolve a value if admitted.
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode({
          kind: "not-applicable",
          note: "Ky. Const. Sec. 69 — inapplicable.",
          value: "at-pleasure",
          source: KENTUCKY_EXECUTIVE_PACK.office.source,
        }),
      ),
    ).toThrow(REFUSAL);
  });

  it("rejects a not-applicable asserted from bare silence, as before", () => {
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode(
          notApplicableRule("removal simply does not apply to this office"),
        ),
      ),
    ).toThrow(REFUSAL);
  });

  it("names unknown as the state such a field must hold instead", () => {
    let message = "";
    try {
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode(notApplicableRule("Art. V § 3 — inapplicable.")),
      );
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/unknown/);
  });

  it("still admits the two states this subsystem does carry (positive control)", () => {
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode({
          kind: "unknown",
          note: "92A did not resolve a removal mode for this office.",
        }),
      ),
    ).not.toThrow();
    expect(() =>
      assertExecutiveAuthorityPackIntegrity(
        withRemovalMode({
          kind: "known",
          value: "at-pleasure",
          source: KENTUCKY_EXECUTIVE_PACK.office.source,
        }),
      ),
    ).not.toThrow();
  });

  it("refuses a not-applicable in every rule-bearing field, not only removal", () => {
    const decorated = notApplicableRule("Art. II, Sec. 3 — inapplicable.");
    const mutations: ReadonlyArray<
      readonly [string, ExecutiveAuthorityRulePack]
    > = [
      [
        "office.branchStructure",
        {
          ...KENTUCKY_EXECUTIVE_PACK,
          office: {
            ...KENTUCKY_EXECUTIVE_PACK.office,
            branchStructure:
              decorated as typeof KENTUCKY_EXECUTIVE_PACK.office.branchStructure,
          },
        },
      ],
      [
        "presentment.legislativeRulePackId",
        {
          ...KENTUCKY_EXECUTIVE_PACK,
          presentment: {
            legislativeRulePackId:
              decorated as typeof KENTUCKY_EXECUTIVE_PACK.presentment.legislativeRulePackId,
          },
        },
      ],
      [
        "clemency.model",
        {
          ...KENTUCKY_EXECUTIVE_PACK,
          clemency: {
            ...KENTUCKY_EXECUTIVE_PACK.clemency,
            model: decorated as typeof KENTUCKY_EXECUTIVE_PACK.clemency.model,
          },
        },
      ],
      [
        "emergencyDeclaration.initialDurationDays",
        {
          ...KENTUCKY_EXECUTIVE_PACK,
          emergencyDeclaration: {
            ...KENTUCKY_EXECUTIVE_PACK.emergencyDeclaration,
            initialDurationDays:
              decorated as typeof KENTUCKY_EXECUTIVE_PACK.emergencyDeclaration.initialDurationDays,
          },
        },
      ],
      [
        "guard.commandsMilitia",
        {
          ...KENTUCKY_EXECUTIVE_PACK,
          guard: {
            ...KENTUCKY_EXECUTIVE_PACK.guard,
            commandsMilitia:
              decorated as typeof KENTUCKY_EXECUTIVE_PACK.guard.commandsMilitia,
          },
        },
      ],
      [
        "pluralExecutive[0].independentlyElected",
        {
          ...KENTUCKY_EXECUTIVE_PACK,
          pluralExecutive: KENTUCKY_EXECUTIVE_PACK.pluralExecutive.map(
            (entry, index) =>
              index === 0
                ? {
                    ...entry,
                    independentlyElected:
                      decorated as typeof entry.independentlyElected,
                  }
                : entry,
          ),
        },
      ],
    ];

    const admitted: string[] = [];
    for (const [path, pack] of mutations) {
      try {
        assertExecutiveAuthorityPackIntegrity(pack);
        admitted.push(path);
      } catch {
        // refused, as required
      }
    }
    expect(admitted).toEqual([]);
  });
});
