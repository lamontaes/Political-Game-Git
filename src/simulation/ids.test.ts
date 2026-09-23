import { describe, expect, it } from "vitest";

import { createStableId, stableHash } from "./ids";

describe("stable entity IDs", () => {
  it("pins the version-one ID contract", () => {
    expect(createStableId("person", "golden-key")).toBe(
      "person_05efe39fb8775bf8",
    );
  });

  it("separates entity kinds and rejects empty keys", () => {
    expect(createStableId("person", "shared-key")).not.toBe(
      createStableId("jurisdiction", "shared-key"),
    );
    expect(() => createStableId("person", "")).toThrow(/empty/i);
  });

  it("hashes exactly as 64-bit FNV-1a over UTF-16 code units", () => {
    // The reference, written the plain way with BigInt.
    const reference = (value: string) => {
      let hash = 0xcbf29ce484222325n;
      for (let index = 0; index < value.length; index += 1) {
        hash ^= BigInt(value.charCodeAt(index));
        hash = BigInt.asUintN(64, hash * 0x100000001b3n);
      }
      return hash.toString(16).padStart(16, "0");
    };
    // A fixed pseudo-random stream, so the sample is the same on every run.
    let state = 0x9e3779b9;
    const next = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state;
    };
    const samples = ["", "a", "person:v1:golden-key", "é", "\uffff\u0000"];
    for (let count = 0; count < 5000; count += 1) {
      let text = "";
      const length = next() % 90;
      for (let index = 0; index < length; index += 1) {
        const roll = next() % 10;
        text += String.fromCharCode(
          roll < 7
            ? 32 + (next() % 95)
            : roll < 9
              ? next() % 0x800
              : next() % 0x10000,
        );
      }
      samples.push(text);
    }
    for (const sample of samples)
      expect(stableHash(sample), JSON.stringify(sample)).toBe(
        reference(sample),
      );
  });
});
