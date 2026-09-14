/** Ordinary assembled play: no history/World injection, browser fixture or alternate store. */
import { writeFileSync } from "node:fs";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import {
  chooseAdultOption,
  letAdultTimePass,
} from "../../src/presentation/adult-life";
import {
  currentOpeningLifeScene,
  openNextLifeScene,
} from "../../src/presentation/life-scene-flow";
import { projectPlayerConversation } from "../../src/presentation/player-conversation";
import { commitConversationTurn } from "../../src/presentation/run-b-conversation";
import { favorEntries, performFavor } from "../../src/simulation/life-favors";
import {
  availableAdultSituations,
  buildAdultLifeContext,
} from "../../src/simulation/adult-situations";
import {
  describePersonContext,
  createCampaignElectionTransitionRegistry,
  serializeWorld,
  deserializeWorld,
  simulationMinutesBetween,
} from "../../src/simulation";
const reload = (world: Parameters<typeof serializeWorld>[0]) =>
  deserializeWorld(serializeWorld(world));
function adult() {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    startAge: 35,
    placeKey: "lexington-fayette",
    household: "shares-a-home",
    seed: "p34-life-lexington-fayette",
  });
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}
const { world, personId } = adult();
const entry = favorEntries(world, personId)[0]!;
const scenes = availableAdultSituations(buildAdultLifeContext(world, personId));
const agreed = chooseAdultOption(reload(world), {
  personId,
  situationKey: "adult.friend-favour",
  optionKey: "conditions",
});
const loaded = reload(agreed);
const performed = performFavor(
  loaded,
  personId,
  entry.request.id,
  createCampaignElectionTransitionRegistry(),
);
const loadedPerformed = reload(performed);
const unperformed = chooseAdultOption(reload(world), {
  personId,
  situationKey: "adult.friend-favour",
  optionKey: "do-it",
});
const callback = letAdultTimePass(reload(unperformed), 97);
const settled = letAdultTimePass(reload(performed), 97);
const family = [6, 10].map((age) => {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    startAge: age,
    placeKey: "lexington-fayette",
    household: "shares-a-home",
    seed: "p34-family-meeting",
  });
  const opened = openNextLifeScene(game.world, game.playerPersonId);
  const scene = currentOpeningLifeScene(opened, game.playerPersonId)!;
  const other = scene.presentPersonIds.find(
    (id) => id !== game.playerPersonId,
  )!;
  let current = opened;
  const exchanges = ["greet", "scene", "activity", "explain"].map((intent) => {
    const view = projectPlayerConversation(
      current,
      game.playerPersonId,
      "life-talk",
      { addressee: other },
    )!;
    const before = current;
    current = commitConversationTurn(current, {
      session: view.session,
      room: view.room,
      progress: view.progress,
      turnOrdinal: view.turnOrdinal,
      addressee: view.addressee,
      audibility: view.audibility,
      intent,
      transitionHandlers: createCampaignElectionTransitionRegistry(),
    }).world;
    const event = current.history.events.at(-1)!;
    return {
      intent,
      line: event.summary,
      reply: event.context.immediateReaction,
      elapsed: simulationMinutesBetween(
        before.currentMoment,
        current.currentMoment,
      ),
    };
  });
  return {
    age,
    person: describePersonContext(opened, game.playerPersonId, other),
    scene: scene.prose,
    sceneKey: scene.definition.key,
    exchanges,
    reloadedRelation: describePersonContext(
      reload(current),
      game.playerPersonId,
      other,
    )?.relationship,
  };
});
const report = {
  seed: world.seed,
  player: personId,
  request: entry.request.id,
  requester: describePersonContext(world, personId, entry.counterpartId),
  terms: entry.details,
  scene: scenes.find((s) => s.key === "adult.friend-favour"),
  otherScenes: scenes
    .filter((s) =>
      ["adult.friend-in-difficulty", "adult.household-quiet-evening"].includes(
        s.key,
      ),
    )
    .map((s) => ({
      key: s.key,
      prose: s.prose,
      options: s.options.map((o) => ({ key: o.key, label: o.label })),
    })),
  agreement: favorEntries(loaded, personId)[0]!.response,
  agreementMinutes: simulationMinutesBetween(
    world.currentMoment,
    loaded.currentMoment,
  ),
  performance: favorEntries(performed, personId)[0]!.outcome,
  performanceMinutes: simulationMinutesBetween(
    loaded.currentMoment,
    performed.currentMoment,
  ),
  performanceCount: performed.history.events.filter(
    (e) => e.type === "life.favour-performed",
  ).length,
  repeatAfterReloadSameWorld:
    performFavor(
      loadedPerformed,
      personId,
      entry.request.id,
      createCampaignElectionTransitionRegistry(),
    ) === loadedPerformed,
  unperformedCallback: callback.history.events.filter(
    (e) =>
      e.type === "life.earlier-choice-returned" &&
      e.tags.includes(`life.favour-request:${entry.request.id}`),
  ),
  performedDue: settled.history.futureDueItemStates.filter((s) =>
    s.stableKey.startsWith(`life-favor:${entry.request.id}:response:callback`),
  ),
  family,
};
const output = process.argv[2];
if (output) writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
else console.log(JSON.stringify(report, null, 2));
