/**
 * The social media age check reaches a teen's mood through the resting stress
 * their affect returns to, in a played world: a place drawn from all 56 on a
 * seed nobody chose, the bench world with every module installed, built twice
 * from the same seed. The law is enacted at every level of the town's chain in
 * one world (value 1) and its twin (value 0). The outcome web moves the share
 * of the place's teens in a major depressive episode by an estimate from the
 * nearest research (age-verification-to-youth-depressive-episode), and
 * restingStress multiplies a 13- to 17-year-old's youth gap by the web's
 * factor on that share at the moment it decides: the resting-stress module for
 * a full teen (monthly), initialPersonState for a counted one (when a group
 * decides), one rule for both tiers. A second case draws a place that began
 * with the law in force, where the twin repeals it and so sits off zero.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import reachParameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };
import { countedPersonOf } from "./counted-actor";
import { careNeedOf } from "./modules/health";
import { enactLaw, lawChain } from "./modules/laws";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { residentsRuntime } from "./modules/residents";
import { WEB_LINKS } from "./outcome-web-model";
import { webReach } from "./outcome-web-reach";
import { initialPersonState } from "./person-state";
import { parameterValues } from "./parameters";
import { POLICY_QUESTIONS } from "./policy-answers";
import { restingStress } from "./resting-stress";
import { coreAPI } from "./state";
import type { CoreState, PersonInput } from "./types";

const seed = process.env.AGE_CHECK_SEED ?? randomBytes(20).toString("hex");
const QUESTION =
  "us-policy-positions:technology-privacy.age-verification-for-social-media";
const LINK = "age-verification-to-youth-depressive-episode";
const MEASURE = "health.youth-major-depressive-episode";
/** A place the web keeps no month for: the same person read with no web factor. */
const NO_WEB_PLACE = "place:none-for-the-neutral-read";
/** Five and a half months: past the link's three-month lag with two steady web months before the last one. */
const DAYS = 170;
const TRIES = 4;
/** Draws looked through for a place that began with the law in force. */
const DRAWS = 600;

const ageOf = (core: CoreState, birthDate: string) =>
  Number(core.date.slice(0, 4)) - Number(birthDate.slice(0, 4));
const covered = (age: number, votingAge: number) =>
  age >= reachParameters.parameters.socialMediaAgeFrom.value && age < votingAge;

/** The town's web months: each month's row id and the link's effect. */
function monthEffects(
  core: CoreState,
  placeId: string,
): Map<string, { id: string; effect: number }> {
  const rows = coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .query("byPlace", [placeId]) as unknown as readonly WebMonth[];
  return new Map(
    rows.map((row) => [
      row.month,
      { id: row.id, effect: row.effects[LINK] ?? 0 },
    ]),
  );
}

/** One teen as the engine decides them: the stored baseline, the rule's output with the web and without it. */
function read(core: CoreState, row: PersonInput, stored?: number) {
  const api = coreAPI(core);
  const age = ageOf(core, row.birthDate);
  const web = webReach(api, row.placeId, MEASURE, { age });
  const care = core.people.has(row.id) ? careNeedOf(core, row.id) : 0;
  const withWeb = restingStress(core, row, care);
  const neutral = restingStress(core, { ...row, placeId: NO_WEB_PLACE }, care);
  return {
    age,
    factor: web.factor,
    recordId: web.recordId,
    links: web.parts.map((part) => part.link),
    stored,
    withWeb,
    neutral,
  };
}

/**
 * The proof in one drawn place: the law enacted in one world and its twin,
 * both run past the lag, then a named teen, a counted teen and the adults read
 * in both. Returns the report line, or null (the reason pushed to `passed`)
 * when the draw shows nothing to read.
 */
function prove(
  drawn: ReturnType<typeof drawPlace>,
  passed: string[],
  openedWithLaw: boolean,
): string | null {
  const where = `${drawn.name}, ${drawn.state} (${drawn.key})`;
  const build = () =>
    buildBenchWorld(drawn.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: drawn.key,
    }).core;
  const worlds = { law: build(), twin: build() };
  const enactedOn = worlds.law.date;
  for (const [name, value] of [
    ["law", 1],
    ["twin", 0],
  ] as const) {
    const api = coreAPI(worlds[name]);
    for (const level of lawChain(api).levels)
      enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: level.level,
        series: QUESTION,
        value,
        effectiveDate: enactedOn,
        measureId: `test:age-check:${name}:${enactedOn}`,
        citation: "Controlled law case in a generated year.",
      });
  }
  const until = addDays(makeIsoDate(enactedOn), DAYS);
  advanceCore(worlds.law, until);
  advanceCore(worlds.twin, until);
  const townId = lawChain(coreAPI(worlds.law)).townPlaceId;
  const withLaw = monthEffects(worlds.law, townId);
  const twin = monthEffects(worlds.twin, townId);
  // The months the law moved against its twin: each reads lower, by the
  // link's size (the twin may itself sit off zero where the place began with
  // the law, so nothing here assumes it is zero).
  const moved = [...withLaw].filter(
    ([month, row]) => row.effect !== (twin.get(month)?.effect ?? 0),
  );
  const size = WEB_LINKS.find((link) => link.key === LINK)!.size!;
  if (moved.length < 2) {
    passed.push(`${where}: ${moved.length} web months moved`);
    return null;
  }
  for (const [month, row] of moved) {
    const other = twin.get(month)?.effect ?? 0;
    expect(row.effect - other, `${row.id} against its twin`).toBeCloseTo(
      size,
      12,
    );
    // A place that began with the law measures from it: the law world sits at
    // its base and the twin, which repeals it, reads higher.
    if (openedWithLaw) {
      expect(row.effect, `${row.id} with the law at the base`).toBeCloseTo(
        0,
        12,
      );
      expect(other, `${row.id} in the repealed twin`).toBeGreaterThan(0);
    }
  }
  const votingAge = parameterValues(worlds.law.data.parameters)["votingAge"]!;
  const youthWeight = parameterValues(worlds.law.data.parameters)[
    "restingStressYouthWeight"
  ]!;

  // A named teen: a full person aged 13 to 17 in the town, alive in both.
  const teens = [...worlds.law.people.values()].filter(
    (person) =>
      person.alive &&
      person.placeId === townId &&
      covered(ageOf(worlds.law, person.birthDate), votingAge) &&
      worlds.twin.people.get(person.id)?.alive,
  );
  const adults = [...worlds.law.people.values()].filter(
    (person) =>
      person.alive &&
      person.placeId === townId &&
      ageOf(worlds.law, person.birthDate) >= votingAge,
  );
  let counted:
    { row: PersonInput; weight: number; household: string } | undefined;
  const runtime = residentsRuntime(worlds.law);
  if (runtime)
    outer: for (const household of runtime.store.liveHouseholds()) {
      for (const id of runtime.store.memberIdsOf(household)) {
        if (runtime.store.countedMember(id) === undefined) continue;
        const row = countedPersonOf(worlds.law, id);
        if (
          row &&
          row.placeId === townId &&
          covered(ageOf(worlds.law, row.birthDate), votingAge)
        ) {
          counted = {
            row,
            weight: runtime.store.weightOf(household),
            household: household.id,
          };
          break outer;
        }
      }
    }
  if (!teens.length && !counted) {
    passed.push(`${where}: no teen, full or counted, in the town`);
    return null;
  }

  const lines: string[] = [];
  for (const teen of teens.slice(0, 3)) {
    const a = read(worlds.law, teen, teen.affect.stressBaseline);
    const twinTeen = worlds.twin.people.get(teen.id)!;
    const b = read(worlds.twin, twinTeen, twinTeen.affect.stressBaseline);
    // The resting-stress module wrote each baseline on the month's first day,
    // from the factor in force. The same teen in the twin has the same money,
    // work, traits and health (the law moves none), so the two stored
    // baselines differ by the youth gap times the factors' difference and
    // nothing else.
    expect(
      a.stored! - b.stored!,
      `${teen.id}: stored baselines against the twin's`,
    ).toBeCloseTo(youthWeight * (a.factor - b.factor), 10);
    // The web's part is the youth gap times the factor, nothing else.
    expect(a.withWeb - a.neutral, teen.id).toBeCloseTo(
      youthWeight * (a.factor - 1),
      12,
    );
    expect(b.withWeb - b.neutral, `${teen.id} in the twin`).toBeCloseTo(
      youthWeight * (b.factor - 1),
      12,
    );
    // The link runs in the world whose law sits off the place's base: the law
    // world, or where the place began with the law, its repealed twin.
    expect(openedWithLaw ? b.links : a.links, teen.id).toContain(LINK);
    // The law world's teen rests lower than the same teen in the twin.
    expect(a.factor, `${teen.id} factor`).toBeLessThan(b.factor);
    expect(a.factor - b.factor, teen.id).toBeCloseTo(size, 12);
    expect(a.stored!, teen.id).toBeLessThan(b.stored!);
    lines.push(
      `${teen.id} (age ${a.age}): resting stress ${a.stored!.toFixed(6)} with the law against ${b.stored!.toFixed(6)} in the twin, factor ${a.factor.toFixed(6)} (${a.recordId}) against ${b.factor.toFixed(6)} (${b.recordId}); without the web ${a.neutral.toFixed(6)} and ${b.neutral.toFixed(6)}`,
    );
  }
  if (counted) {
    const a = read(worlds.law, counted.row);
    const twinRow = countedPersonOf(worlds.twin, counted.row.id);
    expect(twinRow, "the same counted teen in the twin").toBeDefined();
    const b = read(worlds.twin, twinRow!);
    // The counted tier decides by the same rule when a group decides.
    expect(
      initialPersonState(worlds.law, counted.row, false).affect.stressBaseline,
      `${counted.row.id} as a counted group reads them`,
    ).toBeCloseTo(a.withWeb, 12);
    expect(a.withWeb - a.neutral, counted.row.id).toBeCloseTo(
      youthWeight * (a.factor - 1),
      12,
    );
    expect(a.factor, `${counted.row.id} factor`).toBeLessThan(b.factor);
    expect(a.withWeb, counted.row.id).toBeLessThan(b.withWeb);
    lines.push(
      `counted ${counted.row.id} (age ${a.age}, household ${counted.household}, standing for ${counted.weight} households): ${a.withWeb.toFixed(6)} with the law against ${b.withWeb.toFixed(6)} in the twin, factor ${a.factor.toFixed(6)} (${a.recordId}) against ${b.factor.toFixed(6)} (${b.recordId})`,
    );
  }
  // Nobody outside the law's ages is touched.
  for (const adult of adults.slice(0, 5)) {
    const r = read(worlds.law, adult);
    expect(r.withWeb, `${adult.id} (age ${r.age}) is not covered`).toBe(
      r.neutral,
    );
  }
  const last = moved.at(-1)!;
  return `AGE-CHECK (AGE_CHECK_SEED=${seed}) ${where}, world seed ${drawn.seed}, state ${drawn.state}${openedWithLaw ? ", began with the law in force" : ""}: law ${QUESTION} enacted ${enactedOn} at ${lawChain(coreAPI(worlds.law)).levels.length} levels (value 1; twin 0); ${moved.length} web months moved, e.g. ${last[1].id} ${last[1].effect.toExponential(4)} against ${(twin.get(last[0])?.effect ?? 0).toExponential(4)}; ${lines.join("; ")}. Passed over: ${passed.join("; ") || "none"}\n`;
}

describe("the social media age check reaches teens' resting stress", () => {
  it("is an estimate from the nearest research, with its spread across zero", () => {
    const row = WEB_LINKS.find((link) => link.key === LINK)!;
    expect(row.from).toBe(`law:${QUESTION}`);
    expect(row.to).toBe(MEASURE);
    expect(row.size).toBeLessThan(0);
    expect(row.range![0]).toBeLessThan(row.size!);
    expect(row.range![1]).toBeGreaterThan(0);
    expect(row.evidence).toBe("provisional");
    expect(row.lagMonths).toBeGreaterThan(0);
  });

  it(
    `a place with the law in force reads lower teen distress than its twin, for full and counted teens (seed ${seed})`,
    { timeout: 1_800_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const line = prove(
            drawPlace(seed, `law-wiring-age-check:${attempt}`),
            passed,
            false,
          );
          if (line) {
            process.stdout.write(line);
            return;
          }
        }
        throw new Error(
          `No drawn place showed a teen in a month the law moved: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );

  it(
    `a place that began with the law in force reads its repealed twin higher, by the same size (seed ${seed})`,
    { timeout: 1_800_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        // Places drawn from all 56 by the same seed, kept when the researched
        // starting answer to the question is yes (read from the data, so no
        // place is named here).
        const opened = Array.from({ length: DRAWS }, (_, n) =>
          drawPlace(seed, `law-wiring-age-check-open:${n}`),
        )
          .filter(
            (drawn) =>
              POLICY_QUESTIONS[QUESTION]?.answers[drawn.state]?.answer ===
              "yes",
          )
          .slice(0, TRIES);
        expect(opened.length, "draws that began with the law").toBeGreaterThan(
          0,
        );
        for (const drawn of opened) {
          const line = prove(drawn, passed, true);
          if (line) {
            process.stdout.write(line);
            return;
          }
        }
        throw new Error(
          `No place that began with the law showed a teen in a month it moved: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});
