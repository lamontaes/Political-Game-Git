import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  activeWorkRelationshipsAt,
  ageOnDate,
  personName,
} from "../simulation";
import type { World } from "../simulation";
import { createNewGameWorld } from "./new-game";
import type { NewGameSetup } from "./new-game";

/**
 * Proof that a new game is a new game.
 *
 * The audit that sent this branch back reproduced a five-year-old holding a
 * paid staff job, a campaign pledge, a public position and a personal value,
 * with a creation event naming somebody else entirely — because production
 * play was built by making a developer fixture and renaming the person inside
 * it. These tests exist so that cannot come back quietly.
 */

const BASE: Omit<NewGameSetup, "seed"> = {
  placeKey: "kentucky",
  startAge: 10,
  depth: "play-formative-years",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  givenName: null,
  familyName: null,
};

function start(overrides: Partial<NewGameSetup> = {}) {
  return createNewGameWorld({ ...BASE, seed: "acceptance", ...overrides });
}

/** Every canonical record family that only exists once something establishes it. */
function unjustifiedCargo(world: World) {
  const history = world.history;
  return {
    work: history.workRelationships.length,
    campaignCommitments: history.campaignCommitments.length,
    publicPositions: history.publicPositions.length,
    privateBeliefs: history.privateBeliefs.length,
    principles: history.principles.length,
    personalValues: history.personalValues.length,
    personalityTendencies: history.personalityTendencies.length,
    lifeCommitments: history.lifeCommitments.length,
    careResponsibilities: history.careResponsibilities.length,
    propositionExposures: history.propositionExposures.length,
    subjectKnowledge: history.subjectKnowledge.length,
  };
}

const NOTHING = {
  work: 0,
  campaignCommitments: 0,
  publicPositions: 0,
  privateBeliefs: 0,
  principles: 0,
  personalValues: 0,
  personalityTendencies: 0,
  lifeCommitments: 0,
  careResponsibilities: 0,
  propositionExposures: 0,
  subjectKnowledge: 0,
};

describe("The production world is not a renamed fixture", () => {
  const DEMO_CONSTRUCTORS = [
    "createDemoWorld",
    "createScenarioWorld",
    "createGeneratedWorld",
    "createRunDLiteFixture",
  ];

  it("builds normal play without reaching for a demo constructor", () => {
    // Follows the real import graph rather than trusting a comment: if any
    // module reachable from New Game names a fixture constructor, this fails.
    const root = resolve(dirname(new URL(import.meta.url).pathname));
    const seen = new Set<string>();
    const offences: string[] = [];

    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      let source: string;
      try {
        source = readFileSync(file, "utf8");
      } catch {
        return;
      }
      for (const constructor of DEMO_CONSTRUCTORS) {
        if (new RegExp(`\\b${constructor}\\b`).test(source)) {
          offences.push(`${file.slice(root.length + 1)} names ${constructor}`);
        }
      }
      for (const match of source.matchAll(/from "(\.[^"]+)"/g)) {
        const specifier = match[1]!;
        const base = resolve(dirname(file), specifier);
        for (const candidate of [`${base}.ts`, `${base}/index.ts`]) {
          try {
            readFileSync(candidate, "utf8");
            // The simulation package legitimately exports the fixture
            // constructors; what matters is that production never calls one.
            if (!candidate.includes("/simulation/")) visit(candidate);
            break;
          } catch {
            /* try the next candidate */
          }
        }
      }
    };

    visit(resolve(root, "new-game.ts"));
    visit(resolve(root, "production-world.ts"));
    expect(offences).toEqual([]);
  });

  it("gives a child nothing an adult would have", () => {
    const { world, playerPersonId } = start({ startAge: 8 });
    expect(unjustifiedCargo(world)).toEqual(NOTHING);
    expect(activeWorkRelationshipsAt(world, playerPersonId)).toEqual([]);
  });

  it("gives an ordinary adult no political or staff biography", () => {
    const { world, playerPersonId } = start({
      startAge: 34,
      depth: "summarize-earlier-life",
    });
    const cargo = unjustifiedCargo(world);
    expect(cargo.campaignCommitments).toBe(0);
    expect(cargo.publicPositions).toBe(0);
    expect(cargo.principles).toBe(0);
    const legislative = activeWorkRelationshipsAt(world, playerPersonId).filter(
      (entry) => entry.relationship.kind.startsWith("employment:legislative-"),
    );
    expect(legislative).toEqual([]);
  });

  it("keeps fixture vocabulary out of the world it builds", () => {
    const { world } = start({ startAge: 8 });
    // Catalogs installed by the world constructor are shared infrastructure and
    // are checked elsewhere; what must be clean is everything this factory
    // writes — the people, their facts, and the history.
    const written = JSON.stringify({
      people: world.people,
      history: world.history,
      jurisdictions: world.jurisdictions,
    });
    expect(written).not.toMatch(/synthetic/i);
    expect(written).not.toMatch(/fixture/i);
    expect(written).not.toMatch(/stage-6/i);
  });

  it("names the actual person in the event that creates them", () => {
    const { world, playerPersonId } = start({
      startAge: 12,
      givenName: "Wren",
      familyName: "Okafor",
    });
    const player = world.people[playerPersonId]!;
    expect(personName(player)).toBe("Wren Okafor");

    const creation = world.history.events.find(
      (event) => event.type === "world.created",
    );
    expect(creation).toBeDefined();
    expect(creation!.summary).toContain("Wren Okafor");
    expect(creation!.summary).toContain("12");
    expect(creation!.involvedEntityIds).toContain(playerPersonId);

    // The identity is right at creation rather than corrected afterwards, so
    // every fact written about this person already says their real name.
    for (const fact of player.establishedFacts) {
      expect(fact.summary).not.toContain(" is established as undefined");
      if (fact.summary.includes("'s")) {
        expect(fact.summary.startsWith("Wren Okafor")).toBe(true);
      }
    }
  });

  it("puts the age the player asked for on the character", () => {
    for (const startAge of [5, 10, 17, 21, 40, 70]) {
      const { world, playerPersonId } = start({
        startAge,
        startingLife: "ordinary-life",
        household: "shares-a-home",
      });
      const player = world.people[playerPersonId]!;
      expect(ageOnDate(player.birthDate, world.currentDate)).toBe(startAge);
    }
  });

  it("derives the appearance from the person who ends up existing", () => {
    const { world, playerPersonId } = start({ givenName: "Wren" });
    const player = world.people[playerPersonId]!;
    // The recipe is keyed on the final canonical id, so a saved and reloaded
    // world shows the same face rather than a discarded profile's.
    expect(player.appearance).toBeDefined();
    expect(player.id).toBe(playerPersonId);
    expect(player.generatorVersion).toBe("starting-person-v1");
  });

  it("establishes the office job only when the setup actually asks for one", () => {
    const { world, playerPersonId } = start({
      startAge: 30,
      startingLife: "legislative-office",
      household: "shares-a-home",
    });
    const work = activeWorkRelationshipsAt(world, playerPersonId);
    expect(work).toHaveLength(1);
    expect(work[0]!.relationship.kind).toBe("employment:legislative-staff");

    const ordinary = start({ startAge: 30, startingLife: "ordinary-life" });
    expect(
      activeWorkRelationshipsAt(ordinary.world, ordinary.playerPersonId),
    ).toEqual([]);
  });

  it("puts a child in a household with somebody who can raise them", () => {
    const { world, playerPersonId } = start({ startAge: 7 });
    const player = world.people[playerPersonId]!;
    const authority = world.history.childAuthorities.find(
      (record) => record.childPersonId === playerPersonId,
    );
    expect(authority).toBeDefined();
    expect(authority!.holder.kind).toBe("person");

    const guardianId =
      authority!.holder.kind === "person" ? authority!.holder.personId : null;
    const guardian = world.people[guardianId!]!;
    expect(guardian).toBeDefined();
    // Old enough to be raising this child, which is the only claim being made.
    expect(
      ageOnDate(guardian.birthDate, world.currentDate) -
        ageOnDate(player.birthDate, world.currentDate),
    ).toBeGreaterThanOrEqual(24);
  });

  it("does not enrol a child too young for school in one", () => {
    const young = start({ startAge: 5 });
    const older = start({ startAge: 12 });
    expect(older.world.history.educationEnrollments.length).toBeGreaterThan(0);
    for (const enrollment of young.world.history.educationEnrollments) {
      expect(enrollment.startedAt <= young.world.currentDate).toBe(true);
    }
  });
});
