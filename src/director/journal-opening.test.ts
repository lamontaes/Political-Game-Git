import { preStartHistory } from "../core2/pre-start";
import { FAMILY_PARTNERED } from "../core2/modules/people";
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import type { PersonId } from "../core2/types";
import { composeJournal } from "./journal";
import { PAST_WORK_SPELL, pastWorkOf } from "../core2/past";
import type { CoreState } from "../core2/types";
import { employerSaid, jobSaid } from "../english/journal-words";
import { properName } from "./words";
import { writeFileSync } from "node:fs";

// The journal from day one (play-first-10-journal-from-day-one). On the first
// evening the journal's opening chapter tells where the family came from,
// each parent (the one who raised the player, or the one who lived apart, by
// the household each is in) and each brother and sister (by their birth
// against the player's), each line citing the family fact that records them.
// Places are drawn in turn until the player has a parent and a sibling.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 6;

it(`the first evening's journal names the family from their records (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "journal-opening");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const player = core.people.get(playerId!)!;
    const family = (player.pastFacts ?? []).filter(
      (fact) =>
        ["family:parent", "family:other-parent", "family:sibling"].includes(
          fact.kind,
        ) && core.people.get(fact.facts?.otherPersonId ?? "")?.alive,
    );
    if (
      !family.some((fact) => fact.kind !== "family:sibling") ||
      !family.some((fact) => fact.kind === "family:sibling")
    ) {
      tried.push(`${place.name} (no parent and sibling on record)`);
      continue;
    }
    // Play watches the player and their household (src/bench/player.ts).
    director.watch(core, player.id);
    for (const id of core.households.get(player.householdId)?.memberIds ?? [])
      if (id !== player.id) director.watch(core, id as PersonId);
    const [opening] = composeJournal(core, director, player.id);
    expect(opening, `${where}: no opening chapter`).toBeDefined();
    const lines = opening!.lines;
    const told = new Set<string>();
    for (const fact of family) {
      const relative = core.people.get(fact.facts!.otherPersonId!)!;
      if (told.has(relative.id)) continue;
      told.add(relative.id);
      const line = lines.find(
        (row) =>
          row.sourceRecordIds.includes(fact.id) &&
          row.sourceRecordIds.includes(relative.id),
      );
      const here = `${where}: ${fact.kind} ${relative.id} (${fact.id})`;
      expect(line, here).toBeDefined();
      // By relation and name: "My mother Helen raised me."
      expect(line!.text, here).toContain(relative.givenName);
      // Told as part of a memoir entry of several sentences, never a bare
      // fact on a line of its own (owner, Oct 27).
      expect(
        line!.text.split(/(?<=\.)\s+/).length,
        `${here}: "${line!.text}" is one bare sentence`,
      ).toBeGreaterThan(1);
      console.log(`JOURNAL OPENING ${here}: "${line!.text}"`);
    }
    // Where the family came from comes before the people in it, when the
    // record names the place; how the parents met, before both.
    const lineOf = (id: string) =>
      lines.findIndex((row) => row.sourceRecordIds.includes(id));
    const firstPerson = Math.min(
      ...family.map((fact) => lineOf(fact.id)).filter((at) => at >= 0),
    );
    // Where the family came from: the player's own birth, told in the place
    // the run recorded it, when the family lives somewhere else now.
    const roots = preStartHistory(core, {
      kind: "person.birth",
      personId: player.id,
    }).find((row) => row.placeId && row.placeId !== player.placeId);
    const origin = roots
      ? corePlaceByJurisdictionId(roots.placeId as never)
      : null;
    if (roots && origin) {
      const at = lineOf(roots.id);
      expect(at, `${where}: no roots line`).toBeGreaterThanOrEqual(0);
      expect(lines[at]!.text, where).toContain(origin.displayName);
      expect(at, `${where}: roots after a person`).toBeLessThanOrEqual(
        firstPerson,
      );
    }
    // The day the player's parents set up home, from the people engine's run.
    const parents = family
      .filter((fact) =>
        ["family:parent", "family:other-parent"].includes(fact.kind),
      )
      .map((fact) => fact.facts!.otherPersonId!);
    const met = parents.length
      ? preStartHistory(core, {
          kind: FAMILY_PARTNERED,
          personId: parents[0] as never,
        }).find((row) =>
          parents.every((id) => row.personIds?.includes(id as never)),
        )
      : undefined;
    if (met && corePlaceByJurisdictionId((met.placeId ?? "") as never)) {
      const at = lineOf(met.id);
      expect(at, `${where}: no line for ${met.id}`).toBeGreaterThanOrEqual(0);
      expect(at, `${where}: the parents met after`).toBeLessThanOrEqual(
        firstPerson,
      );
    }
    console.log(
      `JOURNAL OPENING ${where}: ${lines.map((row) => `"${row.text}"`).join(" ")}`,
    );
    return;
  }
  throw new Error(
    `no parent and sibling on record in ${tried.join("; ")} (seed ${seed})`,
  );
}, 1_800_000);

// The first note of a new life (words-first-journal-note-says-the-same-
// sentence-twice; Athens, Michigan, Nov 11: "My father went to work somewhere
// new." twice, no employer, "a chief Administrative Officer at Village of
// Athens treasury"). In ten new lives in drawn places: no sentence of the
// opening chapter is said twice; each parent's job change names the employer
// on that parent's own work record, as people say it; no job title carries a
// capital inside a sentence.
const LIVES = 10;
it(`the first note says each thing once and names each parent's employer (seed ${seed})`, () => {
  const evidence: string[] = [];
  let parentJobs = 0;
  for (let life = 0; life < LIVES; life += 1) {
    const place = drawPlace(`${seed}:work:${life}`, "journal-opening-work");
    const where = `${place.name} (${place.key}), seed ${seed}:work:${life}`;
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const player = core.people.get(playerId!)!;
    director.watch(core, player.id);
    for (const id of core.households.get(player.householdId)?.memberIds ?? [])
      if (id !== player.id) director.watch(core, id as PersonId);
    const [opening] = composeJournal(core, director, player.id);
    expect(opening, `${where}: no opening chapter`).toBeDefined();
    const lines = opening!.lines;
    // No sentence twice, in the note or across its entries.
    const sentences = lines.flatMap((row) =>
      row.text.split(/(?<=[.!?])\s+/).map((said) => said.toLowerCase()),
    );
    const twice = sentences.filter(
      (said, at) => sentences.indexOf(said) !== at,
    );
    expect(twice, `${where}: said twice`).toEqual([]);
    // Each parent's job change names the employer of that parent's spell.
    for (const fact of player.pastFacts ?? []) {
      if (!["family:parent", "family:other-parent"].includes(fact.kind))
        continue;
      const parentId = fact.facts!.otherPersonId! as PersonId;
      for (const spell of pastWorkOf(core as CoreState, parentId)) {
        if (spell.kind !== PAST_WORK_SPELL) continue;
        // The job-change line is the spell's own moment (the line of what
        // they do now cites the spell too, by the job held on day one).
        const line = lines.find((row) => row.momentIds.includes(spell.id));
        if (!line) continue;
        const org = core.organizations.get(String(spell.facts.organizationId));
        expect(
          org,
          `${where}: ${spell.id} told with no employer`,
        ).toBeDefined();
        const name = employerSaid(properName(org!.name), org!);
        expect(line.sourceRecordIds, `${where}: ${spell.id}`).toContain(
          org!.id,
        );
        expect(line.text, `${where}: ${spell.id}`).toContain(name);
        parentJobs += 1;
      }
    }
    // A job title is said in lower case inside a sentence.
    for (const id of core.households.get(player.householdId)?.memberIds ?? []) {
      const job = core.jobs.get(core.people.get(id)?.jobId ?? "");
      if (!job || jobSaid(job.title) === job.title) continue;
      for (const row of lines)
        expect(row.text, `${where}: "${job.title}"`).not.toContain(job.title);
    }
    evidence.push(`${where}: ${lines.map((row) => `"${row.text}"`).join(" ")}`);
  }
  if (process.env.JOURNAL_EVIDENCE)
    writeFileSync(process.env.JOURNAL_EVIDENCE, evidence.join("\n") + "\n");
  expect(
    parentJobs,
    `no parent's job change told in ${LIVES} lives`,
  ).toBeGreaterThan(0);
}, 3_600_000);
