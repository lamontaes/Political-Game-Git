/**
 * Can the study-plan answer be reached the way a player reaches it?
 *
 * Explores whether a real collaboration, real proposals and a real compromise
 * answer can be set up from a generated life, so the deliberation invariant
 * can be held at that API too rather than at the trait table.
 */
import {
  ageOnDate,
  createEducationEnrollment,
  money,
} from "../../src/simulation";
import { createResourcePosition } from "../../src/simulation/resources";
import { enterLifePath } from "../../src/simulation/life-paths2";
import { activeEducationEnrollmentsAt } from "../../src/simulation/life-queries";
import {
  STUDY_COLLABORATION_EVENT,
  decideStudyPeerOutcome,
} from "../../src/simulation/people-study";
import {
  PROPOSABLE_APPROACHES,
  decideStudyPlanOutcome,
  recordStudyProposals,
  revisionFor,
  studyPlanProposals,
} from "../../src/simulation/people-study-plan";
import {
  PEOPLE_TRAITS,
  personTrait,
  recordTraitChange,
  type PeopleTrait,
  type TraitValue,
} from "../../src/simulation/people-traits";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../src/presentation/ordinary-life";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "../../src/presentation/player-conversation";
import { commitConversationTurn } from "../../src/presentation/run-b-conversation";
import type { EntityId, World } from "../../src/simulation/types";

const seed = "study-plan-probe";
const game = generateOpeningLife(
  prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 30 }),
).game!;
const player = game.playerPersonId;
const funded = createResourcePosition(openOrdinaryLife(game.world, player), {
  stableKey: `${seed}:funds`,
  owner: { kind: "person", personId: player },
  openedAt: game.world.currentDate,
  openingBalance: money(5_000_000, "USD"),
  provenance: { kind: "authored", note: "Probe fixture." },
});
const entered = enterLifePath(funded, "college-office-certificate");
let world: World = entered.world;
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
  provenance: { kind: "authored", note: "Probe fixture." },
});
world = passOrdinaryDays(world, 1, { stopForTentativeHolds: true });

function eventFor(w: World, personId: EntityId) {
  return [...w.history.events]
    .reverse()
    .find((event) => event.involvedEntityIds.includes(personId))!;
}

function temperament(
  w: World,
  personId: EntityId,
  values: Partial<Record<PeopleTrait, TraitValue>>,
): World {
  let next = w;
  for (const trait of PEOPLE_TRAITS) {
    next = recordTraitChange(next, {
      personId,
      trait,
      value: values[trait] ?? 0,
      eventId: eventFor(next, personId).id,
      reason: "Probe: one trait at a time.",
    });
  }
  return next;
}

console.log(
  `scene open: ${availablePlayerConversations(world, player).some((entry) => entry.subject === "scene-study-peer" && !entry.settled)}`,
);

// Make the peer somebody who says yes to working together.
const willing = temperament(world, peerPersonId, {
  sociability: 2,
  reliability: 2,
});
console.log(
  `peer answer to the offer: ${decideStudyPeerOutcome(willing, { personId: player, peerPersonId }).outcome}`,
);

const view = projectPlayerConversation(willing, player, "scene-study-peer")!;
const said = commitConversationTurn(willing, {
  session: view.session,
  room: view.room,
  progress: view.progress,
  turnOrdinal: view.turnOrdinal,
  addressee: view.addressee,
  audibility: view.audibility,
  intent: "offer",
}).world;
console.log(
  `collaboration agreed: ${said.history.events.some((event) => event.type === STUDY_COLLABORATION_EVENT)}`,
);

for (const mine of PROPOSABLE_APPROACHES) {
  const proposed = recordStudyProposals(said, {
    personId: player,
    peerPersonId,
    approachId: mine,
  });
  const proposals = studyPlanProposals(proposed.world, player, peerPersonId)!;
  const revision = revisionFor(proposals.mine, proposals.theirs);
  console.log(
    `  mine=${mine} theirs=${proposals.theirs} revision=${revision?.id ?? "(none)"}`,
  );
  if (!revision) continue;
  for (const value of [-2, 2] as const) {
    const world2 = temperament(proposed.world, peerPersonId, {
      deliberation: value,
    });
    const shown = personTrait(world2, peerPersonId, "deliberation");
    const outcome = decideStudyPlanOutcome(world2, {
      personId: player,
      peerPersonId,
      answer: "compromise",
    }).outcome;
    console.log(`      "${shown.label}" answers ${outcome}`);
  }
}
