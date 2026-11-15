import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { CoreState, IsoDate, PersonId } from "../core2/types";
import {
  ELECTIONS_MODULE_ID,
  type FilingRow,
} from "../core2/modules/elections";
import { bringItUp, resultLean } from "./bring-it-up";
import { seatFact } from "./sitting-ties";
import { openConversation } from "./conversation";
import { asksQuestion } from "../english/conversation-words";
import conversationParts from "../../data/english/parts/conversation.json";

// The wordings a feeling about the news holds back ("Yes, ... had it."
// confirms the news, not "Good night for our side."), from the bank.
const NOT_AFTER_FEELING = new Set(
  (
    conversationParts.parts as {
      key: string;
      uses: { excludesFacts?: string[] }[];
    }[]
  )
    .filter((part) =>
      part.uses.some((use) => use.excludesFacts?.includes("before-feeling")),
    )
    .map((part) => part.key),
);
// The noises a race's result never gets ("Huh."), from the bank.
const NOT_TO_A_RESULT = new Set(
  (
    conversationParts.parts as {
      key: string;
      uses: { excludesFacts?: string[] }[];
    }[]
  )
    .filter((part) =>
      part.uses.some((use) => use.excludesFacts?.includes("result")),
    )
    .map((part) => part.key),
);

// After a count, a person who read the result brings it up: who won, and,
// for a person clearly with or against the winner's party, how it sits with
// them. The world opens a week before the November 3, 2026 count and lives
// through it to the week after, on the engines' own calendar (the count, the
// paper, the reading). One pinned place and seed (found by drawing, Nov 14;
// the place of three where tellers with, against and with no clear lean were
// most common). Sheridan, Wyoming and Arkadelphia, Arkansas are played
// evidence in the PR, not run here.
const PLACES = [
  {
    name: "Astoria, Oregon",
    key: "4103150",
    seed: "0c04a6002f604427e427591b0e1749643730d79a9b5ed334c1a9e3ab91be8e63",
  },
] as const;
const OPENS = "2026-10-27" as IsoDate;
const WEEK_AFTER = "2026-11-10" as IsoDate;

describe.each(PLACES)("a race's result brought up in $name", (place) => {
  it("is told by tellers with, against and with no clear lean, each citing the result", () => {
    setBookkeeping(false);
    try {
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, OPENS, {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core as CoreState;
      const playerId = world.playerId!;
      advanceCore(core, WEEK_AFTER);
      const seen = new Map<string, string[]>();
      // Told to someone who has read no paper, and to the player, who has:
      // a result the listener knows (read, or told here) is raised only by a
      // teller with a lean, in one line (Words lead, Nov 14).
      const fresh = [...core.people.values()].find(
        (person) =>
          person.alive &&
          person.tier !== "husk" &&
          person.id !== playerId &&
          ![...(core.knowledgeByPerson.get(person.id)?.values() ?? [])].some(
            (fact) => fact.key.startsWith("news:printed:"),
          ),
      );
      expect(fresh, `${where}: someone who read no paper`).toBeTruthy();
      let retold = 0;
      for (const listenerId of [fresh!.id as PersonId, playerId]) {
        const told = new Set<string>();
        for (const person of core.people.values()) {
          if (seen.size === 3 && retold > 0) break;
          if (
            !person.alive ||
            person.tier === "husk" ||
            person.id === listenerId
          )
            continue;
          const said = bringItUp(core, person.id, listenerId);
          if (!said?.resultId) continue;
          const result = core.durableLog.get(said.resultId)!;
          expect(result.kind, where).toBe("election-result");
          const lean = resultLean(core, result, person.id);
          const side = lean?.side ?? "none";
          const texts = said.lines.map((line) => line.text);
          const winner = core.people.get(String(result.facts?.winnerId));
          const named = `${winner?.givenName} ${winner?.familyName}`;
          const seat = seatFact(
            core,
            String(result.facts?.contestId),
            result.id,
          ).seat!.text;
          const again = told.has(result.id);
          told.add(result.id);
          // Every line stands on the result; the winner is named once.
          for (const line of said.lines)
            expect(line.sourceRecordIds, `${where}: ${line.text}`).toContain(
              result.id,
            );
          expect(
            texts.join(" ").split(named).length - 1,
            texts.join(" / "),
          ).toBe(1);
          // The seat is named once in the telling.
          expect(
            texts.join(" ").split(seat).length - 1,
            texts.join(" / "),
          ).toBe(1);
          // A lean line only for a teller with a lean; a ballot line only on
          // their ballot for the winner; no figure.
          // A result the player already knows (read, or told by someone here)
          // is raised only by a teller with a lean, in one line ending on how
          // it sits with them; else who won, then the feeling.
          if (lean && texts.length === 1) {
            expect(said.lines[0]!.feeling, texts.join(" / ")).toBe(true);
            retold += 1;
          } else
            expect(texts.length, `${where}: ${texts.join(" / ")}`).toBe(
              lean ? 2 : 1,
            );
          if (!lean)
            expect(again, `${where}: ${texts.join(" / ")}`).toBe(false);
          if (texts.some((text) => text.startsWith("I voted for")))
            expect(lean?.ballotId, texts.join(" / ")).toBeTruthy();
          // No figure: a district's number is part of the seat's name, said
          // by the one seat wording, and is the only digit allowed.
          for (const text of texts)
            expect(text.split(seat).join(""), where).not.toMatch(/\d/);
          if (!seen.has(side)) seen.set(side, texts);
        }
      }
      expect(
        [...seen.keys()].sort(),
        `${where}: ${JSON.stringify([...seen])}`,
      ).toEqual(["against", "none", "with"]);
      expect(retold, `${where}: a result told again`).toBeGreaterThan(0);
      // Nobody tells a candidate how their own race came out.
      const filings = coreAPI(core)
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .rows() as unknown as FilingRow[];
      const candidate = filings.find(
        (f) =>
          core.people.get(f.personId)?.alive &&
          core.durableLog.has(`election-result:${f.contestId}`),
      );
      expect(
        candidate,
        `${where}: no candidate in a counted race`,
      ).toBeTruthy();
      const own = `election-result:${candidate!.contestId}`;
      for (const person of core.people.values()) {
        if (!person.alive || person.tier === "husk") continue;
        if (person.id === candidate!.personId) continue;
        expect(
          bringItUp(core, person.id, candidate!.personId)?.resultId,
          where,
        ).not.toBe(own);
      }
      // The player's replies follow the line before (M5's pairs, Nov 14):
      // after the result told outright or a feeling about it, never "I
      // haven't heard." or "Tell me."; after a feeling, never "Yes, ... had
      // it.".
      let talks = 0;
      let feelings = 0;
      for (const person of core.people.values()) {
        if (talks === 12) break;
        if (!person.alive || person.tier === "husk" || person.id === playerId)
          continue;
        const talk = openConversation(core, playerId, person.id);
        const before = talk.lines.at(-1);
        if (
          !before ||
          !before.sourceRecordIds.some((id) =>
            id.startsWith("election-result:"),
          )
        )
          continue;
        talks += 1;
        if (before.feeling) feelings += 1;
        const shown = `${where}: ${talk.lines.map((l) => l.text).join(" / ")} -> ${talk.choices.map((c) => c.text).join(" | ")}`;
        if (!asksQuestion(before))
          for (const choice of talk.choices)
            expect(choice.wording?.stage, shown).not.toBe("not-heard");
        for (const choice of talk.choices)
          expect(
            (choice.wording?.parts ?? []).some((id) => NOT_TO_A_RESULT.has(id)),
            shown,
          ).toBe(false);
        if (before.feeling)
          for (const choice of talk.choices)
            expect(
              (choice.wording?.parts ?? []).some((id) =>
                NOT_AFTER_FEELING.has(id),
              ),
              shown,
            ).toBe(false);
      }
      expect(talks, `${where}: result talks`).toBeGreaterThan(3);
      expect(feelings, `${where}: result talks with a feeling`).toBeGreaterThan(
        0,
      );
    } finally {
      setBookkeeping(true);
    }
  }, 180_000);
});
