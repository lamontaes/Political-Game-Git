/**
 * The detector (docs/design/life-record.md, step 3): no kind of record about a person goes untold
 * without a reason. In a drawn world played 200 days, every event kind that names a full person,
 * every fact kind a person is built with and every kind of the simulated past that carries a
 * person must have a row in data/life/remembered.json (it is on someone's list) or be named in its
 * `notTold` list with a one-line reason. The failure names the kind and how many times it
 * occurred. The place and seed are in every message; replay with LIFE_SEED and LIFE_PLACE_KEY.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import table from "./data/life/remembered.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { preStartHistory } from "./past";
import { coreAPI } from "./state";
import type { CoreEventInput } from "./types";

/** The test's findings: printed, and kept in the file LIFE_NOTES names (the test reporter hides console output). */
const note = (line: string) => {
  console.log(line);
  if (process.env.LIFE_NOTES)
    appendFileSync(process.env.LIFE_NOTES, `${line}\n`);
};

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(seed, "life-kinds-told");
const placeKey = process.env.LIFE_PLACE_KEY ?? drawn.key;
const DAYS = 200;

interface NotTold {
  readonly kind: string;
  readonly from: "event" | "past" | "history";
  readonly reason: string;
}
const NOT_TOLD = (table as unknown as { notTold: readonly NotTold[] }).notTold;

const matches = (pattern: string, kind: string) =>
  pattern.endsWith("*")
    ? kind.startsWith(pattern.slice(0, -1))
    : pattern === kind;

/**
 * Every record kind the engines' code emits about a person, read from the source: an object
 * literal with a string `kind` (or a name of a string constant in the same file) and a `personIds`
 * property, passed to a call whose callee is named `emit...`. The same every run.
 */
function emittedKinds(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const walk = (folder: string): string[] =>
    readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(join(folder, entry.name))
        : entry.name.endsWith(".ts") &&
            !entry.name.endsWith(".test.ts") &&
            !entry.name.endsWith(".d.ts")
          ? [join(folder, entry.name)]
          : [],
    );
  for (const path of walk(join(process.cwd(), "src", "core2"))) {
    const text = readFileSync(path, "utf8");
    if (!text.includes("emit")) continue;
    const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    const strings = new Map<string, string>();
    const collect = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        ts.isStringLiteralLike(node.initializer)
      )
        strings.set(node.name.text, node.initializer.text);
      ts.forEachChild(node, collect);
    };
    collect(file);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const name = ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : ts.isIdentifier(callee)
            ? callee.text
            : "";
        if (name.startsWith("emit"))
          for (const arg of node.arguments) {
            if (!ts.isObjectLiteralExpression(arg)) continue;
            let kind: string | undefined;
            let named = false;
            for (const prop of arg.properties) {
              if (
                !ts.isPropertyAssignment(prop) &&
                !ts.isShorthandPropertyAssignment(prop)
              )
                continue;
              const key = prop.name.getText(file);
              if (key === "personIds") named = true;
              if (key === "kind") {
                const value = ts.isPropertyAssignment(prop)
                  ? prop.initializer
                  : prop.name;
                if (ts.isStringLiteralLike(value)) kind = value.text;
                else if (ts.isIdentifier(value)) kind = strings.get(value.text);
              }
            }
            if (kind && named) {
              const at = file.getLineAndCharacterOfPosition(arg.getStart(file));
              const where = `${path.slice(process.cwd().length + 1)}:${at.line + 1}`;
              found.set(kind, [...(found.get(kind) ?? []), where]);
            }
          }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return found;
}

const eventKindIsTold = (kind: string) =>
  table.events.some((row) => row.record === kind) ||
  NOT_TOLD.some((row) => row.from === "event" && matches(row.kind, kind));

describe(`kinds about a person are told or have a reason, in ${placeKey}, seed ${seed}`, () => {
  it("every kind the engines' code emits about a person is on a list or in notTold", () => {
    const kinds = emittedKinds();
    const missing = [...kinds.entries()]
      .filter(([kind]) => !eventKindIsTold(kind))
      .map(([kind, at]) => `${kind} (${at.join(", ")})`)
      .sort();
    note(
      `life-kinds-told static: ${kinds.size} kinds emitted about a person in the code, ${missing.length} on no list`,
    );
    expect(
      missing,
      "kinds that name a person in the engines' code, on no list and not in notTold",
    ).toEqual([]);
  }, 120_000);

  it("every kind that names a full person is on a list or in notTold", () => {
    setBookkeeping(false);
    const world = buildBenchWorld(drawn.seed, gameStartDate(), {
      twoLevel: true,
      placeKey,
    });
    const { core } = world;
    const where = `${world.place.displayName} (${placeKey}), seed ${seed}`;
    const api = coreAPI(core);
    const counts = {
      event: new Map<string, number>(),
      past: new Map<string, number>(),
      history: new Map<string, number>(),
    };
    const bump = (from: keyof typeof counts, kind: string, by = 1) =>
      counts[from].set(kind, (counts[from].get(kind) ?? 0) + by);
    const emit = api.emit.bind(api);
    api.emit = (event: CoreEventInput) => {
      if (event.personIds.some((id) => core.people.has(id)))
        bump("event", event.kind);
      return emit(event);
    };
    // Facts and the past, as the world is built (before any day is played).
    for (const person of core.people.values())
      for (const fact of person.pastFacts ?? []) bump("past", fact.kind);
    for (const row of preStartHistory(core))
      if (row.personIds?.length) bump("history", row.kind);
    advanceCore(core, addDays(makeIsoDate(core.date), DAYS));

    const told = {
      event: (kind: string) => table.events.some((row) => row.record === kind),
      past: (kind: string) =>
        table.past.some((row) => kind.startsWith(row.kindPrefix)),
      history: (kind: string) => table.history.some((row) => row.kind === kind),
    };
    const rows: string[] = [];
    const staticKinds = new Set(emittedKinds().keys());
    const unseen: string[] = [];
    const missing: string[] = [];
    for (const from of ["event", "past", "history"] as const) {
      for (const [kind, count] of [...counts[from].entries()].sort()) {
        // A fact a person is built with is mirrored as `person.<kind>` in the history; it is
        // the same record and is judged as the fact.
        const mirror =
          from === "history" &&
          kind.startsWith("person.") &&
          counts.past.has(kind.slice("person.".length));
        const as = mirror ? "past" : from;
        const name = mirror ? kind.slice("person.".length) : kind;
        const reason = NOT_TOLD.find(
          (row) => row.from === as && matches(row.kind, name),
        )?.reason;
        const state = told[as](name)
          ? "told"
          : reason
            ? `not told: ${reason}`
            : "UNDECIDED";
        rows.push(
          `${from.padEnd(7)} ${String(count).padStart(6)}  ${kind}  ${state}`,
        );
        // An event kind the static scan sees is judged there; the drawn world fails only on a
        // kind the scan cannot see (built from a variable) that is on no list.
        if (
          state === "UNDECIDED" &&
          !(from === "event" && staticKinds.has(kind))
        )
          missing.push(`${from} ${kind} x${count}`);
        if (from === "event" && !staticKinds.has(kind))
          unseen.push(`${kind} x${count}`);
      }
    }
    note(
      `life-kinds-told: the static scan finds ${staticKinds.size} event kinds; this draw has ${counts.event.size}, ${unseen.length} the scan does not see: ${unseen.join(", ")}`,
    );
    note(`life-kinds-told: ${where}; ${DAYS} days\n${rows.join("\n")}`);
    expect(
      missing,
      `${where}: kinds that name a person, are not on any list and have no reason in notTold`,
    ).toEqual([]);
    // A kind that is told does not also say it is not.
    for (const row of NOT_TOLD)
      expect(
        [...counts[row.from].keys()].some(
          (kind) => matches(row.kind, kind) && told[row.from](kind),
        ),
        `${where}: ${row.from} ${row.kind} is both told and listed in notTold`,
      ).toBe(false);
  }, 3_600_000);
});
