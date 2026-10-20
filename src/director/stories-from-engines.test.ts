import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { Moment } from "./types";

// M4-01, Stories from every engine: in a played year in a place drawn from
// all 56, a campaign, a vote and a law each produce moments for the people
// they touched, sized by impact. The three families are told apart by the
// record that caused the moment: a candidate's filing, an official's recorded
// vote, and the press story of a law that took effect.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "stories-from-engines");

const families: Record<string, (m: Moment) => boolean> = {
  campaign: (m) => m.causeId.includes("candidate-filed"),
  vote: (m) => m.label === "cause:event:office.voted",
  law: (m) =>
    m.label.endsWith("news.read") && /law-took-effect/.test(m.causeId),
};

it(`a campaign, a vote and a law each produce sized moments (${place.name}, seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    for (const p of core.people.values())
      if (p.alive && p.tier !== "husk") director.watch(core, p.id);
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const where = `${place.name}, seed ${seed}`;
    const found = new Map<string, { moments: Moment[]; people: Set<string> }>();
    for (const name of Object.keys(families))
      found.set(name, { moments: [], people: new Set() });
    for (const [personId, book] of director.ledger.people)
      for (const row of book.schedule) {
        const moment = book.momentsById.get(row.momentId);
        if (!moment) continue;
        for (const [name, is] of Object.entries(families))
          if (is(moment)) {
            found.get(name)!.moments.push(moment);
            found.get(name)!.people.add(personId);
          }
      }
    for (const [name, { moments, people }] of found) {
      expect(moments.length, `${where}: no ${name} moment`).toBeGreaterThan(0);
      expect(people.size, `${where}: ${name} reached nobody`).toBeGreaterThan(
        0,
      );
      for (const moment of moments)
        expect(
          Number.isFinite(moment.impact) && moment.impact > 0,
          `${where}: ${name} moment ${moment.id} has impact ${moment.impact}`,
        ).toBe(true);
    }
    // Sized by impact: the families are not all the same size.
    const sizes = new Set(
      [...found.values()].flatMap((f) => f.moments.map((m) => m.impact)),
    );
    expect(sizes.size, `${where}: every moment has one size`).toBeGreaterThan(
      1,
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
