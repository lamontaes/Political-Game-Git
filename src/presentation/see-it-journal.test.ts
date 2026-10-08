import { describe, expect, it } from "vitest";

import { addDays } from "../simulation/dates";
import { resolveFutureDueItemsThrough } from "../simulation/future-transitions";
import { composeWorldTimeHandlers } from "../simulation/campaigns";
import { lawInForce } from "../simulation/governing/law-in-force";
import {
  enterPlea,
  PROSECUTION_ESTIMATE,
  referForProsecution,
} from "../simulation/justice/prosecution";
import { prosecutionTimingFor } from "../simulation/justice/prosecution-timing";
import {
  PROSECUTION_ENDED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
} from "../simulation/justice/jail-terms";
import {
  recordVotingRightForSentence,
  VOTING_RIGHT_EVENT,
} from "../simulation/justice/voting-standing";
import { ensureOpeningJudiciary } from "../simulation/judiciary/opening";
import { recordLawExposure } from "../simulation/law-exposure";
import { heardOfficialViews } from "../simulation/heard-official-views";
import { recordEventKnowledge } from "../simulation/records";
import { personName } from "../simulation/people";
import type { EntityId, HistoricalEvent, World } from "../simulation/types";
import { recordWorldEvent } from "../simulation/world";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { seatProsecutor } from "../../tests/support/seated-prosecutor";
import { isOwnCaseEvent } from "./journal-own-case";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { observerPlace } from "./observer-world";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { lawExposureSentence } from "./law-exposure-lines";
import { projectMoneyLaws } from "./money-laws";
import { projectWorld39Journal } from "./world39-journal";

/**
 * SEE-IT, Journal: what the court and the law did to the player reaches the
 * player's own Journal from the records. The place is drawn from all 56 by
 * the seed, and the test names it.
 */
const SEED = "see-it-journal-1";
const place = observerPlace(SEED);
const small = smallWorld({
  place: place.key,
  seed: SEED,
  offices: ["governor"],
});
const playerId = small.personId;
const playerName = personName(small.world.people[playerId]!);

const passDays = (world: World, days: number): World =>
  resolveFutureDueItemsThrough(
    world,
    addDays(world.currentDate, days),
    composeWorldTimeHandlers(),
  );

function eventsOfType(world: World, type: string): readonly HistoricalEvent[] {
  return world.history.events.filter((event) => event.type === type);
}

describe(`the Journal shows the player's own case (${place.displayName}, place ${place.key}, seed ${SEED})`, () => {
  const opened = seatProsecutor(
    ensureOpeningJudiciary(small.world),
    playerId,
    small.jurisdictionId,
  );
  const referred = referForProsecution(opened.world, {
    stableKey: `see-it-journal:${SEED}`,
    subjectPersonId: playerId,
    jurisdictionId: opened.world.people[playerId]!.homeJurisdictionId,
    offenseKey: "public-funds-embezzlement",
    referredBy: { kind: "regulator", label: "state regulator", personId: null },
    basisEventIds: [],
    evidence: "documentary",
    standingFindings: 2,
  });
  const charged = passDays(
    referred.world,
    PROSECUTION_ESTIMATE.chargeDecisionDays + 14,
  );
  const entered = enterPlea(charged, {
    personId: playerId,
    referralId: referred.referralId,
    plea: "guilty",
  });
  const sentenced = passDays(
    entered.world,
    prosecutionTimingFor(place.stateJurisdictionKey).resolveAfterDays + 14,
  );

  it("carries the charge, the plea, the verdict and the sentence in the record's own words", () => {
    const journal = projectWorld39Journal(sentenced, playerId);
    const bySource = new Map(
      journal.entries.map((entry) => [entry.sourceId, entry]),
    );
    const own = sentenced.history.events.filter((event) =>
      isOwnCaseEvent(event, playerId),
    );
    // The charge, the plea, the case ending and the sentence were all written.
    expect(own.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "justice.charged",
        "justice.plea-entered",
        PROSECUTION_ENDED_EVENT,
        PROSECUTION_SENTENCED_EVENT,
      ]),
    );
    for (const event of own) {
      const entry = bySource.get(event.id);
      expect(entry, `${event.type} reaches the Journal`).toBeDefined();
      expect(entry!.at).toBe(event.occurredAt);
      // Record data in the person's own voice: the name becomes "you".
      expect(entry!.text).not.toContain(playerName);
      expect(entry!.text.length).toBeGreaterThan(0);
    }
    const sentence = eventsOfType(sentenced, PROSECUTION_SENTENCED_EVENT)[0]!;
    expect(bySource.get(sentence.id)!.text).toMatch(/^You were sentenced to /);
  });

  it("leaves out what the court does not tell the defendant", () => {
    const journal = projectWorld39Journal(sentenced, playerId);
    const shown = new Set(journal.entries.map((entry) => entry.sourceId));
    for (const type of [
      "justice.prosecution-referred",
      "justice.referral-received",
      "justice.charges-declined",
      "justice.bench-activation",
    ])
      for (const event of eventsOfType(sentenced, type))
        expect(shown.has(event.id), type).toBe(false);
  });

  it("does not put the player's case in somebody else's Journal", () => {
    const bystander = Object.keys(sentenced.people).find(
      (id) => id !== playerId && id !== opened.personId,
    )!;
    const journal = projectWorld39Journal(sentenced, bystander);
    const ownIds = new Set(
      sentenced.history.events
        .filter((event) => isOwnCaseEvent(event, playerId))
        .map((event) => event.id),
    );
    expect(journal.entries.some((entry) => ownIds.has(entry.sourceId))).toBe(
      false,
    );
  });

  it("reads the same after the world is projected twice and writes nothing", () => {
    const before = sentenced.history.events.length;
    const first = projectWorld39Journal(sentenced, playerId);
    const second = projectWorld39Journal(sentenced, playerId);
    expect(second.entries).toEqual(first.entries);
    expect(sentenced.history.events).toHaveLength(before);
  });

  it("carries a suspended vote as the record says it", () => {
    // A felony term is a jail term over a year. The court wrote a shorter one
    // above, so this edge case records the sentence the real writer expects.
    const felony = recordWorldEvent(sentenced, {
      stableKey: `see-it-journal:felony:${SEED}`,
      type: PROSECUTION_SENTENCED_EVENT,
      occurredAt: sentenced.currentDate,
      recordedAt: sentenced.currentDate,
      jurisdictionId: small.stateJurisdictionId,
      involvedEntityIds: [playerId],
      participants: [
        { personId: playerId, role: "focus:defendant", detail: null },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["justice.sentence:jail", "justice.sentence-months:24"],
      summary: `${playerName} was sentenced to 24 months in jail for fraud.`,
      context: {
        location: null,
        socialContext: "Criminal case",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const sentenceEvent = felony.history.events.at(-1)!;
    const withVote = recordVotingRightForSentence(felony, sentenceEvent.id);
    const voteEvent = eventsOfType(withVote, VOTING_RIGHT_EVENT)[0]!;
    expect(voteEvent, "a felony term suspends the vote").toBeDefined();
    const journal = projectWorld39Journal(withVote, playerId);
    const entry = journal.entries.find((row) => row.sourceId === voteEvent.id);
    expect(entry).toBeDefined();
    expect(entry!.text).toBe(
      voteEvent.summary.replace(playerName, "you").replace(/^you /, "You "),
    );
  });
});

describe(`the Journal names a law the place began with (${place.displayName}, place ${place.key}, seed ${SEED})`, () => {
  it("shows a starting-law exposure under the policy question's own name", () => {
    const world = small.world;
    const person = world.people[playerId]!;
    const propositions = Object.values(world.policyCatalog.propositions);
    const found = propositions
      .map((proposition) => ({
        proposition,
        law: lawInForce(world, person.homeJurisdictionId, proposition.id),
      }))
      .find(({ law }) => law?.origin === "in-force-at-start");
    expect(found, "the place has a law in force at the start").toBeDefined();
    const { proposition, law } = found!;
    const written = recordLawExposure(world, {
      stableKey: `see-it-journal:starting-law:${SEED}`,
      personId: playerId,
      measureId: law!.measureId as EntityId,
      sectionKey: proposition.stableKey,
      channel: "benefit",
      direction: "cost",
      amount: null,
      cadence: null,
      sourceRecordId: person.id,
      includeFamily: false,
    });
    const exposure = written.history.lawExposures!.at(-1)!;
    expect(exposure.measureId.startsWith("starting-law:")).toBe(true);
    const sentence = lawExposureSentence(written, playerId, exposure);
    expect(sentence).toContain(`“${proposition.name}”`);
    const journal = projectWorld39Journal(written, playerId);
    const entry = journal.entries.find((row) => row.sourceId === exposure.id);
    expect(entry?.text).toBe(sentence);
  });

  it("shows nothing for a law the catalog does not name", () => {
    const world = small.world;
    const exposure = {
      id: "law-exposure_unnamed",
      stableKey: "unnamed",
      sequence: 1,
      recordedAt: world.currentDate,
      personId: playerId,
      measureId: "starting-law:US:no-such-question" as EntityId,
      sectionKey: null,
      channel: "benefit" as const,
      relation: "own" as const,
      viaPersonId: null,
      direction: "cost" as const,
      amount: null,
      cadence: null,
      monthlyPay: null,
      sourceRecordId: playerId,
    };
    expect(lawExposureSentence(world, playerId, exposure)).toBeNull();
  });
});

/**
 * The ordinary generated world: a new game's opening writes law exposures for
 * the laws the place began with (its benefit programs), through the existing
 * producer. Each person those laws reached has a Journal line for each one.
 */
describe("a new game's opening exposures reach the Journal", () => {
  const drawn = drawRandomPlace(`${SEED}:opening`);
  it(`names every starting-law exposure the opening wrote (${drawn.displayName}, place ${drawn.key}, seed ${SEED}:opening)`, () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: `${SEED}:opening`,
        placeKey: drawn.key,
        startAge: 40,
        questionnaire: "skipped",
      }),
    ).game!;
    const world = game.world;
    const reached = (world.history.lawExposures ?? []).filter(
      (row) =>
        row.relation === "own" && row.measureId.startsWith("starting-law:"),
    );
    expect(
      reached.length,
      "the opening writes starting-law exposures",
    ).toBeGreaterThan(0);
    const people = [...new Set(reached.map((row) => row.personId))].slice(0, 3);
    for (const personId of people) {
      const journal = projectWorld39Journal(world, personId);
      const shown = new Map(
        journal.entries.map((entry) => [entry.sourceId, entry]),
      );
      for (const exposure of reached.filter(
        (row) => row.personId === personId,
      )) {
        const questionKey = /^starting-law:[^:]+:(.+)$/.exec(
          exposure.measureId,
        )![1];
        const name = Object.values(world.policyCatalog.propositions).find(
          (row) => row.stableKey === questionKey,
        )!.name;
        const line = shown.get(exposure.id);
        expect(line, `${name} reaches the Journal`).toBeDefined();
        // A term-limit bar keeps the title the court-rule branch already
        // gave it; every other starting law is named by its question.
        if (exposure.channel === "benefit")
          expect(line!.text).toContain(`\u201C${name}\u201D`);
      }
    }
  }, 240_000);
});

/**
 * A view somebody told the player is saved as fields, not a sentence
 * (`told-view:<teller>:<official>:<position>`), because the English engine is
 * meant to compose what is shown. The Journal printed those fields as they
 * were; it leaves them out until an English bank words them, and the People
 * screen's heard-views list (`heardOfficialViews`) still carries them.
 */
describe(`a told view of an official is not printed as a field string (${place.displayName}, place ${place.key}, seed ${SEED})`, () => {
  it("keeps the told view out of the Journal and in the heard views", () => {
    const [teller, official] = Object.keys(small.world.people).filter(
      (id) => id !== playerId,
    ) as [EntityId, EntityId];
    const withEvent = recordWorldEvent(small.world, {
      stableKey: "see-it-journal:told-view:event",
      type: "people.law-reflection",
      occurredAt: small.world.currentDate,
      recordedAt: small.world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [teller],
      participants: [{ personId: teller, role: "focus:subject", detail: null }],
      personFactConstraints: [],
      visibility: "private",
      tags: ["people.official-view"],
      summary: "Thought over what a law did to them, and who was behind it.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const eventId = withEvent.history.events.at(-1)!.id;
    // The shape `tellViewToHearers` writes for a hearer.
    const told = recordEventKnowledge(withEvent, {
      stableKey: "see-it-journal:told-view:knowledge",
      personId: playerId,
      eventId,
      learnedAt: withEvent.currentDate,
      believedSummary: `told-view:${teller}:${official}:support`,
      accuracy: "accurate",
      confidence: "medium",
      source: { kind: "told-by", sourcePersonId: teller, claimId: null },
    });
    const heard = heardOfficialViews(told, playerId, official);
    expect(heard).toHaveLength(1);
    expect(heard[0]).toMatchObject({ holderId: teller, position: "support" });
    const journal = projectWorld39Journal(told, playerId);
    expect(
      journal.entries.some((entry) => entry.text.includes("told-view:")),
    ).toBe(false);
  });
});

/**
 * A resident's environmental exposure (the place's measured air, water or
 * energy outcome moved because of a law) is saved under its own channel
 * (`environment-energy-landings.ts`). No wording bank covers that channel
 * yet, so the Journal leaves the exposure out. It used to throw reading the
 * channel's missing word table.
 */
describe(`an exposure with no wording is left out, not thrown on (${place.displayName}, place ${place.key}, seed ${SEED})`, () => {
  it("projects the Journal and the Money laws lists without the line", () => {
    const world = small.world;
    const person = world.people[playerId]!;
    const found = Object.values(world.policyCatalog.propositions)
      .map((proposition) => ({
        proposition,
        law: lawInForce(world, person.homeJurisdictionId, proposition.id),
      }))
      .find(({ law }) => law?.origin === "in-force-at-start")!;
    const written = recordLawExposure(world, {
      stableKey: `see-it-journal:environment:${SEED}`,
      personId: playerId,
      measureId: found.law!.measureId as EntityId,
      channel: "environmental-condition",
      direction: "gain",
      amount: null,
      cadence: null,
      sourceRecordId: playerId,
      includeFamily: false,
    });
    const exposure = written.history.lawExposures!.at(-1)!;
    expect(lawExposureSentence(written, playerId, exposure)).toBeNull();
    const journal = projectWorld39Journal(written, playerId);
    expect(
      journal.entries.some((entry) => entry.sourceId === exposure.id),
    ).toBe(false);
    expect(() => projectMoneyLaws(written, playerId)).not.toThrow();
  });
});
