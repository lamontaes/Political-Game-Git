/**
 * The life record, part 2 (pool item
 * core-life-record-part-2-a-talk-brings-up-a-remembered-event): in a talk, a
 * person brings up an event of their life from their own list, one both
 * remember or one of theirs from the last year, weighed by the tie and how
 * much the event changed. The line keeps the event's record as its source,
 * the listener learns it (and is not told it again), and the event is a
 * sentence on the speaker's card. A drawn place is passed over, by name,
 * when nobody the player knows has an event to bring up (up to five per
 * case). The bank has no remembered sentences yet (Story writes them), so the
 * test words them with one plain sentence per event kind. Replay with
 * REMEMBERED_SEED.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { knownCard } from "../bench/card";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { BRING_IT_UP_WORDS } from "../english/bring-it-up-words";
import {
  BRING_IT_UP_ROWS,
  bringUpRemembered,
  rememberedToBringUp,
} from "./bring-it-up";

setBookkeeping(false);

const base = process.env.REMEMBERED_SEED ?? randomBytes(8).toString("hex");
const KINDS = Object.keys(BRING_IT_UP_ROWS.remembered.weights);

describe.each(["a", "b"])(
  "a talk brings up a remembered event (case %s)",
  (draw) => {
    it("from the speaker's list, by the tie and the event, told once, on their card", () => {
      const passed: string[] = [];
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const seed = `${base}:${draw}:${attempt}`;
        const place = drawPlace(seed, "bring-up-remembered");
        const where = `${place.name} (${place.key}), seed ${seed}`;
        const { core, playerId } = buildBenchWorld(
          place.seed,
          gameStartDate(),
          {
            twoLevel: true,
            placeKey: place.key,
          },
        );
        const player = playerId! as PersonId;
        const known = [
          ...(core.people.get(player)?.knownIds ?? []),
        ] as PersonId[];
        const speaker = known.find(
          (id) => rememberedToBringUp(core, id, player).length > 0,
        );
        if (!speaker) {
          passed.push(
            `${where}: nobody the player knows (${known.length}) has an event to bring up`,
          );
          continue;
        }
        const choices = rememberedToBringUp(core, speaker, player);
        // Weighed by the tie and the event, heaviest first, never a stranger's.
        for (let i = 1; i < choices.length; i += 1)
          expect(choices[i - 1]!.weight, where).toBeGreaterThanOrEqual(
            choices[i]!.weight,
          );
        // Words for every event kind: the bank's are Story's to write.
        const words = {
          ...BRING_IT_UP_WORDS,
          remembered: Object.fromEntries(
            choices.map(({ event }) => [
              `${event.life}/${event.what}`,
              [{ key: "test.remembered", text: "That was {{year}}." }],
            ]),
          ),
        };
        const said = bringUpRemembered(core, speaker, player, { words });
        expect(said, `${where}: ${speaker} said nothing`).not.toBeNull();
        const top = choices[0]!.event;
        expect(said!.event.id, where).toBe(top.id);
        expect(KINDS, where).toContain(top.life);
        expect(said!.lines[0]!.sourceRecordIds, where).toContain(top.id);
        expect(said!.lines[0]!.text, where).toContain(top.date.slice(0, 4));
        // The listener learned it, from the speaker: never told it again.
        const heard = core.knowledgeByPerson
          .get(player)
          ?.get(`${BRING_IT_UP_ROWS.remembered.toldKey}:${top.id}`);
        expect(heard?.value, `${where}: ${said!.toldEventId}`).toBe(speaker);
        const again = bringUpRemembered(core, speaker, player, { words });
        expect(again?.event.id, where).not.toBe(top.id);
        // The same event is a sentence on the speaker's card.
        const card = knownCard(core, player, speaker);
        const line = card.history.find((entry) =>
          entry.records.includes(top.id),
        );
        expect(
          line,
          `${where}: ${speaker}'s card does not tell ${top.id} (${top.life}/${top.what}): ${card.history.map((entry) => entry.text).join(" | ")}`,
        ).toBeDefined();
        appendFileSync(
          process.env.REMEMBERED_LOG ?? "/dev/null",
          `\nbring-up-remembered: ${where}; ${speaker} to ${player}: ${top.id} (${top.life}/${top.what}, ${choices[0]!.shared ? "both" : "own"}, weight ${choices[0]!.weight.toFixed(3)}), told ${said!.toldEventId}; card: "${line!.text}"; ${choices.length} choices; passed over: ${passed.join("; ") || "none"}`,
        );
        return;
      }
      throw new Error(
        `no drawn place had an event to bring up: ${passed.join("; ")}`,
      );
    }, 1_800_000);
  },
);
