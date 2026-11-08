import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  BRIBE_OFFERED,
  BRIBE_PRESSED,
  SCANDAL_REPORTED,
  considerBribe,
} from "../core2/modules/corruption";
import { coreAPI, registerModule } from "../core2/state";
import type { PersonId } from "../core2/types";
import { wordPrintedStory } from "./archive-words";
import { buildBenchWorld } from "./world";

// The player, pressed again after handing a bribe back, says they will report
// it (the scene's ending), and the press runs the offer as the exposure of the
// person who made it (owner, Nov 8: "subtle and open threats"; coordinator:
// "I will report it" reaching the press as a scandal about the offerer). The
// offer is asked of the player's seat through the corruption engine, handed
// back and pressed in the engine's own records; the story is worded from the
// scandal record.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`reporting a pressed offer is the offerer's exposure in print (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "printed-bribe-offer");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const me = playerId as PersonId;
    const pressed: string[] = [];
    registerModule(core, {
      id: "test-offer-tap",
      eventKinds: [BRIBE_PRESSED],
      onEvent: (_api, event) => {
        pressed.push(event.id);
      },
    });
    const adults = [...core.people.values()]
      .filter(
        (person) =>
          person.alive &&
          person.tier !== "husk" &&
          person.id !== me &&
          person.birthDate <= "2000-01-01",
      )
      .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id))
      .slice(0, 80);
    for (const offerer of adults) {
      const record = considerBribe(api, {
        offererId: offerer.id,
        officialId: me,
        stakeMinor: 50000000,
        subjectId: `fixture-contract:${offerer.id}`,
      });
      if (!record?.pending) continue;
      const before = pressed.length;
      api.emit({
        id: `scene.reply:test:${record.id}`,
        date: core.date,
        kind: "scene.reply",
        personIds: [me, offerer.id],
        placeId: core.people.get(me)!.placeId,
        facts: {
          typeKey: "bribe-offer",
          causeId: `${BRIBE_OFFERED}:${record.id}`,
          ending: "handed-back",
        },
        source: { tag: "SOURCED", asOf: core.date, citation: "test" },
      });
      if (pressed.length === before) continue;
      // Pressed: the player says in the scene that they will report it.
      const replyId = `scene.reply:test:report:${record.id}`;
      api.emit({
        id: replyId,
        date: core.date,
        kind: "scene.reply",
        personIds: [me, offerer.id],
        placeId: core.people.get(me)!.placeId,
        facts: {
          typeKey: "bribe-pressed",
          causeId: `${BRIBE_PRESSED}:${record.id}`,
          ending: "said-you-would-report",
        },
        source: { tag: "SOURCED", asOf: core.date, citation: "test" },
      });
      const scandalId = `${record.id}:offer-reported:${me}`;
      const scandal = core.durableLog.get(scandalId);
      expect(scandal?.kind, `${where}: ${scandalId}`).toBe(SCANDAL_REPORTED);
      expect(scandal?.personIds, where).toEqual([offerer.id]);
      const worded = wordPrintedStory(core, {
        id: `printed:test:${scandalId}`,
        kind: "press.printed",
        date: scandal!.date,
        topic: scandal!.topic,
        facts: { sourceRecordId: scandalId },
      } as never);
      expect(worded, `${where}: the story is worded`).toBeTruthy();
      const text = `${worded!.headline} ${worded!.lede}`;
      expect(text, where).toContain(offerer.givenName);
      expect(text, where).toMatch(/offer/i);
      expect(text, where).not.toMatch(/took a bribe/i);
      expect(text, where).not.toMatch(/[{}]|bribe-|scandal\./);
      expect(worded!.sourceRecordIds, where).toContain(scandalId);
      process.stdout.write(
        `PRINTED BRIBE OFFER ${where}: ${scandalId}\n  ${worded!.headline} / ${worded!.lede}\n`,
      );
      return;
    }
    tried.push(`${where}: no pressed offer`);
  }
  throw new Error(`no pressed offer: ${tried.join("; ")} (seed ${seed})`);
}, 1_800_000);
