import type { EntityId } from "./types";
import { describe, it, expect } from "vitest";
import {
  createDemoWorld,
  createWorld,
  serializeWorld,
  deserializeWorld,
  advanceWorld,
  createResourcePosition,
  money,
} from "./index";
import {
  startCareerWork,
  seekCareerOffer,
  respondCareerOffer,
  scheduleCareerTask,
  completeCareerTask,
  resignCareer,
  acceptCareerResponsibilities,
  careerEligibility,
} from "./career-path7";
import { CAREER_PROVIDERS } from "../presentation/career-path7-provider";
import { LIFE_PATHS2_HANDLERS } from "./life-paths2";
import { workStatusAt } from "./life-queries";
import { scheduledActivityState } from "./time-work";
const p = CAREER_PROVIDERS[0]!;
function fixture() {
  const d = createDemoWorld("career-path7");
  let w = createWorld({
    seed: d.seed,
    currentDate: d.currentDate,
    jurisdictions: d.jurisdictionOrder.map((id) => d.jurisdictions[id]!),
    people: d.personOrder.map((id) => d.people[id]!),
    control: { kind: "person", personId: d.personOrder[0]! },
  });
  w = createResourcePosition(w, {
    stableKey: "career-funds",
    owner: { kind: "person", personId: d.personOrder[0]! },
    openedAt: w.currentDate,
    openingBalance: money(0, "USD"),
    provenance: { kind: "authored", note: "Synthetic test account." },
  });
  return w;
}
describe("CAREER-PATH7 source tasks through canonical LIFE work", () => {
  it("keeps discovery pure; rejects missing qualifications and invalid offers", () => {
    const w = fixture();
    const before = serializeWorld(w);
    expect(careerEligibility(w, p)).toBeNull();
    expect(
      seekCareerOffer(
        w,
        CAREER_PROVIDERS.find((p) => p.pathId === "repair-worker")!,
      ).ok,
    ).toBe(false);
    expect(serializeWorld(w)).toBe(before);
    expect(respondCareerOffer(w, "absent" as EntityId, p, true).world).toBe(w);
  });
  it("issues, refuses, accepts, works, saves, changes responsibilities, resigns and pays only earned shifts", () => {
    let w = fixture();
    w = seekCareerOffer(w, p).world;
    const refused = w.history.workRelationships.at(-1)!;
    expect(workStatusAt(w, refused.id)?.status).toBe("expected");
    expect(w.history.resourceTransferOutcomes).toHaveLength(0);
    w = respondCareerOffer(w, refused.id, p, false).world;
    expect(workStatusAt(w, refused.id)?.status).toBe("ended");
    w = seekCareerOffer(w, p).world;
    const id = w.history.workRelationships.at(-1)!.id;
    w = respondCareerOffer(w, id, p, true).world;
    expect(respondCareerOffer(w, id, p, true).world).toBe(w);
    expect(startCareerWork(w, id, p).ok).toBe(false);
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    w = startCareerWork(w, id, p).world;
    expect(acceptCareerResponsibilities(w, id, p).ok).toBe(false);
    for (let i = 0; i < 2; i++) {
      const scheduled = scheduleCareerTask(w, id, p, p.tasks[i]!.id);
      expect(scheduled.ok).toBe(true);
      w = scheduled.world;
      const a = w.history.scheduledActivities.at(-1)!;
      expect(scheduleCareerTask(w, id, p, p.tasks[i]!.id).world).toBe(w);
      const done = completeCareerTask(
        w,
        id,
        p,
        a.id,
        "Submitted the completed customer request and stock record.",
      );
      expect(done.ok).toBe(true);
      w = done.world;
      expect(scheduledActivityState(w, a.id).status).toBe("completed");
      expect(
        completeCareerTask(w, id, p, a.id, "Duplicate submission is forbidden.")
          .world,
      ).toBe(w);
    }
    expect(
      w.history.events.filter((e) => e.type === "career-path7.deliverable"),
    ).toHaveLength(2);
    w = acceptCareerResponsibilities(w, id, p).world;
    expect(
      w.history.events.some((e) => e.type === "career-path7.responsibilities"),
    ).toBe(true);
    const saved = serializeWorld(w);
    w = deserializeWorld(saved);
    expect(serializeWorld(w)).toBe(saved);
    w = scheduleCareerTask(w, id, p, p.tasks[0]!.id).world;
    const cancelled = w.history.scheduledActivities.at(-1)!.id;
    w = resignCareer(w, id, p).world;
    expect(workStatusAt(w, id)?.status).toBe("ended");
    expect(scheduledActivityState(w, cancelled).status).toBe("cancelled");
    expect(scheduleCareerTask(w, id, p, p.tasks[0]!.id).world).toBe(w);
    w = advanceWorld(w, 2, LIFE_PATHS2_HANDLERS);
    expect(w.history.resourceTransferOutcomes).toHaveLength(2);
    expect(
      w.history.resourceTransferOutcomes.every(
        (o) => o.transferredAmount.minorUnits === 7200,
      ),
    ).toBe(true);
    expect(seekCareerOffer(w, p).ok).toBe(true);
  });
  it("covers every source task in the declared three LIFE work contexts", () => {
    expect(CAREER_PROVIDERS.map((p) => p.tasks.length)).toEqual([24, 20, 18]);
    for (const provider of CAREER_PROVIDERS)
      expect(new Set(provider.tasks.map((t) => t.id)).size).toBe(
        provider.tasks.length,
      );
  });
});
