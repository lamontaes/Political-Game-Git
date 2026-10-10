/** Meaningful bounded tooling oracles; UNEXECUTED by source-only author. */
import { describe, expect, it } from "vitest";
import type { Parameter } from "../parameters";
import {
  censusOpeningInput,
  compactJsonStringBytes,
  openingInputBudget,
  OPENING_INPUT_BYTES_PER_RESIDENT,
  OPENING_INPUT_SOURCE_SHARE,
} from "./opening-input-budget";
const source = {
  tag: "ESTIMATED",
  asOf: "2026-10-10",
  citation: 'Native oracle é😀\n"\\',
  estimatedFrom: "Full source retained",
};
const escaped = (piece: string, depth: number) => {
  for (let i = 0; i < depth; i += 1) piece = JSON.stringify(piece).slice(1, -1);
  return Buffer.byteLength(piece, "utf8");
};
function registry(bytes: number, share: number): Record<string, Parameter> {
  const row = (value: number): Parameter => ({
    value,
    tag: "TUNABLE",
    citation:
      "Explicit bounded fixture ceiling, no measured production budget claim",
    estimatedFrom: "Controlled exact-size fixture with explicit headroom",
    checkRange: { ref: "controlled-only" },
  });
  return {
    [OPENING_INPUT_BYTES_PER_RESIDENT]: row(bytes),
    [OPENING_INPUT_SOURCE_SHARE]: row(share),
  };
}
describe("opening input exact byte census and registered budgets", () => {
  it("matches native compact JSON escaping, omissions, sparse arrays and repeated aliases", () => {
    const shared = { source },
      sparse = new Array<unknown>(3);
    sparse[1] = undefined;
    const input = {
      people: [{ id: "p" }],
      'quoted"\\key': "value",
      quote: 'é😀\ud800x\udfff\n\t"\\',
      control: "\u0000\b\f\r",
      absent: undefined,
      fn: () => null,
      symbol: Symbol("omit"),
      sparse,
      values: [null, -0, NaN, Infinity, -Infinity, 1e-7, 1e21],
      left: shared,
      right: shared,
    };
    const before = structuredClone({ people: input.people, shared });
    const result = censusOpeningInput(input);
    expect(result.bytes).toBe(Buffer.byteLength(JSON.stringify(input), "utf8"));
    expect(compactJsonStringBytes(input.quote)).toBe(
      Buffer.byteLength(JSON.stringify(input.quote), "utf8"),
    );
    expect(result.directSourceBytes).toBe(
      2 * Buffer.byteLength(JSON.stringify(source), "utf8"),
    );
    expect(result.sourceOccurrences).toBe(2);
    expect({ people: input.people, shared }).toEqual(before);
    for (const text of [
      "",
      "a",
      '"\\',
      "é😀",
      "\ud800",
      "\udfff",
      "\u0001",
      "\b\t\n\f\r",
    ])
      expect(compactJsonStringBytes(text)).toBe(
        Buffer.byteLength(JSON.stringify(text), "utf8"),
      );
  });
  it("attributes only Source spans across exact canonical quoted layers; noncanonical is explicitly conservative", () => {
    const leaf = JSON.stringify(source),
      first = JSON.stringify({
        source,
        unrelated: "Amounts and counterparties are not Source bytes",
      }),
      nested = JSON.stringify({
        facts: {
          contractSourceMap: JSON.stringify({ actualContract: source }),
        },
      });
    const input = {
      people: [{ id: "p" }],
      canonical: first,
      nested,
      noncanonical: ` { "source" : ${leaf}, "unrelated": 17 } `,
    };
    const result = censusOpeningInput(input);
    expect(result.bytes).toBe(Buffer.byteLength(JSON.stringify(input), "utf8"));
    expect(result.directSourceBytes).toBe(0);
    expect(result.canonicalEncodedSourceBytes).toBe(
      escaped(leaf, 1) + escaped(leaf, 2),
    );
    expect(result.noncanonicalEncodedRecordUpperBoundBytes).toBe(
      Buffer.byteLength(JSON.stringify(input.noncanonical), "utf8"),
    );
    expect(result.declaredConservativeSourceByteShare).toBe(
      (result.canonicalEncodedSourceBytes +
        result.noncanonicalEncodedRecordUpperBoundBytes) /
        result.bytes,
    );
    expect(result.exactSourceByteShare).toBe(
      result.canonicalEncodedSourceBytes / result.bytes,
    );
  });
  it("reports exact per-kind record bytes and actual due counts and fails genuine ceilings", () => {
    const term = {
        id: "a",
        kind: "household.food",
        dueAt: "2026-10-11",
        source,
      },
      input = {
        people: [{ id: "p" }],
        finance: { contracts: [term, { ...term, id: "b" }], facilities: [] },
      },
      census = censusOpeningInput(input);
    expect(census.contractKinds[term.kind]!.rows).toBe(2);
    expect(census.contractKinds[term.kind]!.dueDates).toEqual({
      [term.dueAt]: 2,
    });
    expect(census.contractKinds[term.kind]!.bytes).toBe(
      input.finance.contracts.reduce(
        (n, row) => n + Buffer.byteLength(JSON.stringify(row), "utf8"),
        0,
      ),
    );
    expect(openingInputBudget(census, registry(census.bytes, 1)).passed).toBe(
      true,
    );
    const sizeFail = openingInputBudget(census, registry(census.bytes - 1, 1));
    expect(sizeFail.passed).toBe(false);
    expect(sizeFail.violations).toContain(
      "Opening input bytes per resident exceed the registered budget.",
    );
    const sourceFail = openingInputBudget(
      census,
      registry(census.bytes, census.declaredConservativeSourceByteShare / 2),
    );
    expect(sourceFail.passed).toBe(false);
    expect(sourceFail.violations).toContain(
      "Opening input declared conservative Source-byte share exceeds the registered budget.",
    );
  });
  it("rejects custom array prototypes and inherited hole indices without evaluating getters", () => {
    const custom = new Array<unknown>(1),
      prototype = Object.create(Array.prototype) as unknown[];
    prototype[0] = "inherited";
    Object.setPrototypeOf(custom, prototype);
    expect(JSON.stringify(custom)).toBe('["inherited"]');
    expect(() => censusOpeningInput({ people: [{}], custom })).toThrow(
      TypeError,
    );
    const ordinary = new Array<unknown>(1),
      previous = Object.getOwnPropertyDescriptor(Object.prototype, "0");
    let reads = 0;
    try {
      Object.defineProperty(Object.prototype, "0", {
        configurable: true,
        value: "inherited",
        writable: true,
      });
      expect(JSON.stringify(ordinary)).toBe('["inherited"]');
      expect(() => censusOpeningInput({ people: [{}], ordinary })).toThrow(
        TypeError,
      );
      Object.defineProperty(Object.prototype, "0", {
        configurable: true,
        get: () => {
          reads += 1;
          return "getter";
        },
      });
      // No assertion-framework work while the temporary indexed getter exists.
      let rejection: unknown;
      try {
        censusOpeningInput({ people: [{}], ordinary });
      } catch (error) {
        rejection = error;
      }
      Object.defineProperty(Object.prototype, "0", {
        configurable: true,
        value: "inherited",
        writable: true,
      });
      expect(rejection).toBeInstanceOf(TypeError);
      expect(reads).toBe(0);
    } finally {
      if (previous) Object.defineProperty(Object.prototype, "0", previous);
      else Reflect.deleteProperty(Object.prototype, "0");
    }
  });
  it("counts noncanonical encoded records conservatively even when duplicate keys discard Source", () => {
    const hidden = `{"a":${JSON.stringify(source)},"a":null}`,
      sourceFree = ' { "amount" : 17 } ',
      input = { people: [{}], hidden, sourceFree },
      result = censusOpeningInput(input);
    expect(JSON.parse(hidden)).toEqual({ a: null });
    expect(result.bytes).toBe(Buffer.byteLength(JSON.stringify(input), "utf8"));
    expect(result.canonicalEncodedSourceBytes).toBe(0);
    const conservative =
      Buffer.byteLength(JSON.stringify(hidden), "utf8") +
      Buffer.byteLength(JSON.stringify(sourceFree), "utf8");
    expect(result.noncanonicalEncodedRecordUpperBoundBytes).toBe(conservative);
    expect(result.exactSourceByteShare).toBe(0);
    expect(result.declaredConservativeSourceByteShare).toBe(
      conservative / result.bytes,
    );
    expect(
      openingInputBudget(
        result,
        registry(result.bytes, result.declaredConservativeSourceByteShare / 2),
      ).passed,
    ).toBe(false);
  });
  it("rejects own/inherited toJSON accessors without invoking them and explicitly rejects native hooks", () => {
    const own = { people: [{}] },
      hooked = { people: [{}], toJSON: () => ({ native: "hook result" }) };
    let reads = 0;
    Object.defineProperty(own, "toJSON", {
      configurable: true,
      get: () => {
        reads += 1;
        return () => ({ altered: true });
      },
    });
    expect(() => censusOpeningInput(own)).toThrow(TypeError);
    expect(reads).toBe(0);
    expect(JSON.stringify(hooked)).toBe('{"native":"hook result"}');
    expect(() => censusOpeningInput(hooked)).toThrow(TypeError);
    const prior = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
    let rejection: unknown;
    try {
      Object.defineProperty(Object.prototype, "toJSON", {
        configurable: true,
        get: () => {
          reads += 1;
          return () => null;
        },
      });
      try {
        censusOpeningInput({ people: [{}] });
      } catch (error) {
        rejection = error;
      }
    } finally {
      if (prior) Object.defineProperty(Object.prototype, "toJSON", prior);
      else Reflect.deleteProperty(Object.prototype, "toJSON");
    }
    expect(rejection).toBeInstanceOf(TypeError);
    expect(reads).toBe(0);
    // Native nonfunction toJSON values are ordinary properties, not hooks.
    const nonhook = { people: [{}], toJSON: "ordinary" };
    expect(censusOpeningInput(nonhook).bytes).toBe(
      Buffer.byteLength(JSON.stringify(nonhook), "utf8"),
    );
  });
  it("requires a serialized own roster and never invokes skipped roster or term-summary accessors", () => {
    let reads = 0;
    const hiddenRoster = {};
    Object.defineProperty(hiddenRoster, "people", {
      get: () => {
        reads += 1;
        return [{}];
      },
    });
    expect(() => censusOpeningInput(hiddenRoster)).toThrow(TypeError);
    expect(reads).toBe(0);
    const hiddenDataRoster = {};
    Object.defineProperty(hiddenDataRoster, "people", { value: [{}] });
    expect(() => censusOpeningInput(hiddenDataRoster)).toThrow(TypeError);
    for (const key of ["kind", "dueAt"]) {
      const term = { id: "actual" };
      Object.defineProperty(term, key, {
        get: () => {
          reads += 1;
          return "not serialized";
        },
      });
      expect(() =>
        censusOpeningInput({ people: [{}], finance: { contracts: [term] } }),
      ).toThrow(TypeError);
      expect(reads).toBe(0);
    }
    const keys = ["people", "kind", "dueAt"],
      priors = keys.map((key) =>
        Object.getOwnPropertyDescriptor(Object.prototype, key),
      );
    let rosterError: unknown,
      result: ReturnType<typeof censusOpeningInput> | undefined;
    try {
      for (const key of keys)
        Object.defineProperty(Object.prototype, key, {
          configurable: true,
          get: () => {
            reads += 1;
            return "inherited";
          },
        });
      try {
        censusOpeningInput({});
      } catch (error) {
        rosterError = error;
      }
      result = censusOpeningInput({
        people: [{}],
        finance: { contracts: [{ id: "actual" }] },
      });
    } finally {
      for (let i = 0; i < keys.length; i += 1) {
        if (priors[i])
          Object.defineProperty(Object.prototype, keys[i]!, priors[i]!);
        else Reflect.deleteProperty(Object.prototype, keys[i]!);
      }
    }
    expect(rosterError).toBeInstanceOf(TypeError);
    expect(reads).toBe(0);
    expect(result!.contractKinds["<missing-kind>"]!.dueDates).toEqual({
      "<missing-due>": 1,
    });
    const hiddenDataTerm = { id: "actual" };
    Object.defineProperties(hiddenDataTerm, {
      kind: { value: "hidden" },
      dueAt: { value: "hidden-date" },
    });
    const input = { people: [{}], finance: { contracts: [hiddenDataTerm] } },
      census = censusOpeningInput(input);
    expect(census.bytes).toBe(Buffer.byteLength(JSON.stringify(input), "utf8"));
    expect(census.contractKinds["<missing-kind>"]!.dueDates).toEqual({
      "<missing-due>": 1,
    });
  });
  it("rejects BigInt before an installed prototype toJSON hook can run", () => {
    const prior = Object.getOwnPropertyDescriptor(BigInt.prototype, "toJSON");
    let calls = 0;
    try {
      Object.defineProperty(BigInt.prototype, "toJSON", {
        configurable: true,
        value: () => {
          calls += 1;
          return "manufactured";
        },
      });
      expect(() =>
        censusOpeningInput({ people: [{}], value: BigInt(1) }),
      ).toThrow(TypeError);
      expect(() =>
        censusOpeningInput({ people: [{}], values: [BigInt(1)] }),
      ).toThrow(TypeError);
      expect(calls).toBe(0);
    } finally {
      if (prior) Object.defineProperty(BigInt.prototype, "toJSON", prior);
      else Reflect.deleteProperty(BigInt.prototype, "toJSON");
    }
  });
  it("keeps clean function omission exact and rejects own/inherited callable hooks before omission", () => {
    const clean = () => null,
      ordinary = {
        people: [{}],
        omitted: clean,
        values: [clean, undefined, Symbol("null slot")],
      };
    expect(censusOpeningInput(ordinary).bytes).toBe(
      Buffer.byteLength(JSON.stringify(ordinary), "utf8"),
    );
    let calls = 0,
      reads = 0;
    for (const owner of [clean, Function.prototype])
      for (const mode of ["callable", "accessor"]) {
        const previous = Object.getOwnPropertyDescriptor(owner, "toJSON");
        const rejections: unknown[] = [];
        try {
          Object.defineProperty(
            owner,
            "toJSON",
            mode === "callable"
              ? {
                  configurable: true,
                  value: () => {
                    calls += 1;
                    return "manufactured";
                  },
                }
              : {
                  configurable: true,
                  get: () => {
                    reads += 1;
                    return () => "manufactured";
                  },
                },
          );
          for (const input of [
            { people: [{}], term: clean },
            { people: [{}], values: [clean] },
          ]) {
            try {
              censusOpeningInput(input);
            } catch (error) {
              rejections.push(error);
            }
          }
        } finally {
          if (previous) Object.defineProperty(owner, "toJSON", previous);
          else Reflect.deleteProperty(owner, "toJSON");
        }
        expect(rejections).toHaveLength(2);
        expect(rejections.every((error) => error instanceof TypeError)).toBe(
          true,
        );
        expect(calls).toBe(0);
        expect(reads).toBe(0);
      }
  });
  it("checks decoded nested containers before any native stringify while encoded fields precede people", () => {
    const encoded = JSON.stringify({ payload: [{ source }] });
    let calls = 0,
      reads = 0;
    for (const mode of ["callable", "accessor"]) {
      const previous = Object.getOwnPropertyDescriptor(
        Array.prototype,
        "toJSON",
      );
      let rejection: unknown;
      try {
        Object.defineProperty(
          Array.prototype,
          "toJSON",
          mode === "callable"
            ? {
                configurable: true,
                value: () => {
                  calls += 1;
                  return "manufactured";
                },
              }
            : {
                configurable: true,
                get: () => {
                  reads += 1;
                  return () => "manufactured";
                },
              },
        );
        try {
          censusOpeningInput({ encoded, people: [{}] });
        } catch (error) {
          rejection = error;
        }
      } finally {
        if (previous)
          Object.defineProperty(Array.prototype, "toJSON", previous);
        else Reflect.deleteProperty(Array.prototype, "toJSON");
      }
      expect(rejection).toBeInstanceOf(TypeError);
      expect(calls).toBe(0);
      expect(reads).toBe(0);
    }
  });
  it("rejects missing, unresolved, invalid or unowned budgets and unsupported cyclic/BigInt values", () => {
    const census = censusOpeningInput({ people: [{ id: "p" }], source });
    expect(openingInputBudget(census, {}).passed).toBe(false);
    for (const value of [null as unknown as number, NaN, Infinity, 0, -1])
      expect(openingInputBudget(census, registry(value, 1)).passed).toBe(false);
    expect(openingInputBudget(census, registry(census.bytes, 2)).passed).toBe(
      false,
    );
    const unowned = registry(census.bytes, 1);
    unowned[OPENING_INPUT_SOURCE_SHARE]!.tag = "SOURCED";
    expect(openingInputBudget(census, unowned).passed).toBe(false);
    const empty = censusOpeningInput({ people: [] });
    expect(openingInputBudget(empty, registry(1, 1)).passed).toBe(false);
    const cyclic: { people: unknown[]; self?: unknown } = { people: [{}] };
    cyclic.self = cyclic;
    expect(() => censusOpeningInput(cyclic)).toThrow(TypeError);
    expect(() =>
      censusOpeningInput({ people: [{}], value: BigInt(1) }),
    ).toThrow(TypeError);
  });
});
