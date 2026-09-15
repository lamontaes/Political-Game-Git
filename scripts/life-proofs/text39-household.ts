import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import {
  availableAdultSituations,
  buildAdultLifeContext,
} from "../../src/simulation/adult-situations";
import { projectPlayerConversation } from "../../src/presentation/player-conversation";
import { commitConversationTurn } from "../../src/presentation/run-b-conversation";
import { chooseAdultOption } from "../../src/presentation/adult-life";
import { serializeWorld, deserializeWorld } from "../../src/simulation";
const game = createNewGameWorld({
  ...DEFAULT_NEW_GAME_SETUP,
  startKind: "custom",
  startAge: 34,
  depth: "summarize-earlier-life",
  questionnaire: "skipped",
  placeKey: "lexington-fayette",
  household: "shares-a-home",
  seed: "text39-household",
});
const world = openOrdinaryLife(game.world, game.playerPersonId);
const id = game.playerPersonId;
const before = serializeWorld(world);
const scene = availableAdultSituations(buildAdultLifeContext(world, id)).find(
  (s) => s.key === "adult.household-standing",
)!;
const responses = scene.options.map((option) => {
  const next = chooseAdultOption(world, {
    personId: id,
    situationKey: scene.key,
    optionKey: option.key,
  });
  assert.deepEqual(next.currentMoment, world.currentMoment);
  assert.deepEqual(next.history.workItems, world.history.workItems);
  assert.deepEqual(deserializeWorld(serializeWorld(next)), next);
  return {
    choice: option.label,
    description: option.description,
    response: next.history.events.find((e) => e.tags.includes(scene.key))!
      .summary,
  };
});
const view = projectPlayerConversation(world, id, "household-obligation")!;
const raised = commitConversationTurn(world, {
  session: view.session,
  room: view.room,
  progress: view.progress,
  turnOrdinal: view.turnOrdinal,
  addressee: view.addressee,
  audibility: view.audibility,
  intent: "raise-obligation",
});
assert.deepEqual(raised.world.currentMoment, world.currentMoment);
const nextView = projectPlayerConversation(
  raised.world,
  id,
  "household-obligation",
)!;
const dialogueChoices = nextView.intents.map((option) => {
  const next = commitConversationTurn(raised.world, {
    session: nextView.session,
    room: nextView.room,
    progress: nextView.progress,
    turnOrdinal: nextView.turnOrdinal,
    addressee: nextView.addressee,
    audibility: nextView.audibility,
    intent: option.key,
  });
  assert.deepEqual(next.world.currentMoment, world.currentMoment);
  return {
    choice: option.label,
    description: option.description,
    response: next.world.history.events
      .filter((e) => e.type === "conversation.household-turn")
      .at(-1)?.context.immediateReaction,
  };
});
assert.equal(serializeWorld(world), before);
const output = {
  source: "TEXT39 household",
  location: view.room.locationLabel,
  briefing: view.briefing,
  opening: view.openingLine,
  scene: scene.prose,
  responses,
  firstChoices: view.intents,
  firstReply: raised.world.history.events
    .filter((e) => e.type === "conversation.household-turn")
    .at(-1)?.context.immediateReaction,
  dialogueChoices,
};
writeFileSync(
  process.argv[2] ?? "/private/tmp/text39-household-after.json",
  JSON.stringify(output, null, 2) + "\n",
);
console.log(JSON.stringify(output, null, 2));
