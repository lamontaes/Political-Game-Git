import { afterEach, describe, expect, it } from "vitest";
import {
  US_STATE_USPS,
  bindRuleCapabilityResolver,
  candidacyEligibility,
  deserializeWorld,
  searchLifePlaces,
  serializeWorld,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
  unadmittedRuleCapabilityResolver,
} from "../simulation";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  RuleCapabilityResolver,
  World,
} from "../simulation";
import {
  ELECTION_CONTEST_TRANSITION_KEY,
  campaignElectionTransitionHandler,
  createFutureTransitionHandlerRegistry,
  decideGoverningMatter,
  electionContestResult,
  governingMatters,
  governingOfficeForPerson,
  resolveCampaignElectionFromRecordedInput,
  stateExecutiveTermRule,
  termDatesAfterElection,
} from "../simulation";
import { resolveExecutiveOffice } from "../simulation/executive-work-context";
import { receiveExecutiveWork } from "../simulation/executive-work";
import { receiveExecutiveWorkIfCurrentOffice } from "../simulation/incident-response";
import { projectCampaign, spendAnAfternoon } from "./campaign-projection";
import {
  fileForStateExecutiveOffice,
  qualifyForStateExecutiveTerm,
  stateExecutiveCandidacyForPerson,
  stateExecutiveEntryStatus,
  stateExecutiveOfficeCalendar,
} from "./nationwide-candidacy";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { currentPublicOfficeholders } from "./opening-officeholders";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

function firstLocality(usps: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${usps}`,
    scope: "locality",
  })[0];
  if (!place) throw new Error(`No locality found for ${usps}.`);
  return place;
}

function adultLifeIn(usps: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: firstLocality(usps).key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

function runToElection(
  world: World,
  personId: EntityId,
  handlers?: FutureTransitionHandlerRegistry,
): World {
  let next = world;
  for (
    let step = 0;
    step < 60 && projectCampaign(next, personId).phase === "active";
    step += 1
  )
    next = passOrdinaryDays(next, 30, handlers ? { handlers } : {});
  return next;
}

function passUntil(world: World, date: string): World {
  let next = world;
  for (let step = 0; step < 200 && next.currentDate < date; step += 1)
    next = passOrdinaryDays(
      next,
      Math.max(1, Math.min(30, daysBetween(next.currentDate, date))),
    );
  return next;
}

/**
 * Test fixture only: a supplied result so every state's entry route can be
 * exercised with the player as winner. Not a forecast and not a real result.
 */
function suppliedWin(personId: EntityId): FutureTransitionHandlerRegistry {
  return createFutureTransitionHandlerRegistry([
    [
      ELECTION_CONTEST_TRANSITION_KEY,
      (atDate, due) => {
        const contest = (atDate.history.electionContests ?? []).find((c) =>
          due.entityIds.includes(c.id),
        );
        if (!contest || !contest.candidatePersonIds.includes(personId))
          return campaignElectionTransitionHandler(atDate, due);
        const resolved = resolveCampaignElectionFromRecordedInput(atDate, {
          contestId: contest.id,
          winnerPersonId: personId,
          tallies: contest.candidatePersonIds.map((candidatePersonId) => ({
            candidatePersonId,
            votes: candidatePersonId === personId ? 2 : 1,
            voteShare: candidatePersonId === personId ? 2 / 3 : 1 / 3,
          })),
          provenance: {
            method: "authored",
            sourceEntityIds: [],
            note: "Supplied fictional test result; not a forecast.",
          },
        });
        return {
          world: resolved,
          status: "resolved",
          reasonKey: null,
          context: "Supplied recorded-result fixture.",
          outcomeEventId: electionContestResult(resolved, contest.id)!
            .outcomeEventId,
        };
      },
    ],
  ]);
}

/** Test fixture only. Not a sourced term rule for any state. */
const FIXTURE_TERM_FACTS: RuleCapabilityResolver = (request) => ({
  ...unadmittedRuleCapabilityResolver(request),
  refusal: null,
  fields: request.fields.map((field) =>
    field === "term.years" || field === "term.start"
      ? {
          field,
          state: "ADMITTED" as const,
          value:
            field === "term.years"
              ? 4
              : {
                  kind: "reference-start",
                  referenceStart: "2022-03-01",
                  cycleYears: 4,
                },
          ruleScope: "state-constitution" as const,
          ruleVersion: "test-fixture-not-law-v1",
          validFrom: null,
          validThrough: null,
          source: null,
          reason: "Test fixture only; not a sourced rule.",
        }
      : unadmittedRuleCapabilityResolver({ ...request, fields: [field] })
          .fields[0]!,
  ),
});

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

const outcomes: Record<string, string> = {};

describe("GOVERNING all-fifty-state campaign -> office -> work (supplied win fixture)", () => {
  it.each([...US_STATE_USPS])(
    "%s: cycle filing, result, qualification, dated entry, first matters, a recorded consequence, reopen",
    (usps) => {
      const { world, personId } = adultLifeIn(usps, `governing-entry-${usps}`);
      const identity = stateExecutiveIdentity(usps)!;
      const candidacy = stateExecutiveCandidacyForPerson(world, personId)!;
      expect(candidacy.identity.officeKey).toBe(identity.officeKey);
      if (!candidacy.eligible) {
        // Refused with the exact RULES sentence, and nothing is written.
        expect(candidacy.blocks.length).toBeGreaterThan(0);
        expect(() => fileForStateExecutiveOffice(world, personId)).toThrow(
          candidacy.blocks[0]!.reason,
        );
        outcomes[usps] =
          `UNFINISHED refused:${candidacy.blocks[0]!.kind}: ${candidacy.blocks[0]!.reason}`;
        return;
      }
      const calendar = stateExecutiveOfficeCalendar(world, usps)!;
      const rule = stateExecutiveTermRule(usps)!;

      // Filing stands in the office's own regular election, not a fixed
      // number of days away.
      const filed = fileForStateExecutiveOffice(world, personId);
      const contest = filed.history.electionContests!.at(-1)!;
      expect(contest.electionDate).toBe(calendar.nextElection);
      expect(daysBetween(world.currentDate, contest.electionDate)).not.toBe(28);
      expect(stateExecutiveEntryStatus(filed, personId).kind).toBe(
        "pending-election",
      );

      const decided = runToElection(filed, personId, suppliedWin(personId));
      expect(projectCampaign(decided, personId).phase).toBe("won");
      // Never occupied on election night.
      expect(governingOfficeForPerson(decided, personId)).toBeNull();
      const planned = stateExecutiveEntryStatus(decided, personId);
      expect(planned.kind).toBe("awaiting-qualification");
      if (planned.kind !== "awaiting-qualification") return;
      const expected = termDatesAfterElection(rule, contest.electionDate);
      expect(planned.startsAt).toBe(expected.startsAt);
      expect(planned.endsAt).toBe(expected.endsAt);

      const qualified = qualifyForStateExecutiveTerm(decided, personId);
      const entered = passUntil(qualified, planned.startsAt);
      expect(stateExecutiveEntryStatus(entered, personId).kind).toBe(
        "in-office",
      );
      const office = governingOfficeForPerson(entered, personId)!;
      expect(office.officeKey).toBe(identity.officeKey);
      expect(office.termStartedAt).toBe(planned.startsAt);
      expect(
        currentPublicOfficeholders(entered).find(
          (holder) => holder.officeKey === identity.officeKey,
        )?.personId,
      ).toBe(personId);

      // The day after entry the office has its first matters.
      const working = passOrdinaryDays(entered, 2);
      // Matters of the office's previous holder stay on record; the new
      // governor's own first matters are these.
      const mine = (w: World) =>
        governingMatters(w, office.officeKey).filter(
          (m) => m.holderPersonId === personId,
        );
      const opening = mine(working);
      expect(opening.map((m) => m.family).sort()).toEqual([
        "agenda",
        "chief-of-staff",
      ]);
      expect(opening.every((m) => m.workItemId !== null)).toBe(true);

      // Team, agenda and one consequential executive task.
      const cos = opening.find((m) => m.family === "chief-of-staff")!;
      expect(cos.options).toHaveLength(3);
      let next = decideGoverningMatter(working, cos.id, cos.options[0]!.key);
      expect(next.ok).toBe(true);
      const agenda = mine(next.world).find((m) => m.family === "agenda")!;
      const priority = agenda.options.find((o) => o.key !== "priority:none")!;
      next = decideGoverningMatter(next.world, agenda.id, priority.key);
      expect(next.ok).toBe(true);
      const task = mine(next.world).find((m) => m.family === "implementation")!;
      expect(task.status).toBe("open");
      next = decideGoverningMatter(next.world, task.id, "pace:fast");
      expect(next.ok).toBe(true);
      const reported = passOrdinaryDays(next.world, 61);
      const outcome = reported.history.events.find(
        (event) =>
          event.type === "governing.outcome" &&
          event.tags.includes(`matter:${task.id}`),
      );
      expect(outcome?.visibility).toBe("public");

      const reopened = deserializeWorld(serializeWorld(reported));
      expect(governingOfficeForPerson(reopened, personId)?.officeKey).toBe(
        office.officeKey,
      );
      expect(
        mine(reopened).filter((m) =>
          ["chief-of-staff", "agenda", "implementation"].includes(m.family),
        ),
      ).toHaveLength(3);
      outcomes[usps] =
        `in office ${planned.startsAt} (${rule.basis.commencement}); ` +
        (outcome!.tags.find((tag) => tag.startsWith("implementation:")) ?? "");
    },
    240_000,
  );

  it("refuses another state's governorship as living elsewhere", () => {
    const { world, personId } = adultLifeIn("NV", "nationwide-entry-wrong");
    const kentucky = stateExecutiveIdentity("KY")!;
    const eligibility = candidacyEligibility(world, {
      personId,
      jurisdictionId: stateJurisdictionForKey("US-KY")!.id,
      officeKey: kentucky.officeKey,
      alreadyACandidate: false,
    });
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.blocks.map((block) => block.kind)).toContain(
      "lives-elsewhere",
    );
  });

  it("reports the per-state outcome summary", () => {
    console.info(
      `[governing-entry outcomes]\n${Object.entries(outcomes)
        .map(([usps, text]) => `${usps}: ${text}`)
        .join("\n")}`,
    );
    expect(Object.keys(outcomes)).toHaveLength(50);
  });
});

/** A campaign actually won on the shared clock; seeds are tried, results are never supplied. */
function wonKentuckyCampaign() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { world, personId } = adultLifeIn(
      "KY",
      `nationwide-dated-${attempt}`,
    );
    let next = fileForStateExecutiveOffice(world, personId);
    next = spendAnAfternoon(next, personId, "fundraising");
    for (let day = 0; day < 3; day += 1) {
      next = passOrdinaryDays(next);
      next = spendAnAfternoon(next, personId, "outreach");
    }
    next = runToElection(next, personId);
    if (projectCampaign(next, personId).phase === "won")
      return { world: next, personId, attempt };
  }
  throw new Error("No tried seed produced a simulated Kentucky win.");
}

describe("NATIONWIDE ordinary state executive entry once term facts are admitted (test fixture, not law)", () => {
  it("won contest -> dated term -> qualification -> entry -> governed action -> reopen", () => {
    bindRuleCapabilityResolver(FIXTURE_TERM_FACTS);
    const { world, personId, attempt } = wonKentuckyCampaign();
    console.info(
      `[nationwide-entry dated route] won on seed attempt ${attempt}`,
    );
    const kentucky = stateExecutiveIdentity("KY")!;

    const planned = stateExecutiveEntryStatus(world, personId);
    expect(planned.kind).toBe("awaiting-qualification");
    if (planned.kind !== "awaiting-qualification") return;
    // The admitted fixture's reference start follows the regular election.
    expect(planned.startsAt).toBe("2030-03-01");
    expect(planned.endsAt).toBe("2034-03-01");
    expect(planned.qualificationBlocks).toEqual([]);
    expect(resolveExecutiveOffice(world)).toBeNull();

    // Control: without recorded qualification the term is not entered.
    const unqualified = passUntil(world, planned.startsAt);
    expect(resolveExecutiveOffice(unqualified)).toBeNull();
    expect(stateExecutiveEntryStatus(unqualified, personId).kind).toBe(
      "term-over-or-not-entered",
    );

    const qualified = qualifyForStateExecutiveTerm(world, personId);
    expect(stateExecutiveEntryStatus(qualified, personId).kind).toBe(
      "qualified-awaiting-entry",
    );
    expect(qualifyForStateExecutiveTerm(qualified, personId)).toBe(qualified);

    const entered = passUntil(qualified, planned.startsAt);
    expect(stateExecutiveEntryStatus(entered, personId).kind).toBe("in-office");
    const office = resolveExecutiveOffice(entered)!;
    expect(office.origin).toBe("elected-term");
    expect(office.pack.office.officeKey).toBe(kentucky.officeKey);
    expect(office.relationship.startedAt).toBe(planned.startsAt);
    const holder = currentPublicOfficeholders(entered).find(
      (record) => record.officeKey === kentucky.officeKey,
    )!;
    expect(holder.personId).toBe(personId);
    expect(holder.startedAt).toBe(planned.startsAt);

    // A governed action through the office the ordinary route produced.
    const reopened = deserializeWorld(serializeWorld(entered));
    expect(resolveExecutiveOffice(reopened)?.relationship.id).toBe(
      office.relationship.id,
    );
    const outcome = reopened.history.events.find(
      (event) =>
        event.type === "election.contest-resolved" &&
        event.jurisdictionId === office.jurisdictionId,
    )!;
    const governed = receiveExecutiveWork(
      reopened,
      outcome.id,
      "Transition briefing",
      outcome.summary,
    );
    const inboxKey = `executive-inbox:${office.relationship.id}:${outcome.id}`;
    expect(
      governed.history.workItems.filter((item) => item.stableKey === inboxKey),
    ).toHaveLength(1);
    // Receiving again is the same work, not a second item.
    expect(
      receiveExecutiveWork(
        governed,
        outcome.id,
        "Transition briefing",
        outcome.summary,
      ),
    ).toBe(governed);
    // Control: the same public event gives a non-holder nothing.
    expect(
      receiveExecutiveWorkIfCurrentOffice(
        unqualified,
        outcome.id,
        "Transition briefing",
        outcome.summary,
      ),
    ).toBe(unqualified);
  }, 240_000);

  it("a lost contest never produces a term for the loser", () => {
    bindRuleCapabilityResolver(FIXTURE_TERM_FACTS);
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { world, personId } = adultLifeIn(
        "KY",
        `nationwide-lost-${attempt}`,
      );
      const decided = runToElection(
        fileForStateExecutiveOffice(world, personId),
        personId,
      );
      if (projectCampaign(decided, personId).phase !== "lost") continue;
      expect(stateExecutiveEntryStatus(decided, personId).kind).toBe("lost");
      expect(() => qualifyForStateExecutiveTerm(decided, personId)).toThrow();
      expect(
        resolveExecutiveOffice(passUntil(decided, "2030-03-02")),
      ).toBeNull();
      return;
    }
    throw new Error("No tried seed produced a simulated Kentucky loss.");
  }, 240_000);
});
