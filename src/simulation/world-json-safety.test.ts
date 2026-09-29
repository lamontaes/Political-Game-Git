import { describe, expect, it } from "vitest";

import { createDemoWorld } from "./demo";
import type { HistoricalEventInput } from "./history";
import { recordWorldEvent } from "./world";

/** The JSON check runs before anything else reads the event. */
function record(input: Record<string, unknown>): () => unknown {
  const world = createDemoWorld("json-safety");
  return () =>
    recordWorldEvent(world, input as unknown as HistoricalEventInput);
}

describe("the JSON-safety check names the failing value's full path", () => {
  it("names a non-finite number inside a list", () => {
    expect(record({ a: [1, { b: Number.NaN }] })).toThrow(
      "Non-finite number is not JSON-safe at historicalEvent.a[1].b.",
    );
  });

  it("names a function value", () => {
    expect(record({ a: { f: () => 1 } })).toThrow(
      "Non-JSON-safe value at historicalEvent.a.f.",
    );
  });

  it("names a non-plain object", () => {
    expect(record({ d: new Date(0) })).toThrow(
      "Non-plain object is not JSON-safe at historicalEvent.d.",
    );
  });

  it("names a cycle", () => {
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(record({ c: loop })).toThrow(
      "Cyclic value is not JSON-safe at historicalEvent.c.self.",
    );
  });

  it("passes over a hole in a sparse list", () => {
    // eslint-disable-next-line no-sparse-arrays
    expect(record({ s: [1, , 2] })).not.toThrow(/JSON-safe/);
  });
});
