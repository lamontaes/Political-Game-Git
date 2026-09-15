/**
 * `node --import tsx scripts/source/nationwide-rule-coverage.ts` — what the
 * compiled law supports, everywhere.
 *
 * One deterministic pass over all 50 states and DC and every general-purpose
 * government in the Census Bureau's 2025 Government Units listing, asking the
 * capability resolver the same questions the game asks: may someone stand for
 * this state's legislative seats, when does a term start, may a council pass an
 * ordinance, what does an appropriation need. The answers are counted, the
 * missing mandatory fields are named, and the loaded municipal records are
 * matched to the catalog so an unmapped record is visible rather than silent.
 *
 * It measures rule admission, not play. Office/contest producers, ordinary
 * initialization and save continuity belong to the NATIONWIDE WORLD/ELECTION
 * producers and are reported as not measured here. A place name in a list is
 * not a playable government, and no row below says otherwise.
 *
 * Both outputs regenerate byte-identically: no wall clock, a fixed evaluation
 * date, and canonical JSON.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { toCanonicalJson } from "../../src/source/core/index";
import { candidacyPacks } from "../../src/simulation/candidacy-packs";
import { makeIsoDate } from "../../src/simulation/dates";
import {
  GOVERNMENT_UNITS_META,
  allGovernmentUnits,
} from "../../src/simulation/government-units";
import { municipalGovernments } from "../../src/simulation/municipal-government";
import {
  municipalGovernmentForUnit,
  resolveCapability,
  RULES_CAPABILITY_VERSION,
  type CapabilityAction,
  type CapabilityResolution,
} from "../../src/simulation/rule-capability-resolver";
import { REPO_ROOT } from "./registry";

export const COVERAGE_EVALUATED_ON = makeIsoDate("2026-01-05");
export const NATIONWIDE_COVERAGE_JSON_PATH =
  "docs/systems/nationwide-rule-coverage.json";
export const NATIONWIDE_COVERAGE_MARKDOWN_PATH =
  "docs/systems/nationwide-rule-coverage.md";

const STATES: readonly string[] = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const NOT_MEASURED =
  "not measured by RULES; owned by the NATIONWIDE WORLD/ELECTION producers";

function missingFields(resolution: CapabilityResolution): string[] {
  return resolution.refusal === null
    ? []
    : resolution.fields
        .filter((field) => field.state === "UNKNOWN")
        .map((field) => field.field)
        .filter((field) => (resolution.refusal ?? "").startsWith(field));
}

interface OfficeRow {
  readonly officeKey: string;
  readonly standForOffice: "admitted" | "refused";
  readonly standForOfficeMissing: readonly string[];
  readonly enterTerm: "admitted" | "refused";
  readonly enterTermMissing: readonly string[];
  readonly seats: unknown;
}

interface LocalActionCounts {
  readonly units: number;
  readonly withCompiledEnactedInstrument: number;
  readonly introduceOrdinanceAdmitted: number;
  readonly passOrdinanceAdmitted: number;
  readonly appropriationVoteRuleAdmitted: number;
  readonly passAppropriationAdmitted: number;
  readonly inheritedDefaultOnly: number;
  readonly identityOnly: number;
}

function emptyCounts(): { -readonly [K in keyof LocalActionCounts]: number } {
  return {
    units: 0,
    withCompiledEnactedInstrument: 0,
    introduceOrdinanceAdmitted: 0,
    passOrdinanceAdmitted: 0,
    appropriationVoteRuleAdmitted: 0,
    passAppropriationAdmitted: 0,
    inheritedDefaultOnly: 0,
    identityOnly: 0,
  };
}

export function buildNationwideRuleCoverage() {
  const onDate = COVERAGE_EVALUATED_ON;
  const packs = candidacyPacks();
  const units = allGovernmentUnits();

  const local = new Map<string, ReturnType<typeof emptyCounts>>();
  const byType = new Map<string, ReturnType<typeof emptyCounts>>();
  const admittedLocalRoutes: {
    unitId: string;
    name: string;
    state: string;
    actions: string[];
  }[] = [];
  const localMissing = new Map<string, number>();

  const resolve = (unitId: string, action: CapabilityAction) =>
    resolveCapability({
      scope: { kind: "local", governmentUnitId: unitId },
      action,
      onDate,
    });

  for (const unit of units) {
    const counts = local.get(unit.stateUsps) ?? emptyCounts();
    local.set(unit.stateUsps, counts);
    const typeCounts = byType.get(unit.unitType) ?? emptyCounts();
    byType.set(unit.unitType, typeCounts);
    const introduce = resolve(unit.id, "introduce-ordinance");
    const pass = resolve(unit.id, "pass-ordinance");
    const appropriation = resolve(unit.id, "pass-appropriation");
    const enacted =
      municipalGovernmentForUnit(unit) !== null &&
      introduce.fields.some(
        (field) =>
          field.state === "ADMITTED" && field.ruleScope === "local-instrument",
      );
    const financeRule = appropriation.fields.find(
      (field) => field.field === "finance.appropriationVote",
    );
    const anyAdmitted = [...introduce.fields, ...appropriation.fields].some(
      (field) => field.state === "ADMITTED",
    );
    const inherited = pass.fields.some(
      (field) => field.inheritedDefault !== undefined,
    );
    for (const target of [counts, typeCounts]) {
      target.units += 1;
      if (enacted) target.withCompiledEnactedInstrument += 1;
      if (introduce.refusal === null) target.introduceOrdinanceAdmitted += 1;
      if (pass.refusal === null) target.passOrdinanceAdmitted += 1;
      if (financeRule?.state === "ADMITTED")
        target.appropriationVoteRuleAdmitted += 1;
      if (appropriation.refusal === null) target.passAppropriationAdmitted += 1;
      if (!enacted && inherited) target.inheritedDefaultOnly += 1;
      if (!anyAdmitted) target.identityOnly += 1;
    }
    for (const field of missingFields(pass)) {
      localMissing.set(field, (localMissing.get(field) ?? 0) + 1);
    }
    const actions = [
      introduce.refusal === null ? "introduce-ordinance" : null,
      pass.refusal === null ? "pass-ordinance" : null,
      appropriation.refusal === null ? "pass-appropriation" : null,
    ].filter((action): action is string => action !== null);
    if (actions.length > 0) {
      admittedLocalRoutes.push({
        unitId: unit.id,
        name: unit.name,
        state: unit.stateUsps,
        actions,
      });
    }
  }

  const states = [...STATES, "DC"].map((usps) => {
    const pack =
      packs.find((candidate) => candidate.jurisdictionKey === `US-${usps}`) ??
      null;
    const offices: OfficeRow[] = (pack?.offices ?? []).map((office) => {
      const stand = resolveCapability({
        scope: { kind: "state", stateUsps: usps },
        officeKey: office.officeKey,
        action: "stand-for-office",
        onDate,
      });
      const term = resolveCapability({
        scope: { kind: "state", stateUsps: usps },
        officeKey: office.officeKey,
        action: "enter-office-term",
        onDate,
      });
      return {
        officeKey: office.officeKey,
        standForOffice: stand.refusal === null ? "admitted" : "refused",
        standForOfficeMissing: missingFields(stand),
        enterTerm: term.refusal === null ? "admitted" : "refused",
        enterTermMissing: missingFields(term),
        seats:
          stand.fields.find((field) => field.field === "body.seats")?.value ??
          null,
      };
    });
    const inspect = resolveCapability({
      scope: { kind: "state", stateUsps: usps },
      action: "inspect",
      onDate,
    });
    const form = inspect.fields.find(
      (field) => field.field === "institution.form",
    );
    // Rule admission for a legislator in each chamber family, whether or not a
    // playable office exists yet. The probe key carries only the chamber family;
    // it names no real office and grants nothing.
    const legislatorQualifications = (
      usps === "NE"
        ? [["unicameral", "legislature"]]
        : [
            ["lower", "house"],
            ["upper", "senate"],
          ]
    ).map(([family, chamberKey]) => {
      const probe = resolveCapability({
        scope: { kind: "state", stateUsps: usps },
        officeKey: `rules-probe-${usps.toLowerCase()}:${chamberKey}`,
        action: "stand-for-office",
        onDate,
      });
      return {
        chamberFamily: family!,
        standForOffice: probe.refusal === null ? "admitted" : "refused",
        missing: missingFields(probe),
        citations: [
          ...new Set(
            probe.fields
              .filter((field) => field.state === "ADMITTED" && field.source)
              .map((field) => field.source!.citation),
          ),
        ],
      };
    });
    return {
      state: usps,
      isState: usps !== "DC",
      legislativeStructure: form?.state === "ADMITTED" ? form.value : null,
      candidacyPack: pack?.packId ?? null,
      legislatorQualifications,
      offices,
      standForOfficeAdmitted: offices.filter(
        (row) => row.standForOffice === "admitted",
      ).length,
      enterTermAdmitted: offices.filter((row) => row.enterTerm === "admitted")
        .length,
      localGovernments: local.get(usps) ?? emptyCounts(),
      ordinaryInitialization: NOT_MEASURED,
      officeContestProducer: NOT_MEASURED,
      saveContinuity: NOT_MEASURED,
    };
  });

  const unitByGovernment = new Map<string, (typeof units)[number]>();
  for (const unit of units) {
    const government = municipalGovernmentForUnit(unit);
    if (government) unitByGovernment.set(government.key, unit);
  }
  const loadedRecords = municipalGovernments().map((government) => {
    const unit = unitByGovernment.get(government.key) ?? null;
    return {
      governmentKey: government.key,
      state: government.state,
      evidence: government.readings.map((reading) => reading.evidence),
      catalogUnitId: unit?.id ?? null,
      mapping: unit
        ? "mapped"
        : government.identity?.publisherId || government.placeGeoid
          ? "carries an identity link or place GEOID that matches no single 2025 Census municipal unit"
          : "carries neither a declared Census identity link nor a place GEOID; names are never matched",
    };
  });

  const totals = {
    states: states.filter((row) => row.isState).length,
    statesWithLegislativePack: states.filter(
      (row) => row.isState && row.candidacyPack !== null,
    ).length,
    statesWithAnyStandForOfficeAdmitted: states.filter(
      (row) => row.isState && row.standForOfficeAdmitted > 0,
    ).length,
    statesWithAnyTermRuleAdmitted: states.filter(
      (row) => row.isState && row.enterTermAdmitted > 0,
    ).length,
    catalogUnits: GOVERNMENT_UNITS_META.unitCount,
    byUnitType: Object.fromEntries([...byType.entries()].sort()),
    unitsWithAdmittedLocalRoute: admittedLocalRoutes.length,
    loadedMunicipalRecords: loadedRecords.length,
    loadedRecordsMappedToCatalog: loadedRecords.filter(
      (row) => row.catalogUnitId !== null,
    ).length,
    missingMandatoryLocalFields: Object.fromEntries(
      [...localMissing.entries()].sort(),
    ),
  };

  return {
    resolverVersion: RULES_CAPABILITY_VERSION,
    evaluatedOn: onDate,
    catalog: {
      artifactId: GOVERNMENT_UNITS_META.artifactId,
      asOf: GOVERNMENT_UNITS_META.asOf,
      coverage: GOVERNMENT_UNITS_META.coverage,
    },
    scopeNote:
      "Rule admission only. An admitted field is a compiled, dated rule the resolver will apply; it is not proof that a player can reach the action, that an office or contest exists in a save, or that every clause of local law was read. Special districts and school districts are outside the general-purpose catalog.",
    totals,
    states,
    admittedLocalRoutes,
    loadedRecords,
  };
}

export function renderNationwideRuleCoverageMarkdown(
  report: ReturnType<typeof buildNationwideRuleCoverage>,
): string {
  const lines: string[] = [];
  lines.push("# Nationwide rule coverage");
  lines.push("");
  lines.push(
    `Generated by \`npm run coverage:nationwide-rules\` with ${report.resolverVersion}, evaluated on ${report.evaluatedOn}. Catalog: ${report.catalog.artifactId} (as of ${report.catalog.asOf}).`,
  );
  lines.push("");
  lines.push(report.scopeNote);
  lines.push("");
  const t = report.totals;
  lines.push("## Totals");
  lines.push("");
  lines.push(
    `- States: ${t.states}; with a compiled legislative pack: ${t.statesWithLegislativePack}.`,
  );
  lines.push(
    `- States where standing for at least one legislative seat is admitted: ${t.statesWithAnyStandForOfficeAdmitted}.`,
  );
  lines.push(
    `- States where a legislative term rule is admitted: ${t.statesWithAnyTermRuleAdmitted}.`,
  );
  lines.push(
    `- General-purpose governments in the catalog: ${t.catalogUnits}.`,
  );
  lines.push(
    `- Governments with at least one admitted local action: ${t.unitsWithAdmittedLocalRoute}.`,
  );
  lines.push(
    `- Loaded municipal records: ${t.loadedMunicipalRecords}; mapped to a catalog unit: ${t.loadedRecordsMappedToCatalog}.`,
  );
  lines.push("");
  lines.push(
    "Missing mandatory fields for passing an ordinance (first missing field per government):",
  );
  lines.push("");
  for (const [field, count] of Object.entries(t.missingMandatoryLocalFields)) {
    lines.push(`- \`${field}\`: ${count}`);
  }
  lines.push("");
  lines.push("## By unit type");
  lines.push("");
  lines.push(
    "| Type | Units | Enacted instrument compiled | Introduce ordinance | Pass ordinance | Appropriation vote rule | Pass appropriation | Inherited default only | Identity only |",
  );
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const [type, c] of Object.entries(t.byUnitType)) {
    lines.push(
      `| ${type} | ${c.units} | ${c.withCompiledEnactedInstrument} | ${c.introduceOrdinanceAdmitted} | ${c.passOrdinanceAdmitted} | ${c.appropriationVoteRuleAdmitted} | ${c.passAppropriationAdmitted} | ${c.inheritedDefaultOnly} | ${c.identityOnly} |`,
    );
  }
  lines.push("");
  lines.push("## By state");
  lines.push("");
  lines.push(
    `States where a legislator's qualifications are admitted for at least one chamber, with or without a playable office: ${report.states.filter((row) => row.isState && row.legislatorQualifications.some((probe) => probe.standForOffice === "admitted")).length}.`,
  );
  lines.push("");
  lines.push(
    "| State | Legislature | Legislator qualifications | Seats with candidacy admitted | Seats with term rule | Local units | Enacted instrument | Pass ordinance | Appropriation rule | Missing for candidacy |",
  );
  lines.push(
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  );
  for (const row of report.states) {
    const missing =
      [
        ...new Set(
          row.offices.flatMap((office) => office.standForOfficeMissing),
        ),
      ].join(", ") ||
      (row.offices.length === 0 ? "no compiled legislative pack" : "—");
    const qualifications = row.legislatorQualifications
      .map((probe) => `${probe.chamberFamily}: ${probe.standForOffice}`)
      .join("; ");
    lines.push(
      `| ${row.state} | ${row.legislativeStructure ?? "not compiled"} | ${qualifications} | ${row.standForOfficeAdmitted}/${row.offices.length} | ${row.enterTermAdmitted}/${row.offices.length} | ${row.localGovernments.units} | ${row.localGovernments.withCompiledEnactedInstrument} | ${row.localGovernments.passOrdinanceAdmitted} | ${row.localGovernments.appropriationVoteRuleAdmitted} | ${missing} |`,
    );
  }
  lines.push("");
  lines.push(
    "Ordinary initialization, office/contest producers and save continuity are not measured here; they belong to the NATIONWIDE WORLD/ELECTION producers.",
  );
  lines.push("");
  lines.push("## Governments with an admitted local route");
  lines.push("");
  for (const route of report.admittedLocalRoutes) {
    lines.push(
      `- ${route.name} (${route.state}, \`${route.unitId}\`): ${route.actions.join(", ")}`,
    );
  }
  lines.push("");
  lines.push("## Loaded municipal records not mapped to the catalog");
  lines.push("");
  const unmapped = report.loadedRecords.filter(
    (row) => row.catalogUnitId === null,
  );
  lines.push(
    unmapped.length === 0
      ? "None."
      : unmapped
          .map(
            (row) =>
              `- \`${row.governmentKey}\` (${row.state}; ${row.evidence.join(", ")}): ${row.mapping}`,
          )
          .join("\n"),
  );
  lines.push("");
  return lines.join("\n");
}

export function renderNationwideRuleCoverageInto(root: string) {
  const report = buildNationwideRuleCoverage();
  const json = toCanonicalJson(report);
  const markdown = renderNationwideRuleCoverageMarkdown(report);
  for (const [path, text] of [
    [NATIONWIDE_COVERAGE_JSON_PATH, json],
    [NATIONWIDE_COVERAGE_MARKDOWN_PATH, markdown],
  ] as const) {
    mkdirSync(dirname(resolve(root, path)), { recursive: true });
    writeFileSync(resolve(root, path), text, "utf-8");
  }
  return { report, json, markdown };
}

if (process.argv[1]?.endsWith("nationwide-rule-coverage.ts")) {
  const { report } = renderNationwideRuleCoverageInto(REPO_ROOT);
  const t = report.totals;
  console.log(
    `coverage:nationwide-rules: ${t.states} states (${t.statesWithAnyStandForOfficeAdmitted} with candidacy admitted), ${t.catalogUnits} governments (${t.unitsWithAdmittedLocalRoute} with an admitted local route), ${t.loadedMunicipalRecords} loaded municipal records (${t.loadedRecordsMappedToCatalog} mapped).`,
  );
}
