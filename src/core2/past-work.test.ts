/**
 * The working life before the start (history-past-work), in the played
 * world: a place drawn from all 56, the bench's full build, a 35-year-old
 * player. Every job, layoff and spell out of work is a dated record whose
 * cause is another engine's record, the job held on day one began on the
 * jobs engine's own date, the Journal tells it, a person filled in later
 * gets theirs, and the run gives the same lives when run again.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { composeJournal } from "../director/journal";
import { gameStartDate } from "./game-start";
import { corePlaceByKey } from "./place-lookup";
import {
  PAST_WORK_OUT,
  PAST_WORK_SPELL,
  pastWorkOf,
  pastWorkPeople,
  runPastWork,
} from "./past-work";
import {
  preStartHistory,
  preStartWindowOf,
  wholePastOpened,
} from "./pre-start";
import { BUSINESS_MODULE_ID } from "./modules/business";
import { residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";
import { historyMonths, worldPublishedMonth } from "./macro-model";
import type { PersonId } from "./types";

// A named place and seed reproduce a report's draw (the label prints both).
const place =
  process.env.GOLDEN_PATH_SEED && process.env.GOLDEN_PATH_PLACE_KEY
    ? {
        ...drawPlace(process.env.GOLDEN_PATH_SEED, "history-past-work"),
        seed: process.env.GOLDEN_PATH_SEED,
        key: process.env.GOLDEN_PATH_PLACE_KEY,
        name:
          corePlaceByKey(process.env.GOLDEN_PATH_PLACE_KEY)?.displayName ??
          process.env.GOLDEN_PATH_PLACE_KEY,
      }
    : drawPlace(randomBytes(32).toString("hex"), "history-past-work");
const label = `${place.name} (${place.key}), seed ${place.seed}`;
const start = gameStartDate();
const { core, director, playerId } = buildBenchWorld(place.seed, start, {
  twoLevel: true,
  placeKey: place.key,
  playerBirthDate: `${Number(start.slice(0, 4)) - 35}-06-15`,
});
const spells = preStartHistory(core, { kind: PAST_WORK_SPELL });
const outs = preStartHistory(core, { kind: PAST_WORK_OUT });

describe(`the one history starts in the player's birth year, ${label}`, () => {
  it("opens the pre-start window on January 1 of the year the player was born (owner, Oct 28)", () => {
    const player = core.people.get(playerId as PersonId)!;
    const window = preStartWindowOf(core)!;
    expect(window.from, label).toBe(`${player.birthDate.slice(0, 4)}-01-01`);
    expect(window.from <= player.birthDate, label).toBe(true);
    // The player's birth is a record of the run, and so is their first job
    // after school: both fall inside the window now, by record id.
    const birth = preStartHistory(core, {
      kind: "person.birth",
      personId: playerId as PersonId,
    });
    expect(
      birth.map((row) => row.id),
      label,
    ).toEqual([`person-history:${playerId}:birth`]);
    const firstJob = pastWorkOf(core, playerId as PersonId).find(
      (row) => row.kind === PAST_WORK_SPELL && row.facts.how === "first-job",
    );
    expect(
      firstJob?.id,
      `${label}: the player's first job after school`,
    ).toBeDefined();
    expect(firstJob!.date > window.from, label).toBe(true);
  });
});

describe(`the economy's months the run reads are this world's, ${label}`, () => {
  it("records every month by the rule the opening months follow, so the past and day one are one path", () => {
    const p = (key: string) => coreAPI(core).parameter(key);
    const opening = new Map(
      historyMonths(core.startedAt, core.seed, p).map((row) => [
        row.month,
        row,
      ]),
    );
    const months = preStartHistory(core, { kind: "economy.conditions" });
    expect(months.length, label).toBeGreaterThan(0);
    let shared = 0;
    for (const row of months) {
      const month = row.date.slice(0, "YYYY-MM".length);
      const world = worldPublishedMonth(month, core.startedAt, core.seed, p)!;
      const kept = opening.get(month);
      if (kept) shared += 1;
      for (const key of [
        "unemploymentPct",
        "priceIndex",
        "payrollJobsThousands",
        "hourlyEarnings",
        "policyRatePct",
        "treasury10Pct",
      ] as const) {
        if (typeof row.facts[key] !== "number") continue;
        expect(row.facts[key], `${label}: ${row.id} ${key}`).toBe(world[key]);
        if (kept)
          expect(row.facts[key], `${label}: ${row.id} ${key}`).toBe(kept[key]);
      }
    }
    expect(shared, label).toBeGreaterThan(0);
  });
});

describe(`the working life before the start, ${label}`, () => {
  it("is a run of dated records, each ending caused by another engine's record", () => {
    expect(spells.length, label).toBeGreaterThan(0);
    const months = new Set(
      preStartHistory(core, { kind: "economy.conditions" }).map((r) => r.id),
    );
    const founded = new Map(
      preStartHistory(core, { kind: "business.founded" }).map((r) => [
        String(r.facts.organizationId),
        r.date,
      ]),
    );
    for (const row of spells) {
      const person = core.people.get(row.personIds![0]!);
      expect(person?.tier, row.id).not.toBe("husk");
      if (row.facts.endedAt)
        expect(String(row.facts.endedAt) >= String(row.facts.startedAt)).toBe(
          true,
        );
      // Let go in a month the economy pass recorded.
      if (row.facts.end === "let-go")
        expect(months.has(String(row.facts.causeRecordId)), row.id).toBe(true);
      // Hired by a business of the town that was open by then.
      if (row.facts.organizationId) {
        const org = String(row.facts.organizationId);
        expect(core.organizations.has(org), row.id).toBe(true);
        const opened = founded.get(org);
        // (The day-one job's start is the jobs engine's own date.)
        if (
          opened &&
          row.facts.how !== "before-the-run" &&
          row.facts.end !== "held-at-start"
        )
          expect(opened <= String(row.facts.startedAt), row.id).toBe(true);
      }
    }
    // A spell out of work follows the job it came from.
    const byId = new Map(spells.map((row) => [row.id, row]));
    for (const row of outs)
      if (row.facts.causeRecordId)
        expect(byId.has(String(row.facts.causeRecordId)), row.id).toBe(true);
  });

  it("never holds two jobs at once, and the job held on day one began on the jobs engine's date", () => {
    const people = new Set(spells.map((row) => row.personIds![0]!));
    for (const id of people) {
      const own = spells
        .filter((row) => row.personIds![0] === id)
        .sort((a, b) =>
          String(a.facts.startedAt).localeCompare(String(b.facts.startedAt)),
        );
      for (const [at, row] of own.entries()) {
        const next = own[at + 1];
        if (next && row.facts.endedAt)
          expect(
            String(row.facts.endedAt) <= String(next.facts.startedAt),
            row.id,
          ).toBe(true);
      }
      const held = own.find((row) => row.facts.end === "held-at-start");
      if (!held) continue;
      const commitment = [...(core.work.commitmentsByPerson.get(id) ?? [])]
        .map((cid) => core.work.commitments.get(cid)!)
        .find((row) => row.jobId === held.facts.jobId)!;
      expect(String(held.facts.startedAt), held.id).toBe(
        commitment.heldSince ?? commitment.startsAt,
      );
    }
  });

  it("never holds a job since a date before its employer's founding", () => {
    const ages = coreAPI(core).moduleState(BUSINESS_MODULE_ID).table("ages");
    let checked = 0;
    for (const commitment of core.work.commitments.values()) {
      const age = ages.get(commitment.organizationId) as
        { foundedAt: string } | undefined;
      if (!age) continue;
      checked += 1;
      expect(
        age.foundedAt <= (commitment.heldSince ?? commitment.startsAt),
        `${label}: ${commitment.id} held since ${commitment.heldSince ?? commitment.startsAt}, before ${commitment.organizationId} was founded ${age.foundedAt} (business.founded:${commitment.organizationId})`,
      ).toBe(true);
    }
    expect(checked, label).toBeGreaterThan(0);
  });

  it("is told in the Journal from its own records", () => {
    // The player when they worked, else the first worker the run let go,
    // with or without an employer on record (a held-at-start job is told by
    // the line that leads into it, so it alone is not enough).
    const tellable = (id: PersonId) =>
      pastWorkOf(core, id).some(
        (row) =>
          row.kind === PAST_WORK_SPELL && row.facts.end !== "held-at-start",
      );
    const told = [
      playerId as PersonId,
      ...spells
        .filter((row) => row.facts.end === "let-go")
        .flatMap((row) => row.personIds ?? []),
    ].find(tellable);
    expect(told, label).toBeDefined();
    director.watch(core, told!);
    const ids = new Set(
      composeJournal(core, director, told!).flatMap((chapter) =>
        chapter.lines.flatMap((line) => line.sourceRecordIds),
      ),
    );
    expect(
      pastWorkOf(core, told!).some((row) => ids.has(row.id)),
      `${label}, ${told}`,
    ).toBe(true);
    // Work with no employer on record (held in another place before a move)
    // is told by its place, never skipped (words-journal-work-line-without-
    // employer; Leopolis, Wisconsin and Alberton, Montana, #7023).
    const placeOnly = spells.find(
      (row) =>
        !row.facts.organizationId &&
        core.people.has(row.personIds?.[0] as PersonId) &&
        (["first-job", "after-out-of-work"].includes(String(row.facts.how)) ||
          ["let-go", "moved-on", "retired", "child-born"].includes(
            String(row.facts.end),
          )),
    );
    if (placeOnly) {
      const who = placeOnly.personIds![0] as PersonId;
      director.watch(core, who);
      const lines = composeJournal(core, director, who).flatMap(
        (chapter) => chapter.lines,
      );
      const said = lines.filter((line) =>
        line.sourceRecordIds.includes(placeOnly.id),
      );
      process.stdout.write(
        `past-work without an employer: ${placeOnly.id} told as ${said.map((line) => `"${line.text}"`).join(", ") || "nothing"} (${label})\n`,
      );
      expect(said.length, `${label}, ${placeOnly.id}`).toBeGreaterThan(0);
    }
  });

  it("runs the same lives again from the same records (no roll decides them)", () => {
    const again = runPastWork(
      coreAPI(core),
      preStartWindowOf(core)!,
      pastWorkPeople(core),
      new Map(),
    );
    const key = (row: { id: string; facts: object }) =>
      `${row.id}:${JSON.stringify(row.facts)}`;
    // The run of the window is the same; the people whose whole past has been
    // opened (the player's circle) also hold the years before it, which join
    // their first record (src/core2/whole-past.test.ts).
    const closed = (row: { personIds?: readonly PersonId[] }) =>
      !wholePastOpened(core, row.personIds![0]!, ["work"]);
    expect(again.filter(closed).map(key).sort()).toEqual(
      [...spells, ...outs].filter(closed).map(key).sort(),
    );
  });

  it("gives someone filled in from the counts their working life too", () => {
    const rt = residentsRuntime(core)!;
    const adults = [...rt.households.values()]
      .flatMap((row) => row.people)
      .filter((row) => {
        const age =
          Number(start.slice(0, 4)) - Number(row.birthDate.slice(0, 4));
        return age >= 30 && age < 60 && !core.people.has(row.id);
      })
      .slice(0, 12);
    expect(adults.length, label).toBeGreaterThan(0);
    // Someone whose last job ended before the window opens has no record in
    // it (the window starts in the player's birth year), so several are
    // filled in and at least one must have a working life; a fill-in that
    // wrote none fails here.
    let withWork = 0;
    for (const adult of adults) {
      fillInPerson(core, adult.id);
      if (pastWorkOf(core, adult.id).length > 0) withWork += 1;
    }
    expect(withWork, `${label}: ${adults.length} filled in`).toBeGreaterThan(0);
  });
});
