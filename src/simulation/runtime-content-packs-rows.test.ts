import { describe, expect, it } from "vitest";
import {
  assertRuntimeContentRows,
  mergeRuntimeContentRows,
} from "./runtime-content-pack-rows";

describe("runtime content row envelopes", () => {
  it("accepts namespaced data rows in each declared section", () => {
    const rows = {
      policyRows: [{ id: "mod.example.policy", data: { title: "A question" } }],
      institutionRows: [{ id: "mod.example.institution", data: { value: 3 } }],
      effectRows: [{ id: "mod.example.effect", data: { enabled: true } }],
      balanceRows: [{ id: "mod.example.balance", data: { amount: 4.5 } }],
      characterRows: [{ id: "mod.example.character", data: { role: "clerk" } }],
      dialogueRows: [
        { id: "mod.example.dialogue", data: { line: "Welcome." } },
      ],
    };

    expect(() => assertRuntimeContentRows(rows)).not.toThrow();
    expect(mergeRuntimeContentRows([rows])).toEqual(rows);
  });

  it("rejects executable values and network or filesystem references", () => {
    expect(() =>
      assertRuntimeContentRows({
        dialogueRows: [
          {
            id: "mod.example.line",
            data: { line: "Hi", callback: "run" },
          },
        ],
      }),
    ).toThrow(/forbidden field/iu);
    expect(() =>
      assertRuntimeContentRows({
        characterRows: [
          {
            id: "mod.example.person",
            data: { asset: "file:///tmp/person.png" },
          },
        ],
      }),
    ).toThrow(/URL, path/iu);
    expect(() =>
      assertRuntimeContentRows({
        effectRows: [
          { id: "mod.example.effect", data: { callback: () => undefined } },
        ],
      }),
    ).toThrow(/forbidden field|non-data value/iu);
  });

  it("rejects unknown sections, malformed identities, and duplicate IDs", () => {
    expect(() => assertRuntimeContentRows({ arbitraryRows: [] })).toThrow(
      /unsupported section/iu,
    );
    expect(() =>
      assertRuntimeContentRows({ policyRows: [{ id: "built-in", data: {} }] }),
    ).toThrow(/namespaced id/iu);
    expect(() =>
      assertRuntimeContentRows({
        policyRows: [
          { id: "mod.example.same", data: {} },
          { id: "mod.example.same", data: {} },
        ],
      }),
    ).toThrow(/repeats row identity/iu);
  });

  it("merges independent rows by stable identity and refuses collisions", () => {
    expect(
      mergeRuntimeContentRows([
        { balanceRows: [{ id: "mod.first.cash", data: { amount: 2 } }] },
        { balanceRows: [{ id: "mod.second.cash", data: { amount: 5 } }] },
      ]).balanceRows,
    ).toHaveLength(2);
    expect(() =>
      mergeRuntimeContentRows([
        { policyRows: [{ id: "mod.example.topic", data: { name: "First" } }] },
        { policyRows: [{ id: "mod.example.topic", data: { name: "Second" } }] },
      ]),
    ).toThrow(/already defined/iu);
  });
});
