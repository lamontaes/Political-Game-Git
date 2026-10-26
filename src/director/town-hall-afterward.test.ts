import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { corePlaceByKey } from "../core2/place-lookup";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";
import { topicInSentence } from "../english/policy-names";
import { composeScene } from "./scene";
import { speechOccasion } from "./scheduling";

// A candidate's speech that moves a listener's views is a scene: afterward the
// candidate comes over to ask for their support. Before, no situation staged
// the moment, so it stopped the player's day with nobody there to answer.
// In a drawn town the player's household is watched as play watches it, for
// up to two years. Every moment where someone else's campaign speech moved one
// of them must stage the scene with the speaker as the candidate, and its
// exchange must compose: the ask and four replies. A cause someone shared with
// them stages its invitation, which says the cause by its record's topic; it
// composes too wherever the catalog names that topic.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
// A place to replay first, as the golden-path runner binds one.
const pinned = process.env.GOLDEN_PATH_PLACE_KEY;
const MONTHS = 24;

it(`a campaign speech that moves a listener brings the candidate over, seed ${seed}`, () => {
  setBookkeeping(false);
  const told: string[] = [];
  const invites: string[] = [];
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < 3 && !told.length; attempt += 1) {
      const place =
        attempt === 0 && pinned
          ? {
              key: pinned,
              seed,
              name: corePlaceByKey(pinned)?.displayName ?? pinned,
            }
          : drawPlace(seed, `town-hall-afterward:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const player = core.people.get(core.playerId!)!;
      for (const id of [
        player.id,
        ...(core.households.get(player.householdId)?.memberIds ?? []),
      ])
        if (core.people.get(id)?.alive) director.watch(core, id);
      const seen = new Set<string>();
      // Each listener the candidate moved, and those the scene was staged for.
      const pairs = new Map<string, string>();
      const staged = new Set<string>();
      for (let month = 0; month < MONTHS && !told.length; month += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 30));
        for (const book of director.ledger.people.values())
          for (const entry of book.schedule) {
            const key = `${book.personId}|${entry.momentId}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const moment = book.momentsById.get(entry.momentId);
            if (!moment) continue;
            const topic = core.durableLog.get(moment.causeId)?.topic;
            if (
              entry.bindings.some((row) => row.typeKey === "cause-invite") &&
              topic &&
              topicInSentence(topic)
            ) {
              const invite = purposeScene(
                core,
                director,
                book.personId as PersonId,
                entry,
                { typeKey: "cause-invite" },
              );
              const said = `${where}: ${book.personId} ${entry.momentId}`;
              expect(invite?.kind, said).toBe("composed");
              if (invite?.kind === "composed")
                invites.push(`${said}: "${invite.scene.talk.state.text}"`);
            }
            if (moment.label !== "cause:event:speech.heard") continue;
            const speaker = core.durableLog.get(moment.causeId)?.facts?.[
              "views:speaker"
            ];
            if (
              speechOccasion(core, moment.causeId) !== "campaign" ||
              typeof speaker !== "string" ||
              speaker === book.personId
            )
              continue;
            const said = `${where}: ${book.personId} ${entry.momentId}`;
            const pair = `${book.personId}|${speaker}`;
            if (!pairs.has(pair)) pairs.set(pair, said);
            const binding = entry.bindings.find(
              (row) => row.typeKey === "town-hall-afterward",
            );
            // A moment that stops the day has the candidate there to answer.
            if (entry.interrupt)
              expect(
                binding,
                `a stop with no one there: ${said}`,
              ).toBeDefined();
            // A later speech the same day joins the sitting already staged;
            // the same candidate is not staged again within the month.
            if (!binding) continue;
            staged.add(pair);
            expect(
              binding.roles.find((row) => row.role === "candidate")?.personIds,
              said,
            ).toEqual([speaker]);
            const result = purposeScene(
              core,
              director,
              book.personId as PersonId,
              entry,
              { typeKey: "town-hall-afterward" },
            );
            expect(result?.kind, said).toBe("composed");
            if (result?.kind !== "composed") continue;
            const { talk } = result.scene;
            expect(talk.askerId, said).toBe(speaker);
            expect(talk.state.text, said).toBeTruthy();
            expect(talk.tree.replies, said).toHaveLength(4);
            expect(result.scene.cause.id, said).toBe(moment.causeId);
            const narration = composeScene(
              core,
              director,
              book.personId,
              entry,
            )!
              .narration.map((line) => line.text)
              .join(" ");
            expect(narration, said).toMatch(/town hall|candidate/i);
            told.push(
              `${said} (asked by ${speaker}): "${narration}" / "${talk.state.text}" / ${talk.tree.replies.map((reply) => `"${reply.line.text}"`).join(", ")}`,
            );
          }
      }
      for (const [pair, said] of pairs)
        expect(staged.has(pair), `never staged: ${said}`).toBe(true);
      if (!told.length)
        tried.push(
          `${where}: no campaign speech moved a watched listener in ${MONTHS} months`,
        );
    }
    expect(told.length, tried.join("; ")).toBeGreaterThan(0);
    console.log(
      `TOWN HALL AFTERWARD\n${told.join("\n")}\nCAUSE INVITE\n${invites.join("\n")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
