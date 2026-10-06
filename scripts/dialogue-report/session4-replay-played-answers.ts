import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import type { World } from "../../src/simulation/types";
import { projectPlayedSceneExchange } from "../../src/presentation/scene-conversation";
import { commitPlayedSceneTurn } from "../../src/presentation/life-conversation";
import { speakerTraits } from "../../src/presentation/speaker-traits";

// Replays actual retained browser arrivals; never creates or patches a World.
// This is regression evidence, not a replacement for fresh played browser proof.
const receipts = process.argv.slice(2).map((path) => {
  const bytes = readFileSync(path);
  const world = JSON.parse(bytes.toString("utf8")) as World;
  assert.equal(world.control.kind, "person");
  if (world.control.kind !== "person") throw new Error("No controlled person.");
  const player = world.control.personId;
  const entry = world.history.events.findLast(
    (event) =>
      event.type === "civic.meeting-entered" &&
      event.participants.some(
        (person) =>
          person.personId === player && person.role === "presence:participant",
      ),
  );
  assert.ok(
    entry,
    "The saved arrival must actually contain meeting attendance.",
  );
  const chair = entry.participants.find(
    (person) => person.role === "coordination:chair",
  )?.personId;
  assert.ok(chair, "The saved arrival must actually record a chair.");
  const scene = projectPlayedSceneExchange(world, player, chair);
  assert.ok(
    scene,
    "Recorded participants must reach the existing exchange reader.",
  );
  assert.ok(
    scene.contributions.length,
    "An unsupported agenda must not suppress the recorded chair.",
  );
  const question = scene.replies.find(
    (reply) =>
      reply.primitive === "ask-record" && reply.sourceEventId === entry.id,
  );
  assert.ok(question, "The known chair question must actually be offered.");
  const next = commitPlayedSceneTurn(world, {
    playerPersonId: player,
    addresseePersonId: chair,
    replyKey: question.key,
    snapshot: scene.snapshot,
  });
  const turn = next.history.events.findLast((event) =>
    event.tags.includes("scene.composed-turn"),
  );
  assert.ok(turn);
  assert.match(
    turn.context.immediateReaction ?? "",
    /chair/i,
    "This actual consenting chair should answer the chair question, not ask permission to listen.",
  );
  assert.equal(
    createHash("sha256").update(readFileSync(path)).digest("hex"),
    createHash("sha256").update(bytes).digest("hex"),
  );
  return {
    inputPath: path,
    inputSha256: createHash("sha256").update(bytes).digest("hex"),
    worldId: world.id,
    seed: world.seed,
    moment: world.currentMoment,
    presenceEventId: entry.id,
    playerPersonId: player,
    chairPersonId: chair,
    chairTraits: speakerTraits(world, chair),
    contributions: scene.contributions,
    offered: scene.replies,
    selected: question,
    consequence: turn,
  };
});
assert.ok(receipts.length, "Supply actual saved browser arrival files.");
process.stdout.write(
  `${JSON.stringify({ kind: "saved-browser-arrival-replay", receipts }, null, 2)}\n`,
);
