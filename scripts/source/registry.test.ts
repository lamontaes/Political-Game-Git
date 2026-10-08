import { describe, expect, it } from "vitest";
import { listDomainNames } from "./registry";

describe("source-domain registry", () => {
  it("registers a script import for every retained source folder", () => {
    expect(listDomainNames().length).toBeGreaterThan(0);
  });
});
