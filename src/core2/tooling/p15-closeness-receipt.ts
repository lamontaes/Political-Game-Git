/**
 * P15 closeness receipt: builds an ordinary generated town, runs it, and
 * reports closeness and contact by kind of tie against the answer keys.
 *
 *   npx tsx src/core2/tooling/p15-closeness-receipt.ts --seed <seed> \
 *     [--place <placeKey>] [--minimum <people>] [--days <n>] [--out <file>]
 */
import { writeFileSync } from "node:fs";
import { addDays, ageOnDate, makeIsoDate } from "../../simulation/dates";
import { enrichCivicInputs } from "../civic-inputs";
import { CLOSENESS, currentCloseness } from "../closeness";
import { buildDeepPast } from "../deep-past";
import { advanceCore, createLifeCore } from "../life";
import { OPENING_KIN } from "../opening-kin";
import { buildPopulation } from "../population";
import type { CoreState, PersonState } from "../types";
import research from "../../../data/research/people/contact-frequency-by-tie.json" with { type: "json" };

const ADULT_AGE = 18;

function tieOf(core: CoreState, actor: PersonState, otherId: string): string {
  const other = core.people.get(otherId);
  if (!other) return "unknown";
  if (actor.householdId === other.householdId)
    return actor.familyIds.has(otherId) ? "household family" : "housemate";
  const fact = actor.pastFacts?.find(
    (row) => row.id === `${actor.id}${CLOSENESS.kinFactMarker}${otherId}`,
  );
  if (fact) return fact.kind.slice(CLOSENESS.familyFactPrefix.length);
  if (actor.familyIds.has(otherId)) return "family (other)";
  return "acquaintance";
}

function summary(values: number[]) {
  if (!values.length) return { pairs: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) =>
    Number(
      sorted[
        Math.min(sorted.length - 1, Math.floor(q * sorted.length))
      ]!.toFixed(3),
    );
  return {
    pairs: values.length,
    mean: Number(
      (values.reduce((s, v) => s + v, 0) / values.length).toFixed(3),
    ),
    p10: at(0.1),
    median: at(0.5),
    p90: at(0.9),
  };
}

function closenessByTie(core: CoreState) {
  const rows = new Map<string, number[]>();
  for (const row of core.relationships.values()) {
    const actor = core.people.get(row.actorId)!;
    const other = core.people.get(row.otherId)!;
    const resident = [actor, other].find(
      (person) => person.tier !== OPENING_KIN.kinTier,
    );
    if (!resident) continue;
    const tie = tieOf(core, resident, resident === actor ? other.id : actor.id);
    const list = rows.get(tie) ?? [];
    list.push(currentCloseness(core, row));
    rows.set(tie, list);
  }
  return Object.fromEntries(
    [...rows]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tie, values]) => [tie, summary(values)]),
  );
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1]?.endsWith("p15-closeness-receipt.ts")) {
  const seed = argument("seed");
  if (!seed) throw new Error("--seed is required.");
  const placeKey = argument("place");
  const minimum = argument("minimum");
  const days = Number(argument("days") ?? "91");
  const clock = () => performance.now() / 1000;
  const began = clock();
  const input = buildPopulation({
    seed,
    startedAt: "2021-01-01",
    ...(placeKey ? { placeKey } : {}),
    ...(minimum ? { minimumPeople: Number(minimum) } : {}),
  });
  const built = clock();
  const core = createLifeCore(enrichCivicInputs(buildDeepPast(input)));
  const created = clock();
  const residents = [...core.people.values()].filter(
    (person) => person.tier !== OPENING_KIN.kinTier,
  );
  const adults = residents.filter(
    (person) =>
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) >=
      ADULT_AGE,
  );
  const adultIds = new Set(adults.map((person) => person.id));
  const circles = residents.map(
    (person) =>
      [...person.knownIds].filter(
        (id) => tieOf(core, person, id) === "acquaintance",
      ).length,
  );
  const opening = closenessByTie(core);

  const contacts = new Map<string, number>();
  const byActor = new Map<string, Map<string, number>>();
  advanceCore(core, addDays(makeIsoDate(core.date), days), {
    controller: (decision) => {
      const chosen = decision.selected;
      if (!chosen || !adultIds.has(decision.actorId)) return undefined;
      if (
        chosen.definition.effect !== "contact" &&
        chosen.definition.effect !== "care"
      )
        return undefined;
      const actor = core.people.get(decision.actorId)!;
      const tie = tieOf(core, actor, chosen.targetId);
      contacts.set(tie, (contacts.get(tie) ?? 0) + 1);
      const mine = byActor.get(actor.id) ?? new Map<string, number>();
      mine.set(chosen.targetId, (mine.get(chosen.targetId) ?? 0) + 1);
      byActor.set(actor.id, mine);
      return undefined;
    },
  });
  const simulated = clock();

  // Contacts per adult per year with each kind of tie, against GSS visits.
  const tieCounts = new Map<string, number>();
  for (const adult of adults)
    for (const id of adult.knownIds) {
      const tie = tieOf(core, adult, id);
      tieCounts.set(tie, (tieCounts.get(tie) ?? 0) + 1);
    }
  const yearScale = 365.2425 / days;
  const contactRates = Object.fromEntries(
    [...contacts]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tie, count]) => [
        tie,
        {
          contacts: count,
          perAdultPerYear: Number(
            ((count / adults.length) * yearScale).toFixed(2),
          ),
          perTiePerYear: Number(
            ((count / (tieCounts.get(tie) ?? 1)) * yearScale).toFixed(2),
          ),
          ties: tieCounts.get(tie) ?? 0,
        },
      ]),
  );
  const repeat = [...byActor.values()].map((targets) =>
    Math.max(...targets.values()),
  );

  const receipt = {
    version: CLOSENESS.version,
    seed,
    place: input.placeMetadata?.placeName,
    startedAt: input.startedAt,
    days,
    residents: residents.length,
    adults: adults.length,
    people: core.people.size,
    relationships: core.relationships.size,
    circle: {
      residentsWithAcquaintances: circles.filter((n) => n > 0).length,
      meanAcquaintances: Number(
        (circles.reduce((s, n) => s + n, 0) / residents.length).toFixed(1),
      ),
    },
    openingCloseness: opening,
    closenessAfter: closenessByTie(core),
    contactRates,
    mostContactsWithOnePerson: summary(repeat),
    answerKeys: {
      gss: research.sources.find((row) => row.id === "gss-social-evening"),
      hall: research.sources.find(
        (row) => row.id === "hall-2019-friendship-hours",
      ),
    },
    seconds: {
      build: Number((built - began).toFixed(1)),
      createWithDeepPast: Number((created - built).toFixed(1)),
      simulate: Number((simulated - created).toFixed(1)),
    },
  };
  const text = `${JSON.stringify(receipt, null, 2)}\n`;
  const out = argument("out");
  if (out) writeFileSync(out, text);
  else process.stdout.write(text);
}
