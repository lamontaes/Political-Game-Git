import { describe, expect, it } from "vitest";

import { authorityFrom, parseActor } from "./artbench-bridge";

describe("artbench bridge identity boundary", () => {
  it("refuses missing or malformed actors instead of defaulting to the owner", () => {
    expect(parseActor(undefined).ok).toBe(false);
    expect(parseActor({}).ok).toBe(false);
    expect(parseActor({ kind: "owner" }).ok).toBe(false);
    expect(parseActor({ kind: "boss", id: "x" }).ok).toBe(false);
    expect(parseActor({ kind: "owner", id: "../etc" }).ok).toBe(false);
    const ok = parseActor({ kind: "owner", id: "hub-qa-fixture" });
    expect(ok.ok && ok.actor).toEqual({ kind: "owner", id: "hub-qa-fixture" });
  });

  it("derives authority only from the host token or the session capability header", () => {
    const expected = { hostToken: "host-secret", ownerCapability: "cap-1" };
    expect(
      authorityFrom({ hostToken: null, ownerCapability: null }, expected),
    ).toBeNull();
    expect(
      authorityFrom({ hostToken: "wrong", ownerCapability: "wrong" }, expected),
    ).toBeNull();
    expect(
      authorityFrom(
        { hostToken: "host-secret", ownerCapability: null },
        expected,
      ),
    ).toBe("host-token");
    expect(
      authorityFrom({ hostToken: null, ownerCapability: "cap-1" }, expected),
    ).toBe("session-capability");
  });
});
