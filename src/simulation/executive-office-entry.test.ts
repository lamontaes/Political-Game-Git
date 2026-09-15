import { describe, expect, it } from "vitest";
import { passOrdinaryDays } from "../presentation/ordinary-life";
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
import {
  initializeExecutiveOfficePremiseForReview,
  planElectedExecutiveOfficeTerm,
  recordElectedExecutiveQualification,
} from "./executive-work-entry";
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
import {
  applyExecutivePlayTransition,
  executivePlayHandlers,
} from "../presentation/executive-entry";
import { deserializeWorld, serializeWorld } from "./serialization";
import { advanceWorld } from "./world";
import type { World } from "./types";

const contestHandlers = createFutureTransitionHandlerRegistry([
  [ELECTION_CONTEST_TRANSITION_KEY, electionContestTransitionHandler],
]);

const RECORDED_TERM_NOTE =
  "Recorded consumer-proof term boundaries for this executive consumer. Not sourced Kentucky gubernatorial commencement or duration, not House/Senate January-first dates, and not national presidential noon.";

const RECORDED_QUALIFICATION_NOTE =
  "Recorded consumer-proof qualification for dated term entry. Not sourced Kentucky governor eligibility and not inferred from winning.";

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
      note: "Supplied recorded executive contest result for consumer proof; not an ordinary gubernatorial campaign producer.",
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

function daysBetween(from: World["currentDate"], to: World["currentDate"]) {
  let days = 0;
  let cursor = from;
  while (cursor < to) {
    cursor = addDays(cursor, 1);
    days += 1;
  }
  return days;
}

function connectRecordedTerm(
  world: World,
  options: { qualify?: boolean } = {},
) {
  const contest = world.history.electionContests!.at(-1)!;
  const result = world.history.electionContestResults!.at(-1)!;
  const outcome = world.history.events.find(
    (event) => event.id === result.outcomeEventId,
  )!;
  const startsAt = addDays(world.currentDate, 4);
  const endsAt = addDays(startsAt, 5);
  expect(startsAt).not.toBe(outcome.occurredAt);
  let next = planElectedExecutiveOfficeTerm(world, {
    contestId: contest.id,
    startsAt,
    endsAt,
    termNote: RECORDED_TERM_NOTE,
  });
  if (options.qualify !== false) {
    next = recordElectedExecutiveQualification(next, {
      contestId: contest.id,
      personId: result.winnerPersonId,
      qualificationNote: RECORDED_QUALIFICATION_NOTE,
    });
  }
  return { world: next, startsAt, endsAt, contest, result, outcome };
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
  it("does not treat a recorded result as occupancy and keeps Custom Start distinct", () => {
    const resolved = runGovernorContest(kentuckyWorld("exec-elected-winner"));
    const result = resolved.history.electionContestResults!.at(-1)!;
    const afterResult = synchronizeExecutiveInbox(
      withControl(resolved, result.winnerPersonId),
    );
    expect(resolveExecutiveOffice(afterResult)).toBeNull();
    expect(
      afterResult.history.events.some(
        (event) => event.type === "executive.custom-start",
      ),
    ).toBe(false);

    const custom = initializeExecutiveOfficePremiseForReview(
      kentuckyWorld("exec-custom-start-distinct"),
      EXECUTIVE_AUTHORITY_RULE_PACKS.find(
        (pack) => pack.jurisdictionKey === "US-KY",
      )!.packId,
      "2026-02-05",
    );
    const office = resolveExecutiveOffice(custom)!;
    expect(office.origin).toBe("custom-start");
    expect(office.entry.type).toBe("executive.custom-start");
    expect(custom.history.electionContestResults ?? []).toEqual([]);
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
    const connected = connectRecordedTerm(
      withControl(resolved, result.winnerPersonId),
    ).world;
    const entered = advanceWorld(
      connected,
      daysBetween(connected.currentDate, addDays(connected.currentDate, 4)),
      executivePlayHandlers(),
    );
    expect(resolveExecutiveOffice(entered)?.personId).toBe(
      result.winnerPersonId,
    );
    const loserWorld = withControl(entered, loserId);
    expect(resolveExecutiveOffice(loserWorld)).toBeNull();
    const publicEvent = entered.history.events.find(
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

  it("connects a public election outcome to News without treating the result as possession", () => {
    const before = kentuckyWorld("exec-public-news");
    const resolved = runGovernorContest(before);
    const result = resolved.history.electionContestResults!.at(-1)!;
    const next = applyExecutivePlayTransition(
      before,
      withControl(resolved, result.winnerPersonId),
    );
    expect(resolveExecutiveOffice(next)).toBeNull();
    const outcome = next.history.events.find(
      (event) => event.type === "election.contest-resolved",
    )!;
    const digest = projectPublicInformationDigest(
      next,
      outcome.jurisdictionId!,
    );
    expect(digest.items.some((item) => item.sourceEventId === outcome.id)).toBe(
      true,
    );

    const privateWorld = occurKnownIncident(next, "private");
    const onset = privateWorld.history.incidents.at(-1)!.onsetEventId;
    expect(() =>
      publishIncidentEvent(privateWorld, onset, { publishPublicEvent }),
    ).toThrow(/already-public/);
  });

  it("grants active-term access after recorded dates and keeps it on reload", () => {
    const resolved = runGovernorContest(kentuckyWorld("exec-term-access"));
    const result = resolved.history.electionContestResults!.at(-1)!;
    const connected = connectRecordedTerm(
      withControl(resolved, result.winnerPersonId),
    );
    expect(resolveExecutiveOffice(connected.world)).toBeNull();
    const entered = advanceWorld(
      connected.world,
      daysBetween(connected.world.currentDate, connected.startsAt),
      executivePlayHandlers(),
    );
    const office = resolveExecutiveOffice(entered)!;
    expect(office.origin).toBe("elected-term");
    expect(office.entry.type).toBe("election.contest-resolved");
    expect(office.pack.office.officeKey).toBe("us-ky-governor");
    expect(office.relationship.startedAt).toBe(connected.startsAt);
    expect(office.relationship.startedAt).not.toBe(
      connected.outcome.occurredAt,
    );
    expect(office.entry.tags).not.toContain("executive.custom-start");
    const restored = deserializeWorld(serializeWorld(entered));
    const reloaded = resolveExecutiveOffice(restored)!;
    expect(reloaded.origin).toBe("elected-term");
    expect(reloaded.relationship.id).toBe(office.relationship.id);
    expect(reloaded.endsAt).toBe(connected.endsAt);

    const withReport = occurKnownIncident(restored, "public");
    const onset = withReport.history.incidents.at(-1)!.onsetEventId;
    const inboxWorld = recordKnownIncidentForCurrentOffice(withReport, onset);
    const report = inboxWorld.history.events.find(
      (event) => event.type === "incident.response.report",
    )!;
    expect(
      inboxWorld.history.workItems.some(
        (item) =>
          item.stableKey ===
          `executive-inbox:${office.relationship.id}:${report.id}`,
      ),
    ).toBe(true);
  });

  it("refuses before the recorded start and after the recorded end", () => {
    const resolved = runGovernorContest(kentuckyWorld("exec-term-refusal"));
    const result = resolved.history.electionContestResults!.at(-1)!;
    const winnerWorld = withControl(resolved, result.winnerPersonId);
    expect(() =>
      planElectedExecutiveOfficeTerm(winnerWorld, {
        contestId: winnerWorld.history.electionContests!.at(-1)!.id,
        startsAt: winnerWorld.history.events.find(
          (event) => event.id === result.outcomeEventId,
        )!.occurredAt,
        endsAt: addDays(winnerWorld.currentDate, 10),
        termNote: RECORDED_TERM_NOTE,
      }),
    ).toThrow(/provenance, not the office start/);

    const unqualified = connectRecordedTerm(winnerWorld, { qualify: false });
    const throughStartUnqualified = passOrdinaryDays(
      unqualified.world,
      daysBetween(unqualified.world.currentDate, unqualified.startsAt),
      executivePlayHandlers(),
    );
    expect(resolveExecutiveOffice(throughStartUnqualified)).toBeNull();

    const connected = connectRecordedTerm(winnerWorld);
    expect(resolveExecutiveOffice(connected.world)).toBeNull();
    expect(() =>
      receiveExecutiveWork(
        connected.world,
        connected.outcome.id,
        "Inbox",
        connected.outcome.summary,
      ),
    ).toThrow(/No current executive office/);

    const entered = passOrdinaryDays(
      connected.world,
      daysBetween(connected.world.currentDate, connected.startsAt),
      executivePlayHandlers(),
    );
    expect(resolveExecutiveOffice(entered)?.origin).toBe("elected-term");
    const expired = passOrdinaryDays(
      entered,
      daysBetween(entered.currentDate, connected.endsAt),
      executivePlayHandlers(),
    );
    expect(resolveExecutiveOffice(expired)).toBeNull();
    expect(() =>
      receiveExecutiveWork(
        expired,
        connected.outcome.id,
        "Inbox",
        connected.outcome.summary,
      ),
    ).toThrow(/No current executive office/);
  });
});
