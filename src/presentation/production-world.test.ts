import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  activeWorkRelationshipsAt,
  ageOnDate,
  assertWorldIntegrity,
  characterHistoryContextPersonId,
  educationEnrollmentStateAt,
  createSyntheticPolicyCatalog,
  createSyntheticVitalityCatalog,
  createWorldId,
  personName,
  serializeWorld,
  deserializeWorld,
  worldLineage,
} from "../simulation";
import type { World } from "../simulation";
import { createNewGameWorld, otherParentQuestionApplies } from "./new-game";
import type { NewGameOtherParent, NewGameSetup } from "./new-game";
import {
  decodeReplayDescriptor,
  encodeReplayDescriptor,
} from "./new-game-identity";
import { observerPlace } from "./observer-world";
import { openOrdinaryLife } from "./ordinary-life";
import { drawRandomPlace } from "../../tests/support/random-place";
import { drawFamilyShape } from "../simulation/family-shape";
import { ensureTownEmployment } from "../simulation/living-world/town-employment";
import { worldSeedFor } from "./new-game-identity";

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
  familyShape: "one-parent",
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

  it("saves a world with no validation substrate anywhere in it", () => {
    // The import scan above cannot see this, and says so: it stops at the
    // simulation package, which legitimately exports the fixture constructors.
    // The re-audit walked straight through that gap — `createWorld` defaulted
    // every catalog to the synthetic set, so a production five-year-old was
    // serialized carrying generatorVersion "demo-world-v15", a policy catalog
    // versioned "synthetic-stage-3-v2", synthetic outbreak and storm models,
    // and a "Synthetic certain-death fixture" mortality table sourced from
    // "synthetic-validation-only". None of it was on screen; all of it was in
    // the save. This reads the payload instead of the imports.
    for (const startAge of [5, 12, 34]) {
      const { world } = start({ startAge });
      const payload = serializeWorld(world);
      expect({ startAge, matches: payload.match(/synthetic/gi) }).toEqual({
        startAge,
        matches: null,
      });
      expect({ startAge, matches: payload.match(/validation-only/gi) }).toEqual(
        {
          startAge,
          matches: null,
        },
      );
      expect({ startAge, matches: payload.match(/demo-world/gi) }).toEqual({
        startAge,
        matches: null,
      });
      expect({ startAge, matches: payload.match(/fixture/gi) }).toEqual({
        startAge,
        matches: null,
      });
    }
  });

  it("stamps a player's world as a production world, not a demo one", () => {
    const { world } = start({ startAge: 12 });
    expect(world.generatorVersion).toBe("production-world-v1");
    expect(worldLineage(world)).toBe("production");
    expect(world.policyCatalog.catalogVersion).toBe("production-policy-v1");
    // A production world and a fixture from the same seed are different
    // worlds, so one can never be addressed as, or land on, the other.
    expect(world.id).not.toBe(createWorldId(world.seed, "fixture"));
    expect(world.id).toBe(createWorldId(world.seed, "production"));
  });

  it("refuses to be a production world holding fixture content", () => {
    const { world } = start({ startAge: 12 });
    // Not a claim about how it is built — a claim about what may exist. A
    // world that says it is somebody's game and carries validation substrate
    // fails integrity rather than being written to disk.
    expect(() =>
      assertWorldIntegrity({
        ...world,
        vitalityCatalog: createSyntheticVitalityCatalog(),
      }),
    ).toThrow(/mortality table/i);
    expect(() =>
      assertWorldIntegrity({
        ...world,
        policyCatalog: createSyntheticPolicyCatalog(),
      }),
    ).toThrow(/production-policy-v1/);
  });

  it("gives a child none of the adult week the player shell opens", () => {
    // The builder's own output was already clean; the defect was one call
    // later. PlayerGame opened an ordinary life for whoever was starting, so a
    // five-year-old got "The week's errands", a decision about whether to
    // attend a public meeting, and an evening on their calendar with
    // themselves down as the responsible person — invisible behind the
    // formative screen and permanent in the save. This runs the same call.
    const child = start({ startAge: 5 });
    const opened = openOrdinaryLife(child.world, child.playerPersonId);
    expect(opened.history.workItems).toEqual([]);
    expect(opened.history.scheduledActivities).toEqual([]);
    expect(
      opened.history.events.filter((event) => event.type.startsWith("civic.")),
    ).toEqual([]);
    expect(opened).toBe(child.world);

    // And an adult still gets theirs, so this is a gate rather than a removal.
    const adult = start({ startAge: 34, depth: "summarize-earlier-life" });
    const adultDay = openOrdinaryLife(adult.world, adult.playerPersonId);
    expect(adultDay.history.workItems.length).toBeGreaterThan(0);
  });

  it("opens the ordinary week on the day it becomes the character's", () => {
    // Seventeen is a dependent; eighteen is not. The week has to start at the
    // boundary rather than at whichever boot happened to come after it.
    const seventeen = start({ startAge: 17 });
    expect(
      openOrdinaryLife(seventeen.world, seventeen.playerPersonId).history
        .workItems,
    ).toEqual([]);
    const eighteen = start({ startAge: 18 });
    expect(
      openOrdinaryLife(eighteen.world, eighteen.playerPersonId).history
        .workItems.length,
    ).toBeGreaterThan(0);
  });

  it("gives a child nothing an adult would have", () => {
    const { world, playerPersonId } = start({ startAge: 8 });
    expect(unjustifiedCargo(world)).toEqual({
      ...NOTHING,
      personalityTendencies: world.personOrder.length * 2,
      personalValues: world.personOrder.length * 3,
    });
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

  it("does not enroll a child too young for school in one", () => {
    const young = start({ startAge: 5 });
    const older = start({ startAge: 12 });
    expect(older.world.history.educationEnrollments.length).toBeGreaterThan(0);
    for (const enrollment of young.world.history.educationEnrollments) {
      expect(enrollment.startedAt <= young.world.currentDate).toBe(true);
    }
  });

  it("puts a school-age child in school on every earlier-life version", () => {
    /*
     * The regression this pins. `context-v2` declines to assume a school,
     * employer or credential in an ADULT's summarized past, which is the right
     * call and is decided on the adult path. The same condition was attached
     * to the code that enrolls a child, where nothing replaces it, so a
     * twelve-year-old had no enrollment: `in-school` stopped holding, every
     * early.school and early.peer opening went ineligible, and the child
     * attended nothing. A child at school today is present circumstance, not
     * invented biography, so it holds whatever version generated the past.
     *
     * The test above shares this file's BASE, which names no version, which is
     * exactly why it went on passing while the game shipped a schoolless
     * child. Every supported version is asked here by name.
     */
    for (const earlierLifeGenerationVersion of [
      undefined,
      "context-v2",
    ] as const) {
      const child = start({ startAge: 12, earlierLifeGenerationVersion });
      const enrollments = child.world.history.educationEnrollments.filter(
        (enrollment) => enrollment.personId === child.playerPersonId,
      );
      expect(enrollments.length, `${earlierLifeGenerationVersion}`).toBe(2);
      const current = enrollments.find(
        (enrollment) => enrollment.programKind === "schooling:general",
      );
      expect(current).toBeDefined();
      // Still in school: its current enrollment is not a finished one.
      expect(["expected", "active"]).toContain(
        educationEnrollmentStateAt(child.world, current!.id)?.status,
      );
    }
  });
});

/**
 * A148: whether the parent who is not raising the character is alive, living
 * elsewhere or dead is the player's own fact, asked in setup. The world never
 * draws it, so no setup records a death the player did not state. The place
 * is drawn from all 56 by the seed.
 */
/** Stated one-parent families, in places drawn by seed. */
const ONE_PARENT_SETUPS: readonly NewGameSetup[] = (() => {
  const found: NewGameSetup[] = [];
  for (let index = 0; index < 3; index += 1) {
    const seed = `a148-other-parent-${index}`;
    const setup: NewGameSetup = {
      ...BASE,
      seed,
      placeKey: observerPlace(seed).key,
      startAge: 6 + (index % 11),
    };
    if (otherParentQuestionApplies(setup)) found.push(setup);
  }
  return found;
})();
const DRAWN = ONE_PARENT_SETUPS.map(
  (setup) => `${setup.placeKey} (seed ${setup.seed}, age ${setup.startAge})`,
).join("; ");

describe(`the other parent is the player's answer, never a draw: ${DRAWN}`, () => {
  function oneParentSetups(count: number): NewGameSetup[] {
    expect(ONE_PARENT_SETUPS.length).toBeGreaterThanOrEqual(count);
    return ONE_PARENT_SETUPS.slice(0, count);
  }

  function otherParentRecords(world: World) {
    const id = characterHistoryContextPersonId(
      world,
      "production:initial-life:nonresident-parent",
    );
    return {
      parents: world.people[id] ? [id] : [],
      deaths: world.history.personDeaths.filter((row) => row.personId === id),
    };
  }

  it("records no death and no other parent when the player says nothing", () => {
    for (const setup of oneParentSetups(3)) {
      const { world } = createNewGameWorld(setup);
      const where = `${setup.placeKey}, seed ${setup.seed}`;
      expect(world.history.personDeaths, where).toHaveLength(0);
      expect(otherParentRecords(world).parents, where).toEqual([]);
    }
  });

  it("records exactly what the player said about the other parent", () => {
    const [setup] = oneParentSetups(1);
    const built = (otherParent: NewGameOtherParent) =>
      createNewGameWorld({ ...setup!, otherParent });
    const where = `${setup!.placeKey}, seed ${setup!.seed}`;

    const living = built("living");
    expect(otherParentRecords(living.world).parents, where).toEqual([]);
    expect(living.world.history.personDeaths).toHaveLength(0);

    const elsewhere = built("nonresident");
    const away = otherParentRecords(elsewhere.world);
    expect(away.parents, where).toHaveLength(1);
    expect(away.deaths).toHaveLength(0);

    const died = built("deceased");
    const gone = otherParentRecords(died.world);
    expect(gone.parents, where).toHaveLength(1);
    expect(gone.deaths).toHaveLength(1);
    expect(gone.deaths[0]!.causeKey).toBe("cause:unknown");
    expect(died.world.history.personDeaths).toHaveLength(1);
  });

  it("asks only where one parent raises the child, and keeps the answer in a replay", () => {
    // The stated household makes the question available before an answer.
    const [setup] = oneParentSetups(1);
    for (const otherParent of ["living", "nonresident", "deceased"] as const)
      expect(otherParentQuestionApplies({ ...setup!, otherParent })).toBe(true);
    expect(otherParentQuestionApplies({ ...setup!, startAge: 4 })).toBe(false);
    expect(otherParentQuestionApplies({ ...setup!, startAge: 30 })).toBe(false);
    const replayed = decodeReplayDescriptor(
      encodeReplayDescriptor({ ...setup!, otherParent: "deceased" }),
    );
    expect(replayed?.otherParent).toBe("deceased");
    expect(
      decodeReplayDescriptor(encodeReplayDescriptor(setup!))?.otherParent,
    ).toBeUndefined();
  });

  it("has no seeded pick for the other parent left in the world builder", () => {
    const source = readFileSync(
      resolve(
        dirname(new URL(import.meta.url).pathname),
        "production-world.ts",
      ),
      "utf8",
    );
    expect(source).not.toContain("opening-life-other-parent-v1");
  });

  it.each(["one-parent", "two-parents", "guardian"] as const)(
    "records the stated %s household through canonical kinship and authority",
    (familyShape) => {
      const seed = `a148-stated-family-${familyShape}`;
      const place = drawRandomPlace(seed);
      const setup: NewGameSetup = {
        ...BASE,
        seed,
        placeKey: place.key,
        startKind: "custom",
        household: "lives-alone",
        familyShape,
      };
      const game = createNewGameWorld(setup);
      const replayed = decodeReplayDescriptor(encodeReplayDescriptor(setup));
      expect(replayed?.familyShape).toBe(familyShape);
      expect(worldSeedFor(replayed!)).toBe(worldSeedFor(setup));
      const saved = deserializeWorld(serializeWorld(game.world));
      const parents = saved.history.kinshipRelationships.filter(
        (row) =>
          row.personIds.includes(game.playerPersonId) &&
          row.kind === "lineal:parent-child",
      );
      expect(parents).toHaveLength(
        familyShape === "two-parents"
          ? 2
          : familyShape === "one-parent"
            ? 1
            : 0,
      );
      const authorities = saved.history.childAuthorities.filter(
        (row) => row.childPersonId === game.playerPersonId,
      );
      expect(authorities).toHaveLength(familyShape === "two-parents" ? 2 : 1);
      expect(authorities[0]!.kind).toBe(
        familyShape === "guardian"
          ? "guardianship:ordinary"
          : "parental:primary",
      );
      expect(
        saved.history.events.some((row) => row.type === "life.family-estimate"),
      ).toBe(false);
      expect(otherParentQuestionApplies(setup)).toBe(
        familyShape === "one-parent",
      );
      assertWorldIntegrity(saved);
    },
  );

  it("keeps recorded source families and the estimated household choice through save/reload", () => {
    const seed = "a148-recorded-family-opening";
    const place = drawRandomPlace(seed);
    const setup: NewGameSetup = {
      ...BASE,
      seed,
      placeKey: place.key,
      familyShape: undefined,
    };
    const game = createNewGameWorld(setup);
    const saved = deserializeWorld(serializeWorld(game.world));
    const event = saved.history.events.find(
      (row) => row.type === "life.family-estimate",
    )!;
    expect(event).toBeDefined();
    const estimate = JSON.parse(event.context.motivation!) as ReturnType<
      typeof drawFamilyShape
    >["estimate"];
    expect(estimate.samples.length).toBeGreaterThan(0);
    expect(event.summary).toContain("ESTIMATED FROM AVERAGE");
    for (const sample of estimate.samples) {
      expect(saved.people[sample.personId]!.birthDate).toBe(sample.birthDate);
      expect(sample.parentIds.map((id) => saved.people[id]!.birthDate)).toEqual(
        sample.parentBirthDates,
      );
      expect(
        sample.kinshipIds.every((id) =>
          saved.history.kinshipRelationships.some((row) => row.id === id),
        ),
      ).toBe(true);
    }
    // The source is the pre-opening cohort, not the newly estimated family.
    const sourceKinship = saved.history.kinshipRelationships.filter(
      (row) =>
        !row.personIds.includes(game.playerPersonId) &&
        estimate.samples.some((sample) => sample.kinshipIds.includes(row.id)),
    );
    const expected = drawFamilyShape(
      {
        ...saved,
        history: { ...saved.history, kinshipRelationships: sourceKinship },
      },
      worldSeedFor(setup),
    );
    expect(event.context.choice).toBe(
      expected.secondParent ? "two-parents" : "one-parent",
    );
    const parents = saved.history.kinshipRelationships.filter(
      (row) =>
        row.personIds.includes(game.playerPersonId) &&
        row.kind === "lineal:parent-child",
    );
    expect(parents).toHaveLength(expected.secondParent ? 2 : 1);
    expect(
      ensureTownEmployment(
        saved,
        place.context.jurisdiction.id,
        game.playerPersonId,
      ).history.workRelationships,
    ).toEqual(saved.history.workRelationships);
    assertWorldIntegrity(saved);
  });
});
