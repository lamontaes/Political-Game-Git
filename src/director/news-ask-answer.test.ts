/**
 * Questions get answers (words-news-ask-gets-answer). In a played year of a
 * drawn place, a household member who has hard news of a relative (a serious
 * illness, a prison sentence) tells the one they live with; asked "For how
 * long?" or "How long has {name} been sick?", they answer from the record
 * the news came from: the sentence's release date on the justice record, the
 * illness's onset on the health record, cited by record id. Never an
 * acknowledgment in place of an answer.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { openConversation, say, subjectsBetween } from "./conversation";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 6;
const YEAR = 365;
const ASKS: Readonly<Record<string, { news: string; answer: string }>> = {
  "prison-news": { news: "prison-term", answer: "release" },
  "illness-news": { news: "illness-since", answer: "onset" },
};

it(`a question about a relative's hard news is answered from its record (seed ${seed})`, () => {
  const shown: string[] = [];
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS && !shown.length; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "news-ask-answer");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // Every full adult with someone at home, watched, so the news reaches them.
    const homes = [...core.people.values()].filter(
      (person) =>
        person.alive &&
        person.id.startsWith("person_") &&
        person.birthDate < "2005-01-01" &&
        (core.households.get(person.householdId)?.memberIds.length ?? 0) > 1,
    );
    for (const person of homes) director.watch(core, person.id);
    const end = addDays(makeIsoDate(core.date), YEAR);
    let found = 0;
    for (
      let day = addDays(makeIsoDate(core.date), 30);
      day <= end;
      day = addDays(day, 30)
    ) {
      advanceCore(core, day);
      for (const listener of homes) {
        if (!listener.alive) continue;
        const mates = (
          core.households.get(listener.householdId)?.memberIds ?? []
        )
          .filter((id) => id !== listener.id && core.people.get(id)?.alive)
          .sort();
        for (const speakerId of mates) {
          const subjects = subjectsBetween(
            core,
            speakerId as PersonId,
            listener.id as PersonId,
            director,
          );
          for (const [kind, ask] of Object.entries(ASKS)) {
            const news = subjects.find((row) => row.kind === kind);
            const answer = subjects.find((row) => row.kind === ask.news);
            if (!news || !answer) continue;
            found += 1;
            const talk = openConversation(
              core,
              listener.id as PersonId,
              speakerId as PersonId,
              { director },
            );
            const told = talk.lines.find((line) => line.kind.startsWith(kind));
            if (!told) continue;
            const question = talk.choices.find((choice) =>
              /how long/i.test(choice.text),
            );
            const here = `${where}: ${listener.id} hears ${kind} from ${speakerId}`;
            expect(
              question,
              `${here}: no question offered (${talk.choices.map((c) => c.text).join(" / ")})`,
            ).toBeDefined();
            const after = say(core, talk, question!.key);
            const reply = after.lines
              .slice(talk.lines.length)
              .find((line) => line.speakerId === speakerId);
            expect(reply, `${here}: no answer`).toBeDefined();
            const cited = answer.facts[ask.answer]!.sourceRecordIds;
            for (const id of cited)
              expect(
                reply!.sourceRecordIds,
                `${here}: "${reply!.text}"`,
              ).toContain(id);
            expect(reply!.text, here).toContain(answer.facts[ask.answer]!.text);
            shown.push(
              `${here}: "${told.text}" / "${question!.text}" / "${reply!.text}" (${cited.join(", ")})`,
            );
          }
        }
      }
      if (shown.length >= 2) break;
    }
    if (!shown.length)
      tried.push(`${where}: ${found} news subjects, none told`);
  }
  process.stdout.write(`NEWS ASKED\n${shown.join("\n")}\n`);
  expect(
    shown.length,
    `no hard news was asked about: ${tried.join("; ")}`,
  ).toBeGreaterThan(0);
}, 3_600_000);
