import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverageData from "../../data/content/trait-coverage.json" with { type: "json" };
import actKindsData from "../../data/content/act-kinds.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { chooseAct, traitLean } from "./choice";
import { createLifeCore } from "./life";
import { PEOPLE_MIND_VERSION } from "./people-mind";
import { buildPopulation } from "./population";
import {
  buildTraitCoverage,
  decisionTable,
  REPOSITORY_ROOT,
  resolvedDecisions,
  traitTable,
  type ResolvedDecision,
} from "./tooling/trait-coverage";
import type { ActOffer, CoreState, PersonState } from "./types";

// Owner, Oct 6 and Oct 12, 2026: every trait is wired into every decision a
// person makes, at both ends. This holds the trait table, the decision table
// and the code to each other, then proves it in a generated town: flipping a
// trait from high to low for everyone changes what they choose in every
// decision the coverage table lists against it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-trait-coverage");
const decisions = resolvedDecisions();
const traits = traitTable();
const kinds = new Set(actKindsData.kinds.map((row) => row.id));
const HIGH = 2;
const LOW = -2;

function sourceFiles(directory: string): string[] {
  return readdirSync(resolve(REPOSITORY_ROOT, directory), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => join(directory, name));
}

function read(path: string): string {
  return readFileSync(resolve(REPOSITORY_ROOT, path), "utf8");
}

describe("trait coverage: every trait, both sides, in every person-decision", () => {
  it("gives every trait a researched high and low side over known act kinds", () => {
    const problems: string[] = [];
    for (const [id, row] of Object.entries(traits)) {
      const full = row as typeof row & { basis?: string };
      if (!full.basis?.trim()) problems.push(`${id} has no research basis`);
      for (const side of ["high", "low"] as const) {
        const pulls = row[side];
        if (!pulls?.toward?.length)
          problems.push(`${id} ${side} pulls nowhere`);
        for (const kind of [...(pulls?.toward ?? []), ...(pulls?.away ?? [])])
          if (!kinds.has(kind)) problems.push(`${id} ${side} names ${kind}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("tags every option of every person-decision with act kinds traits reach", () => {
    const problems: string[] = [];
    for (const decision of decisions) {
      if (decision.resolved.length < 2)
        problems.push(`${decision.id} offers no choice`);
      for (const option of decision.resolved) {
        if (!option.actKinds.length)
          problems.push(`${decision.id}/${option.id} has no act kinds`);
        for (const kind of option.actKinds)
          if (!kinds.has(kind))
            problems.push(`${decision.id}/${option.id} names ${kind}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("finds every decision in code that weighs traits", () => {
    const problems: string[] = [];
    const helper =
      /\b(chooseAct|scoreOffers|decisionFromScores|traitLean|traitLeanBetween|decisionLean|decisionKinds|leanedYes|leanedYesWithTerm|leanedYesWhy|leanedScore|leanedTerm|leanedByKinds|decisionTraitTerm)\(/;
    for (const decision of decisions) {
      const site = read(decision.via ?? decision.site);
      if (!helper.test(site))
        problems.push(
          `${decision.id}: ${decision.via ?? decision.site} weighs no traits`,
        );
      // An option the table names directly is read from the table by its site.
      const prefix = decision.id.split(".")[0]!;
      const text = read(decision.site);
      if (
        decision.options.some((option) => option.actKinds) &&
        !text.includes(decision.id) &&
        !text.includes(`\`${prefix}.`)
      )
        problems.push(`${decision.id}: ${decision.site} does not read its row`);
    }
    // Every file that calls the chooser or a trait helper is a listed site or
    // listed as outside, with its reason.
    const { outside } = decisionTable();
    const listed = new Set([
      ...decisions.flatMap((row) => [row.site, row.via ?? row.site]),
      ...outside.map((row) => row.site.split(" ")[0]!),
    ]);
    for (const file of [
      ...sourceFiles("src/core2"),
      ...sourceFiles("src/director"),
    ])
      if (
        helper.test(read(file)) &&
        !file.includes("/tooling/") &&
        !listed.has(file)
      )
        problems.push(
          `${file} decides with traits but is not in the decision table`,
        );
    expect(problems).toEqual([]);
  });

  it("keeps the coverage table current, with every trait side changing a decision", () => {
    const built = buildTraitCoverage();
    expect(coverageData.traits).toEqual(built.traits);
    expect(Object.keys(built.traits).sort()).toEqual(
      Object.keys(traits).sort(),
    );
    const empty = Object.entries(built.traits)
      .filter(([, row]) => !row.high.length || !row.low.length)
      .map(([id]) => id);
    expect(empty).toEqual([]);
    // And every decision is changed by some trait.
    const reached = new Set(
      Object.values(built.traits).flatMap((row) => [...row.high, ...row.low]),
    );
    expect(
      decisions.map((row) => row.id).filter((id) => !reached.has(id)),
    ).toEqual([]);
  });
});

describe(`trait coverage in a generated town: ${place.name}, ${place.state} (seed ${seed})`, () => {
  const input = buildPopulation({
    seed,
    placeKey: place.key,
    startedAt: "2021-01-01",
    minimumPeople: 800,
  });
  const core = createLifeCore(input, { modules: [] });
  const adults = [...core.people.values()]
    .filter(
      (row) =>
        row.alive &&
        row.tier !== "husk" &&
        ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(input.startedAt)) >=
          18,
    )
    .slice(0, 600);

  const offers = (decision: ResolvedDecision): ActOffer[] =>
    decision.resolved.map((option) => ({
      definition: {
        id: option.id,
        actKinds: option.actKinds,
        goalKinds: [],
        need: "time",
        effortParameter: "zero",
        effectParameter: "zero",
        targetKind: "trait-coverage",
        effect: "trait-coverage",
      },
      targetId: decision.id,
      availableHours: 1,
      effortHours: 0,
    }));
  /**
   * The chooser's pick when the options differ only by the trait reason: the
   * highest trait lean, ties to the lowest key. Checked against chooseAct.
   */
  const pick = (
    actor: Pick<PersonState, "traits">,
    decision: ResolvedDecision,
    offsets?: ReadonlyMap<string, number>,
  ) => {
    let best: { key: string; id: string; lean: number } | undefined;
    for (const option of decision.resolved) {
      const lean =
        traitLean(core, actor, option.actKinds) -
        (offsets?.get(option.id) ?? 0);
      const key = `${option.id}:${decision.id}`;
      if (!best || lean > best.lean || (lean === best.lean && key < best.key))
        best = { key, id: option.id, lean };
    }
    return best!.id;
  };
  const working = new Map(
    adults.map((person) => [person.id, { ...person.traits }]),
  );
  /**
   * A real decision also weighs money, party, grievance and the rest, which
   * spread the town around the point where it tips. Stand in for those by
   * centering each option at the town's median trait lean for it, so the
   * town splits the way a calibrated decision does; traits then decide who
   * sits on which side.
   */
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)]!;
  };
  const centers = new Map(
    decisions.map((decision) => [
      decision.id,
      new Map(
        decision.resolved.map((option) => [
          option.id,
          median(
            adults.map((person) => traitLean(core, person, option.actKinds)),
          ),
        ]),
      ),
    ]),
  );
  /** What everyone chooses in each decision with one trait set for everyone. */
  function distributions(traitId: string, value: number): Map<string, string> {
    const counts = new Map<string, Record<string, number>>();
    for (const person of adults) {
      // One working copy of the person's traits, set for this trait.
      const traits = working.get(person.id)!;
      // A notable-only trait the person does not record reads as the middle.
      const before = traits[traitId];
      traits[traitId] = value;
      const actor = { traits };
      for (const decision of decisions) {
        const id = pick(actor, decision, centers.get(decision.id));
        const row = counts.get(decision.id) ?? {};
        row[id] = (row[id] ?? 0) + 1;
        counts.set(decision.id, row);
      }
      if (before === undefined) delete traits[traitId];
      else traits[traitId] = before;
    }
    return new Map(
      [...counts].map(([id, row]) => [
        id,
        JSON.stringify(
          Object.entries(row).sort(([a], [b]) => a.localeCompare(b)),
        ),
      ]),
    );
  }

  it("carries a level on every trait for every adult, low as well as high", () => {
    expect(adults.length).toBeGreaterThan(50);
    const ids = Object.keys(traits);
    // Only the opening temperament is recorded for everyone; any other trait
    // is notable-only (the trait registry): at the middle level it is not
    // recorded, so absence reads as the middle, never as unknown.
    const missing = adults.flatMap((person) =>
      ids
        .filter(
          (id) =>
            id.startsWith(`${PEOPLE_MIND_VERSION}:`) &&
            person.traits[id] === undefined,
        )
        .map((id) => `${person.id} ${id}`),
    );
    expect(missing).toEqual([]);
    const oneEnded = ids.filter(
      (id) =>
        !adults.some((row) => row.traits[id]! < 0) ||
        !adults.some((row) => row.traits[id]! > 0),
    );
    expect(oneEnded).toEqual([]);
  });

  it("picks what the chooser picks", () => {
    const ids = Object.keys(traits);
    decisions.forEach((decision, index) => {
      const traitId = ids[index % ids.length]!;
      for (const person of adults.slice(0, 20))
        for (const value of [HIGH, LOW]) {
          const actor: PersonState = {
            ...person,
            traits: { ...person.traits, [traitId]: value },
          };
          const view = {
            ...core,
            people: new Map([[person.id, actor]]),
          } as CoreState;
          // The same option, or one whose trait lean ties it to rounding
          // once the chooser adds the reasons every option shares.
          const chosen = chooseAct(view, person.id, offers(decision)).selected!
            .definition.actKinds;
          const best = decision.resolved.find(
            (option) => option.id === pick(actor, decision),
          )!.actKinds;
          expect(
            Math.abs(
              traitLean(core, actor, chosen) - traitLean(core, actor, best),
            ),
          ).toBeLessThan(1e-9);
        }
    });
  });

  it("changes what people choose at each end of every trait, in every decision listed against that end", () => {
    // Each end against the middle: everyone high in the trait, and everyone
    // low in it, choose differently from the same people in the middle.
    const unchanged: string[] = [];
    let checked = 0;
    for (const [traitId, row] of Object.entries(coverageData.traits)) {
      const middle = distributions(traitId, 0);
      const ends = {
        high: distributions(traitId, HIGH),
        low: distributions(traitId, LOW),
      };
      for (const side of ["high", "low"] as const)
        for (const decisionId of row[side]) {
          checked++;
          if (ends[side].get(decisionId) === middle.get(decisionId))
            unchanged.push(`${traitId} ${side} in ${decisionId}`);
        }
    }
    expect(checked).toBeGreaterThan(Object.keys(traits).length * 2);
    expect(unchanged).toEqual([]);
  }, 200_000);
});
