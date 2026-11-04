import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { campaignAnswer } from "./campaign-answer";
import { tieSide } from "./purpose-scene";

/**
 * Each person answers the player's campaign ask in their own spoken words
 * (words-campaign-asks-spoken-by-trait): a yes and a no for volunteering and
 * for an endorsement, worded through the one scene word maker, never
 * narrating the speaker ("Ruth Stanton agrees to endorse you."). A friend
 * and someone without a tie say different lines. Drawn places, a fresh seed,
 * place and seed printed.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 3;

it(`campaign asks are answered in the speaker's own words (seed ${seed})`, () => {
  const shown: string[] = [];
  let friendsCompared = 0;
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "campaign-answer");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const player = playerId as PersonId;
    const me = core.people.get(player)!;
    const known = [...me.knownIds].filter((id) => core.people.has(id)).sort();
    const friend = known.find(
      (id) => tieSide(core, id, player)?.side === "friend",
    );
    const plain = known.find((id) => !tieSide(core, id, player));
    for (const speakerId of [friend, plain].filter(
      (id): id is PersonId => !!id,
    )) {
      const speaker = core.people.get(speakerId)!;
      for (const ask of ["volunteer", "endorse"] as const)
        for (const yes of [true, false]) {
          const said = campaignAnswer(core, {
            speakerId,
            playerId: player,
            ask,
            yes,
            momentKey: `${ask}|${speakerId}`,
          });
          expect(said, `${where}: ${speakerId} ${ask} ${yes}`).toBeTruthy();
          // Spoken by the person, never narration of them.
          expect(said!.text, where).not.toContain(speaker.givenName);
          expect(said!.text, where).not.toContain(speaker.familyName);
          shown.push(
            `${where}: ${speaker.givenName} (${speakerId === friend ? "friend" : "no tie"}) ${ask} ${yes ? "yes" : "no"}: "${said!.text}"`,
          );
        }
    }
    if (friend && plain) {
      const a = campaignAnswer(core, {
        speakerId: friend,
        playerId: player,
        ask: "volunteer",
        yes: true,
        momentKey: "compare",
      })!;
      const b = campaignAnswer(core, {
        speakerId: plain,
        playerId: player,
        ask: "volunteer",
        yes: true,
        momentKey: "compare",
      })!;
      expect(
        a.pieceKey,
        `${where}: a friend and a stranger said the same`,
      ).not.toBe(b.pieceKey);
      friendsCompared += 1;
    }
  }
  process.stdout.write(`CAMPAIGN ANSWERS\n${shown.join("\n")}\n`);
  expect(shown.length).toBeGreaterThan(0);
  expect(
    friendsCompared,
    "no drawn place had both a friend and someone with no tie",
  ).toBeGreaterThan(0);
}, 1_800_000);
