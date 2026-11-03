// The new-game check must fail when the game does: a refused request, a stop it
// cannot get past, or a crash, each named with its route.
import { describe, expect, it, vi } from "vitest";

const replies: Record<string, { status: number; body: string }> = {};
vi.mock("../src/bench/handler", () => ({
  benchRequest: async (method: string, url: URL) => {
    const key = `${method} ${url.pathname}`;
    if (key === "POST /api/advance" && replies.crash)
      throw new Error("simulated crash in a day");
    return (
      replies[key] ?? {
        status: 200,
        headers: {},
        body: JSON.stringify({
          placeName: "Drawn Town",
          personId: "p1",
          packet: { kind: "complete" },
        }),
      }
    );
  },
}));

const { newGameCheck } = await import("./new-game-check");

describe("new-game check", () => {
  it("passes when the game opens and plays", async () => {
    const out = await newGameCheck("r1", 2);
    expect(out.failure).toBeNull();
    expect(out.place).toBe("Drawn Town");
    expect(out.steps.map((s) => s.route)).toEqual([
      "POST /api/newlife?seed=r1",
      "POST /api/advance?mode=week",
      "POST /api/advance?mode=week",
      "GET /api/scene?id=p1",
      "GET /api/journal",
    ]);
  });

  it("fails on a refused week, naming the route", async () => {
    replies["POST /api/advance"] = {
      status: 400,
      body: '{"error":"Answer the open choice or stop first."}',
    };
    const out = await newGameCheck("r2", 2);
    delete replies["POST /api/advance"];
    expect(out.failure?.route).toBe("POST /api/advance?mode=week");
    expect(out.failure?.body).toMatch(/open choice/);
  });

  it("fails when a stop never clears", async () => {
    replies["POST /api/advance"] = {
      status: 200,
      body: JSON.stringify({ packet: { kind: "stop", pauseId: "x" } }),
    };
    replies["POST /api/resume"] = replies["POST /api/advance"];
    const out = await newGameCheck("r3", 1);
    delete replies["POST /api/advance"];
    delete replies["POST /api/resume"];
    expect(out.failure?.route).toBe("POST /api/resume?pauseId=x");
    expect(out.failure?.body).toMatch(/stuck/);
  });

  it("a crash inside a day is thrown, not passed", async () => {
    replies.crash = { status: 0, body: "" };
    await expect(newGameCheck("r4", 1)).rejects.toThrow(/simulated crash/);
    delete replies.crash;
  });
});
