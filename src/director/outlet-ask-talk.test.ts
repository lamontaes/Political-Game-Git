/**
 * A neighbor asks the player about a printed story, by the outlet's medium
 * (Words lead, Nov 15), and the player answers yes or no from their own
 * record. Pinned at Creve Coeur, Illinois (seed pl5): the neighbor is a member
 * of the player's household, the story is the player's own strongest question, printed and
 * delivered by the news engine's route (printStory) with a radio station, a
 * television station or a paper as its outlet. The talks are written to a
 * file for the readers.
 */
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { outletsHere } from "../core2/modules/press";
import { printStory, storiesHeard } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { openConversation, say } from "./conversation";
import { strongestQuestion } from "./view-learned";

const KINDS = ["radio", "television", "newspaper"] as const;

for (const kind of KINDS)
  for (const playerHeard of [true, false])
    it(`${kind}: the neighbor asks, the player ${playerHeard ? "heard it and says yes" : "did not hear it and says no"} (played file)`, () => {
      setBookkeeping(false);
      const out: string[] = [];
      {
        const place = drawPlace("pl5", "police-log");
        // Creve Coeur, Illinois, by its record id: a change to the draw fails here, not in a lookalike place.
        expect(place.key).toBe("1717549");
        const { core, director, playerId } = buildBenchWorld(
          place.seed,
          gameStartDate(),
          { twoLevel: true, placeKey: place.key },
        );
        const me = playerId as PersonId;
        const api = coreAPI(core);
        advanceCore(core, addDays(makeIsoDate(core.date), 28));
        const outlet = outletsHere(api).find(
          (o) => o.kind === kind && o.tier !== "national",
        )!;
        const org = core.organizations.get(outlet.organizationId as never)!;
        const neighbor = [...core.people.values()]
          .filter(
            (p) =>
              p.alive &&
              p.id !== me &&
              p.householdId === core.people.get(me)!.householdId,
          )
          .sort((a, b) => a.id.localeCompare(b.id))
          .find((p) => strongestQuestion(api, p.id as PersonId));
        expect(neighbor, "a neighbor with a stand").toBeTruthy();
        const id = neighbor!.id as PersonId;
        const storyId = `fixture:ask-talk:${kind}:${playerHeard}`;
        const readers = playerHeard ? [id, me] : [id];
        printStory(
          api,
          {
            id: storyId,
            kind: "press.printed",
            date: addDays(makeIsoDate(core.date), -1),
            placeId: neighbor!.placeId,
            topic: strongestQuestion(api, id)!.question,
            desiredChange: "enact",
            outletId: outlet.organizationId,
            facts: {},
          } as never,
          readers,
          readers,
        );
        for (
          let day = 0;
          day < 7 && !storiesHeard(api, id).some((r) => r.id === storyId);
          day += 1
        )
          advanceCore(core, addDays(makeIsoDate(core.date), 1));
        expect(storiesHeard(api, me).some((r) => r.id === storyId)).toBe(
          playerHeard,
        );
        const talk = openConversation(core, me, id, { director });
        const shown: string[] = [
          `${place.name} (${place.key}), seed pl5, ${kind} "${org.name}", the player ${playerHeard ? "heard" : "did not hear"} the story. ${neighbor!.givenName} ${neighbor!.familyName}:`,
        ];
        const pressed = playerHeard ? "yes" : "no";
        const asked = talk.lines.find((l) => l.kind === "news")!;
        expect(
          asked,
          `the neighbor asks about the story: ${talk.lines.map((l) => `${l.kind}: ${l.text}`).join(" | ")}`,
        ).toBeTruthy();
        // The verb fits the medium: read of a paper only, the radio of a station only.
        if (kind !== "newspaper")
          expect(asked.text).not.toMatch(/\bread\b|paper/);
        if (kind !== "radio") expect(asked.text).not.toMatch(/radio/);
        // The player answers from their own record: yes only if it reached them.
        const moves = talk.choices.map((c) => c.move);
        expect(moves.includes("yes"), `yes offered: ${moves}`).toBe(
          playerHeard,
        );
        expect(moves.includes("no"), `no offered: ${moves}`).toBe(!playerHeard);
        for (let turn = 0; turn < 4 && talk.choices.length; turn += 1) {
          shown.push(
            `  They say: ${talk.lines.at(-1)?.text}`,
            `  You say: ${talk.choices.map((c) => `[${c.move}] ${c.text}`).join(" || ")}`,
          );
          const choice =
            talk.choices.find((c) => c.move === pressed) ?? talk.choices[0]!;
          shown.push(`  Pressed: [${choice.move}] ${choice.text}`);
          say(core, talk, choice.key);
        }
        const mine = talk.lines.findIndex(
          (l) => l.speakerId === me && l.kind === "news",
        );
        // A player who did not hear is told what it was about, then the stand;
        // one who did hear gets the stand alone.
        const after = talk.lines.slice(mine + 1).map((l) => l.kind);
        // Their own view carries the stand: never a stand line and then the
        // same stand again.
        expect(
          after.slice(0, playerHeard ? 1 : 2),
          `lines after the answer: ${after.join()}`,
        ).toEqual(playerHeard ? ["own-view"] : ["news-back", "own-view"]);
        shown.push(
          `  Lines: ${talk.lines.map((l) => `${l.kind}/${l.speakerId === id ? "they" : "you"}: ${l.text}`).join(" | ")}`,
        );
        out.push(shown.join("\n"));
      }
      appendFileSync(
        path.join(tmpdir(), "outlet-ask-talk.txt"),
        out.join("\n") + "\n",
      );
    }, 120_000);
