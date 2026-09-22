import { describe, expect, it } from "vitest";

import { ageOnDate, createEducationEnrollment, money } from "../simulation";
import { enterLifePath } from "../simulation/life-paths2";
import { activeEducationEnrollmentsAt } from "../simulation/life-queries";
import { createResourcePosition } from "../simulation/resources";
import { STUDY_COLLABORATION_EVENT } from "../simulation/people-study";
import {
  decideStudyPlanOutcome,
  recordStudyProposals,
  studyPlanProposals,
} from "../simulation/people-study-plan";
import {
  PEOPLE_TRAITS,
  recordTraitChange,
  type PeopleTrait,
  type TraitValue,
} from "../simulation/people-traits";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { projectPlayerConversation } from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";
import type { EntityId, World } from "../simulation";

/**
 * The second module the deliberation trait is read in, held at the answer a
 * player actually sees rather than at the lean table.
 *
 * The fix that corrected this trait's poles was a uniform sweep of its nine
 * consumers, and a uniform sweep is exactly the thing that cannot tell eight
 * wrong sites from one right one. It broke this one: the "not yet" answer
 * moved to the impulsive pole, so somebody described as acting on impulse
 * became the person who withheld a yes pending more thought. A test on
 * people-promise alone did not see it, and the nine sites span five files.
 *
 * What is held here is the one-sentence version: whoever else may want to
 * leave a plan open, it is not the person who acts on impulse.
 */
function classmates(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 30 }),
  ).game!;
  const player = game.playerPersonId;
  const funded = createResourcePosition(openOrdinaryLife(game.world, player), {
    stableKey: `${seed}:funds`,
    owner: { kind: "person", personId: player },
    openedAt: game.world.currentDate,
    openingBalance: money(5_000_000, "USD"),
    provenance: { kind: "authored", note: "Study-plan trait fixture." },
  });
  let world: World = enterLifePath(funded, "college-office-certificate").world;
  const enrollment = activeEducationEnrollmentsAt(world, player).at(-1)!;
  const peerPersonId = world.personOrder.find(
    (id) =>
      id !== player &&
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18 &&
      activeEducationEnrollmentsAt(world, id).length === 0,
  )!;
  world = createEducationEnrollment(world, {
    stableKey: `${seed}:peer`,
    personId: peerPersonId,
    organizationId: enrollment.enrollment.organizationId,
    startedAt: world.currentDate,
    programKind: enrollment.enrollment.programKind,
    contextKind: "program:life-paths2-v2",
    provenance: { kind: "authored", note: "Study-plan trait fixture." },
  });
  return {
    player,
    peerPersonId,
    world: passOrdinaryDays(world, 1, { stopForTentativeHolds: true }),
  };
}

function temperament(
  world: World,
  personId: EntityId,
  values: Partial<Record<PeopleTrait, TraitValue>>,
): World {
  let next = world;
  for (const trait of PEOPLE_TRAITS) {
    const eventId = [...next.history.events]
      .reverse()
      .find((event) => event.involvedEntityIds.includes(personId))!.id;
    next = recordTraitChange(next, {
      personId,
      trait,
      value: values[trait] ?? 0,
      eventId,
      reason: "Set for this test, so one trait argues at a time.",
    });
  }
  return next;
}

/** The whole route: they agree to work together, then both say how. */
function planUnderWay(seed: string) {
  const { player, peerPersonId, world } = classmates(seed);
  // Somebody who says yes to working together in the first place.
  const willing = temperament(world, peerPersonId, {
    sociability: 2,
    reliability: 2,
  });
  const view = projectPlayerConversation(willing, player, "scene-study-peer")!;
  const agreed = commitConversationTurn(willing, {
    session: view.session,
    room: view.room,
    progress: view.progress,
    turnOrdinal: view.turnOrdinal,
    addressee: view.addressee,
    audibility: view.audibility,
    intent: "offer",
  }).world;
  const proposed = recordStudyProposals(agreed, {
    personId: player,
    peerPersonId,
    // An approach that differs from theirs, so there is a compromise to put.
    approachId: "outline-first",
  }).world;
  return { player, peerPersonId, world: proposed, agreed };
}

describe("a study plan reads deliberation the way its own words read", () => {
  const seeds = ["a", "b", "c", "d"].map((suffix) =>
    planUnderWay(`study-plan-deliberation-${suffix}`),
  );

  it("is reached the way a player reaches it, not assembled", () => {
    for (const seed of seeds) {
      expect(
        seed.agreed.history.events.some(
          (event) => event.type === STUDY_COLLABORATION_EVENT,
        ),
      ).toBe(true);
      const proposals = studyPlanProposals(
        seed.world,
        seed.player,
        seed.peerPersonId,
      );
      expect(proposals).not.toBeNull();
      expect(proposals!.revision).toBeTruthy();
    }
  });

  it("somebody who acts on impulse does not leave the plan open", () => {
    // Confrontational argues for coming back with part of it, and nothing
    // argues for leaving it open, so a peer who acts on impulse answers
    // "part of it". With the poles inverted, impulsiveness argued for "not
    // yet" as strongly, and the answer turned on the tie-breaking jitter.
    const answers = seeds.map(
      (seed) =>
        decideStudyPlanOutcome(
          temperament(seed.world, seed.peerPersonId, {
            deliberation: 2,
            conflict: 2,
          }),
          {
            personId: seed.player,
            peerPersonId: seed.peerPersonId,
            answer: "compromise",
          },
        ).outcome,
    );
    expect(answers).not.toContain("unresolved");
    expect(answers).toEqual(seeds.map(() => "counterproposes"));
  });
});
