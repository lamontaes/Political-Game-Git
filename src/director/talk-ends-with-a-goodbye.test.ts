import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { meetOverTalk, openConversation, say } from "./conversation";

// A line the player has no reply to is the other person's last word, and a
// stranger's talk ends there with their goodbye (owner, Oct 24: a talk is not
// a statement left hanging). The answer to a question the player turned back
// ("I work at Barnes Construction. Where do you work?") went through its own
// path that never closed the talk, so five of the new-life walk's talks at
// South Haven stopped on "I work there as a shift supervisor." with nothing to
// press and no goodbye (played-talks-9697-8a745c83, Nov 16). Pinned to that
// place and seed: Ray Chavez (a stranger on day one) asks where the player
// works, the player turns it back, and the talk must close.
const SEED = "tw3";
const place = drawPlace(SEED, "talk-walk");
const RAY = "person_05c1ffa7b8652880";

it(`closes a stranger's talk with their goodbye after the answer to a turned-back question (${place.name}, seed ${SEED})`, () => {
  setBookkeeping(false);
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = playerId as PersonId;
  let talk = openConversation(core, me, RAY as PersonId, { director });
  meetOverTalk(core, talk);
  const question = talk.choices.find((row) => row.raises);
  // The place and the person are pinned: the turned-back question is offered.
  expect(question, "a reply that turns the question back").toBeDefined();
  talk = say(core, talk, question!.key);
  const last = talk.lines.at(-1)!;
  expect(talk.choices, "nothing is left to press").toHaveLength(0);
  expect(last.speakerId).not.toBe(me);
  expect(last.kind, "the talk closes on their goodbye").toBe("farewell");
}, 40_000);
