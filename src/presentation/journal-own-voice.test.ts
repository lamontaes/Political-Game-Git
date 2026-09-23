import { describe, expect, it } from "vitest";

import { personName, type EntityId, type World } from "../simulation";
import { recordEventKnowledge } from "../simulation/records";
import { recordWorldEvent } from "../simulation/world";
import { deserializeWorld, serializeWorld } from "../simulation";
import {
  introductionCandidates,
  introductionSettingPhrase,
  recordIntroduction,
} from "../simulation/social-introductions";
import {
  commitLifeConversation,
  projectLifeConversation,
  type LifeTalkIntent,
} from "./life-conversation";
import { createNewGameWorld } from "./new-game";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";
import { inOwnVoice, projectWorld39Journal } from "./world39-journal";

/*
 * Juneau playtest, 2026-09-23: the Journal printed a conversation as a script
 * ("Selena McGuire: Say hello. Dakota Austin: Hi, Selena."), opened an entry
 * with her own name ("Selena McGuire met Alice May"), and copied a posted
 * agenda and a coursework notice into her life story.
 */

const setup = {
  startKind: "custom",
  seed: "journal-own-voice",
  placeKey: "alaska",
  startAge: 6,
  depth: "play-formative-years",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  givenName: "Selena",
  familyName: "Journal",
  gender: "female",
  pronouns: "she-her",
  questionnaire: "skipped",
} as const;

function say(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
  intent: LifeTalkIntent,
): World {
  const view = projectLifeConversation(world, playerPersonId, personId);
  if (!view) throw new Error("No conversation is available.");
  return commitLifeConversation(world, {
    playerPersonId,
    personId,
    intent,
    revision: view.revision,
  });
}

describe("the Journal speaks to its own subject", () => {
  it(
    "records a conversation as what you said, not as a script",
    { timeout: 300_000 },
    () => {
      const { world, playerPersonId } = createNewGameWorld(setup);
      const scene = resolveOpeningPlaySceneContext(world, playerPersonId);
      const other = scene.presentPeople[0]!;
      const otherName = personName(world.people[other.personId]!);
      let next = say(world, playerPersonId, other.personId, "greet");
      next = say(next, playerPersonId, other.personId, "leave");

      const texts = projectWorld39Journal(next, playerPersonId).entries.map(
        (entry) => entry.text,
      );
      expect(texts).toContain(`You said hello to ${otherName}.`);
      // The account is read from the saved record, so it survives a reload.
      const restored = deserializeWorld(serializeWorld(next));
      expect(projectWorld39Journal(restored, playerPersonId)).toEqual(
        projectWorld39Journal(next, playerPersonId),
      );
      expect(texts).toContain(`You said goodbye to ${otherName}.`);
      const ownName = personName(next.people[playerPersonId]!);
      expect(texts.filter((text) => text.includes(`${ownName}:`))).toEqual([]);
      expect(texts.filter((text) => text.includes("Say hello"))).toEqual([]);

      // The other person's own account does not speak as the player either.
      const theirs = projectWorld39Journal(next, other.personId).entries.map(
        (entry) => entry.text,
      );
      expect(theirs).toContain(`You talked with ${ownName}.`);
    },
  );

  it("turns the subject's own name into you, and only whole names", () => {
    expect(
      inOwnVoice(
        "Selena McGuire met Alice May on the same program.",
        "Selena McGuire",
      ),
    ).toBe("You met Alice May on the same program.");
    expect(
      inOwnVoice("Selena McGuire was asked to stay late.", "Selena McGuire"),
    ).toBe("You were asked to stay late.");
    expect(
      inOwnVoice("Alice May met Selena McGuire at school.", "Selena McGuire"),
    ).toBe("Alice May met you at school.");
    expect(
      inOwnVoice("Selena McGuire's bike was found.", "Selena McGuire"),
    ).toBe("Your bike was found.");
    expect(inOwnVoice("Joann Lee waved.", "Ann Lee")).toBe("Joann Lee waved.");
  });

  it("leaves a posted agenda and coursework still due out of the life story", () => {
    const { world, playerPersonId } = createNewGameWorld(setup);
    const jurisdictionId = world.people[playerPersonId]!.homeJurisdictionId;
    let next = world;
    const notices = [
      [
        "civic.meeting-agenda-item",
        "The posted agenda asks whether the public meeting room should open for an extra evening each week.",
      ],
      [
        "school.shared-assignment",
        "A shared piece of coursework is due and counts as one piece.",
      ],
    ] as const;
    for (const [type, summary] of notices) {
      next = recordWorldEvent(next, {
        stableKey: `journal-own-voice:${type}`,
        type,
        occurredAt: next.currentDate,
        recordedAt: next.currentDate,
        jurisdictionId,
        involvedEntityIds: [playerPersonId],
        participants: [
          {
            personId: playerPersonId,
            role: "focus:subject",
            detail: "The person this is happening to",
          },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: [],
        summary,
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      next = recordEventKnowledge(next, {
        stableKey: `journal-own-voice:${type}:knowledge`,
        personId: playerPersonId,
        eventId: next.history.events.at(-1)!.id,
        learnedAt: next.currentDate,
        believedSummary: summary,
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "direct" },
      });
    }
    const texts = projectWorld39Journal(next, playerPersonId).entries.map(
      (entry) => entry.text,
    );
    for (const [, summary] of notices) expect(texts).not.toContain(summary);
  });

  it("tells a crime's victim what happened to them, and nobody else", () => {
    const { world, playerPersonId } = createNewGameWorld(setup);
    const jurisdictionId = world.people[playerPersonId]!.homeJurisdictionId;
    const ownName = personName(world.people[playerPersonId]!);
    const record = (current: World, key: string, victim: boolean): World =>
      recordWorldEvent(current, {
        stableKey: key,
        type: "crime.reported",
        occurredAt: current.currentDate,
        recordedAt: current.currentDate,
        jurisdictionId,
        involvedEntityIds: victim ? [playerPersonId] : [jurisdictionId],
        participants: victim
          ? [
              {
                personId: playerPersonId,
                role: "impact:crime-victim",
                detail: null,
              },
            ]
          : [],
        personFactConstraints: [],
        visibility: "public",
        tags: [],
        summary: `Police in town took a report of an assault (${key}).`,
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
    let next = record(world, "town-log", false);
    next = record(next, "own", true);
    next = recordEventKnowledge(next, {
      stableKey: "own:knows",
      personId: playerPersonId,
      eventId: next.history.events.at(-1)!.id,
      learnedAt: next.currentDate,
      believedSummary: `${ownName} was assaulted.`,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    const texts = projectWorld39Journal(next, playerPersonId).entries.map(
      (entry) => entry.text,
    );
    expect(texts).toContain("You were assaulted.");
    expect(texts.filter((text) => text.startsWith("Police in town"))).toEqual(
      [],
    );
  });

  it("says who you met, and where, from the introduction's own record", () => {
    const { world, playerPersonId } = createNewGameWorld({
      ...setup,
      seed: "journal-own-voice-met",
      startAge: 16,
    });
    const candidate = introductionCandidates(world, playerPersonId)[0];
    expect(candidate).toBeDefined();
    const next = deserializeWorld(
      serializeWorld(
        recordIntroduction(world, {
          personId: playerPersonId,
          otherPersonId: candidate!.personId,
          setting: candidate!.setting,
          how: "happened",
        }),
      ),
    );
    const otherName = personName(next.people[candidate!.personId]!);
    const phrase = introductionSettingPhrase(world, candidate!);
    expect(
      projectWorld39Journal(next, playerPersonId).entries.map(
        (entry) => entry.text,
      ),
    ).toContain(`You met ${otherName} ${phrase}.`);
    expect(
      projectWorld39Journal(next, candidate!.personId).entries.map(
        (entry) => entry.text,
      ),
    ).toContain(
      `You met ${personName(next.people[playerPersonId]!)} ${phrase}.`,
    );
  });
});
