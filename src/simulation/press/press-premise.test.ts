import { describe, expect, it } from "vitest";
import {
  advanceWorld,
  createCampaignElectionTransitionRegistry,
  createScenarioWorld,
} from "../index";
import { KENTUCKY_CONTEXT } from "../legislation-scenarios";
import type { World } from "../types";
import { recordWorldEvent } from "../world";
import {
  assignStory,
  discloseToReporter,
  ensurePressMediaOpening,
  ensurePressDeskSchedule,
  ensurePressStateCoverage,
  mediaOutlets,
  negotiateGroundRules,
  openMatter,
  dispositionsForLead,
  reporterRoles,
} from "./index";
import { PRESS_DESK_INTERVALS } from "./desk";

function oneSourceOutcome(standard: "gentler" | "tougher") {
  const scenario = createScenarioWorld(
    "press-premise-one-source-49",
    KENTUCKY_CONTEXT,
    { peopleCount: 5 },
  );
  const playerId = scenario.personOrder[0]!;
  const source = scenario.personOrder[1]!;
  let world: World = {
    ...scenario,
    control: { kind: "person", personId: playerId },
    playSettings: {
      challenge: "standard",
      notes: "full",
      saves: "free",
      personalLifeDepiction: "full",
      premises: {
        familyMoney: "ordinary",
        press: standard,
        ongoingMoneyCosts: "standard",
      },
    },
  };
  world = ensurePressMediaOpening(world, playerId);
  world = ensurePressStateCoverage(world, KENTUCKY_CONTEXT.jurisdiction.id);
  world = ensurePressDeskSchedule(world);
  const outlet = mediaOutlets(world).find(
    (candidate) => candidate.scope === "state",
  )!;
  const reporterId = reporterRoles(world, outlet.id)[0]!.personId;
  const heard = recordWorldEvent(world, {
    stableKey: `press-premise:${standard}:basis`,
    type: "life.overheard-remark",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    involvedEntityIds: [source],
    participants: [{ personId: source, role: "agency:witness", detail: null }],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary: "A source described a private committee payment.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const matter = openMatter(heard, {
    stableKey: `press-premise:${standard}:matter`,
    family: "M1",
    subjectPersonIds: [playerId],
    occurrenceId: null,
    originEventId: heard.history.events.at(-1)!.id,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
  });
  const agreement = negotiateGroundRules(matter.world, {
    stableKey: `press-premise:${standard}:agreement`,
    outletId: outlet.id,
    reporterPersonId: reporterId,
    sourcePersonId: source,
    leadId: null,
    terms: "background",
    attributionLabel: "a source",
  });
  const disclosure = discloseToReporter(agreement.world, {
    stableKey: `press-premise:${standard}:tip`,
    agreementId: agreement.agreement!.id,
    statement: "The committee made a private payment.",
    disclosedEventIds: [],
    leakedEvidenceArtifactIds: [],
    subjectPersonIds: [playerId],
    stance: null,
    worldTruth: "false",
    openLead: true,
    matterId: matter.matter.id,
  });
  const assigned = assignStory(disclosure.world, disclosure.leadId!);
  let later = assigned;
  const handlers = createCampaignElectionTransitionRegistry();
  const days =
    14 +
    PRESS_DESK_INTERVALS.sweepDays +
    PRESS_DESK_INTERVALS.routinePublishDays +
    PRESS_DESK_INTERVALS.holdRecheckDays;
  for (let day = 0; day < days; day += 1)
    later = advanceWorld(later, 1, handlers);
  return dispositionsForLead(later, disclosure.leadId!);
}

describe("press premise", () => {
  it("records the selected editorial standard on opening and later-founded outlets", () => {
    const scenario = createScenarioWorld("press-premise-49", KENTUCKY_CONTEXT, {
      peopleCount: 5,
    });
    const playerId = scenario.personOrder[0]!;
    let world: World = {
      ...scenario,
      control: { kind: "person" as const, personId: playerId },
      playSettings: {
        challenge: "standard" as const,
        notes: "full" as const,
        saves: "free" as const,
        personalLifeDepiction: "full" as const,
        premises: {
          familyMoney: "ordinary" as const,
          press: "tougher" as const,
          ongoingMoneyCosts: "standard" as const,
        },
      },
    };
    world = ensurePressMediaOpening(world, playerId);
    world = ensurePressStateCoverage(world, KENTUCKY_CONTEXT.jurisdiction.id);
    const outlets = mediaOutlets(world);
    expect(outlets.length).toBeGreaterThan(0);
    expect(
      outlets.every((outlet) => outlet.editorialStandard === "tougher"),
    ).toBe(true);
    const reporters = outlets.flatMap((outlet) =>
      reporterRoles(world, outlet.id),
    );
    expect(reporters.length).toBeGreaterThan(0);
    expect(
      reporters.every((reporter) =>
        ["medium", "high"].includes(reporter.persistence ?? ""),
      ),
    ).toBe(true);
    expect(
      reporters.every((reporter) =>
        ["medium", "high"].includes(reporter.conflict ?? ""),
      ),
    ).toBe(true);
  });

  it("tougher prints a single background source while gentler holds with reasons", () => {
    const gentle = oneSourceOutcome("gentler");
    const tough = oneSourceOutcome("tougher");
    expect(gentle.some((record) => record.decision === "held")).toBe(true);
    expect(tough.some((record) => record.decision === "published")).toBe(true);
    expect(gentle.every((record) => record.reasonKey.length > 0)).toBe(true);
    expect(tough.every((record) => record.reasonKey.length > 0)).toBe(true);
    process.stdout.write(
      `${JSON.stringify({ proof: "one-source-editorial", seed: "press-premise-one-source-49", gentler: gentle.map(({ decision, reasonKey }) => ({ decision, reasonKey })), tougher: tough.map(({ decision, reasonKey }) => ({ decision, reasonKey })) })}\n`,
    );
  });
});
