/**
 * Plays the sit-down an ask to serve stages (brief J), the way the office
 * panel does: the ask is the player's own press, so the director stages its
 * scene at once; the player takes the reply that closes it (an answer to a
 * stranger's question first, else thanks for a yes or acceptance of a no).
 * Returns the scene's reply record and the lines as played.
 */
import type { Director } from "../../src/director/ledger";
import { purposeScene, replyInScene } from "../../src/director/purpose-scene";
import type { CoreState, PersonId } from "../../src/core2/types";

export function playServeAsk(
  core: CoreState,
  director: Director,
  playerId: PersonId,
  eventId: string,
) {
  const entry = director.stageOwnPress(core, playerId, eventId);
  if (!entry) throw new Error(`The ask ${eventId} staged no scene.`);
  const result = purposeScene(core, director, playerId, entry);
  if (result?.kind !== "composed")
    throw new Error(
      `The ask ${eventId} did not compose: ${JSON.stringify(result)}`,
    );
  const { scene } = result;
  const first = scene.talk.tree.lines[0]!;
  const yes = first.move !== "decline";
  const index = scene.talk.tree.replies.findIndex(
    (r) =>
      r.line.move ===
      (first.move === "ask" ? "answer" : yes ? "thank" : "accept"),
  );
  if (index < 0)
    throw new Error(`The ask ${eventId} offered no closing reply.`);
  const replyId = replyInScene(core, director, playerId, entry, [index]);
  const chosen = scene.talk.tree.replies[index]!;
  return {
    scene,
    first,
    reply: core.durableLog.get(replyId!)!,
    lines: [
      ...scene.talk.narration.map((l) => `Narrator: ${l.text}`),
      `${scene.talk.state.speaker}: ${scene.talk.state.text}`,
      `${first.speaker}: ${first.text}`,
      `${chosen.line.speaker}: ${chosen.line.text}`,
      ...(chosen.next?.lines.map((l) => `${l.speaker}: ${l.text}`) ?? []),
    ],
  };
}
