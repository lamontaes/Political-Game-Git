import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { smallWorld } from "../../../tests/fixtures/small-world";
import coverage from "../../../docs/plans/rules3/campaigns-coverage.json";
import inventory from "../../../docs/plans/rules3/campaigns-kernels.json";
const modules = import.meta.glob("./parts-*.ts", { eager: true }) as Record<
  string,
  Record<string, (facts: Record<string, unknown>) => unknown>
>;
const sources = new Map<string, string>();
function source(file: string) {
  let code = sources.get(file);
  if (code === undefined) {
    code = readFileSync(file, "utf8");
    sources.set(file, code);
  }
  return code;
}
function oracle(
  row: (typeof inventory.rows)[number],
  kernel: (typeof inventory.rows)[number]["kernels"][number],
) {
  const original = source(row.file).slice(kernel.start, kernel.end);
  expect(original, kernel.name).toBe(kernel.source);
  let expression = original;
  const spans = kernel.inputs
    .flatMap((input) =>
      input.occurrences.map((span) => ({
        ...span,
        name: input.name,
        source: input.source,
      })),
    )
    .sort((a, b) => b.start - a.start);
  for (const span of spans) {
    expect(source(row.file).slice(span.start, span.end)).toBe(span.source);
    expression =
      expression.slice(0, span.start - kernel.start) +
      "facts[" +
      JSON.stringify(span.name) +
      "]" +
      expression.slice(span.end - kernel.start);
  }
  // The oracle uses legacy expression text, not the generated kernel AST/body.
  const javascript = ts.transpileModule(
    "const evaluate = (facts: Record<string, unknown>) => (" +
      expression +
      ");",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  return new Function(javascript + "; return evaluate;")() as (
    facts: Record<string, unknown>,
  ) => unknown;
}
const numeric = [
  -1,
  0,
  1,
  2,
  89,
  90,
  91,
  99,
  100,
  101,
  365,
  1000,
  10001,
  1e-12,
  NaN,
  Infinity,
  -Infinity,
];
const bigint = [-1n, 0n, 1n, 2n, 10n ** 18n - 1n, 10n ** 18n, 10n ** 18n + 1n];
const strings = [
  "",
  "scheduled",
  "completed",
  "drafting",
  "ended",
  "pending",
  "filed",
  "failed",
  "national",
  "state",
  "communications",
  "hazard-episode",
  "2026-03-08",
  "2026-11-01",
  "2026-11-03",
];
const evaluations = inventory.rows.flatMap((row) =>
  row.kernels.map((kernel) => ({
    row,
    kernel,
    expected: oracle(row, kernel),
    actual: modules["./" + row.purePart.split("/").at(-1)]![kernel.name]!,
  })),
);
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
function check(
  entry: (typeof evaluations)[number],
  facts: Record<string, unknown>,
) {
  const frozen = Object.freeze({ ...facts });
  expect(
    capture(() => entry.actual(frozen)),
    entry.kernel.name,
  ).toEqual(capture(() => entry.expected({ ...facts })));
  expect(frozen).toEqual(facts);
}
describe("explicit-fact expression equivalence for all 56 places", () => {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  for (const [placeIndex, place] of places.entries())
    it(place.usps, () => {
      const { world } = smallWorld({
        place: place.usps,
        seed: "rules3-second-campaigns-" + place.usps,
      });
      for (const entry of evaluations) {
        const facts: Record<string, unknown> = {};
        entry.kernel.inputs.forEach((input, index) => {
          const position = (placeIndex + index) % numeric.length;
          facts[input.name] = input.type.startsWith("number")
            ? numeric[position]
            : input.type.startsWith("bigint")
              ? bigint[(placeIndex + index) % bigint.length]
              : input.type.startsWith("boolean")
                ? (placeIndex + index) % 2 === 0
                : input.type.startsWith("string")
                  ? /date|Day|At|Start|End/.test(input.source)
                    ? world.currentDate
                    : /state|usps/i.test(input.source)
                      ? place.usps
                      : strings[(placeIndex + index) % strings.length]
                  : (placeIndex + index) % 3 === 0
                    ? null
                    : (placeIndex + index) % 3 === 1
                      ? undefined
                      : { id: "selected:" + place.usps };
        });
        check(entry, facts);
      }
    });
});
it("preserves nullable inputs, arithmetic boundaries, short-circuiting, and thrown errors", () => {
  for (const entry of evaluations) {
    const base: Record<string, unknown> = Object.fromEntries(
      entry.kernel.inputs.map((input) => [
        input.name,
        input.type.startsWith("bigint")
          ? 1n
          : input.type.startsWith("number")
            ? 1
            : input.type.startsWith("string")
              ? "2026-10-11"
              : input.type.startsWith("boolean")
                ? true
                : {},
      ]),
    );
    check(entry, base);
    for (const input of entry.kernel.inputs) {
      const values = input.type.startsWith("bigint")
        ? bigint
        : input.type.startsWith("number")
          ? numeric
          : input.type.startsWith("string")
            ? strings
            : input.type.startsWith("boolean")
              ? [false, true]
              : [null, undefined, false, true, {}, []];
      for (const value of [
        ...values,
        ...(input.type.includes("null") ? [null] : []),
        ...(input.type.includes("undefined") ? [undefined] : []),
      ])
        check(entry, { ...base, [input.name]: value });
    }
  }
});
it("accounts for every original deferral with actual pure code or documented plumbing", () => {
  const rows = coverage.rows.filter((row) => row.secondPass === true);
  expect(rows).toHaveLength(46);
  for (const row of rows) {
    expect(
      row.status === "partially-lifted" ||
        row.status === "lifted" ||
        row.status === "pure-plumbing",
      row.name,
    ).toBe(true);
    expect(row.partiallyLifted, row.name).toBe(
      row.status === "partially-lifted",
    );
    if (row.status !== "pure-plumbing")
      for (const file of row.purePart)
        expect(readFileSync(file, "utf8").length, row.name).toBeGreaterThan(0);
    else expect(row.reason.length, row.name).toBeGreaterThan(80);
    expect(row.coreContracts.length, row.name).toBeGreaterThan(0);
  }
});

it("preserves the retirement policy gate for both settings in all 56 places", async () => {
  const { retirementTriggersSuccession } = await import("./succession-trigger");
  const file = "src/simulation/living-world/movement-succession.ts";
  const old = ts.createSourceFile(
    file,
    source(file),
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = old.statements.find(
    (node) =>
      ts.isFunctionDeclaration(node) &&
      node.name?.text === "succeedRetiredLeader",
  )!;
  const body = ts.transpileModule(
    declaration.getText(old).replace(/^export /, ""),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  for (const place of lifePlaceStateIdentities())
    for (const keepsLeading of [false, true]) {
      let called = false;
      const legacy = new Function(
        "MOVEMENT_SUCCESSION_SETTINGS",
        "activeLeaderships",
        "decideSuccession",
        body + "; return succeedRetiredLeader;",
      )(
        { retiredLeaderKeepsLeading: keepsLeading },
        () => [{ organizationId: place.usps }],
        (world: unknown) => {
          called = true;
          return world;
        },
      ) as (world: object, id: string) => object;
      const world = {};
      expect(legacy(world, "leader")).toBe(world);
      expect(retirementTriggersSuccession(keepsLeading), place.usps).toBe(
        called,
      );
    }
});
