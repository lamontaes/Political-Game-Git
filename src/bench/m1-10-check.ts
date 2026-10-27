/* global process, console */
// Roadmap M1-10, political views, in the place the golden-path runner draws
// (GOLDEN_PATH_SEED, GOLDEN_PATH_PLACE_KEY). Builds the world the player gets
// (`buildBenchWorld`, every module) and:
// (1) checks the town's opening views against its state's answer key (CES
//     2024, `VIEWS_KEYS`), as src/core2/views.test.ts does for a views-only
//     town: the mean lean, the conservative share and the not-sure share;
// (2) plays a year, watching the views engine as it takes each event the
//     ordinary producers emit (nothing is injected). A stance moved only when
//     its side or strength differs from before the engine wrote it; a write
//     that leaves both alone is counted apart and never as a move. Every
//     stance an event moves must belong to someone who learned of that event, and must cite
//     that event as its latest cause;
// (3) names the event that moved the most people in the year, the people it
//     reached, their stance before and after by record id, and people in town
//     it did not reach whose stance on that topic it left alone.
// Exits nonzero naming each failed clause.
// Usage: node --max-old-space-size=8192 --import tsx src/bench/m1-10-check.ts
import { buildBenchWorld } from "./world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import {
  registerStanceListener,
  stancesOf,
  viewOf,
  viewsModule,
  VIEWS_KEYS,
} from "../core2/modules/views";
import type { CoreEventInput as CoreEvent } from "../core2/types";

const seed = process.env.GOLDEN_PATH_SEED ?? "m1-10-check";
const placeKey = process.env.GOLDEN_PATH_PLACE_KEY;
const failures: string[] = [];
const check = (ok: unknown, message: string) => {
  if (!ok && failures.length < 40) failures.push(message);
};

// The views engine as it takes each event: who learned of it and whose stance
// it moved. Watching changes nothing it does.
interface Moved {
  personId: string;
  before: number;
  after: number;
  sideBefore: string;
  desiredChange: string;
}
interface Taken {
  event: CoreEvent;
  learners: number;
  moved: Moved[];
}
let current: {
  event: CoreEvent;
  learners: Set<string>;
  moved: Moved[];
} | null = null;
const taken: Taken[] = [];
// Each stance's side and strength as last seen; a stance moved only when one
// of them differs after the engine wrote it.
const seen = new Map<string, { side: string; strength: number }>();
let notifiedUnchanged = 0;
let outsideAnyEvent = 0,
  movedWithoutLearning = 0,
  causeMissing = 0;
const takeEvent = viewsModule.onEvent!;
viewsModule.onEvent = (api, event, learnedBy) => {
  current = { event, learners: new Set(learnedBy), moved: [] };
  try {
    takeEvent(api, event, learnedBy);
  } finally {
    if (current.moved.length)
      taken.push({
        event,
        learners: current.learners.size,
        moved: current.moved,
      });
    current = null;
  }
};
registerStanceListener((api, personId, topic) => {
  const stance = stancesOf(api, personId).find((s) => s.topic === topic);
  const key = `${personId}:${topic}`;
  const prior = seen.get(key) ?? { side: "", strength: 0 };
  const after = stance?.strength ?? 0;
  const side = stance?.desiredChange ?? "";
  seen.set(key, { side, strength: after });
  if (side === prior.side && Math.abs(after - prior.strength) < 1e-9) {
    notifiedUnchanged += 1;
    return;
  }
  if (!current) {
    outsideAnyEvent += 1;
    return;
  }
  if (!current.learners.has(personId)) movedWithoutLearning += 1;
  if (stance?.causes.at(-1)?.eventId !== current.event.id) causeMissing += 1;
  current.moved.push({
    personId,
    before: prior.strength,
    after,
    sideBefore: prior.side,
    desiredChange: side,
  });
});

setBookkeeping(false);
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const { core } = w;
const api = coreAPI(core);
const where = `${w.place.displayName} (${w.place.key}), seed ${seed}`;
const town = core.people.get(w.playerId!)!.placeId;
for (const person of core.people.values())
  for (const stance of stancesOf(api, person.id))
    seen.set(`${person.id}:${stance.topic}`, {
      side: stance.desiredChange,
      strength: stance.strength,
    });

// (1) The opening views against the state's answer key.
const adults = [...core.people.values()].filter(
  (p) =>
    p.alive &&
    p.tier !== "husk" &&
    p.placeId === town &&
    ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date)) >= 18,
);
const views = adults.map((p) => viewOf(api, p.id)).filter((v) => v !== null);
check(views.length > 0, `${where}: no adult in town has a view`);
const state = views[0]?.basis.split(":")[1] ?? "";
const key = VIEWS_KEYS.states[state] ?? VIEWS_KEYS.national;
const spreads = Object.values(VIEWS_KEYS.states)
  .map((row) => (row as { countySpread?: number }).countySpread)
  .filter((value): value is number => value !== undefined)
  .sort((a, b) => a - b);
const spread =
  (key as { countySpread?: number }).countySpread ??
  spreads[Math.floor(spreads.length / 2)]!;
const mean = views.reduce((sum, v) => sum + v.lean, 0) / views.length;
const sampling = key.sd / Math.sqrt(views.length);
const share = (labels: string[]) =>
  views.filter((v) => labels.includes(v.label)).length / views.length;
const shares = key.shares!;
const conservative = share(["conservative", "veryConservative"]);
const notSure = share(["not-sure"]);
check(
  Math.abs(mean - key.mean) <= 2 * spread + 2 * sampling,
  `${where}: mean lean ${mean.toFixed(3)} is off the ${state || "national"} key's ${key.mean} by more than ${(2 * spread + 2 * sampling).toFixed(3)}`,
);
check(
  Math.abs(conservative - (shares.conservative! + shares.veryConservative!)) <
    0.15,
  `${where}: conservative share ${conservative.toFixed(3)} against the key's ${(shares.conservative! + shares.veryConservative!).toFixed(3)}`,
);
check(
  Math.abs(notSure - shares.notSure!) < 0.08,
  `${where}: not-sure share ${notSure.toFixed(3)} against the key's ${shares.notSure}`,
);
for (const v of views)
  check(/^ces-2024:/.test(v.basis), `${where}: ${v.id} names no key cell`);

// (2) A year of the ordinary producers.
advanceCore(core, addDays(makeIsoDate(core.date), 365));
check(taken.length > 0, `${where}: no event moved anyone's stance in a year`);
check(
  movedWithoutLearning === 0,
  `${where}: ${movedWithoutLearning} stances moved for people who did not learn of the event`,
);
check(
  outsideAnyEvent === 0,
  `${where}: ${outsideAnyEvent} stances moved outside any event`,
);
check(
  causeMissing === 0,
  `${where}: ${causeMissing} moved stances don't cite the event that moved them`,
);

// (3) The event that moved the most people, and people it did not reach.
const big = [...taken].sort(
  (a, b) =>
    b.moved.length - a.moved.length || a.event.id.localeCompare(b.event.id),
)[0];
const reached = new Set(big?.moved.map((m) => m.personId));
const untouched = big
  ? adults
      .filter((p) => !reached.has(p.id))
      .map((p) => ({
        personId: p.id,
        stance: stancesOf(api, p.id).find((s) => s.topic === big.event.topic),
      }))
      .filter(
        (row) => !row.stance?.causes.some((c) => c.eventId === big.event.id),
      )
  : [];
check(
  !big || untouched.length > 0,
  `${where}: every adult in town was moved by ${big?.event.id}`,
);
const kinds = new Map<string, number>();
for (const t of taken)
  kinds.set(t.event.kind, (kinds.get(t.event.kind) ?? 0) + 1);

console.log(
  JSON.stringify(
    {
      place: where,
      opening: {
        adults: views.length,
        state: state || "national",
        meanLean: +mean.toFixed(3),
        keyMean: key.mean,
        conservative: +conservative.toFixed(3),
        keyConservative: +(
          shares.conservative! + shares.veryConservative!
        ).toFixed(3),
        notSure: +notSure.toFixed(3),
        keyNotSure: shares.notSure,
      },
      eventsThatMovedStances: taken.length,
      stancesMoved: taken.reduce((sum, t) => sum + t.moved.length, 0),
      notifiedUnchanged,
      byKind: Object.fromEntries(
        [...kinds].sort((a, b) => b[1] - a[1]).slice(0, 8),
      ),
      biggest: big && {
        id: big.event.id,
        kind: big.event.kind,
        date: big.event.date,
        topic: big.event.topic,
        desiredChange: big.event.desiredChange,
        learned: big.learners,
        moved: big.moved.length,
        sample: big.moved.slice(0, 3).map((m) => ({
          ...m,
          stance: `${m.personId}:${big.event.topic}`,
        })),
        notReached: untouched.slice(0, 3).map((row) => ({
          personId: row.personId,
          stance: row.stance
            ? `${row.stance.id} ${row.stance.desiredChange} ${row.stance.strength.toFixed(3)}, latest cause ${row.stance.causes.at(-1)?.eventId}`
            : "no stance on the topic",
        })),
      },
    },
    null,
    2,
  ),
);
if (failures.length) {
  console.log(`M1-10 FAIL:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`M1-10 passed: ${where}`);
