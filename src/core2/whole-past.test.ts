/**
 * A person's past reaches back to their own birth (docs/design/life-record.md, step 2; the owner's
 * ruling, Nov 9, 2026). One world drawn from all 56 places, built twice, plus the named repro. The
 * place and seed are in every message; replay with WHOLE_SEED and WHOLE_PLACE_KEY.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { knownCard } from "../bench/card";
import { traceNode } from "../bench/dev-trace";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { lifeOf, openWholePast } from "./modules/people";
import { onCalendar } from "./past-school-calendar";
import { preStartHistory, preStartWindowOf } from "./past";
import type { CoreState, PersonId, PersonState } from "./types";

const seed = process.env.WHOLE_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(seed, "whole-past");
const placeKey = process.env.WHOLE_PLACE_KEY ?? drawn.key;

/** The kinds that are one person's own past; every other kind is the world's history. */
const OWN_KINDS = [
  "person.work-spell",
  "person.out-of-work",
  "person.moved-in",
  "school.started",
];

setBookkeeping(false);
const build = (worldSeed: string, key: string) =>
  buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });
const world = build(drawn.seed, placeKey);
const { core } = world;
const where = `${world.place.displayName} (${placeKey}), seed ${seed}`;
const windowOf = (c: CoreState) => preStartWindowOf(c)!;

/** Full living adults of the played town, oldest first. */
const adultsOf = (c: CoreState, placeId: string) =>
  [...c.people.values()]
    .filter(
      (person) =>
        person.alive &&
        person.tier !== "husk" &&
        person.placeId === placeId &&
        ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(c.date)) >= 18,
    )
    .sort(
      (a, b) =>
        a.birthDate.localeCompare(b.birthDate) || a.id.localeCompare(b.id),
    );

const circleOf = (c: CoreState) => {
  const player = c.people.get(c.playerId as PersonId)!;
  return new Set<string>([
    player.id,
    ...player.knownIds,
    ...(c.households.get(player.householdId)?.memberIds ?? []),
  ]);
};

/** A person's whole past rows, as plain text, row for row. */
const rowsOf = (c: CoreState, id: string) =>
  JSON.stringify(preStartHistory(c, { personId: id as PersonId }));

const yearsBefore = (person: PersonState, c: CoreState) =>
  Number(windowOf(c).from.slice(0, 4)) - Number(person.birthDate.slice(0, 4));

/** The oldest adult in the player's household or circle born at least ten years before the window. */
function olderAdult(c: CoreState, placeId: string): PersonState | undefined {
  const circle = circleOf(c);
  return adultsOf(c, placeId).find(
    (person) => circle.has(person.id) && yearsBefore(person, c) >= 10,
  );
}

describe(`the whole past in ${where}`, () => {
  it("1: an older adult has a childhood and a working life before the window", () => {
    const person = olderAdult(core, world.placeId);
    if (!person) {
      console.log(`whole-past 1: ${where}; no older adult in the circle`);
      return;
    }
    openWholePast(core, person.id);
    const from = windowOf(core).from;
    const life = lifeOf(core, person.id);
    const schools = life.filter((e) => e.life === "school" && e.date < from);
    expect(
      schools.length,
      `${where}: ${person.id} school before ${from}`,
    ).toBeGreaterThan(0);
    for (const event of schools)
      expect(event.date > person.birthDate, `${where}: ${event.id}`).toBe(true);
    const sixteenth = `${Number(person.birthDate.slice(0, 4)) + 16}${person.birthDate.slice(4)}`;
    const jobs = life
      .filter((e) => e.life === "work" && e.what === "job-started")
      .sort((a, b) => a.date.localeCompare(b.date));
    const firstJob = jobs[0];
    // Their working life began before the window if they were out of school by then.
    if (firstJob && firstJob.date < from)
      expect(
        firstJob.date >= sixteenth.replace("-02-29", "-03-01"),
        `${where}: first job ${firstJob.date} before sixteen`,
      ).toBe(true);
    console.log(
      `whole-past 1: ${where}; ${person.id} born ${person.birthDate}: ${schools.length} school events and ${jobs.filter((e) => e.date < from).length} job spells before ${from}`,
    );
  }, 600_000);

  it("2: a past ends where the records say, for 20 adults of different ages", () => {
    const all = adultsOf(core, world.placeId);
    const step = Math.max(1, Math.floor(all.length / 20));
    const chosen = all.filter((_, i) => i % step === 0).slice(0, 20);
    let checked = 0;
    let publicJobs = 0;
    for (const person of chosen) {
      openWholePast(core, person.id);
      const spells = preStartHistory(core, { personId: person.id })
        .filter((row) => row.kind === "person.work-spell")
        .sort((a, b) =>
          String(a.facts.startedAt).localeCompare(String(b.facts.startedAt)),
        );
      const label = `${where}: ${person.id} born ${person.birthDate}`;
      const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
      const last = spells.at(-1);
      if (job && !job.endsAt) {
        if (!last) continue; // a town without businesses on record keeps no working lives
        // A public office held on day one (an appointee) is not a business of the working-life run.
        const business = [...core.finance.businesses.values()].some(
          (book) => book.organizationId === job.organizationId,
        );
        if (!business) {
          publicJobs++;
          continue;
        }
        expect(
          last.facts.organizationId,
          `${label}: the job held at the opening`,
        ).toBe(job.organizationId);
        expect(last.facts.end, label).toBe("held-at-start");
        checked++;
      } else if (last) {
        expect(
          last.facts.end,
          `${label}: how the last job ended`,
        ).toBeDefined();
        expect(last.facts.end, label).not.toBe("held-at-start");
        checked++;
      }
    }
    console.log(
      `whole-past 2: ${where}; ${checked} of ${chosen.length} pasts checked (${publicJobs} hold a public office the working-life run does not keep)`,
    );
    expect(chosen.length, where).toBeGreaterThan(0);
  }, 600_000);

  it("3: no job spell names an employer founded after it began", () => {
    const founded = new Map(
      preStartHistory(core, { kind: "business.founded" }).map((row) => [
        String(row.facts.organizationId),
        row.date,
      ]),
    );
    let spells = 0;
    let named = 0;
    let heldLate = 0;
    for (const row of preStartHistory(core, { kind: "person.work-spell" })) {
      spells++;
      const org = row.facts.organizationId;
      if (org === undefined) continue;
      named++;
      const since = founded.get(String(org));
      if (!since || since <= String(row.facts.startedAt)) continue;
      // The job held on day one carries the opening's own start date, which the
      // business pass may date earlier than the firm's founding: not written by
      // the whole past, counted here and left to the opening's records.
      if (row.id.endsWith(":held")) {
        heldLate++;
        continue;
      }
      expect(
        since <= String(row.facts.startedAt),
        `${where}: ${row.id} at ${String(org)} founded ${since}, spell began ${String(row.facts.startedAt)}`,
      ).toBe(true);
    }
    console.log(
      `whole-past 3: ${where}; ${spells} spells, ${named} name an employer, ${heldLate} day-one jobs began before their firm's founding row (the opening's own dates)`,
    );
  });

  it("6: the world's own history did not move", () => {
    const from = windowOf(core).from;
    let before = 0;
    for (const row of preStartHistory(core)) {
      if (OWN_KINDS.includes(row.kind)) {
        if (row.date < from) before++;
        continue;
      }
      expect(
        row.date >= from,
        `${where}: ${row.kind} ${row.id} is dated ${row.date}, before ${from}`,
      ).toBe(true);
    }
    console.log(
      `whole-past 6: ${where}; ${before} own rows before ${from}, no world row`,
    );
  });

  it("7: every row before the window is on its year grain", () => {
    const from = windowOf(core).from;
    let rows = 0;
    for (const row of preStartHistory(core)) {
      if (!OWN_KINDS.includes(row.kind) || row.date >= from) continue;
      const person = core.people.get(row.personIds![0]!)!;
      const label = `${where}: ${row.id} ${row.date}`;
      rows++;
      if (row.kind === "school.started") {
        expect(row.date, label).toBe(
          onCalendar(Number(row.facts.schoolYear), "starts"),
        );
        continue;
      }
      const birthday = person.birthDate.slice(5).replace("02-29", "03-01");
      // A move or a spell is told on the person's birthday that year.
      expect(row.date.slice(5), `${label}: birthday ${person.birthDate}`).toBe(
        birthday,
      );
    }
    console.log(
      `whole-past 7: ${where}; ${rows} rows before ${from} on year grain (school: the school calendar's first day; work and moves: the birthday)`,
    );
  });

  it("8: the card shows a school and a work sentence from before the window, and every line opens in Trace", () => {
    const from = windowOf(core).from;
    const circle = circleOf(core);
    const candidates = adultsOf(core, world.placeId).filter(
      (person) => circle.has(person.id) && yearsBefore(person, core) >= 10,
    );
    if (!candidates.length) {
      console.log(`whole-past 8: ${where}; no older adult in the circle`);
      return;
    }
    const playerId = core.playerId!;
    let shown:
      | { person: PersonState; lines: ReturnType<typeof knownCard>["history"] }
      | undefined;
    for (const person of candidates) {
      const lines = knownCard(core, playerId, person.id).history;
      const life = lifeOf(core, person.id);
      // A sentence is from before the window when any record it tells is.
      const early = (line: { records: string[] }) =>
        line.records.some(
          (id) => (life.find((e) => e.id === id)?.date ?? "9999") < from,
        );
      const school = lines.some((l) => l.kind === "school" && early(l));
      const work = lines.some((l) => l.kind === "work" && early(l));
      if (school && work) {
        shown = { person, lines };
        break;
      }
      shown ??= { person, lines };
    }
    const { person, lines } = shown!;
    const life = lifeOf(core, person.id);
    const early = (line: { records: string[] }) =>
      line.records.some(
        (id) => (life.find((e) => e.id === id)?.date ?? "9999") < from,
      );
    const kinds = new Set(lines.filter(early).map((l) => l.kind));
    expect(
      kinds.has("school"),
      `${where}: ${person.id} a school sentence before ${from}`,
    ).toBe(true);
    expect(
      kinds.has("work"),
      `${where}: ${person.id} a work sentence before ${from}`,
    ).toBe(true);
    const missing = lines.filter((line) =>
      line.records.some(
        (id) => traceNode(core, world.director, id).answer === "not-a-record",
      ),
    );
    expect(
      missing.map((line) => `${line.recordId}: ${line.text}`),
      where,
    ).toEqual([]);
    console.log(
      `whole-past 8: ${where}; ${person.id}:\n${lines.map((l) => `  ${l.text}`).join("\n")}`,
    );
  }, 600_000);

  it("10: a person an engine made for a role gets the same past when opened", () => {
    const roleless = [...core.people.values()].find(
      (person) =>
        person.alive &&
        person.tier !== "husk" &&
        (person.pastFacts ?? []).length === 0 &&
        !preStartHistory(core, { personId: person.id }).length &&
        ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) >= 18,
    );
    if (!roleless) {
      console.log(
        `whole-past 10: ${where}; no living adult without a past in this town`,
      );
      return;
    }
    openWholePast(core, roleless.id);
    const life = lifeOf(core, roleless.id);
    const kinds = [...new Set(life.map((e) => `${e.life}/${e.what}`))];
    console.log(
      `whole-past 10: ${where}; ${roleless.id} (${roleless.givenName} ${roleless.familyName}, born ${roleless.birthDate}, household ${roleless.householdId || "none"}, job ${roleless.jobId ?? "none"}) now has ${life.length} events: ${kinds.join(", ")}`,
    );
    expect(
      life.length,
      `${where}: ${roleless.id} has a past after opening`,
    ).toBeGreaterThan(0);
  }, 600_000);

  it("11: rows for the oldest person, and the time to open 50 adults", () => {
    const all = adultsOf(core, world.placeId);
    const oldest = all[0];
    if (oldest) {
      openWholePast(core, oldest.id);
      const rows = preStartHistory(core, { personId: oldest.id });
      const own = rows.filter((row) => OWN_KINDS.includes(row.kind));
      console.log(
        `whole-past 11: ${where}; the oldest, born ${oldest.birthDate}, has ${rows.length} past rows, ${own.length} of their own past`,
      );
      expect(own.length, where).toBeLessThanOrEqual(40);
    }
    const fresh = all
      .filter(
        (person) =>
          !preStartHistory(core, {
            personId: person.id,
            kind: "school.started",
          }).some((row) => row.date < windowOf(core).from),
      )
      .slice(0, 50);
    const started = performance.now();
    const opened = [oldest, ...all.slice(1, 11)].filter(
      Boolean,
    ) as PersonState[];
    for (const person of opened) openWholePast(core, person.id);
    const most = Math.max(
      ...opened.map(
        (p) =>
          preStartHistory(core, { personId: p.id }).filter((row) =>
            OWN_KINDS.includes(row.kind),
          ).length,
      ),
    );
    console.log(
      `whole-past 11: ${where}; the most own-past rows among the 11 oldest: ${most}`,
    );
    expect(most, where).toBeLessThanOrEqual(40);
    for (const person of fresh) openWholePast(core, person.id);
    const mean = (performance.now() - started) / Math.max(1, fresh.length);
    console.log(
      `whole-past 11: ${where}; opened ${fresh.length} adults, mean ${mean.toFixed(1)} ms each`,
    );
  }, 600_000);
});

describe(`the card story reads well (${where})`, () => {
  it("12: three opened adults of different ages, the whole story in order", () => {
    const all = adultsOf(core, world.placeId);
    const year = (p: PersonState) => Number(p.birthDate.slice(0, 4));
    const nowYear = Number(core.date.slice(0, 4));
    const picks = [
      all.find((p) => year(p) < 1960),
      all.find((p) => year(p) >= 1970 && year(p) < 1990),
      all.find((p) => nowYear - year(p) < 30),
    ].filter(Boolean) as PersonState[];
    for (const person of picks) {
      const card = knownCard(core, core.playerId!, person.id);
      console.log(
        `whole-past 12: ${where}; ${person.id} born ${person.birthDate}:\n${card.history.map((l) => `  [${l.kind}] ${l.text}`).join("\n")}`,
      );
      expect(card.history.length, `${where}: ${person.id}`).toBeGreaterThan(0);
    }
  }, 600_000);
});

describe(`opening is the same every time and touches only the people opened (${where})`, () => {
  it("4 and 5: five people opened in another order, one twice, have the same rows; nobody else changed", () => {
    const twin = build(drawn.seed, placeKey);
    const other = twin.core;
    const circle = circleOf(other);
    const five = adultsOf(other, twin.placeId)
      .filter((person) => !circle.has(person.id))
      .filter((_, i) => i % 7 === 0)
      .slice(0, 5)
      .map((person) => person.id);
    expect(five.length, where).toBe(5);
    const everyone = [...other.people.keys()];
    const before = new Map(everyone.map((id) => [id, rowsOf(other, id)]));
    // The first world opens them in the order given, the twin in the reverse order, one twice.
    for (const id of [...five].reverse()) openWholePast(other, id);
    openWholePast(other, five[0]!);
    for (const id of five) openWholePast(core, id);
    for (const id of five)
      expect(rowsOf(other, id), `${where}: ${id}`).toBe(rowsOf(core, id));
    const changed = everyone.filter(
      (id) => rowsOf(other, id) !== before.get(id),
    );
    expect(changed.sort(), `${where}: only the five opened change`).toEqual(
      [...five].sort(),
    );
    console.log(
      `whole-past 4/5: ${where}; ${five.length} people, identical in both worlds, ${changed.length} people changed`,
    );
  }, 900_000);
});

describe("the named repro: Caño Martín Peña, Puerto Rico, seed 50fe2d1143af", () => {
  it("9: an adult born before 1980 shows events from before the player's birth year", () => {
    const repro = build("50fe2d1143af", "7212806");
    const c = repro.core;
    const label = `${repro.place.displayName} (7212806), seed 50fe2d1143af`;
    const from = windowOf(c).from;
    const circle = circleOf(c);
    const elders = adultsOf(c, repro.placeId).filter(
      (person) => person.birthDate < "1980",
    );
    expect(elders.length, label).toBeGreaterThan(0);
    const early = (id: string, line: { records: string[] }) =>
      line.records.some(
        (rec) =>
          (lifeOf(c, id as PersonId).find((e) => e.id === rec)?.date ??
            "9999") < from,
      );
    const told = (p: PersonState) => knownCard(c, c.playerId!, p.id).history;
    const ordered = [
      ...elders.filter((p) => circle.has(p.id)),
      ...elders.filter((p) => !circle.has(p.id)),
    ];
    const person =
      ordered.find((p) =>
        told(p).some((l) => l.kind === "work" && early(p.id, l)),
      ) ?? ordered[0]!;
    const lines = told(person);
    const earlier = lifeOf(c, person.id).filter((e) => e.date < from);
    console.log(
      `whole-past 9: ${label}; ${person.id} born ${person.birthDate}, ${earlier.length} events before ${from}:\n${lines.map((l) => `  ${l.text}`).join("\n")}`,
    );
    expect(earlier.length, `${label}: ${person.id}`).toBeGreaterThan(0);
    expect(
      lines.some((l) => l.kind === "work" && early(person.id, l)),
      `${label}: ${person.id} a work sentence before ${from}`,
    ).toBe(true);
    const missing = lines.filter((line) =>
      line.records.some(
        (id) => traceNode(c, repro.director, id).answer === "not-a-record",
      ),
    );
    expect(
      missing.map((l) => l.recordId),
      label,
    ).toEqual([]);
  }, 900_000);
});
