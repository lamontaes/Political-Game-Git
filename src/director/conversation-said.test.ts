/**
 * A question is named by its subject in talk (the `said` field of
 * data/english/question-names.json). In a played world in three places
 * pinned by name and seed, the player talks with everyone they live with or
 * know every five days for 30 days, taking each offered reply in turn, and
 * the lines the said field changed are read as played: each one shows the
 * question's subject ("drug prices"), never a blank, never the longer
 * "about" name, and every shape of said line is seen at least once across
 * the three places (a telling of the news, a stand, a question put to the
 * player, a reply to a stand, an agreeing or splitting answer).
 */
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { buildBenchWorld } from "../bench/world";
import bank from "../../data/english/parts/conversation.json" with { type: "json" };
import names from "../../data/english/question-names.json" with { type: "json" };
import { openConversation, say } from "./conversation";

/** The three pinned draws: a seed each, and the place it draws (named for the report). */
const DRAWS = JSON.parse(
  process.env.SAID_DRAWS ??
    '[["s1","Olla, Louisiana"],["s4","South Eliot, Maine"],["s5","Thorne Bay, Alaska"]]',
) as [string, string][];
const DAYS = Number(process.env.SAID_DAYS ?? 30);
const EVERY = 5;
const TURNS = 6;

type Part = { key: string; text: string };
const NAMES = (
  names as unknown as {
    names: Record<string, { about: string; said?: string }>;
  }
).names;
/** The pieces whose words carry the subject by its said name. */
const SAID_PIECES = (bank as unknown as { parts: Part[] }).parts.filter(
  (part) => part.text.includes("{said}"),
);
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SHAPES = SAID_PIECES.map((part) => ({
  key: part.key,
  pattern: new RegExp(
    `^${part.text
      .split(/\{[a-z-]+\}/)
      .map(escape)
      .join(".+?")}$`,
  ),
}));
/** Every said name in the table. */
const SAID_VALUES = Object.values(NAMES).flatMap((row) =>
  row.said ? [row.said] : [],
);

it(`the lines the said field changed read as played in ${DRAWS.length} pinned places`, () => {
  const played: string[] = [];
  const shapes = new Set<string>();
  for (const [seed] of DRAWS) {
    setBookkeeping(false);
    const place = drawPlace(seed, "talk-replies");
    process.stdout.write(`SAID ${place.name} (${place.key}), seed ${seed}\n`);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId as PersonId;
    const start = makeIsoDate(core.date);
    played.push(`## ${place.name} (${place.key}), seed ${seed}`);
    for (let day = 0; day <= DAYS; day += 1) {
      if (day) advanceCore(core, addDays(start, day));
      if (day % EVERY) continue;
      const home = [...core.people.values()].filter(
        (row) =>
          row.alive &&
          row.id !== me &&
          row.householdId === core.people.get(me)!.householdId,
      );
      const known = [...core.relationships.values()]
        .filter(
          (tie) => tie.actorId === me && core.people.get(tie.otherId)?.alive,
        )
        .map((tie) => core.people.get(tie.otherId)!);
      for (const other of [...new Set([...home, ...known])].sort((a, b) =>
        a.id < b.id ? -1 : 1,
      )) {
        const talk = openConversation(core, me, other.id as PersonId, {
          director,
        });
        for (let turn = 0; turn < TURNS && talk.choices.length; turn += 1) {
          // Take an offered reply whose shape has not played yet, else go round.
          const unseen = talk.choices.find((choice) =>
            SHAPES.some(
              (row) => !shapes.has(row.key) && row.pattern.test(choice.text),
            ),
          );
          const pick = unseen ?? talk.choices[turn % talk.choices.length]!;
          for (const row of SHAPES)
            if (row.pattern.test(pick.text)) shapes.add(row.key);
          say(core, talk, pick.key);
        }
        const lines = talk.lines.map(
          (line) =>
            `${line.speakerId === me ? "You" : other.givenName}: ${line.text}`,
        );
        let said = false;
        for (const line of talk.lines) {
          expect(line.text, `${place.name} ${core.date}`).not.toMatch(/[{}]/);
          const shape = SHAPES.find((row) => row.pattern.test(line.text));
          if (!shape) continue;
          said = true;
          shapes.add(shape.key);
          // The slot is filled by the question's subject, not its longer name.
          expect(
            SAID_VALUES.some((value) =>
              line.text.toLowerCase().includes(value.toLowerCase()),
            ),
            `${place.name}: "${line.text}" holds no question's said name`,
          ).toBe(true);
        }
        if (said)
          played.push(
            `### ${core.date} ${other.givenName}`,
            ...lines.map((l) => `  ${l}`),
          );
      }
    }
  }
  if (process.env.SAID_OUT)
    writeFileSync(process.env.SAID_OUT, played.join("\n"));
  process.stdout.write(
    `SAID shapes seen ${shapes.size} of ${SHAPES.length}: ${[...shapes].join(", ")}\n`,
  );
  // Every line left on {said} is read as played here; a line that no path
  // in the game reached stays on {about} (the Words lead, Nov 14).
  expect(
    [...shapes].sort(),
    "a said line was not played in the pinned places",
  ).toEqual(SHAPES.map((row) => row.key).sort());
}, 600000);
