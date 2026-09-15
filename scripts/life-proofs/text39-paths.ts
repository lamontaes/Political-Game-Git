import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
  type NewGameSetup,
} from "../../src/presentation/new-game";
import {
  answerQuestionnaire,
  questionnaireScreenFor,
  endQuestionnaireEarly,
} from "../../src/presentation/setup-questionnaire-flow";
import { SETUP_QUESTIONNAIRE_BANK } from "../../src/simulation/setup-questionnaire-bank";
import { questionnaireItem } from "../../src/simulation/setup-questionnaire";
import {
  openNextLifeScene,
  currentOpeningLifeScene,
  chooseOpeningLifeScene,
} from "../../src/presentation/life-scene-flow";
import { serializeWorld, deserializeWorld } from "../../src/simulation";
import {
  projectLifeConversation,
  commitLifeConversation,
} from "../../src/presentation/life-conversation";
const questionnaire = SETUP_QUESTIONNAIRE_BANK.map((item) => {
  const old = questionnaireItem(item.key.replace(/\.text39-v1$/, ""))!;
  assert(old);
  assert.deepEqual(item.eligibility, old.eligibility);
  assert.deepEqual(
    item.options.map((o) => o.key),
    old.options.map((o) => o.key),
  );
  return {
    key: item.key,
    prompt: item.prompt,
    options: item.options.map((o) => ({ key: o.key, text: o.text })),
  };
});
assert.equal(questionnaire.length, 56);
const paths = [];
for (const age of [6, 16, 34])
  for (const depth of ["short", "deep"] as const) {
    let setup: NewGameSetup = {
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "custom",
      startAge: age,
      questionnaire: depth,
      seed: `text39-q-${age}`,
      household: "shares-a-home",
    };
    const screens = [];
    for (let i = 0; i < 80; i++) {
      const screen = questionnaireScreenFor(setup);
      if (!screen) break;
      const original = JSON.stringify(setup);
      const options = screen.options.map((option) => {
        const answered = answerQuestionnaire(setup, option.key);
        assert.equal(answered.priors!.at(-1)!.questionKey, screen.questionKey);
        assert.equal(answered.priors!.at(-1)!.choiceId, option.key);
        const next = questionnaireScreenFor(answered);
        return { text: option.text, next: next?.prompt ?? "Start playing" };
      });
      assert.equal(JSON.stringify(setup), original);
      screens.push({ prompt: screen.prompt, key: screen.questionKey, options });
      setup = answerQuestionnaire(
        setup,
        screen.options[i % screen.options.length]!.key,
      );
    }
    assert(screens.length > 0);
    assert.equal(new Set(screens.map((s) => s.key)).size, screens.length);
    assert.deepEqual(endQuestionnaireEarly(setup).priors, setup.priors);
    const oldAnswers = setup.priors!.map((a) => ({
      ...a,
      questionKey: a.questionKey.replace(/\.text39-v1$/, ""),
    }));
    // A partial old run keeps its exact answer records and cannot repeat those items.
    const partial = { ...setup, priors: oldAnswers.slice(0, 2) };
    const next = questionnaireScreenFor(partial);
    assert(
      !next ||
        !partial.priors.some(
          (a) => next.questionKey === `${a.questionKey}.text39-v1`,
        ),
    );
    assert.deepEqual(partial.priors, oldAnswers.slice(0, 2));
    paths.push({ age, depth, screens });
  }
const game = createNewGameWorld({
  ...DEFAULT_NEW_GAME_SETUP,
  startKind: "custom",
  startAge: 6,
  household: "shares-a-home",
  seed: "repair6-lunchbox",
});
let world = game.world;
const id = game.playerPersonId;
let child: unknown = null;
for (let i = 0; i < 60; i++) {
  world = openNextLifeScene(world, id, "school");
  const scene = currentOpeningLifeScene(world, id);
  if (!scene) break;
  if (scene.definition.key !== "early.peer.roughhouse-line") {
    world = chooseOpeningLifeScene(
      world,
      id,
      scene.eventId,
      scene.choices[0]!.key,
    );
    continue;
  }
  const bytes = serializeWorld(world);
  assert.deepEqual(currentOpeningLifeScene(deserializeWorld(bytes), id), scene);
  const options = scene.choices.map((option) => {
    const answered = chooseOpeningLifeScene(
      world,
      id,
      scene.eventId,
      option.key,
    );
    const reply = answered.history.events
      .filter((e) => e.type === "life.scene.resolved")
      .at(-1)!.summary;
    const nextWorld = openNextLifeScene(
      deserializeWorld(serializeWorld(answered)),
      id,
      "school",
    );
    const next = currentOpeningLifeScene(nextWorld, id);
    const followup =
      next?.definition.key === scene.definition.key
        ? {
            prose: next.prose,
            options: next.choices.map((choice) => {
              const response = chooseOpeningLifeScene(
                nextWorld,
                id,
                next.eventId,
                choice.key,
              );
              return {
                choice: choice.label,
                reply: response.history.events
                  .filter((e) => e.type === "life.scene.resolved")
                  .at(-1)!.summary,
              };
            }),
          }
        : null;
    return { choice: option.label, reply, followup };
  });
  const conversation = scene.counterpartPersonId
    ? projectLifeConversation(world, id, scene.counterpartPersonId)
    : null;
  const dialogue = conversation?.intents.map((intent) => {
    const response = commitLifeConversation(world, {
      playerPersonId: id,
      personId: scene.counterpartPersonId!,
      intent: intent.key,
      revision: conversation.revision,
    });
    return {
      intent,
      reply: response.history.events
        .filter((e) => e.type === "life.conversation")
        .at(-1)?.context.immediateReaction,
    };
  });
  assert.equal(serializeWorld(world), bytes);
  child = {
    scene: scene.prose,
    location: world.history.events.find((event) => event.id === scene.eventId)
      ?.context.location?.label,
    options,
    dialogue,
  };
  break;
}
assert(
  child,
  "ordinary child route did not reach the edited roughhouse source",
);
writeFileSync(
  process.argv[2] ?? "/private/tmp/text39-paths-after.json",
  JSON.stringify({ questionnaire, paths, child }, null, 2) + "\n",
);
console.log(
  `TEXT39: ${questionnaire.length} versioned items, ${paths.length} short/deep paths, all shown options + next questions, ordinary child branches + dialogue; assertions passed.`,
);
