import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import * as oldDates from "../../simulation/dates";
import { EXECUTIVE_AUTHORITY_RULE_PACKS } from "../../simulation/executive-authority-rule-packs";
import { STATES } from "../../simulation/state-reference";
import * as districtIdentity from "../../simulation/nationwide-world/district-of-columbia-identity";
import {
  executiveKnown,
  executiveUnknown,
} from "../../simulation/executive-authority-rules";
import { transitionServiceStatus } from "./transition-services";
import { buildEstimatedPack } from "./estimated-pack";
const modules = import.meta.glob("./pure-*.ts", { eager: true }) as Record<
  string,
  Record<string, unknown>
>;
const sources = new Map<string, ts.SourceFile>();
function original(file: string) {
  let sf = sources.get(file);
  if (!sf) {
    sf = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    sources.set(file, sf);
  }
  return sf;
}
function declarations(sf: ts.SourceFile) {
  const result = new Map<string, ts.Node>();
  for (const node of sf.statements) {
    if (ts.isFunctionDeclaration(node) && node.name)
      result.set(node.name.text, node);
    if (ts.isVariableStatement(node))
      for (const d of node.declarationList.declarations)
        if (ts.isIdentifier(d.name)) result.set(d.name.text, node);
  }
  return result;
}
function evaluateSource(
  nodes: readonly ts.Node[],
  sf: ts.SourceFile,
  symbol: string,
  globals: Record<string, unknown>,
) {
  const text = nodes
    .map((n) => n.getText(sf).replace(/^export /, ""))
    .join("\n");
  const javascript = ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(
    ...Object.keys(globals),
    javascript + "; return " + symbol + ";",
  )(...Object.values(globals)) as unknown;
}
function legacy(file: string, symbol: string) {
  const text = readFileSync("src/rules/governing/" + file, "utf8");
  const path = /Lifted unchanged from ([^;]+);/.exec(text)![1]!;
  const fresh = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const old = original(path),
    oldDeclarations = declarations(old);
  const names = [...declarations(fresh).keys()].filter((name) =>
    oldDeclarations.has(name),
  );
  const nodes = [...new Set(names.map((name) => oldDeclarations.get(name)!))];
  return evaluateSource(nodes, old, symbol, {
    ...oldDates,
    driveInventory: JSON.parse(
      readFileSync(
        "src/environment/public-drive-inventory.generated.json",
        "utf8",
      ),
    ),
  });
}
function capture(evaluate: () => unknown) {
  try {
    return { value: evaluate() };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.name + ": " + error.message
          : String(error),
    };
  }
}
const oldPackSource = original(
  "src/simulation/executive-authority-game-profile.ts",
);
const packNames = [
  "GAME_PROFILE_SOURCE",
  "PROFILE_SOURCES",
  "stableIndex",
  "spreadValue",
  "knownValues",
  "middleOfReadSpread",
  "profileSourceForField",
  "profileRuleForField",
  "estimatedPluralExecutive",
  "officeIdentity",
  "buildEstimatedPack",
];
const oldPackDeclarations = declarations(oldPackSource);
function packOracle(packs: readonly unknown[]) {
  return evaluateSource(
    packNames.map((name) => oldPackDeclarations.get(name)!),
    oldPackSource,
    "({buildEstimatedPack,officeIdentity})",
    {
      EXECUTIVE_AUTHORITY_RULE_PACKS: packs,
      STATES,
      ...districtIdentity,
      executiveKnown,
      executiveUnknown,
    },
  ) as {
    buildEstimatedPack: (key: string) => unknown;
    officeIdentity: (key: string) => {
      officeKey: string;
      title: string;
      displayName: string;
    };
  };
}
const scale = 10n ** 18n;
const cases: Record<string, readonly unknown[][]> = {
  isNonEmptyString: [
    [undefined],
    [null],
    [false],
    [0],
    [NaN],
    [""],
    ["  "],
    ["a"],
    [[]],
  ],
  isPercent: [
    [-1],
    [0],
    [0.5],
    [100],
    [100.01],
    [NaN],
    [Infinity],
    [undefined],
    [null],
  ],
  isPositiveNumber: [
    [-1],
    [0],
    [0.5],
    [100],
    [NaN],
    [Infinity],
    [undefined],
    [null],
  ],
  compareCanonicalStrings: [
    ["", ""],
    ["a", "b"],
    ["b", "a"],
    ["a", "a"],
  ],
  environmentSourceBulkCounts: [[]],
  stateRequestWarranted: [
    ...["minor", "moderate", "major", "catastrophic"].flatMap((m) => [
      [m, 0],
      [m, 1],
      [m, 100],
    ]),
  ],
  federalDeclarationWarranted: [
    ["minor"],
    ["moderate"],
    ["major"],
    ["catastrophic"],
  ],
  turn: [
    [0, 4.5, 1],
    [4.5, 4.5, 1],
    [17.5, 17.5, 1],
    [64.5, 64.5, 1],
    [100, 80, 4],
  ],
  epidemicSeriousness: [
    [0, false],
    [1, false],
    [18, false],
    [80, false],
    [100, false],
    [18, true],
  ],
  between: [
    [1500000, 8000000, 0],
    [1500000, 8000000, 0.5],
    [1500000, 8000000, 1],
  ],
  epidemicSusceptibilityAtAge: [[0], [4.5], [17.5], [64.5], [80], [100]],
  epidemicSeasonOn: [
    ["2026-01-01"],
    ["2026-06-15"],
    ["2026-12-31"],
    ["2028-02-29"],
  ],
  workdaysBetween: [
    ["2026-10-09", "2026-10-12"],
    ["2026-10-12", "2026-10-09"],
    ["2026-10-10", "2026-10-11"],
    ["2028-02-28", "2028-03-01"],
  ],
  twiceAtanh: [[0n], [scale / 3n], [-scale / 4n]],
  fixedLn: [
    [-1n],
    [0n],
    [1n],
    [scale / 2n],
    [scale - 1n],
    [scale],
    [scale + 1n],
    [scale * 2n],
  ],
  fixedFromDecimal: [
    ["0.000001"],
    ["0.001685"],
    ["0.5"],
    ["1.000000"],
    ["0.000000000000000001"],
    ["bad"],
    ["-0.1"],
  ],
  hazardFromAnnualProbability: [
    [-1n],
    [0n],
    [1n],
    [scale / 2n],
    [scale - 1n],
    [scale],
    [scale + 1n],
  ],
  magnitudeFor: [
    [0, 0],
    [1, 3],
    [2, 4],
    [4, 11],
    [5, 12],
    [11, 39],
    [12, 40],
  ],
  recordedDurationDays: [
    [{ startDate: "2026-10-11", endDate: "2026-10-11" }],
    [{ startDate: "2026-10-11", endDate: "2026-11-11" }],
    [{ startDate: "2026-10-11", endDate: "2026-10-10" }],
  ],
  thresholdUnits: [[0n], [1n], [-1n], [scale]],
  ageAt: [
    ["2000-02-29", "2026-02-28"],
    ["2000-02-29", "2028-02-28"],
    ["2000-02-29", "2028-02-29"],
    ["2000-01-01", "1999-12-31"],
  ],
};
const entries = Object.entries(cases).map(([name, args]) => {
  const file = Object.keys(modules).find((file) => name in modules[file]!)!;
  return {
    name,
    args,
    actual: modules[file]![name] as (...args: unknown[]) => unknown,
    expected: legacy(file.slice(2), name) as (...args: unknown[]) => unknown,
  };
});
const constants = [
  "FIXED_SCALE",
  "THREE_HALVES",
  "THREE_QUARTERS",
  "FIXED_LN2",
].map((name) => {
  const file = Object.keys(modules).find((file) => name in modules[file]!)!;
  return {
    name,
    actual: modules[file]![name],
    expected: legacy(file.slice(2), name),
  };
});
const oldExactAge = legacy("pure-exact-age.ts", "exactAge") as (
  world: unknown,
  id: string,
) => number;
const normalPack = packOracle(EXECUTIVE_AUTHORITY_RULE_PACKS),
  emptyPack = packOracle([]);
describe("whole copied rules and adapted facts against independent legacy bodies in all 56 places", () => {
  for (const place of lifePlaceStateIdentities())
    it(place.usps, () => {
      for (const entry of entries)
        for (const args of entry.args)
          expect(
            capture(() => entry.actual(...args)),
            entry.name + " " + place.usps,
          ).toEqual(capture(() => entry.expected(...args)));
      for (const entry of constants)
        expect(entry.actual, entry.name).toBe(entry.expected);
      const { world, personId } = smallWorld({
        place: place.usps,
        seed: "rules3-second-governing-whole-" + place.usps,
      });
      const age = modules["./pure-exact-age.ts"]!["exactAge"] as (
        birthDate: unknown,
        today: unknown,
      ) => number;
      expect(age(world.people[personId]!.birthDate, world.currentDate)).toBe(
        oldExactAge(world, personId),
      );
      for (const [packs, oracle] of [
        [EXECUTIVE_AUTHORITY_RULE_PACKS, normalPack],
        [[], emptyPack],
      ] as const) {
        const identity = oracle.officeIdentity(place.jurisdictionKey);
        const before = JSON.stringify(packs);
        expect(
          buildEstimatedPack(place.jurisdictionKey, identity, packs),
        ).toEqual(oracle.buildEstimatedPack(place.jurisdictionKey));
        expect(JSON.stringify(packs)).toBe(before);
      }
    });
});
it("isolates validator output buffers while preserving errors and scene IDs", () => {
  for (const [slug, name, values] of [
    [
      "surface-slots",
      "validateSurfaceSlots",
      [
        undefined,
        {},
        [],
        [{}],
        [
          {
            id: "provided",
            kind: "monitor-or-screen",
            z_order: 1,
            bounds: { x: 0, y: 0, width: 101, height: 0 },
          },
        ],
      ],
    ],
    [
      "raster",
      "validateRaster",
      [undefined, {}, { asset_id: "", frame_width: 0, frame_height: -1 }],
    ],
    [
      "presentation",
      "validatePresentation",
      [
        {},
        {
          standard_body_width_percent: 101,
          plate: { width: 0, height: 1 },
          surface_slots: [{}],
        },
      ],
    ],
  ] as const) {
    const expected = legacy("pure-validate-" + slug + ".ts", name) as (
      ...args: unknown[]
    ) => unknown;
    const actual = modules["./pure-validate-" + slug + ".ts"]![
      name + "Rule"
    ] as (...args: unknown[]) => unknown;
    for (const value of values) {
      const originalIds = new Map([["provided", "spec.existing"]]);
      const priorErrors = Object.freeze(["prior"]);
      const expectedIds = new Map(originalIds);
      const errors = [...priorErrors];
      if (slug === "raster") {
        expected(value, errors);
        expect(actual(value, priorErrors)).toEqual(errors);
      } else {
        expected(value, expectedIds, errors);
        expect(actual(value, originalIds, priorErrors)).toEqual({
          sceneIds: expectedIds,
          errors,
        });
      }
      expect(originalIds).toEqual(new Map([["provided", "spec.existing"]]));
      expect(priorErrors).toEqual(["prior"]);
    }
  }
});

it("separates transition attendance reads from its date/status decision in all 56 places", () => {
  const sf = original("src/simulation/office-transition.ts"),
    decls = declarations(sf);
  const names = [
    "OFFICE_TRANSITION_SERVICE_ATTENDED",
    "transitionServiceAttendance",
    "transitionAttendanceKey",
    "transitionServiceStatus",
  ];
  const expected = evaluateSource(
    names.map((name) => decls.get(name)!),
    sf,
    "transitionServiceStatus",
    {},
  ) as (
    world: unknown,
    personId: string,
    contestId: string,
    service: unknown,
  ) => unknown;
  const key = evaluateSource(
    [decls.get("transitionAttendanceKey")!],
    sf,
    "transitionAttendanceKey",
    {},
  ) as (...args: string[]) => string;
  for (const place of lifePlaceStateIdentities())
    for (const today of [
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
    ])
      for (const attended of [false, true]) {
        const personId = "person:" + place.usps,
          contestId = "contest:" + place.usps;
        const service = {
          key: "orientation",
          title: "",
          description: "",
          span: {
            opens: { daysAfterElection: 1 },
            closes: { daysAfterElection: 2 },
          },
          opensOn: oldDates.makeIsoDate("2026-10-11"),
          closesOn: oldDates.makeIsoDate("2026-10-12"),
        };
        const world = {
          currentDate: today,
          history: {
            events: attended
              ? [
                  {
                    type: "election.transition-service-attended",
                    stableKey: key(personId, contestId, service.key),
                  },
                ]
              : [],
          },
        };
        expect(
          transitionServiceStatus(
            oldDates.makeIsoDate(today),
            attended,
            service,
          ),
          place.usps,
        ).toBe(expected(world, personId, contestId, service));
      }
});
