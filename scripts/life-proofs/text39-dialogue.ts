import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { projectPlayerConversation } from "../../src/presentation/player-conversation";
import { commitConversationTurn } from "../../src/presentation/run-b-conversation";
import { serializeWorld, deserializeWorld } from "../../src/simulation";
const game = createNewGameWorld({
  ...DEFAULT_NEW_GAME_SETUP,
  startKind: "custom",
  startAge: 34,
  household: "shares-a-home",
  seed: "text39-household",
  placeKey: "lexington-fayette",
});
const world = openOrdinaryLife(game.world, game.playerPersonId);
const id = game.playerPersonId;
const view = projectPlayerConversation(
  world,
  id,
  "neighborhood-meeting-notice",
)!;
assert(view);
const original = serializeWorld(world);
function answer(
  w: typeof world,
  v: typeof view,
  intent: (typeof view.intents)[number]["key"],
) {
  const result = commitConversationTurn(w, {
    session: v.session,
    room: v.room,
    progress: v.progress,
    turnOrdinal: v.turnOrdinal,
    addressee: v.addressee,
    audibility: v.audibility,
    intent,
  });
  assert.deepEqual(result.world.currentMoment, w.currentMoment);
  assert.deepEqual(
    deserializeWorld(serializeWorld(result.world)),
    result.world,
  );
  return result.world;
}
const options = view.intents.map((option) => {
  const answered = answer(world, view, option.key);
  const next = projectPlayerConversation(
    answered,
    id,
    "neighborhood-meeting-notice",
  )!;
  return {
    choice: option.label,
    description: option.description,
    reply: answered.history.events
      .filter((e) => e.type === "conversation.neighborhood-turn")
      .at(-1)?.context.immediateReaction,
    next: next.intents.map((item) => {
      const final = answer(answered, next, item.key);
      return {
        choice: item.label,
        description: item.description,
        reply: final.history.events
          .filter((e) => e.type === "conversation.neighborhood-turn")
          .at(-1)?.context.immediateReaction,
      };
    }),
  };
});
assert.equal(serializeWorld(world), original);
const output = {
  location: view.room.locationLabel,
  briefing: view.briefing,
  opening: view.openingLine,
  options,
};
writeFileSync(
  process.argv[2] ?? "/private/tmp/text39-dialogue-after.json",
  JSON.stringify(output, null, 2) + "\n",
);
console.log(JSON.stringify(output, null, 2));
