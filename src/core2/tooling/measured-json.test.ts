/** Controlled tooling byte oracles; no simulation or annual-speed evidence. */
import { constants } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parameter as p } from "../parameters";
import {
  hashMeasuredJson,
  streamMeasuredJson,
  writeMeasuredJson,
} from "./measured-json";

describe("buffered measured JSON", () => {
  it("matches standard compact/pretty UTF-8 bytes, omission, hashes and export newlines", () => {
    const shared = { value: "shared" },
      sparse = new Array<unknown>(3);
    sparse[1] = undefined;
    const values = [
      null,
      true,
      -0,
      NaN,
      Infinity,
      -Infinity,
      1e-7,
      1e21,
      {
        "10": "ten",
        "2": "two",
        z: 'é😀\ud800x\udfff\n\t"\\',
        a: [null, -0, NaN],
        absent: undefined,
        fn: () => null,
        symbol: Symbol("omitted"),
      },
      [undefined, () => null, Symbol("null"), sparse, {}, []],
      { left: shared, right: shared, nested: { deep: [{ amount: 25 }] } },
      Object.assign(Object.create(null), { 'quoted"key': "value" }),
      { crossing: "😀é".repeat(p("bytesPerKiB")) },
    ];
    const directory = mkdtempSync(join(tmpdir(), "p8-measured-json-"));
    try {
      for (const [index, value] of values.entries()) {
        for (const pretty of [false, true]) {
          for (const trailingNewline of [false, true]) {
            const text =
              JSON.stringify(value, null, pretty ? p("two") : undefined) +
              (trailingNewline ? "\n" : "");
            const expected = Buffer.from(text, "utf8"),
              chunks: Buffer[] = [];
            const bytes = streamMeasuredJson(
              value,
              (chunk) => chunks.push(Buffer.from(chunk)),
              { pretty, trailingNewline },
            );
            expect(Buffer.concat(chunks)).toEqual(expected);
            expect(bytes).toBe(expected.length);
            const path = join(
              directory,
              `${index}-${pretty}-${trailingNewline}.json`,
            );
            const artifact = writeMeasuredJson(path, value, {
              pretty,
              trailingNewline,
            });
            expect(readFileSync(path)).toEqual(expected);
            expect(artifact.bytes).toBe(expected.length);
            expect(artifact.sha256).toBe(
              createHash("sha256").update(expected).digest("hex"),
            );
            expect(() => writeMeasuredJson(path, value)).toThrow();
          }
        }
        expect(hashMeasuredJson(value)).toBe(
          createHash("sha256").update(JSON.stringify(value)).digest("hex"),
        );
      }
      let reads = 0;
      const accessor: unknown[] = [];
      Object.defineProperty(accessor, "0", {
        enumerable: true,
        get() {
          reads += 1;
          if (reads > 1) throw new Error("Array value was read twice.");
          return "one owning read";
        },
      });
      const accessorOracle = JSON.stringify(accessor);
      reads = 0;
      const accessorChunks: Buffer[] = [];
      streamMeasuredJson(accessor, (chunk) =>
        accessorChunks.push(Buffer.from(chunk)),
      );
      expect(Buffer.concat(accessorChunks).toString("utf8")).toBe(
        accessorOracle,
      );
      expect(reads).toBe(1);
      const cycle: { self?: unknown } = {};
      cycle.self = cycle;
      for (const unsupported of [cycle, { nested: [BigInt(p("one"))] }])
        expect(() => streamMeasuredJson(unsupported, () => {})).toThrow(
          TypeError,
        );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("streams actual total output above Node's maximum string length without assembling it", () => {
    const scalar = "x".repeat(p("bytesPerMiB"));
    const length =
      Math.floor(constants.MAX_STRING_LENGTH / (scalar.length + 3)) + 1;
    const values = new Array<string>(length).fill(scalar);
    const token = JSON.stringify(scalar),
      expected = createHash("sha256");
    expected.update("[");
    for (let index = 0; index < length; index += 1) {
      if (index > 0) expected.update(",");
      expected.update(token);
    }
    expected.update("]");
    const actual = createHash("sha256");
    let calls = 0,
      maximumChunk = 0;
    const bytes = streamMeasuredJson(values, (chunk) => {
      calls += 1;
      maximumChunk = Math.max(maximumChunk, chunk.length);
      actual.update(chunk);
    });
    expect(bytes).toBe(length * (scalar.length + 3) + 1);
    expect(bytes).toBeGreaterThan(constants.MAX_STRING_LENGTH);
    expect(actual.digest("hex")).toBe(expected.digest("hex"));
    expect(maximumChunk).toBeLessThanOrEqual(p("bytesPerMiB"));
    expect(calls).toBeLessThan(length * 5);
  });
});
