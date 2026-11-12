/**
 * A life story is told in more than one way (words-life-story-has-one-
 * wording-for-each-kind-of-event; Summit Park, Utah, Nov 11: "I started school
 * at Summit Park Public Schools. I went on to middle school. I went on to high
 * school." in every world). In ten new lives in drawn places, the player's own
 * story ("My life" on You) and the cards of their household hold no sentence
 * twice; across the ten, each kind of event told three times or more is said
 * at least three ways; and a school stage whose school has a name of its own
 * names it.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
// The world loads before the card (an import cycle otherwise, as in
// card-history.test.ts).
import { buildBenchWorld } from "./world";
import { knownCard } from "./card";
// After the world, whose modules it reads (an import cycle otherwise).
import { lifeOf } from "../core2/person-life";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const LIVES = 10;
/** The fewest ways a kind told this often across the lives is said. */
const WAYS = 3;

it(`tells each kind of event more than one way in ten lives (seed ${seed})`, () => {
  const evidence: string[] = [];
  // Each kind of event (the piece's key without its form and wording), the
  // wordings it was said with, and how many times it was told.
  const ways = new Map<string, Set<string>>();
  const told = new Map<string, number>();
  for (let life = 0; life < LIVES; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "card-history-ways");
    const where = `${place.name} (${place.key}), seed ${seed}:${life}`;
    setBookkeeping(false);
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const me = playerId!;
    const household = core.households.get(core.people.get(me)!.householdId);
    const ids = [
      me,
      ...[...(household?.memberIds ?? [])].filter((id) => id !== me),
    ];
    for (const id of ids) {
      const card = knownCard(core, me, id);
      const here = `${where}, ${card.name}`;
      const sentences = card.history.map((row) => row.text);
      const twice = sentences.filter(
        (text, at) => sentences.indexOf(text) !== at,
      );
      expect(twice, `${here}: said twice`).toEqual([]);
      const pieces = card.history.map((row) => row.piece);
      expect(
        pieces.filter((piece, at) => pieces.indexOf(piece) !== at),
        `${here}: one wording twice`,
      ).toEqual([]);
      for (const row of card.history) {
        const kind = row.piece
          .replace(/^person-history\.story\./, "")
          .replace(/\.(i|third|they|any)(\.w\d+)?$/, "")
          .replace(/-second$/, "");
        (ways.get(kind) ?? ways.set(kind, new Set()).get(kind)!).add(
          row.piece.replace(/\.(i|third|they|any)(\.w\d+)?$/, ".$2"),
        );
        told.set(kind, (told.get(kind) ?? 0) + 1);
      }
      // A school stage whose school has a name of its own names it.
      const text = sentences.join(" ");
      for (const event of lifeOf(core, id))
        if (event.life === "school" && event.what === "started") {
          const name = core.organizations.get(
            String(event.facts?.schoolId ?? ""),
          )?.name;
          if (name)
            expect(text, `${here}: ${event.id} names no school`).toContain(
              name,
            );
        }
      evidence.push(`${here}: ${sentences.join(" ")}`);
    }
  }
  if (process.env.CARD_EVIDENCE)
    writeFileSync(process.env.CARD_EVIDENCE, `${evidence.join("\n")}\n`);
  // Every kind told often enough to show it, said at least three ways.
  const thin = [...told]
    .filter(([kind, count]) => count >= WAYS * 2 && ways.get(kind)!.size < WAYS)
    .map(
      ([kind, count]) => `${kind}: told ${count}, ${ways.get(kind)!.size} ways`,
    );
  expect(thin, `in ${LIVES} lives`).toEqual([]);
}, 3_600_000);
