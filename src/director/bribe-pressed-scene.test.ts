import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  BRIBE_OFFERED,
  BRIBE_PRESSED,
  considerBribe,
} from "../core2/modules/corruption";
import { coreAPI, registerModule } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// The open threat (owner, Nov 8: "subtle and open threats"). Someone offers the
// player's seat a bribe through the corruption engine; the player hands it
// back in the scene (the reply the scene writes); the engine writes the
// refusal, and the offerer's own reasons decide whether they press. When they
// do, the director stages the pressure as a scene for the player, citing the
// press record. Offers are asked of the player the way a lobbyist's would be;
// the answer is the scene's own reply record.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 3;

it(`an offerer who presses after a refusal is a scene for the player (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "bribe-pressed");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const api = coreAPI(core);
    const me = playerId as PersonId;
    core.focusPersonIds.add(me);
    director.watch(core, me);
    const pressedIds: string[] = [];
    registerModule(core, {
      id: "test-pressed-tap",
      eventKinds: [BRIBE_PRESSED],
      onEvent: (_api, event) => {
        pressedIds.push(event.id);
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
    let pressedCrime: string | undefined;
    let offers = 0;
    for (const offerer of adults) {
      const record = considerBribe(api, {
        offererId: offerer.id,
        officialId: me,
        stakeMinor: 50000000,
        subjectId: `fixture-contract:${offerer.id}`,
      });
      if (!record?.pending) continue;
      offers += 1;
      const before = pressedIds.length;
      // The player hands it back in the scene.
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
      if (pressedIds.length > before) {
        pressedCrime = record.id;
        break;
      }
    }
    if (!pressedCrime) {
      tried.push(`${where}: ${offers} offers to the player, none pressed`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 3));
    const book = director.ledger.people.get(me)!;
    const entry = book.schedule.find((row) =>
      row.bindings.some((binding) => binding.typeKey === "bribe-pressed"),
    );
    expect(
      entry,
      `${where}: a bribe-pressed moment for ${pressedCrime}`,
    ).toBeTruthy();
    const moment = book.momentsById.get(entry!.momentId)!;
    expect(moment.causeId, where).toBe(`${BRIBE_PRESSED}:${pressedCrime}`);
    const result = purposeScene(core, director, me, entry!, {
      typeKey: "bribe-pressed",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") return;
    const { scene } = result;
    // The scene plays whichever of the kind's arcs the records give it
    // (arc-variant.ts); the kind's own arc is the plain one.
    expect(scene.variant?.family, where).toBe("bribe-pressed");
    expect(scene.purpose, where).toBe(scene.variant!.purpose);
    const crime = core.durableLog.get(moment.causeId);
    expect(scene.askerId, where).toBe(crime!.personIds[0]);
    const root = scene.talk.tree.replies.map((reply) => reply.line);
    expect(root.length, where).toBeGreaterThanOrEqual(3);
    // The official can always hold the line or say they will report it.
    for (const move of ["refuse", "confront"])
      expect(
        root.map((row) => row.move),
        where,
      ).toContain(move);
    expect(
      scene.talk.endingCounts["said-you-would-report"],
      where,
    ).toBeGreaterThan(0);
    for (const row of [scene.talk.state, ...root])
      expect(row.text, where).not.toMatch(
        /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
      );
    process.stdout.write(
      `BRIBE PRESSED ${where}: ${offers} offers, cause ${moment.causeId}\n  ${scene.talk.state.text}\n`,
    );
    return;
  }
  throw new Error(`no pressed scene: ${tried.join("; ")} (seed ${seed})`);
}, 1_800_000);
