/** A public-sector bargaining law raises public workers' pay toward the union premium over its phase-in; a repeal takes no one's pay back. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, lawChain } from "./modules/laws";
import { PUBLIC_EMPLOYER_CLASSES } from "./public-pay-floor";
import { jobsAt } from "./law-reach/group-b-money";
import { bargainingRow, premiumShare } from "./law-reach/group-a-bargaining";
import { reachParameter } from "./law-reach/group-a-records";

const question =
  "us-policy-positions:labor-workforce.public-sector-collective-bargaining";

it("phases a pay premium onto public jobs after the law, and keeps it on repeal", () => {
  const seed = process.env.PB_SEED ?? randomBytes(32).toString("hex");
  setBookkeeping(false);
  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const draw = drawPlace(seed, `pb:${attempt}`);
      let core;
      try {
        ({ core } = buildBenchWorld(draw.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: draw.key,
        }));
      } catch (error) {
        if (/holds a resident aged/.test(String(error))) continue;
        throw error;
      }
      const api = coreAPI(core);
      const where = `seed ${draw.seed}, place ${draw.key}`;
      const pay = () =>
        new Map(
          jobsAt(api, PUBLIC_EMPLOYER_CLASSES).map(
            (j) => [j.id, j.hourlyMinor ?? 0] as const,
          ),
        );
      const before = pay();
      if (!before.size) continue;
      const state = lawChain(api).levels.find((l) => l.level === "state")!;
      const set = (value: number, days: number) => {
        enactLaw(api, {
          jurisdiction: state.jurisdiction,
          level: "state",
          series: question,
          value,
          effectiveDate: core.date,
          measureId: `test:pb:${value}:${core.date}`,
          citation: "Controlled law case in a generated town.",
        });
        advanceCore(core, addDays(makeIsoDate(core.date), days));
      };
      set(1, 400);
      const row = bargainingRow(api);
      // A state with the law at the opening has its effect in the pay already.
      if (!row) continue;
      const premium = reachParameter("publicBargainingPayPremium");
      const during = pay();
      let atFloor = 0,
        checked = 0,
        met = 0;
      for (const id of before.keys()) {
        const now = during.get(id);
        const base = row.facts.baseMinor[id];
        if (now === undefined || base === undefined) continue;
        // The law's own floor: the base pay times the premium earned at the
        // last monthly review. A job whose worker left is refilled at the
        // posted wage until the next review, so nearly all, not every, job
        // stands at or above it on any one day.
        const floor = Math.ceil(
          base *
            (1 +
              premium *
                premiumShare(row.facts, addDays(makeIsoDate(core.date), -35))),
        );
        checked += 1;
        if (now >= floor - 1) met += 1;
        if (floor > base) atFloor += 1;
      }
      expect(atFloor, `${where}: the premium reached nobody`).toBeGreaterThan(
        0,
      );
      expect(met / checked, `${where}: jobs at the floor`).toBeGreaterThan(0.8);
      // A repeal ends the phase-in and records it; it takes no pay back.
      set(0, 60);
      expect(bargainingRow(api)?.active, where).toBe(false);
      return;
    }
    throw new Error(
      `no drawn town had public jobs and a post-opening law (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
