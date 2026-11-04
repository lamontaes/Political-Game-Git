import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { enactLaw, lawChain, lawInForce } from "../core2/modules/laws";
import { printStory } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { lawName, lawTopic } from "./journal";
import { composeScene } from "./scene";

/**
 * The scene a law's effect stages says which law it was and what the
 * household paid or got back (words-scene-cause-law-effect-learned). In a
 * played town a price law is enacted and its press story printed (as in
 * src/core2/place-prices-learned.test.ts); a watched resident whose
 * household paid under it and who heard the story learns the effect, and
 * the scene's narration names the law and the amount, citing the learned
 * record. A place drawn from all 56, place and seed printed.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const question =
  "us-policy-positions:transportation-infrastructure.fare-free-transit";
const DAYS = 60;
const WATCHED = 60;

const run = (drawSeed: string): string | null => {
  const place = drawPlace(drawSeed, "law-effect-scene");
  const where = `${place.name} (${place.key}), seed ${drawSeed}`;
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const residents = [...core.people.values()]
    .filter((p) => p.alive && p.placeId === town && p.tier !== "husk")
    .map((p) => p.id as PersonId)
    .sort();
  // As in play, the scene is the player's circle's: only its private
  // records (a learned effect is one) are kept for the scene to read.
  for (const id of residents.slice(0, WATCHED)) {
    core.focusPersonIds.add(id);
    director.watch(core, id);
  }
  const effectiveDate = makeIsoDate(core.date);
  for (const level of lawChain(api).levels)
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: question,
      value: 1,
      effectiveDate,
      measureId: "fixture:fare-free",
      citation: "Controlled enactment in a generated town.",
    });
  const lawId = lawInForce(api, question, effectiveDate).governing?.id;
  if (!lawId) return `${where}: no law governs`;
  printStory(
    api,
    {
      id: "fixture:fare-free-story",
      kind: "press.printed",
      outletId: `outlet:${town}`,
      date: core.date,
      placeId: town,
      topic: question,
      desiredChange: "enact",
      facts: { lawId },
    },
    residents,
  );
  advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
  const told: string[] = [];
  for (const id of residents.slice(0, WATCHED)) {
    const book = director.ledger.people.get(id);
    for (const entry of book?.schedule ?? []) {
      const moment = book!.momentsById.get(entry.momentId);
      if (moment?.label !== "cause:event:law.effect-learned") continue;
      if (!entry.bindings.length) continue;
      const scene = composeScene(core, director, id, entry);
      const learned = core.durableLog.get(moment.causeId);
      const moved = Number(learned?.facts?.movedMinor ?? 0);
      const line = (scene?.narration ?? []).find((row) =>
        row.sourceRecordIds.includes(moment.causeId),
      );
      expect(line, `${where}: ${moment.causeId} told nothing`).toBeTruthy();
      // The law, by its bill's name or by what it is about, from its record.
      const learnedLaw = String(learned?.facts?.lawId ?? "");
      const lawText = (lawName(core, learnedLaw) ?? lawTopic(core, learnedLaw))
        ?.text;
      expect(
        lawText,
        `${where}: ${learnedLaw} has no name or topic`,
      ).toBeTruthy();
      expect(line!.text, `${where}: ${line!.text}`).toContain(lawText!);
      // What the household paid or got back, in dollars, the right way round.
      if (moved !== 0) {
        expect(line!.text, `${where}: ${line!.text}`).toMatch(/\$\d/);
        expect(line!.text, `${where}: ${line!.text}`).toMatch(
          moved < 0 ? /cost|paid/ : /back/,
        );
      }
      told.push(`${moment.causeId} (moved ${moved}): "${line!.text}"`);
    }
  }
  if (!told.length)
    return `${where}: no watched resident learned the effect in ${DAYS} days`;
  process.stdout.write(`LAW EFFECT SCENE ${where}\n${told.join("\n")}\n`);
  return null;
};

it(`the scene of a law's effect names the law and what the household paid (seed ${seed})`, () => {
  const passed: string[] = [];
  for (let draw = 0; draw < 4; draw += 1) {
    const skipped = run(`${seed}:${draw}`);
    if (!skipped) return;
    passed.push(skipped);
  }
  throw new Error(`No drawn place staged the scene: ${passed.join("; ")}`);
}, 1_800_000);
