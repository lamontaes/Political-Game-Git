import { describe, expect, it } from "vitest";
import { decoder } from "./snapshot";

// Restoring refills the rebuilt world's own objects in place. Two things have
// to hold or a restored world drifts from the one it was saved from.
describe("restoring into the rebuilt world", () => {
  it("does not let two saved records share the one object the rebuilt world shared", () => {
    // The rebuilt world gives every person the same opening source object;
    // the saved world has since given one of them its own.
    const shared = { citation: "opening", asOf: "2025-01-20" };
    const rebuilt = [{ source: shared }, { source: shared }];
    const saved = [
      { source: { citation: "opening", asOf: "2025-01-20" } },
      { source: { citation: "moved away", asOf: "2025-02-21" } },
    ];
    const out = decoder()(saved, rebuilt) as typeof saved;
    expect(out[0]!.source.citation).toBe("opening");
    expect(out[1]!.source.citation).toBe("moved away");
    expect(out[0]!.source).not.toBe(out[1]!.source);
  });

  it("puts an object's keys back in the order they were saved in", () => {
    const rebuilt = { b: 1, a: 2, c: 3 };
    const out = decoder()({ a: 2, b: 1, c: 3 }, rebuilt) as Record<
      string,
      number
    >;
    expect(Object.keys(out)).toEqual(["a", "b", "c"]);
  });

  it("still refills a rebuilt object in place when it is used once", () => {
    const rebuilt = { n: 1 };
    const out = decoder()({ n: 2 }, rebuilt) as { n: number };
    expect(out).toBe(rebuilt);
    expect(out.n).toBe(2);
  });
});
