import { addSimulationMinutes } from "./dates";
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
  performCareerWork,
  resignCareer,
  acceptCareerResponsibilities,
  careerEligibility,
} from "./career-path7";
import { CAREER_PROVIDERS } from "../presentation/career-path7-provider";
import {
  enterLifePath,
  scheduleLifePathSession,
  performLifePathSession,
  hasLifePathCredential,
  LIFE_PATHS2_HANDLERS,
  changeLifePathStatus,
} from "./life-paths2";
import { workStatusAt } from "./life-queries";
import {
  scheduledActivityState,
  advanceWorldMinutes,
  createScheduledActivity,
} from "./time-work";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
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
    openingBalance: money(100000, "USD"),
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
      const done = performCareerWork(w, id, p);
      expect(done.ok).toBe(true);
      w = done.world;
      expect(
        w.history.events.filter((e) => e.type === "life-paths2.work-session"),
      ).toHaveLength(i + 1);
      expect(
        completeCareerTask(
          w,
          id,
          p,
          w.history.scheduledActivities.at(-1)!.id,
          "Duplicate submission is forbidden.",
        ).world,
      ).toBe(w);
    }
    expect(
      w.history.events.filter((e) => e.type === "career-path7.deliverable"),
    ).toHaveLength(0);
    expect(
      w.history.events.filter((e) => e.type === "career-path7.work-record"),
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
  it("switches jobs only after actually completing required training", () => {
    let w = fixture();
    const repair = CAREER_PROVIDERS.find((p) => p.pathId === "repair-worker")!;
    expect(seekCareerOffer(w, repair).ok).toBe(false);
    w = seekCareerOffer(w, p).world;
    const old = w.history.workRelationships.at(-1)!.id;
    w = respondCareerOffer(w, old, p, true).world;
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    w = startCareerWork(w, old, p).world;
    w = resignCareer(w, old, p).world;
    w = enterLifePath(w, "trade-training").world;
    const enrollment = w.history.educationEnrollments.at(-1)!.id;
    expect(
      hasLifePathCredential(
        w,
        w.personOrder[0]!,
        "training:repair-certificate",
      ),
    ).toBe(false);
    for (let i = 0; i < 12; i++) {
      const scheduled = scheduleLifePathSession(w, enrollment);
      expect(scheduled.ok).toBe(true);
      w = scheduled.world;
      const attended = performLifePathSession(
        w,
        w.history.scheduledActivities.at(-1)!.id,
      );
      expect(attended.ok).toBe(true);
      w = attended.world;
    }
    expect(
      hasLifePathCredential(
        w,
        w.personOrder[0]!,
        "training:repair-certificate",
      ),
    ).toBe(true);
    w = seekCareerOffer(w, repair).world;
    const next = w.history.workRelationships.at(-1)!;
    expect(next.organizationId).not.toBe(
      w.history.workRelationships.find((r) => r.id === old)!.organizationId,
    );
    w = respondCareerOffer(w, next.id, repair, true).world;
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    w = startCareerWork(w, next.id, repair).world;
    expect(workStatusAt(w, old)?.status).toBe("ended");
    expect(workStatusAt(w, next.id)?.status).toBe("active");
    expect(
      deserializeWorld(serializeWorld(w)).history.workRelationships,
    ).toEqual(w.history.workRelationships);
  });
  it("covers every source task in the declared three LIFE work contexts", () => {
    expect(CAREER_PROVIDERS.map((p) => p.tasks.length)).toEqual([24, 20, 18]);
    for (const provider of CAREER_PROVIDERS)
      expect(new Set(provider.tasks.map((t) => t.id)).size).toBe(
        provider.tasks.length,
      );
  });
});

function employed() {
  let w = fixture();
  w = seekCareerOffer(w, p).world;
  const id = w.history.workRelationships.at(-1)!.id;
  w = respondCareerOffer(w, id, p, true).world;
  w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
  w = startCareerWork(w, id, p).world;
  return { w, id };
}

function sessions(w: ReturnType<typeof fixture>, id: EntityId) {
  return w.history.events.filter(
    (e) =>
      e.type === "life-paths2.work-session" && e.involvedEntityIds.includes(id),
  );
}

describe("ordinary work without mandatory submissions and during fast-forward", () => {
  it("keeps optional historical submissions and refuses a too-short offered text", () => {
    let { w, id } = employed();
    w = scheduleCareerTask(w, id, p, p.tasks[0]!.id).world;
    const a = w.history.scheduledActivities.at(-1)!;
    expect(completeCareerTask(w, id, p, a.id, "short").ok).toBe(false);
    const recorded = completeCareerTask(
      w,
      id,
      p,
      a.id,
      "Submitted the completed customer request and stock record.",
    );
    expect(recorded.ok).toBe(true);
    w = recorded.world;
    expect(
      w.history.events.some((e) => e.type === "career-path7.deliverable"),
    ).toBe(true);
    const saved = serializeWorld(w);
    expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
  });
  it("earns pay after Perform work with no written report", () => {
    let { w, id } = employed();
    expect(performCareerWork(w, id, p).ok).toBe(true);
    w = performCareerWork(w, id, p).world;
    expect(sessions(w, id)).toHaveLength(1);
    expect(
      w.history.events.some((e) => e.type === "career-path7.deliverable"),
    ).toBe(false);
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    expect(w.history.resourceTransferOutcomes).toHaveLength(1);
    expect(
      w.history.resourceTransferOutcomes[0]?.transferredAmount.minorUnits,
    ).toBe(7200);
  });
  it("completes the authored 09:00–13:00 shift once when skipping to 20:00", () => {
    const { w, id } = employed();
    const skipped = advanceWorldMinutes(w, 20 * 60, LIFE_PATHS2_HANDLERS);
    expect(skipped.currentMoment.minuteOfDay).toBe(20 * 60);
    expect(sessions(skipped, id)).toHaveLength(1);
    expect(skipped.history.resourceTransferOutcomes).toHaveLength(0);
    const paid = advanceWorld(skipped, 1, LIFE_PATHS2_HANDLERS);
    expect(paid.history.resourceTransferOutcomes).toHaveLength(1);
  });
  it("uses the same shared clock registry the ordinary day surface composes", () => {
    const { w, id } = employed();
    const skipped = advanceWorldMinutes(
      w,
      20 * 60,
      createCampaignElectionTransitionRegistry(),
    );
    expect(sessions(skipped, id)).toHaveLength(1);
    expect(skipped.currentMoment.minuteOfDay).toBe(20 * 60);
  });
  it("does not invent work when unemployed or interrupted, and does not double a completed day", () => {
    const idle = advanceWorldMinutes(fixture(), 20 * 60, LIFE_PATHS2_HANDLERS);
    expect(
      idle.history.events.filter((e) => e.type === "life-paths2.work-session"),
    ).toHaveLength(0);
    let { w, id } = employed();
    w = changeLifePathStatus(w, id, "pause").world;
    expect(
      sessions(advanceWorldMinutes(w, 20 * 60, LIFE_PATHS2_HANDLERS), id),
    ).toHaveLength(0);
    const once = employed();
    const evening = advanceWorldMinutes(once.w, 18 * 60, LIFE_PATHS2_HANDLERS);
    expect(sessions(evening, once.id)).toHaveLength(1);
    const later = advanceWorldMinutes(evening, 2 * 60, LIFE_PATHS2_HANDLERS);
    expect(sessions(later, once.id)).toHaveLength(1);
  });
  it("stops for a conflicting appointment instead of overlapping ordinary work", () => {
    let { w, id } = employed();
    const actor =
      w.control.kind === "person" ? w.control.personId : w.personOrder[0]!;
    const start = addSimulationMinutes(w.currentMoment, 10 * 60);
    w = createScheduledActivity(w, {
      stableKey: "test:conflicting-appointment",
      title: "Political meeting",
      summary: "A commitment that still requires this person.",
      kind: "confirmed",
      start,
      end: addSimulationMinutes(start, 60),
      participantPersonIds: [actor],
      responsiblePersonId: actor,
      location: {
        locationKey: "meeting",
        label: "Meeting",
        jurisdictionId: null,
      },
      sourceEntityIds: [w.history.events[0]!.id],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [actor] },
    });
    const skipped = advanceWorldMinutes(w, 20 * 60, LIFE_PATHS2_HANDLERS);
    expect(skipped.currentMoment.minuteOfDay).toBe(10 * 60);
    expect(sessions(skipped, id)).toHaveLength(0);
  });
  it("matches long and short skips for work and pay, and survives a mid-window save", () => {
    const longStart = employed();
    const long = advanceWorldMinutes(
      longStart.w,
      3 * 1440,
      LIFE_PATHS2_HANDLERS,
    );
    expect(sessions(long, longStart.id)).toHaveLength(3);
    expect(long.history.resourceTransferOutcomes).toHaveLength(3);
    let short = employed();
    for (let i = 0; i < 3; i++)
      short = {
        w: advanceWorldMinutes(short.w, 1440, LIFE_PATHS2_HANDLERS),
        id: short.id,
      };
    expect(sessions(short.w, short.id)).toHaveLength(3);
    expect(short.w.history.resourceTransferOutcomes).toHaveLength(3);
    let mid = employed();
    mid = {
      w: advanceWorldMinutes(mid.w, 10 * 60, LIFE_PATHS2_HANDLERS),
      id: mid.id,
    };
    expect(sessions(mid.w, mid.id)).toHaveLength(0);
    const restored = deserializeWorld(serializeWorld(mid.w));
    const finished = advanceWorldMinutes(
      restored,
      10 * 60,
      LIFE_PATHS2_HANDLERS,
    );
    expect(sessions(finished, mid.id)).toHaveLength(1);
    expect(finished.currentMoment.minuteOfDay).toBe(20 * 60);
  });
});
