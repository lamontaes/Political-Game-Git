import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "../presentation/new-game";
import type { NewGameSetup } from "../presentation/new-game";
import { EPISODE_FAMILIES, episodeFamily } from "./episode-bank";
import { DISTINCT_GIVEN_NAME_GENERATION_VERSION } from "./people";
import { advanceWorld } from "./world";
import { personName } from "./people";
import {
  eligibleEpisodeBeats,
  episodeDetails,
  episodeRoleBindings,
  playEpisodeOption,
  playedEpisodeStages,
  type EpisodeBeat,
} from "./life-episodes";
import { deserializeWorld, serializeWorld } from "./index";
import type { EntityId, World } from "./index";

/**
 * The corridor scene the third playtest met, and what it has to be instead.
 *
 * What it said was "Something got broken in the corridor at your school and
 * your name is the one that came up", with "Say who did it" underneath and
 * nobody to name: no object, no accused, and a choice whose subject the player
 * could not identify. These check the repair through the actual composition —
 * a bound classmate, a named incident, and both of them holding through the
 * choice, the memory it writes, the continuation a year later and a reload.
 */

const SCHOOL = "school.the-thing-you-got-blamed-for";

const INCIDENTS = episodeFamily(SCHOOL)!.details!["incident"]!;

/** The authored incident as it appears, wherever it falls in the sentence. */
function mentionsIncident(text: string, incident: string): boolean {
  return (
    text.includes(incident) ||
    text.includes(incident.charAt(0).toUpperCase() + incident.slice(1))
  );
}

function incidentIn(text: string): string | undefined {
  return INCIDENTS.find((incident) => mentionsIncident(text, incident));
}

function schoolLife(age: number, seed: string) {
  const game = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: age,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
    givenNameGenerationVersion: DISTINCT_GIVEN_NAME_GENERATION_VERSION,
  } as NewGameSetup);
  return { world: game.world, personId: game.playerPersonId };
}

function blamedBeat(
  world: World,
  personId: EntityId,
  asOfDate?: string,
): EpisodeBeat | undefined {
  return eligibleEpisodeBeats({
    world,
    personId,
    families: EPISODE_FAMILIES,
    ...(asOfDate ? { asOfDate: asOfDate as never } : {}),
  }).beats.find(
    (beat) => beat.episodeKey === SCHOOL && beat.stageKey === "blamed",
  );
}

describe("PT3 — the school corridor names what happened and who did it", () => {
  for (const [age, seed] of [
    [10, "pt3-school-child"],
    [16, "pt3-school-teen"],
  ] as const) {
    it(`gives a ${age}-year-old a specific incident and a named classmate`, () => {
      const { world, personId } = schoolLife(age, seed);
      const beat = blamedBeat(world, personId);
      expect(
        beat,
        "the corridor scene is reachable in ordinary play",
      ).toBeDefined();

      const peer = beat!.bindings.find(
        (binding) => binding.role === "school-peer",
      );
      expect(peer, "somebody from the same school is cast").toBeDefined();
      expect(peer!.basis).toBe("Active enrollment in the same school.");

      // What happened, and who did it, are both on the screen.
      expect(
        incidentIn(beat!.prose),
        "the scene names what got broken",
      ).toBeDefined();
      expect(beat!.prose).toContain(peer!.personName);

      // And what the playtest read is gone.
      expect(beat!.prose).not.toContain("Something got broken");
      expect(beat!.prose).not.toContain("four feet away");
      expect(beat!.prose).not.toMatch(/The person who did/i);

      // The option that names somebody names them.
      const nameThem = beat!.options.find(
        (option) => option.key === "name-them",
      );
      expect(nameThem!.label).toContain(peer!.personName);
      expect(nameThem!.label).not.toBe("Say who did it");

      // Sentences read as sentences: a slot that opens one is capitalized.
      for (const sentence of beat!.prose.split(/(?<=[.!?])\s+/)) {
        expect(sentence).toMatch(/^[A-Z"“]/);
      }

      // What was seen is separated from what the school was told.
      expect(beat!.prose).toMatch(/standing next to it when it happened/i);
      expect(beat!.prose).toMatch(/office/i);
    });
  }

  it("casts a different classmate in a different life, and keeps each incident stable", () => {
    const first = schoolLife(14, "pt3-school-cast-a");
    const second = schoolLife(14, "pt3-school-cast-b");
    const one = blamedBeat(first.world, first.personId)!;
    const two = blamedBeat(second.world, second.personId)!;
    expect(one.bindings[0]!.personName).not.toBe(two.bindings[0]!.personName);

    // Re-reading the same life composes the same scene: the incident is drawn
    // once per instance, not per redraw.
    const again = blamedBeat(first.world, first.personId)!;
    expect(again.prose).toBe(one.prose);
    expect(again.instanceKey).toBe(one.instanceKey);
    expect(
      episodeDetails(
        first.world,
        one.instanceKey,
        episodeFamily(SCHOOL)!.details,
      ),
    ).toEqual(
      episodeDetails(
        first.world,
        one.instanceKey,
        episodeFamily(SCHOOL)!.details,
      ),
    );
  });

  it("withholds the scene, with its reason, when the school holds nobody else", () => {
    const { world, personId } = schoolLife(12, "pt3-school-alone");
    const mine = new Set(
      world.history.educationEnrollments
        .filter((enrollment) => enrollment.personId === personId)
        .map((enrollment) => enrollment.id),
    );
    /*
     * The same life with nobody else enrolled anywhere. A constructed control,
     * not a played world: what it proves is that the stage is withheld rather
     * than composed around an invented culprit.
     */
    const alone: World = {
      ...world,
      history: {
        ...world.history,
        educationEnrollments: world.history.educationEnrollments.filter(
          (enrollment) => mine.has(enrollment.id),
        ),
      },
    };
    const eligibility = eligibleEpisodeBeats({
      world: alone,
      personId,
      families: EPISODE_FAMILIES,
    });
    expect(eligibility.beats.some((beat) => beat.stageKey === "blamed")).toBe(
      false,
    );
    expect(
      eligibility.exclusions.some(
        (entry) =>
          entry.episodeKey === SCHOOL &&
          entry.stageKey === "blamed" &&
          entry.requirement.kind === "role" &&
          entry.requirement.role === "school-peer",
      ),
    ).toBe(true);
  });

  it("keeps the incident and the person through the choice, the memory and a reload", () => {
    const { world, personId } = schoolLife(15, "pt3-school-follow");
    const beat = blamedBeat(world, personId)!;
    const peer = beat.bindings[0]!;
    const incident = incidentIn(beat.prose)!;

    const played = playEpisodeOption(world, {
      personId,
      beat,
      optionKey: "take-it",
      families: EPISODE_FAMILIES,
    });

    // The memory the record keeps says the same thing the screen said.
    const stages = playedEpisodeStages(played.world, personId).filter(
      (entry) => entry.instanceKey === beat.instanceKey,
    );
    expect(stages).toHaveLength(1);
    const event = played.world.history.events.find(
      (candidate) => candidate.id === played.eventId,
    )!;
    expect(mentionsIncident(event.summary, incident)).toBe(true);
    expect(event.summary).toContain(peer.personName);
    expect(event.involvedEntityIds).toContain(peer.personId);

    // And it survives a save and a reload unchanged.
    const reloaded = deserializeWorld(serializeWorld(played.world));
    const reloadedEvent = reloaded.history.events.find(
      (candidate) => candidate.id === played.eventId,
    )!;
    expect(reloadedEvent.summary).toBe(event.summary);
    expect(
      episodeDetails(
        reloaded,
        beat.instanceKey,
        episodeFamily(SCHOOL)!.details,
      )["incident"],
    ).toBe(incident);
  });

  it("names two people in the house two different names", () => {
    /*
     * The adjacent home scene, which binds a guardian and a household peer in
     * the same sentence. Its option read "Tell Charles Rush — then it is
     * Charles Rush's to deal with, and Charles Rush will know it came from
     * you": the guardian and the older brother had been handed the same name
     * by the generator, so the choice named nobody the player could pick out.
     */
    for (let index = 0; index < 12; index += 1) {
      const { world, personId } = schoolLife(13, `pt3-house-${index}`);
      const cast = new Map<string, EntityId>();
      for (const binding of episodeRoleBindings(world, personId)) {
        const already = cast.get(binding.personName);
        expect(
          already === undefined || already === binding.personId,
          `two people in ${`pt3-house-${index}`} answer to ${binding.personName}`,
        ).toBe(true);
        cast.set(binding.personName, binding.personId);
      }
      expect(cast.has(personName(world.people[personId]!))).toBe(false);
    }
  });

  it("hands the home scene's telling to the adult who is actually responsible", () => {
    /*
     * The first ordinary life that reaches the home scene. Not every household
     * does — the peer has to be old enough to be out — and a fixture that
     * forced one would be proving something the player never meets.
     */
    let beat: EpisodeBeat | undefined;
    let world: World | undefined;
    for (let index = 0; index < 12 && beat === undefined; index += 1) {
      const life = schoolLife(14, `pt3-house-tell-${index}`);
      beat = eligibleEpisodeBeats({
        world: life.world,
        personId: life.personId,
        families: EPISODE_FAMILIES,
      }).beats.find(
        (candidate) =>
          candidate.episodeKey === "home.someone-is-not-all-right" &&
          candidate.stageKey === "noticing",
      );
      if (beat) world = life.world;
    }
    expect(beat, "the home scene is reachable in ordinary play").toBeDefined();
    expect(world).toBeDefined();
    const guardian = beat!.bindings.find(
      (binding) => binding.role === "guardian",
    )!;
    const peer = beat!.bindings.find(
      (binding) => binding.role === "household-peer",
    )!;
    expect(guardian.personId).not.toBe(peer.personId);

    const tell = beat!.options.find((option) => option.key === "tell-someone")!;
    // The unbound "a grown-up at home" is gone, and the two of them are told
    // apart in the line the player reads.
    expect(tell.label).toBe(`Tell ${guardian.personName}`);
    expect(tell.description).toContain(peer.personName);
    expect(guardian.personName).not.toBe(peer.personName);
    expect(beat!.prose).toContain(peer.personName);
  });

  it("waits a real year before saying a year has passed", () => {
    const { world, personId } = schoolLife(15, "pt3-school-year");
    const beat = blamedBeat(world, personId)!;
    const peer = beat.bindings[0]!;
    const incident = incidentIn(beat.prose)!;
    const after = playEpisodeOption(world, {
      personId,
      beat,
      optionKey: "take-it",
      families: EPISODE_FAMILIES,
    }).world;

    /*
     * The world actually moves: a stage that asks how long ago something
     * happened has to be asked on a day that has arrived, not on a date the
     * caller wishes were current.
     */
    const stuckAt = (world: World) =>
      eligibleEpisodeBeats({
        world,
        personId,
        families: EPISODE_FAMILIES,
      }).beats.find((candidate) => candidate.stageKey === "it-stuck");

    const twoHundred = advanceWorld(after, 200);
    // 200 days is not a year, and the continuation used to claim it was.
    expect(stuckAt(twoHundred)).toBeUndefined();
    const later = stuckAt(advanceWorld(twoHundred, 166));
    expect(later, "a year later it is still on the record").toBeDefined();
    expect(later!.prose).toMatch(/^A year on/);
    expect(mentionsIncident(later!.prose, incident)).toBe(true);
    expect(later!.instanceKey).toBe(beat.instanceKey);
    expect(
      later!.options.find((option) => option.key === "correct-it")!.description,
    ).toContain(peer.personName);
  });

  it("carries the named incident into the tell-people continuation", () => {
    const { world, personId } = schoolLife(10, "pt3-school-tell-people");
    const beat = blamedBeat(world, personId)!;
    const incident = incidentIn(beat.prose)!;
    const after = playEpisodeOption(world, {
      personId,
      beat,
      optionKey: "name-them",
      families: EPISODE_FAMILIES,
    }).world;
    const later = eligibleEpisodeBeats({
      world: advanceWorld(after, 200),
      personId,
      families: EPISODE_FAMILIES,
    }).beats.find((candidate) => candidate.stageKey === "it-came-out");

    expect(later, "the named-person continuation is reachable").toBeDefined();
    expect(mentionsIncident(later!.prose, incident)).toBe(true);
    expect(later!.prose).toContain(beat.bindings[0]!.personName);
  });
});
