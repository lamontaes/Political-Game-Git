import { describe, expect, it } from "vitest";

import {
  addDays,
  advanceWorld,
  ageOnDate,
  createCampaignElectionTransitionRegistry,
  createScenarioWorld,
  GAME_ADULT_CANDIDACY_AGE,
} from "../index";
import { KENTUCKY_CONTEXT } from "../legislation-scenarios";
import { personName } from "../people";
import type { EntityId, HistoricalEvent, World } from "../types";
import {
  resolveElectionContest,
  scheduleElectionContest,
} from "../election-contests";
import { recordGovernorCandidacyIntent } from "../nationwide-world/state-executive-turnover";
import { recordWorldEvent } from "../world";
import {
  editorialHeadline,
  editorialParagraphs,
  readableDate,
} from "./editorial";
import {
  ensurePressMediaOpening,
  ensurePressStateCoverage,
  mediaOutlets,
} from "./index";

/**
 * A story adds what the World holds about its event — earlier steps, the
 * person and office behind a notice, a hazard's size and place — and never
 * prints the simulation's own notes to itself.
 */

const KY = KENTUCKY_CONTEXT.jurisdiction.id;

function fixture(): { world: World; personId: EntityId } {
  const created = createScenarioWorld("editorial", KENTUCKY_CONTEXT, {
    peopleCount: 5,
  });
  const personId = created.personOrder.find(
    (id) =>
      ageOnDate(created.people[id]!.birthDate, created.currentDate) >=
      GAME_ADULT_CANDIDACY_AGE,
  )!;
  let world: World = { ...created, control: { kind: "person", personId } };
  world = ensurePressMediaOpening(world, personId);
  world = ensurePressStateCoverage(world, KY);
  return { world, personId };
}

function record(
  world: World,
  key: string,
  input: {
    readonly type: HistoricalEvent["type"];
    readonly tags: readonly string[];
    readonly summary: string;
    readonly involved?: readonly EntityId[];
  },
): { world: World; event: HistoricalEvent } {
  const next = recordWorldEvent(world, {
    stableKey: `editorial-test:${key}`,
    type: input.type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: KY,
    involvedEntityIds: [...(input.involved ?? [KY])],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [...input.tags],
    summary: input.summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, event: next.history.events.at(-1)! };
}

function stateOutlet(world: World) {
  return mediaOutlets(world).find((outlet) => outlet.scope === "state")!;
}

describe("editorial copy", () => {
  it("dates the earlier steps of the same development, and only that one", () => {
    const { world } = fixture();
    const first = record(world, "posted", {
      type: "civic.local-matter-proposal-posted",
      tags: ["matter:test:one", "stage:proposal-posted"],
      summary: "The council posted a proposal about park hours.",
    });
    const other = record(first.world, "unrelated", {
      type: "civic.local-matter-proposal-posted",
      tags: ["matter:test:two", "stage:proposal-posted"],
      summary: "The council posted a proposal about bus shelters.",
    });
    const second = record(other.world, "withdrawn", {
      type: "civic.local-matter-withdrawn",
      tags: ["matter:test:one", "stage:proposal-withdrawn"],
      summary: "The council withdrew its proposal about park hours.",
    });
    const paragraphs = editorialParagraphs(
      second.world,
      second.event,
      stateOutlet(second.world),
    );
    expect(paragraphs[0]).toBe(
      "The council withdrew its proposal about park hours.",
    );
    expect(paragraphs[1]).toBe(
      [
        "Earlier in this story:",
        `${readableDate(first.event.occurredAt, second.event.occurredAt)}: The council posted a proposal about park hours.`,
      ].join("\n"),
    );
    expect(paragraphs.join("\n")).not.toContain("bus shelters");
  });

  it("names who died and what they held, not the notice's field list", () => {
    const { world, personId } = fixture();
    const died = record(world, "died", {
      type: "crisis.officeholder-died",
      tags: ["crisis"],
      summary: "Died while holding office: Governor of Kentucky.",
      involved: [personId],
    });
    const name = personName(died.world.people[personId]!);
    expect(editorialHeadline(died.world, died.event)).toBe(
      `${name} dies in office`,
    );
    expect(
      editorialParagraphs(died.world, died.event, stateOutlet(died.world))[0],
    ).toBe(
      `${name}, Governor of Kentucky, died on ${readableDate(died.event.occurredAt, died.event.occurredAt)}.`,
    );
  });

  it("never prints what the game has not compiled or modeled", () => {
    const { world, personId } = fixture();
    const died = record(world, "senator-died", {
      type: "crisis.officeholder-died",
      tags: ["crisis"],
      summary: "Died while holding office: U.S. Senator from Kentucky.",
      involved: [personId],
    });
    const ruling = record(died.world, "ruling", {
      type: "governing.office-continuity",
      tags: [
        "continuity-change:death",
        `crisis-origin:${died.event.id}`,
        "office:us-senate:KY-1",
        "outcome:us-senate:KY-1:blocked",
      ],
      summary:
        "X: U.S. Senator from Kentucky: The seat is vacant. The Seventeenth Amendment lets KY's legislature allow its governor to appoint a temporary senator, but the game has not compiled KY's rule, so no one is appointed.",
      involved: [personId],
    });
    const copy = [
      editorialHeadline(ruling.world, ruling.event),
      ...editorialParagraphs(
        ruling.world,
        ruling.event,
        stateOutlet(ruling.world),
      ),
    ].join("\n");
    expect(copy).not.toMatch(/game|compiled|modeled|Seventeenth/);
    expect(copy).toContain(
      "The seat is vacant, and no temporary senator has been appointed.",
    );
    expect(copy).toContain("U.S. Senator from Kentucky");
  });

  it("writes a hazard's size and count from its tags, not '(major)'", () => {
    const { world } = fixture();
    const one = record(world, "storm-1", {
      type: "crisis.hazard-occurred",
      tags: ["hazard:severe-storm", "magnitude:minor"],
      summary: "A severe storm struck the area (minor).",
    });
    const two = record(one.world, "storm-2", {
      type: "crisis.hazard-occurred",
      tags: ["hazard:severe-storm", "magnitude:major"],
      summary: "A severe storm struck the area (major).",
    });
    const copy = editorialParagraphs(
      two.world,
      two.event,
      stateOutlet(two.world),
    );
    expect(editorialHeadline(two.world, two.event)).toBe(
      "Major storm strikes Kentucky",
    );
    expect(copy[0]).not.toContain("(major)");
    expect(copy[1]).toBe(
      "It is the second storm recorded in Kentucky this year.",
    );
  });

  it("reports who won an election and whom they beat, with no tally", () => {
    const { world } = fixture();
    const [winnerId, loserId] = world.personOrder;
    const scheduled = scheduleElectionContest(world, {
      stableKey: "editorial-test:contest",
      jurisdictionId: KY,
      office: {
        officeKey: "governor",
        title: "Governor of Kentucky",
        seatKey: null,
        occupationClassification: "service:governor",
      },
      electionDate: addDays(world.currentDate, 1),
      candidatePersonIds: [winnerId!, loserId!],
      provenance: { method: "simulated", sourceEntityIds: [], note: null },
    });
    const contest = scheduled.history.electionContests!.at(-1)!;
    const moved = advanceWorld(
      scheduled,
      1,
      createCampaignElectionTransitionRegistry(),
    );
    const resolved = (moved.history.electionContestResults ?? []).some(
      (entry) => entry.contestId === contest.id,
    )
      ? moved
      : resolveElectionContest(moved, { contestId: contest.id });
    const result = resolved.history.electionContestResults!.at(-1)!;
    const event = resolved.history.events.find(
      (candidate) => candidate.id === result.outcomeEventId,
    )!;
    const winner = personName(resolved.people[result.winnerPersonId]!);
    const loser = personName(
      resolved.people[
        result.winnerPersonId === winnerId ? loserId! : winnerId!
      ]!,
    );
    expect(editorialHeadline(resolved, event)).toBe(
      `${winner} wins election for Governor of Kentucky`,
    );
    const [lede] = editorialParagraphs(resolved, event, stateOutlet(resolved));
    expect(lede).toContain(
      `${winner} won the election for Governor of Kentucky on `,
    );
    expect(lede).toContain(`defeating ${loser}.`);
    expect(lede).not.toMatch(/Winner:|resolved|votes|percent/);
  });

  it("says who is standing for governor without the game's own reason", () => {
    const { world, personId } = fixture();
    const office = {
      officeKey: "governor",
      displayName: "Governor of Kentucky",
    };
    const open = recordGovernorCandidacyIntent(world, {
      office,
      year: 2027,
      stateJurisdictionId: KY,
      incumbentPersonId: null,
      seeking: false,
      reason: "no sitting governor is on record.",
    });
    const vacant = open.history.events.at(-1)!;
    expect(editorialHeadline(open, vacant)).toBe(
      "No incumbent in the 2027 race for Governor of Kentucky",
    );
    const standing = recordGovernorCandidacyIntent(open, {
      office,
      year: 2031,
      stateJurisdictionId: KY,
      incumbentPersonId: personId,
      seeking: false,
      reason: "they cannot or will not stand again under this game profile.",
    });
    const event = standing.history.events.at(-1)!;
    const name = personName(standing.people[personId]!);
    const copy = [
      editorialHeadline(standing, event),
      ...editorialParagraphs(standing, event, stateOutlet(standing)),
      ...editorialParagraphs(open, vacant, stateOutlet(open)),
    ].join("\n");
    expect(copy).toContain(`${name} will not seek another term`);
    expect(copy).toContain(
      "No sitting Governor of Kentucky is a candidate in the 2027 election.",
    );
    expect(copy).not.toMatch(/on record|game profile|not on the ballot/);
  });
});
