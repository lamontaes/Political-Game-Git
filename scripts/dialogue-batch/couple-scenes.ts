/**
 * Proves the couple scenes in a played world (Lives, Nov 8, 2026): the town's
 * adults are watched as the bench watches the player, a few years pass, and
 * the first date, proposal, breakup and wedding celebration each scene the
 * director stages from the partnerships engine's record is composed through
 * the purpose-scene pipeline. Development tooling; shipped play never imports it.
 *
 *   node --import tsx scripts/dialogue-batch/couple-scenes.ts --seed <seed> [--years 3]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { registerModule } from "../../src/core2/state";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreState, PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import { composeScene } from "../../src/director/scene";
import { drawPlace } from "../core2-year/place";
import { OPENING_DATE } from "./play-lives";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "couple-scenes");
const years = Number(option("years", "3"));
const place = drawPlace(seed, "couple-scenes");
setBookkeeping(false);
// Pass 1 finds who the engine partners and parts; pass 2 is the same world,
// deterministic, watching only them (watching every adult takes half an hour).
const KINDS = new Set([
  "family.partnered",
  "family.engaged",
  "family.married",
  "family.separated",
]);
const first = buildBenchWorld(place.seed, OPENING_DATE, {
  twoLevel: true,
  placeKey: place.key,
});
const start = first.core.date;
const involved = new Set<PersonId>();
registerModule(first.core, {
  id: "couple-scenes:watch",
  eventKinds: [...KINDS],
  onEvent: (_api, event) => {
    for (const p of event.personIds)
      if (first.core.people.get(p)?.tier !== "husk") involved.add(p);
  },
});
advanceCore(first.core, addDays(makeIsoDate(start), years * 365));
const { core, director } = buildBenchWorld(place.seed, OPENING_DATE, {
  twoLevel: true,
  placeKey: place.key,
});
const watched: PersonId[] = [...involved].filter((id) => core.people.has(id));
// The record keeps what names the player's circle; the watched are the circle here.
for (const id of watched) {
  core.focusPersonIds.add(id);
  director.watch(core, id);
}
console.log(`watching ${watched.length} people the engine partners or parts`);
const tallies = new Map<string, number>();
const seen = new Map<PersonId, number>();
const found = new Map<string, string[]>();
const name = (c: CoreState, id: string) => {
  const row = c.people.get(id as PersonId);
  return row ? `${row.givenName} ${row.familyName}` : id;
};
const WANT = ["date", "proposal", "breakup", "celebration"];
for (let day = 0; day < years * 365; day += 1) {
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  for (const id of watched) {
    const book = director.ledger.people.get(id);
    if (!book) continue;
    const from = seen.get(id) ?? 0;
    seen.set(id, book.schedule.length);
    for (const entry of book.schedule.slice(from)) {
      const moment = book.momentsById.get(entry.momentId)!;
      if (!moment.label.includes("family.")) continue;
      const tally = `${moment.label} ${entry.outcome} selfNamed=${moment.selfNamed === true}${entry.outcome === "journal-line" ? ` why=${(entry as { coverage?: { reason?: string; typeKey?: string; detail?: string } }).coverage?.typeKey}/${(entry as { coverage?: { reason?: string } }).coverage?.reason}` : ""}`;
      tallies.set(tally, (tallies.get(tally) ?? 0) + 1);
      const purpose = purposeScene(core, director, id, entry);
      const scene = composeScene(core, director, id, entry);
      const type =
        purpose?.kind === "composed"
          ? purpose.scene.typeKey
          : (entry.bindings[0]?.typeKey ?? "journal");
      const lines: string[] = [
        `${core.date} ${moment.label} (${moment.causeId}) ${name(core, id)} with ${moment.counterpartIds.map((c) => name(core, c)).join(", ")} -> ${type} [${entry.outcome}]`,
      ];
      if (purpose?.kind === "composed")
        lines.push(
          ...purpose.scene.talk.narration.map((l) => `    narrator: ${l.text}`),
          `    asker: ${purpose.scene.talk.state.text}`,
        );
      else if (scene)
        lines.push(`    (plain scene) ${JSON.stringify(scene).slice(0, 160)}`);
      const list = found.get(type) ?? [];
      if (list.length < 2) found.set(type, [...list, ...lines]);
    }
  }
}
console.log(`${place.name} (${place.key}), seed ${place.seed}, ${years} years`);
for (const [type, lines] of found) {
  console.log(`== ${type}`);
  for (const l of lines) console.log(l);
}
console.log([...tallies].map(([k, v]) => `${v} x ${k}`).join("\n"));
console.log(
  `wanted but not seen: ${WANT.filter((w) => !found.has(w)).join(", ") || "none"}`,
);
