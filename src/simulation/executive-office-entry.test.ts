import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { createDemoWorld } from "./demo";
import { LEXINGTON_DEMO_CONTEXT } from "./demo-jurisdiction-context";
import { stateJurisdictionForKey } from "./life-places";
import {
  ELECTION_CONTEST_TRANSITION_KEY,
  electionContestTransitionHandler,
  resolveElectionContest,
  scheduleElectionContest,
} from "./election-contests";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import { initializeExecutiveOfficePremiseForReview } from "./executive-work-entry";
import { resolveExecutiveOffice } from "./executive-work-context";
import {
  receiveExecutiveWork,
  synchronizeExecutiveInbox,
} from "./executive-work";
import { EXECUTIVE_AUTHORITY_RULE_PACKS } from "./executive-authority-rule-packs";
import { evaluateIncident, occurIncident } from "./incidents";
import {
  publishIncidentEvent,
  recordKnownIncidentForCurrentOffice,
  receiveExecutiveWorkIfCurrentOffice,
} from "./incident-response";
import {
  projectPublicInformationDigest,
  publishPublicEvent,
} from "./public-information";
import { applyExecutivePlayTransition } from "../presentation/executive-entry";
import { advanceWorld } from "./world";
import type { World } from "./types";

const contestHandlers = createFutureTransitionHandlerRegistry([
  [ELECTION_CONTEST_TRANSITION_KEY, electionContestTransitionHandler],
]);

function kentuckyWorld(seed: string): World {
  const jurisdiction = stateJurisdictionForKey("US-KY")!;
  const world = createDemoWorld(seed, {
    context: {
      ...LEXINGTON_DEMO_CONTEXT,
      jurisdiction,
      initialMoment: {
        date: "2026-01-05" as World["currentDate"],
        minuteOfDay: 550,
        timeZone: "America/New_York",
        utcOffsetMinutes: -300,
      },
      creationSummary: "Elected executive entry test world.",
    },
  });
  return {
    ...world,
    control: { kind: "person", personId: world.personOrder[0]! },
  };
}

function runGovernorContest(world: World): World {
  const winner = world.personOrder[0]!;
  const rival = world.personOrder[1]!;
  const jurisdictionId = stateJurisdictionForKey("US-KY")!.id;
  const electionDate = addDays(world.currentDate, 1);
  let next = scheduleElectionContest(world, {
    stableKey: `ky-governor:${world.seed}`,
    jurisdictionId,
    office: {
      officeKey: "us-ky-governor",
      title: "Governor",
      seatKey: null,
      occupationClassification: "service:us-ky-governor",
    },
    electionDate,
    candidatePersonIds: [winner, rival],
    provenance: {
      method: "authored",
      sourceEntityIds: [],
      note: "Supported executive contest for ordinary office entry.",
    },
  });
  next = advanceWorld(next, 1, contestHandlers);
  const contest = next.history.electionContests!.at(-1)!;
  if (
    !next.history.electionContestResults?.some(
      (r) => r.contestId === contest.id,
    )
  ) {
    next = resolveElectionContest(next, {
      contestId: contest.id,
      resolvedAt: next.currentDate,
      winnerPersonId: winner,
      tallies: [
        { candidatePersonId: winner, votes: 8, voteShare: 0.8 },
        { candidatePersonId: rival, votes: 2, voteShare: 0.2 },
      ],
    });
  }
  return next;
}

function withControl(
  world: World,
  personId: World["personOrder"][number],
): World {
  return { ...world, control: { kind: "person", personId } };
}

function occurKnownIncident(world: World, visibility: "public" | "private") {
  const personId =
    world.control.kind === "person"
      ? world.control.personId
      : world.personOrder[0]!;
  const jurisdictionId = stateJurisdictionForKey("US-KY")!.id;
  const definitionId = Object.values(world.incidentCatalog.definitions).find(
    (definition) => definition.occurrenceMode === "actor-initiated",
  )!.id;
  const share = { numerator: 1, denominator: 1, unit: "rate:share" as const };
  const evaluation = evaluateIncident(world, {
    definitionId,
    evaluationKey: `exec-entry:${visibility}`,
    scope: { jurisdictionId, segmentKey: null },
    evaluatedAt: world.currentDate,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    exposure: share,
    vulnerability: share,
    resilience: share,
    consequences: [],
  });
  return occurIncident(world, {
    stableKey: `exec-entry-incident:${visibility}`,
    evaluation,
    actorPersonId: personId,
    summary:
      visibility === "public"
        ? "A public civic disruption was recorded in the jurisdiction."
        : "A private staff briefing stayed inside the office.",
    visibility,
  });
}

describe("ordinary elected executive entry", () => {
  it("seats the recorded winner using the contest result, not Custom Start", () => {
    const resolved = runGovernorContest(kentuckyWorld("exec-elected-winner"));
    const result = resolved.history.electionContestResults!.at(-1)!;
    const seated = synchronizeExecutiveInbox(
      withControl(resolved, result.winnerPersonId),
    );
    const office = resolveExecutiveOffice(seated)!;
    expect(office.origin).toBe("elected-term");
    expect(office.entry.type).toBe("election.contest-resolved");
    expect(office.pack.office.officeKey).toBe("us-ky-governor");
    expect(office.entry.tags).not.toContain("executive.custom-start");
    expect(
      seated.history.events.some(
        (event) => event.type === "executive.custom-start",
      ),
    ).toBe(false);
  });

  it("keeps Custom Start distinct from winning office", () => {
    const world = initializeExecutiveOfficePremiseForReview(
      kentuckyWorld("exec-custom-start-distinct"),
      EXECUTIVE_AUTHORITY_RULE_PACKS.find(
        (pack) => pack.jurisdictionKey === "US-KY",
      )!.packId,
      "2026-02-05",
    );
    const office = resolveExecutiveOffice(world)!;
    expect(office.origin).toBe("custom-start");
    expect(office.entry.type).toBe("executive.custom-start");
    expect(world.history.electionContestResults ?? []).toEqual([]);
  });

  it("refuses unheld power and a contest that is not a supported executive office", () => {
    let world = kentuckyWorld("exec-unheld-mayor");
    const winner = world.personOrder[0]!;
    const rival = world.personOrder[1]!;
    world = scheduleElectionContest(world, {
      stableKey: "lexington-mayor:unheld",
      jurisdictionId: world.jurisdictionOrder[0]!,
      office: {
        officeKey: "mayor",
        title: "Mayor",
        seatKey: null,
        occupationClassification: "occupation:elected-official",
      },
      electionDate: addDays(world.currentDate, 1),
      candidatePersonIds: [winner, rival],
      provenance: {
        method: "authored",
        sourceEntityIds: [],
        note: "Unsupported local office, not an executive pack.",
      },
    });
    world = advanceWorld(world, 1, contestHandlers);
    world = synchronizeExecutiveInbox(world);
    expect(resolveExecutiveOffice(world)).toBeNull();
    expect(() =>
      receiveExecutiveWork(
        world,
        world.history.events.at(-1)!.id,
        "Inbox",
        "No office.",
      ),
    ).toThrow(/No current executive office/);
  });

  it("does not seat a rival or grant the loser's inbox", () => {
    const resolved = runGovernorContest(kentuckyWorld("exec-loser-refusal"));
    const result = resolved.history.electionContestResults!.at(-1)!;
    const loserId = resolved.personOrder.find(
      (id) => id !== result.winnerPersonId,
    )!;
    const seated = synchronizeExecutiveInbox(
      withControl(resolved, result.winnerPersonId),
    );
    expect(resolveExecutiveOffice(seated)?.personId).toBe(
      result.winnerPersonId,
    );
    const loserWorld = withControl(seated, loserId);
    expect(resolveExecutiveOffice(loserWorld)).toBeNull();
    const publicEvent = seated.history.events.find(
      (event) => event.type === "election.contest-resolved",
    )!;
    expect(
      receiveExecutiveWorkIfCurrentOffice(
        loserWorld,
        publicEvent.id,
        "Inbox",
        publicEvent.summary,
      ),
    ).toBe(loserWorld);
  });

  it("connects a public election outcome to News and keeps private incidents unpublished", () => {
    const before = kentuckyWorld("exec-public-news");
    const resolved = runGovernorContest(before);
    const result = resolved.history.electionContestResults!.at(-1)!;
    const next = applyExecutivePlayTransition(
      before,
      withControl(resolved, result.winnerPersonId),
    );
    const office = resolveExecutiveOffice(next)!;
    expect(office.origin).toBe("elected-term");
    const digest = projectPublicInformationDigest(next, office.jurisdictionId);
    expect(
      digest.items.some((item) => item.sourceEventId === office.entry.id),
    ).toBe(true);

    const privateWorld = occurKnownIncident(next, "private");
    const onset = privateWorld.history.incidents.at(-1)!.onsetEventId;
    expect(() =>
      publishIncidentEvent(privateWorld, onset, { publishPublicEvent }),
    ).toThrow(/already-public/);
  });

  it("routes a known public report into the held office inbox", () => {
    const resolved = runGovernorContest(kentuckyWorld("exec-inbox-report"));
    const result = resolved.history.electionContestResults!.at(-1)!;
    let world = synchronizeExecutiveInbox(
      withControl(resolved, result.winnerPersonId),
    );
    const office = resolveExecutiveOffice(world)!;
    world = occurKnownIncident(world, "public");
    const onset = world.history.incidents.at(-1)!.onsetEventId;
    world = recordKnownIncidentForCurrentOffice(world, onset);
    const report = world.history.events.find(
      (event) => event.type === "incident.response.report",
    )!;
    expect(
      world.history.workItems.some(
        (item) =>
          item.stableKey ===
          `executive-inbox:${office.relationship.id}:${report.id}`,
      ),
    ).toBe(true);
  });
});
