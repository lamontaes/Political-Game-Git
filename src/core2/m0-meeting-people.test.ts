import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { enrichCivicInputs } from "./civic-inputs";
import { CLOSENESS, levelFromHours } from "./closeness";
import { ENCOUNTERS } from "./encounters";
import { advanceCore, createLifeCore } from "./life";
import { parameter } from "./parameters";
import { buildPopulation } from "./population";
import { resolveOperation } from "./state";
import type { CoreModule } from "./types";
import research from "../../data/research/people/contact-frequency-by-tie.json" with { type: "json" };

// M0-07, step 2: meeting people. Over 91 days in a random place, the player
// meets new people through real encounters, at least one tie grows closer,
// and visits to parents and siblings fall inside the survey ranges.
const DAYS = 91;
// The golden-path runner draws the place and seed from all 56.
const SEED = process.env.GOLDEN_PATH_SEED ?? "m0-07-a";
const input = enrichCivicInputs(
  buildPopulation({
    seed: SEED,
    placeKey: process.env.GOLDEN_PATH_SEED
      ? process.env.GOLDEN_PATH_PLACE_KEY
      : undefined,
    startedAt: "2021-01-01",
    minimumPeople: 600,
  }),
);
const core = createLifeCore(input);
const p = (key: string) => parameter(key, core.data.parameters);
const ageAt = (birthDate: string) =>
  ageOnDate(makeIsoDate(birthDate), makeIsoDate(input.startedAt));
const byId = new Map(input.people.map((person) => [person.id, person]));
// The player: a young adult with family living in another home.
const player = input.people.find(
  (person) =>
    person.tier !== "husk" &&
    ageAt(person.birthDate) >= 18 &&
    ageAt(person.birthDate) <= 30 &&
    person.familyIds.some(
      (id) => byId.get(id) && byId.get(id)!.householdId !== person.householdId,
    ),
)!;
core.playerId = player.id;
core.focusPersonIds.add(player.id);
const knownBefore = new Set(core.people.get(player.id)!.knownIds);

// Each adult resident's relation to each relative, from their family facts.
const relationOf = new Map<string, Map<string, string>>();
for (const person of input.people) {
  if (person.tier === "husk" || ageAt(person.birthDate) < 18) continue;
  const rows = new Map<string, string>();
  for (const fact of person.pastFacts ?? [])
    if (fact.kind.startsWith("family:") && fact.facts?.otherPersonId)
      rows.set(fact.facts.otherPersonId, fact.kind.slice("family:".length));
  relationOf.set(person.id, rows);
}
const visits = new Map<string, number>();
let hoursWithRelatives = 0;
const contact = resolveOperation(core, "effectHandlers", "contact")!;
const counter: CoreModule = {
  id: "m0-07-counter",
  effectHandlers: {
    contact: (api, actorId, chosen, ...rest) => {
      const relation = relationOf.get(actorId)?.get(chosen.targetId);
      const other = core.people.get(chosen.targetId);
      if (
        relation &&
        other?.householdId !== core.people.get(actorId)!.householdId
      ) {
        visits.set(relation, (visits.get(relation) ?? 0) + 1);
        hoursWithRelatives += chosen.effortHours ?? 0;
      }
      return contact(api, actorId, chosen, ...rest);
    },
  },
};
core.modules = new Map([[counter.id, counter], ...core.modules]);
const seenBy = new Map<string, number>();
advanceCore(core, addDays(makeIsoDate(core.date), DAYS), {
  // The player makes the rounds of people outside the family, going to
  // whoever they have seen least: old classmates and coworkers first, then
  // people they have since met.
  controller: (decision, offers) => {
    if (decision.actorId !== player.id) return undefined;
    const me = core.people.get(player.id)!;
    const visit = offers
      .filter(
        (offer) =>
          offer.definition.effect === "contact" &&
          !me.familyIds.has(offer.targetId),
      )
      .sort(
        (a, b) =>
          (seenBy.get(a.targetId) ?? 0) - (seenBy.get(b.targetId) ?? 0) ||
          a.targetId.localeCompare(b.targetId),
      )[0];
    if (!visit) return undefined;
    seenBy.set(visit.targetId, (seenBy.get(visit.targetId) ?? 0) + 1);
    return `${visit.definition.id}:${visit.targetId}`;
  },
});

describe(`meeting people over ${DAYS} days in ${input.placeMetadata?.placeName} (seed ${SEED})`, () => {
  const me = core.people.get(player.id)!;
  const met = [...me.knownIds].filter((id) => !knownBefore.has(id));
  const tieWith = (id: string) =>
    core.relationships.get([player.id, id].sort().join(":"));

  it("meets new people through real encounters, each a dated fact naming the place", () => {
    expect(met.length).toBeGreaterThan(0);
    for (const id of met) {
      const fact = core.knowledgeByPerson
        .get(player.id)
        ?.get(`person:${id}:met`);
      expect(fact?.value).toBeTruthy();
      expect(core.people.get(id)!.knownIds.has(player.id)).toBe(true);
      expect(tieWith(id)).toBeDefined();
    }
  });

  it("grows at least one tie closer than when it began", () => {
    const first = levelFromHours(p, p("socialHours"));
    const grown = [...(core.relationshipsByPerson.get(player.id) ?? [])]
      .map((id) => core.relationships.get(id)!)
      .filter((row) => row.kind !== CLOSENESS.familyKind && row.level > first);
    expect(grown.length).toBeGreaterThan(0);
  });

  it("saves a reason with every closeness change", () => {
    let changed = 0;
    for (const id of core.relationshipsByPerson.get(player.id) ?? []) {
      const row = core.relationships.get(id)!;
      if (row.lastContactDate <= input.startedAt) continue;
      changed += 1;
      const change = row.latestChange!;
      expect(change.date).toBe(row.lastContactDate);
      expect(change.after.level).toBe(row.level);
      expect(change.reason?.cause ?? change.decision?.reasonKey).toBeTruthy();
    }
    expect(changed).toBeGreaterThan(0);
    expect(
      met.some((id) =>
        [ENCOUNTERS.causes.metOnVisit, ENCOUNTERS.causes.visit].includes(
          tieWith(id)!.latestChange!.reason!.cause,
        ),
      ),
    ).toBe(true);
  });

  it("keeps visits to parents and siblings inside the GSS ranges, and hours near ATUS", () => {
    const gss = research.sources.find(
      (row) => row.id === "gss-social-evening",
    )!;
    const perYear = CLOSENESS.visitsPerYearByCategory.values;
    // The answer at a given share of people with such relatives.
    const quantile = (row: { percent: number[] }, share: number) => {
      const total = row.percent.reduce((sum, value) => sum + value, 0);
      let seen = 0;
      for (let index = row.percent.length - 1; index >= 0; index -= 1) {
        seen += row.percent[index]! / total;
        if (seen >= share) return perYear[index]!;
      }
      return perYear[0]!;
    };
    const rows = (
      gss as unknown as { rows: Record<string, { percent: number[] }> }
    ).rows;
    for (const [relation, gssRow] of [
      ["parent", rows.parents!],
      ["sibling", rows.siblings!],
    ] as const) {
      let ties = 0;
      for (const relatives of relationOf.values())
        for (const kind of relatives.values()) if (kind === relation) ties += 1;
      const rate =
        ((visits.get(relation) ?? 0) / ties) * (p("daysPerMeanYear") / DAYS);
      expect(rate).toBeGreaterThanOrEqual(quantile(gssRow, 0.25));
      expect(rate).toBeLessThanOrEqual(quantile(gssRow, 0.75));
    }
    const adults = relationOf.size;
    const hours = (hoursWithRelatives / adults) * (p("daysPerMeanYear") / DAYS);
    const atus = research.sources.find(
      (row) => row.id === "atus-companionship",
    )!;
    const minutes = (
      atus as unknown as {
        minutesPerDay: Record<string, Record<string, number>>;
      }
    ).minutesPerDay.nonHouseholdFamily!["2019"]!;
    const atusHours = (minutes / p("minutesPerHour")) * p("daysPerMeanYear");
    expect(hours).toBeGreaterThan(atusHours / 2);
    expect(hours).toBeLessThan(atusHours * 2);
  });
});
