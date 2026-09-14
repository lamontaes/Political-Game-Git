import { writeFileSync } from "node:fs";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import {
  openNextLifeScene,
  currentOpeningLifeScene,
} from "../../src/presentation/life-scene-flow";
import {
  commitLifeConversation,
  projectLifeConversation,
  type LifeTalkIntent,
} from "../../src/presentation/life-conversation";
import {
  serializeWorld,
  deserializeWorld,
  simulationMinutesBetween,
  createCampaignElectionTransitionRegistry,
  type World,
  assertWorldIntegrity,
} from "../../src/simulation";
const setup = {
  ...DEFAULT_NEW_GAME_SETUP,
  seed: "p34-mom-game-3",
  startKind: "custom",
  startAge: 10,
  depth: "play-formative-years",
  questionnaire: "skipped",
  placeKey: "lexington-fayette",
  household: "shares-a-home",
} as const;
const game = createNewGameWorld(setup);
const world = openNextLifeScene(game.world, game.playerPersonId);
const player = game.playerPersonId;
const mom = currentOpeningLifeScene(world, player)!.presentPersonIds.find(
  (id) => id !== player,
)!;
const reload = (w: World) => deserializeWorld(serializeWorld(w));
function speak(w: World, intent: LifeTalkIntent) {
  return commitLifeConversation(w, {
    playerPersonId: player,
    personId: mom,
    intent,
    revision: projectLifeConversation(w, player, mom)!.revision,
    transitionHandlers: createCampaignElectionTransitionRegistry(),
  });
}
const proposed = speak(world, "activity");
const agreed = speak(reload(proposed), "suggestGame");
const performed = speak(reload(agreed), "spendTime");
const declined = speak(reload(proposed), "declineProposal");
const cancelled = speak(reload(agreed), "cancelProposal");
const loaded = reload(performed);
let repeatRejected = false;
try {
  speak(loaded, "spendTime");
} catch {
  repeatRejected = true;
}
assertWorldIntegrity(performed);
const report = {
  setup,
  player: world.people[player],
  requester: projectLifeConversation(world, player, mom)!.person,
  proposal: projectLifeConversation(proposed, player, mom)!.proposal,
  agreement: projectLifeConversation(agreed, player, mom)!.proposal,
  transcript: projectLifeConversation(performed, player, mom)!.transcript,
  actualEvents: performed.history.events.slice(world.history.events.length),
  minutes: {
    proposal: simulationMinutesBetween(
      world.currentMoment,
      proposed.currentMoment,
    ),
    agreement: simulationMinutesBetween(
      world.currentMoment,
      agreed.currentMoment,
    ),
    performance: simulationMinutesBetween(
      agreed.currentMoment,
      performed.currentMoment,
    ),
    decline: simulationMinutesBetween(
      world.currentMoment,
      declined.currentMoment,
    ),
    cancel: simulationMinutesBetween(
      world.currentMoment,
      cancelled.currentMoment,
    ),
  },
  decline: projectLifeConversation(reload(declined), player, mom)!.proposal,
  cancel: projectLifeConversation(reload(cancelled), player, mom)!.proposal,
  repeatRejected,
  performedCount: loaded.history.events.filter((e) =>
    e.tags.includes("life.proposal.performed"),
  ).length,
};
const output = process.argv[2];
if (output) writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
else console.log(JSON.stringify(report, null, 2));
