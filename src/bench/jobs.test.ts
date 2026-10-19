import { describe, expect, it, vi } from "vitest";
import type { CoreState } from "../core2/types";
const engine = vi.hoisted(() => ({
  accept: vi.fn(() => true),
  decline: vi.fn(() => true),
  offers: vi.fn(() => [
    {
      id: "offer",
      organizationId: "employer",
      title: "Clerk",
      hourlyMinor: 1500,
      offeredAt: "2025-01-01",
      deadline: "2025-01-10",
    },
  ]),
}));
vi.mock("../core2/state", () => ({ coreAPI: (value: unknown) => value }));
vi.mock("../core2/modules/jobs", () => ({
  JOBS_MODULE_ID: "jobs",
  jobOffersFor: engine.offers,
  acceptJobOffer: engine.accept,
  declineJobOffer: engine.decline,
}));
import { answerJobOffer, jobsView } from "./jobs";
const core = {
  modules: new Map([["jobs", {}]]),
  organizations: new Map([["employer", { name: "Recorded employer" }]]),
} as unknown as CoreState;
describe("job offer screen boundary", () => {
  it("reads employer records and restricts answers to the person's pending offers", () => {
    expect(jobsView(core, "player").offers[0]?.employer).toBe(
      "Recorded employer",
    );
    expect(engine.offers).toHaveBeenLastCalledWith(core, "player");
    expect(() =>
      answerJobOffer(core, "player", "other-offer", "accept"),
    ).toThrow();
    expect(engine.accept).not.toHaveBeenCalled();
    expect(() => answerJobOffer(core, "player", "offer", "anything")).toThrow();
    expect(answerJobOffer(core, "player", "offer", "accept").answered).toBe(
      true,
    );
    expect(engine.accept).toHaveBeenCalledExactlyOnceWith(core, "offer");
    expect(answerJobOffer(core, "player", "offer", "decline").answered).toBe(
      true,
    );
    expect(engine.decline).toHaveBeenCalledExactlyOnceWith(core, "offer");
  });
});
