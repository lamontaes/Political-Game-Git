import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { gameStartDate } from "./game-start";
import { lawChain } from "./modules/laws";
import { drawPlace } from "../../tests/golden-path/place";
import type { CoreState } from "./types";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  `family-link:${Date.now()}:${Math.random().toString(16).slice(2)}`;
const source = (core: CoreState) => ({
  tag: "ESTIMATED" as const,
  asOf: core.date,
  citation: "A test forms and ends a partnership.",
});

// Two people become partners in play and another pair stops being partners;
// each person's record says so, and the event reaches the engines. The births
// engine's own reader is the People item people-births-reads-family-partnered.
it(`forms and ends partner links (seed ${seed})`, () => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "family-link");
    if (partnersIn(place)) return;
  }
  throw new Error(`no drawn place had two single adults (seed ${seed})`);
}, 1_800_000);

function partnersIn(place: ReturnType<typeof drawPlace>): boolean {
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const day = (days: number) =>
    advanceCore(
      core,
      new Date(Date.parse(`${core.date}T00:00:00Z`) + days * 86_400_000)
        .toISOString()
        .slice(0, 10),
    );
  // The engines open on the first days.
  day(2);
  const town = lawChain(api).townPlaceId;
  const partnered = new Set(
    [...core.familyLinks.values()]
      .filter((row) => row.kind === "partner")
      .flatMap((row) => row.personIds),
  );
  const age = (born: string) =>
    Number(core.date.slice(0, 4)) -
    Number(born.slice(0, 4)) -
    (core.date.slice(5) < born.slice(5) ? 1 : 0);
  const single = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        !partnered.has(p.id) &&
        age(p.birthDate) >= 20 &&
        age(p.birthDate) <= 45,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const mother = single.find((p) => p.looks?.gender === "female");
  // The partner moves in, so they live elsewhere now and leave an adult behind.
  const other = single.find(
    (p) =>
      p.id !== mother?.id &&
      p.householdId !== mother?.householdId &&
      !p.familyIds.has(mother?.id ?? "") &&
      core.households
        .get(p.householdId)
        ?.memberIds.some(
          (id) =>
            id !== p.id &&
            age(core.people.get(id)?.birthDate ?? core.date) >= 18,
        ),
  );
  const couple = [...core.familyLinks.values()].find(
    (row) =>
      row.kind === "partner" &&
      row.personIds.every((id) => core.people.get(id)?.alive),
  );
  if (!mother || !other || !couple) return false;

  // 1. They share a home, then become partners.
  api.changeHouseholdV1({
    personIds: [other.id],
    householdId: mother.householdId,
    source: source(core),
  });
  api.setPartnersV1({
    personIds: [mother.id, other.id],
    together: true,
    source: source(core),
  });
  const link = [...core.familyLinks.values()].find(
    (row) =>
      row.kind === "partner" &&
      row.personIds.includes(mother.id) &&
      row.personIds.includes(other.id),
  )!;
  expect(link, "a partner link").toBeTruthy();
  expect(core.people.get(mother.id)!.familyIds.has(other.id)).toBe(true);
  for (const id of [mother.id, other.id])
    expect(
      core.people
        .get(id)!
        .pastFacts?.some(
          (fact) => fact.kind === "family:partner" && fact.date === core.date,
        ),
      `${id}'s record`,
    ).toBe(true);
  expect(() =>
    api.setPartnersV1({
      personIds: [mother.id, other.id],
      together: true,
      source: source(core),
    }),
  ).toThrow();

  // 2. Another pair stops being partners.
  api.setPartnersV1({
    personIds: couple.personIds,
    together: false,
    source: source(core),
  });
  expect(core.familyLinks.has(couple.id)).toBe(false);
  for (const id of couple.personIds)
    expect(
      core.people
        .get(id)!
        .pastFacts?.some((fact) => fact.kind === "family:former-partner"),
    ).toBe(true);

  // The months go on without a fault.
  day(90);
  return true;
}
