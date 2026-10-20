/**
 * Full couples' plan to have a child reads the outcome web: the log of the
 * web's birth factor for the mother's age and home is a term in the plan
 * score, so a town's full-tier births move with the factor the way counted
 * births do. The unemployment link is left out because a lost job already
 * lowers the couple's own work and income terms. Played in the bench world in
 * a place drawn from all 56 on a seed nobody chose; the twin is the same
 * world with the web's price links shifted where the plan reads them.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { RENEWAL_PARAMETERS } from "./births-parameters";
import {
  birthCircumstances,
  chooseBirthPlan,
  PLAN_CHILD,
  type BirthCouple,
} from "./births-plan";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.WEB_BIRTHS_PLAN_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "web-births-plan");
const EFFECTS = {
  "home-prices-to-owner-births": 0.1,
  "home-prices-to-renter-births": 0.1,
};

function setEffects(core: CoreState, effects: Record<string, number>) {
  const table = coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months");
  const rows = table.rows() as unknown as WebMonth[];
  const latest = rows
    .map((r) => r.month)
    .sort()
    .at(-1)!;
  for (const row of rows)
    if (row.month === latest)
      table.put({ ...row, effects: { ...row.effects, ...effects } } as never);
}

type Plan = { id: string; coupleId: string; agreed: boolean };
const plansOf = (core: CoreState) =>
  coreAPI(core)
    .moduleState(RENEWAL_MODULE_ID)
    .table("plans")
    .rows() as unknown as Plan[];

/** Play a year; the shifted twin has its web row re-shifted each day after the web wrote it. */
function playYear(shifted: boolean) {
  const opening = gameStartDate();
  const core = buildBenchWorld(seed, opening, {
    twoLevel: true,
    placeKey: place.key,
  }).core;
  const api = coreAPI(core);
  const sample = { couples: 0, planning: 0, planningWithout: 0, logFactor: 0 };
  const weight = RENEWAL_PARAMETERS["renewalWebWeight"]!;
  let day = makeIsoDate(opening);
  for (let i = 0; i < 360; i++) {
    day = addDays(day, 1);
    advanceCore(core, day);
    if (!shifted) continue;
    setEffects(core, EFFECTS);
    if (i % 7 !== 6) continue;
    // Every active couple's plan at this date, with the web's term and
    // without it (weight zero), on the same records.
    const couples = (
      api
        .moduleState(RENEWAL_MODULE_ID)
        .table("couples")
        .rows() as unknown as (BirthCouple & { status: string })[]
    ).filter((c) => c.status === "active");
    const agreed = () =>
      couples.filter((c) =>
        [c.motherId, c.otherParentId].every(
          (id) => chooseBirthPlan(api, id, c).selected === PLAN_CHILD.id,
        ),
      ).length;
    const original = weight.value;
    api.state.data.parameters["renewalWebWeight"] = {
      ...weight,
      value: 0,
    } as never;
    sample.planningWithout += agreed();
    api.state.data.parameters["renewalWebWeight"] = {
      ...weight,
      value: original,
    } as never;
    sample.planning += agreed();
    sample.couples += couples.length;
    // The factor the plan read for each couple's mother (the web term over its weight).
    for (const c of couples)
      sample.logFactor +=
        birthCircumstances(api, core.people.get(c.motherId)!, c).web / original;
  }
  sample.logFactor /= sample.couples;
  return { core, sample };
}

describe(`full couples' plans and the outcome web (${place.name}, seed ${seed})`, () => {
  it("a higher birth factor moves the share of couples that plan by about the factor, and the played year's plans follow", () => {
    const base = playYear(false);
    const lifted = playYear(true);
    const { sample } = lifted;
    expect(sample.couples).toBeGreaterThan(50);
    expect(sample.logFactor).toBeGreaterThan(0);
    expect(sample.planningWithout).toBeGreaterThan(5);
    const move = sample.planning / sample.planningWithout - 1;
    const factorMove = Math.exp(sample.logFactor) - 1;
    console.log(
      `web births plan: ${place.name}, seed ${seed}: factor ${(1 + factorMove).toFixed(4)}; couples planning ${sample.planningWithout} -> ${sample.planning} of ${sample.couples} couple-months (${(move * 100).toFixed(1)}% against the factor's ${(factorMove * 100).toFixed(1)}%)`,
    );
    // The share moves up, by about the factor (a quarter to two and a half times it: the
    // sample is a few dozen planning couples, so it is coarse).
    expect(move).toBeGreaterThan(factorMove * 0.25);
    expect(move).toBeLessThan(factorMove * 2.5);
    // The played year: the shifted twin agrees to more plans, named by record.
    const agreedIds = (core: CoreState) =>
      plansOf(core)
        .filter((p) => p.agreed)
        .map((p) => p.id);
    const a = agreedIds(base.core),
      b = agreedIds(lifted.core);
    const onlyLifted = b.filter((id) => !a.includes(id));
    console.log(
      `web births plan year: ${place.name}, seed ${seed}: agreed plans ${a.length} -> ${b.length}; only in the shifted year ${onlyLifted.slice(0, 5).join(", ")}`,
    );
    expect(b.length).toBeGreaterThan(a.length);
    expect(onlyLifted.length).toBeGreaterThan(0);
  }, 1_800_000); // two played years in a two-level world, queued behind other sessions
});
