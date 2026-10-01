import { afterEach, describe, expect, it, vi } from "vitest";
import { createScenarioWorld } from "./demo";
import { ageOnDate, addDays, daysBetween, makeIsoDate } from "./dates";
import { searchLifePlaces } from "./life-places";
import { createOrganization } from "./life";
import { settingPartyStableKey } from "./living-world/party-registry";
import {
  CHAPTER_INVITATION_EVENT,
  CHAPTER_OUTREACH_TRANSITION_KEY,
  chapterOutreachTransitionHandler,
  ensureHomePartyChapters,
} from "./living-world/party-chapters";
import { advanceWorldMinutes } from "./time-work";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrity } from "./world";
import * as decisions from "./decisions";
import type { DecisionContext, World } from "./types";

// Explicit small authored chapter fixture; this does not prove ordinary opening or nationwide party behavior.
function fixture(seed: string, date: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-OR",
    scope: "locality",
  })[0]!;
  let world = createScenarioWorld(
    seed,
    {
      jurisdiction: place.context.jurisdiction,
      initialMoment: {
        date: makeIsoDate(date),
        minuteOfDay: 540,
        timeZone: "America/Los_Angeles",
        utcOffsetMinutes: -420,
      },
      creationSummary: "Authored weekly chapter caller fixture.",
      goalScope: "Weekly chapter caller fixture",
      householdLocationLabel: place.displayName,
    },
    { peopleCount: 6 },
  );
  const personId = world.personOrder.find(
    (id) => ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 25,
  )!;
  if (!personId) throw new Error("Fixture requires an adult.");
  world = { ...world, control: { kind: "person", personId } };
  world = createOrganization(world, {
    stableKey: settingPartyStableKey("democratic"),
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "One existing setting party for the caller fixture.",
    },
    initialProfile: {
      name: "Democratic Party",
      classification: "membership:political-party",
      locationJurisdictionId: place.context.jurisdiction.id,
    },
  });
  return ensureHomePartyChapters(world, personId);
}
function controlledPerson(world: World) {
  if (world.control.kind !== "person")
    throw new Error("Fixture control was lost.");
  return world.control.personId;
}
afterEach(() => vi.restoreAllMocks());
describe("party outreach follows its existing weekly meeting profile", () => {
  it.each([
    ["a121-weekly-monday", "2026-09-14", "2026-09-22"],
    ["a121-weekly-tuesday", "2026-09-15", "2026-09-22"],
    ["a121-weekly-sunday", "2026-09-20", "2026-09-22"],
  ])(
    "%s initially schedules the next eligible meeting",
    (seed: string, date: string, expected: string) => {
      const world = fixture(seed, date);
      const items = world.history.futureDueItems.filter(
        (item) => item.transitionKey === CHAPTER_OUTREACH_TRANSITION_KEY,
      );
      expect(items).toHaveLength(1);
      expect(items[0]!.dueAt).toBe(expected);
      const saved = deserializeWorld(serializeWorld(world));
      assertWorldIntegrity(saved);
      const before = serializeWorld(saved);
      expect(ensureHomePartyChapters(saved, controlledPerson(saved))).toBe(
        saved,
      );
      expect(serializeWorld(saved)).toBe(before);
    },
  );
  it("the actual due clock saves an invitation and next outreach one week after its meeting", () => {
    const world = fixture("a121-weekly-invitation", "2026-09-20");
    const item = world.history.futureDueItems.find(
      (item) => item.transitionKey === CHAPTER_OUTREACH_TRANSITION_KEY,
    )!;
    const actual = decisions.evaluateDecision;
    vi.spyOn(decisions, "evaluateDecision").mockImplementation(
      (at: World, context: DecisionContext) => {
        if (context.decisionType !== "party-chapter.invite-to-meeting")
          return actual(at, context);
        // Controlled selected invitation; no new organizer motive or legal meeting rule.
        return actual(at, {
          ...context,
          randomness: "none",
          constraints: [
            {
              stableKey: "fixture:a121-invite",
              optionKey: "not-now",
              kind: "fixture:controlled-answer",
              explanation: "This caller fixture requires an invitation.",
              sourceRefs: [],
            },
          ],
        });
      },
    );
    const result = advanceWorldMinutes(
      world,
      daysBetween(world.currentDate, item.dueAt) * 1440,
      new Map([
        [CHAPTER_OUTREACH_TRANSITION_KEY, chapterOutreachTransitionHandler],
      ]),
    );
    const invitations = result.history.events.filter(
      (event) => event.type === CHAPTER_INVITATION_EVENT,
    );
    expect(invitations).toHaveLength(1);
    const meetingDate = invitations[0]!.tags
      .find((tag) => tag.startsWith("meeting-date:"))!
      .slice("meeting-date:".length);
    const successor = result.history.futureDueItems.filter(
      (next) =>
        next.transitionKey === CHAPTER_OUTREACH_TRANSITION_KEY &&
        next.id !== item.id,
    );
    expect(successor).toHaveLength(1);
    expect(successor[0]!.dueAt).toBe(addDays(makeIsoDate(meetingDate), 7));
    const saved = deserializeWorld(serializeWorld(result));
    assertWorldIntegrity(saved);
    const before = serializeWorld(saved);
    expect(ensureHomePartyChapters(saved, controlledPerson(saved))).toBe(saved);
    expect(serializeWorld(saved)).toBe(before);
    expect(
      saved.history.events.filter(
        (event) => event.type === CHAPTER_INVITATION_EVENT,
      ),
    ).toHaveLength(1);
  });
  it("an unresolved organizer retains the existing two-week review without an invitation", () => {
    const world = fixture("a121-weekly-unresolved", "2026-09-20");
    const item = world.history.futureDueItems.find(
      (item) => item.transitionKey === CHAPTER_OUTREACH_TRANSITION_KEY,
    )!;
    const actual = decisions.evaluateDecision;
    vi.spyOn(decisions, "evaluateDecision").mockImplementation(
      (at: World, context: DecisionContext) => {
        const evaluation = actual(at, context);
        return context.decisionType === "party-chapter.invite-to-meeting"
          ? { ...evaluation, outcomeKind: "undecided", selectedOptionKey: null }
          : evaluation;
      },
    );
    const result = advanceWorldMinutes(
      world,
      daysBetween(world.currentDate, item.dueAt) * 1440,
      new Map([
        [CHAPTER_OUTREACH_TRANSITION_KEY, chapterOutreachTransitionHandler],
      ]),
    );
    expect(
      result.history.events.filter(
        (event) => event.type === CHAPTER_INVITATION_EVENT,
      ),
    ).toHaveLength(0);
    const successor = result.history.futureDueItems.filter(
      (next) =>
        next.transitionKey === CHAPTER_OUTREACH_TRANSITION_KEY &&
        next.id !== item.id,
    );
    expect(successor).toHaveLength(1);
    expect(successor[0]!.dueAt).toBe(addDays(result.currentDate, 14));
    const saved = deserializeWorld(serializeWorld(result));
    assertWorldIntegrity(saved);
    expect(
      saved.history.events.filter(
        (event) => event.type === CHAPTER_INVITATION_EVENT,
      ),
    ).toHaveLength(0);
  });
});
