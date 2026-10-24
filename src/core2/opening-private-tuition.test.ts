import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { setBookkeeping } from "./bookkeeping";
import { residentsRuntime } from "./modules/residents";
import { drawPlace } from "../../scripts/core2-year/place";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { parameter as p } from "./parameters";
import shares from "../../data/research/people/nces-private-enrollment-share-fall-2021.json" with { type: "json" };
import homeschool from "../../data/research/people/census-household-pulse-homeschool-share-2023.json" with { type: "json" };
import { privateShareOf } from "./opening-private-tuition";
import { generatedOpening } from "./tooling/generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-private-tuition");

describe(`private tuition in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("town families with school-age children pay the town's private schools", () => {
    const input = generatedOpening(place, {
      settings: { population: 1500 },
    });
    const schools = new Map(
      input.organizations
        .filter((row) => row.classification === "service:private-school")
        .map((row) => [row.id, row]),
    );
    const tuition = input.finance!.contracts.filter(
      (row) => row.kind === "household.customer.private-school",
    );
    if (!schools.size) {
      expect(tuition).toEqual([]);
      return;
    }
    expect(tuition.length).toBeGreaterThan(0);
    const homes = new Map(input.households.map((row) => [row.id, row]));
    // The homeschool share is taken out of the state's enrolled children first.
    const hs =
      homeschool.states[place.state as keyof typeof homeschool.states].share;
    expect(hs).toBeGreaterThan(0);
    expect(
      privateShareOf(undefined, input.placeMetadata?.placeKey),
    ).toBeCloseTo(
      shares.states[place.state as keyof typeof shares.states].share * (1 - hs),
      10,
    );
    console.log(
      `private share used in ${place.name} (${place.key}, ${place.state}), seed ${seed}: ${privateShareOf(undefined, input.placeMetadata?.placeKey)} (NCES ${shares.states[place.state as keyof typeof shares.states].share} x (1 - homeschool ${hs}))`,
    );
    const people = new Map(input.people.map((row) => [row.id, row]));
    const perChild =
      (p("openingPrivateTuitionAnnualUsd") * p("minorPerDollar")) /
      p("monthsPerYear");
    const cashPerHome = (id: string) =>
      homes
        .get(id)!
        .memberIds.reduce((sum, m) => sum + people.get(m)!.liquidMinor, 0);
    const enrolledByTown = new Map<
      string,
      { id: string; children: number }[]
    >();
    for (const row of tuition) {
      const school = schools.get(row.payeeId)!;
      const home = homes.get(row.householdId!)!;
      // Paid to a private school in the family's own town.
      expect(school.placeId).toBe(home.placeId);
      // The full tuition for a whole number of children.
      const children = row.amountMinor / perChild;
      expect(Math.abs(children - Math.round(children))).toBeLessThan(0.01);
      expect(Math.round(children)).toBeGreaterThan(0);
      enrolledByTown.set(home.placeId, [
        ...(enrolledByTown.get(home.placeId) ?? []),
        { id: home.id, children: Math.round(children) },
      ]);
    }
    // Who enrolls is a matter of means: within a town, no enrolled family has
    // less cash per child than a family with children who did not enroll.
    for (const [placeId, enrolled] of enrolledByTown) {
      const inSchool = new Set(enrolled.map((row) => row.id));
      const perChildCash = (id: string, kids: number) => cashPerHome(id) / kids;
      const least = Math.min(
        ...enrolled.map((row) => perChildCash(row.id, row.children)),
      );
      for (const home of input.households) {
        if (home.placeId !== placeId || inSchool.has(home.id)) continue;
        const ageOf = (m: string) =>
          ageOnDate(
            makeIsoDate(people.get(m)!.birthDate),
            makeIsoDate(input.startedAt),
          );
        const kids = home.memberIds.filter(
          (m) =>
            ageOf(m) >= p("openingSchoolAgeFirst") &&
            ageOf(m) <= p("openingSchoolAgeLast"),
        ).length;
        const payer = home.memberIds.some(
          (m) => ageOf(m) > p("openingSchoolAgeLast"),
        );
        if (!payer) continue;
        if (kids)
          expect(perChildCash(home.id, kids)).toBeLessThanOrEqual(least + 1);
      }
    }
  }, 300_000);
});

it(`a drawn played world uses the homeschool factor with a positive tuition contract, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const here = drawPlace(seed, `homeschool-private-positive:${attempt}`);
      const { core } = buildBenchWorld(here.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: here.key,
      });
      // Counted households carry the same tuition in the residents flow store.
      const tuition = [
        ...[...core.finance.contracts.values()].filter(
          (row) => row.kind === "household.customer.private-school",
        ),
        ...[...(residentsRuntime(core)?.flows.values() ?? [])].filter(
          (row) => row.financeKind === "household.customer.private-school",
        ),
      ];
      tried.push(
        `${here.name} (${here.key}): ${tuition.length} tuition contracts`,
      );
      if (!tuition.length) continue;
      const hs =
        homeschool.states[here.state as keyof typeof homeschool.states];
      const nces = shares.states[here.state as keyof typeof shares.states];
      const used = privateShareOf(undefined, core.placeMetadata?.placeKey);
      const where = `${here.name} (${here.key}), seed ${here.seed}`;
      expect(hs.share, where).toBeGreaterThan(0);
      expect(used, where).toBeCloseTo(nces.share * (1 - hs.share), 10);
      expect(tuition[0]!.amountMinor, where).toBeGreaterThan(0);
      expect(JSON.stringify(tuition[0]!.source), where).toContain(String(used));
      expect(core.organizations.has(tuition[0]!.payeeId), where).toBe(true);
      process.stdout.write(
        `HOMESCHOOL_PLAYED ${JSON.stringify({
          place: here.name,
          placeKey: here.key,
          worldSeed: here.seed,
          drawSeed: seed,
          nces: nces.share,
          homeschool: hs.share,
          used,
          contract: tuition[0]!.id,
          payee: tuition[0]!.payeeId,
          amountMinor: tuition[0]!.amountMinor,
          contracts: tuition.length,
        })}\n`,
      );
      return;
    }
    throw new Error(
      `No positive tuition case in six drawn worlds: ${tried.join("; ")}; seed ${seed}`,
    );
  } finally {
    setBookkeeping(true);
  }
  // Six generated openings, previously measured at 13–46 seconds each.
}, 360_000);
