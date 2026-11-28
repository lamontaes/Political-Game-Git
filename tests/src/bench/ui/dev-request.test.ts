import { afterEach, describe, expect, it, vi } from "vitest";
import { sendDevRequest } from "../../../../src/bench/ui/dev-request.mjs";

afterEach(() => vi.unstubAllGlobals());

describe("developer panel requests", () => {
  it("reads without a payload and sends the existing JSON body with a payload", async () => {
    const result = { id: "record" };
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => result });
    vi.stubGlobal("fetch", fetch);
    await expect(sendDevRequest("record", undefined)).resolves.toEqual(result);
    await expect(sendDevRequest("record", { id: "record" })).resolves.toEqual(
      result,
    );
    expect(fetch.mock.calls).toEqual([
      ["/api/dev/record", { method: "GET" }],
      ["/api/dev/record", { method: "POST", body: '{"id":"record"}' }],
    ]);
  });

  it("reports the same error from the API reply", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "No matching record" }),
      }),
    );
    await expect(sendDevRequest("record", undefined)).rejects.toThrow(
      "No matching record",
    );
  });
});
