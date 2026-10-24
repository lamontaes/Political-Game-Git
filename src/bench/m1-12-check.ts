/* global process, console */
// Roadmap M1-12, important people everywhere, in the place the golden-path
// runner draws (GOLDEN_PATH_SEED, GOLDEN_PATH_PLACE_KEY). Every official the
// world seats, in every state (src/core2/modules/officials.ts: Congress, every
// governor and statewide executive, the town's state legislature and other
// states' leaders and members), is clicked as the play screen clicks a person
// (`personCard`): each must be a full person in a real seat, with a
// personality, a history and relationships, and the positions their votes are
// made of (their own lean, wing and causes, and a stance on a question).
// Exits nonzero naming each official who falls short.
// Usage: node --max-old-space-size=8192 --import tsx src/bench/m1-12-check.ts
import { buildBenchWorld } from "./world";
import { personCard } from "./card";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { allOfficials, officialStance } from "../core2/modules/officials";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { corePlaceStateIdentities } from "../core2/place-lookup";

const seed = process.env.GOLDEN_PATH_SEED ?? "m1-12-check";
const placeKey = process.env.GOLDEN_PATH_PLACE_KEY;
setBookkeeping(false);
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const api = coreAPI(w.core);
const where = `${w.place.displayName} (${w.place.key}), seed ${seed}`;
const failures: string[] = [];
const seats = api.moduleState(OFFICES_MODULE_ID).table("seats");

const serving = allOfficials(api).filter((row) => row.ended === null);
const states = new Set(serving.map((row) => row.stateKey));
const short = new Map<string, string[]>();
const miss = (clause: string, id: string) =>
  short.set(clause, [...(short.get(clause) ?? []), id]);
for (const row of serving) {
  if (!w.core.people.has(row.id)) {
    miss("not a full person", row.id);
    continue;
  }
  // A real seat: the offices engine's seat, or a seat in Congress or another
  // state's legislature the officials engine names by its record.
  if (row.termId && !seats.get(row.seatId)) miss("no seat record", row.id);
  const card = personCard(w.core, row.id);
  if (!card.traits.length) miss("no personality", row.id);
  if (!card.past.length) miss("no history", row.id);
  if (!card.ties.length) miss("no relationships", row.id);
  if (!row.wing || !Number.isFinite(row.ideal)) miss("no lean or wing", row.id);
  if (!PLATFORM_QUESTIONS.some((q) => officialStance(api, row.id, q) !== null))
    miss("no stance on any question", row.id);
}
const kindOf = new Map(serving.map((row) => [row.id, row.officeKind]));
for (const [clause, ids] of short) {
  const byKind = new Map<string, number>();
  for (const id of ids)
    byKind.set(kindOf.get(id)!, (byKind.get(kindOf.get(id)!) ?? 0) + 1);
  failures.push(
    `${where}: ${ids.length} of ${serving.length} officials have ${clause}, by office: ${[
      ...byKind,
    ]
      .sort((a, b) => b[1] - a[1])
      .map(([kind, n]) => `${kind} ${n}`)
      .join(", ")} (for example ${ids.slice(0, 3).join(", ")})`,
  );
}
// Every state, D.C. and territory the place records hold has officials of its
// own, read from the records rather than from the officials list itself.
const missingPlaces = [...corePlaceStateIdentities()].filter(
  (identity) => !states.has(identity.jurisdictionKey),
);
if (missingPlaces.length)
  failures.push(
    `${where}: no serving official in ${missingPlaces.length} of 56 places the records hold: ${missingPlaces
      .map((p) => p.name)
      .join(", ")}`,
  );

// One official in each of three states, as the card shows them.
const sample = [...states]
  .sort()
  .filter((_, i, all) => i % Math.max(1, Math.floor(all.length / 3)) === 0)
  .slice(0, 3)
  .map((state) => serving.find((row) => row.stateKey === state)!)
  .map((row) => {
    const card = personCard(w.core, row.id);
    return {
      id: row.id,
      name: card.name,
      seat: row.seatId,
      party: row.party,
      wing: row.wing,
      causes: row.signature.length,
      traits: card.traits.map((t) => `${t.label}: ${t.word}`),
      past: card.past.length,
      ties: card.ties.length,
    };
  });
console.log(
  JSON.stringify(
    { place: where, officials: serving.length, states: states.size, sample },
    null,
    2,
  ),
);
if (failures.length) {
  console.error(`M1-12 FAIL:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`M1-12 passed: ${where}`);
