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
/** Draws that once failed, kept as cases (seed and life, as the test draws them). */
const KNOWN_DRAWS = [
  "3ce58b155d125aeb788fea59f8353c954131e6f3:work:0",
  // Stowe, Vermont: "My father DeAndre ..." (a capital inside a name).
  "0da7d0ae7277eff20bce2be78ff0923fcf5a106a:work:1",
  // Winter Harbor, Maine: a father who changed jobs and holds a county seat
  // ("County Commissioner" mid-sentence).
  "aa73e37ebdc41b538771fe51249d8514cb45eea4:work:7",
];
/**
 * A note's sentences: split after a stop, never after an initial such as the
 * "U.S." in "U.S. Virgin Islands".
 */
const sentencesOf = (text: string) =>
  text.split(/(?<=[.!?])(?<!(?:^|[\s.])[A-Z]\.)\s+(?=[A-Z"])/);
it(`the first note says each thing once and names each parent's employer (seed ${seed})`, () => {
  const evidence: string[] = [];
  let parentJobs = 0;
  // Ten fresh draws, and the draws that once failed (Tutu, U.S. Virgin
  // Islands: "U.S." is an initial, not a sentence's end; Stowe, Vermont:
  // "DeAndre" is one name).
  const draws = [
    ...Array.from({ length: LIVES }, (_, life) => `${seed}:work:${life}`),
    ...KNOWN_DRAWS,
  ];
  for (const draw of draws) {
    const place = drawPlace(draw, "journal-opening-work");
    const where = `${place.name} (${place.key}), seed ${draw}`;
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
      sentencesOf(row.text).map((said) => said.toLowerCase()),
    );
    const twice = sentences.filter(
      (said, at) => sentences.indexOf(said) !== at,
    );
    expect(twice, `${where}: said twice`).toEqual([]);
    // The note on the family's work is one sentence per person (lead, Nov
    // 11): each opens on who they are with their name ("My father Tracy"),
    // nobody is the subject of two, and none opens on a time that points
    // back ("A year and a half on,").
    for (const row of lines.filter((line) =>
      line.momentIds.some((id) => id.startsWith("livelihood:")),
    )) {
      const said = sentencesOf(row.text);
      const subjects = said.map(
        (sentence) =>
          // A given name may carry a capital inside ("DeAndre") or an
          // apostrophe or hyphen.
          // Said-as (words composer, Nov 12): "My father Tracy" the first
          // time the Journal names him, "Tracy" after that.
          /^(?:My [a-z]+(?: [a-z]+)? )?([A-Z][\w'-]*)/.exec(sentence)?.[1],
      );
      expect(subjects, `${where}: "${row.text}"`).not.toContain(undefined);
      expect(
        subjects.filter((name, at) => subjects.indexOf(name) !== at),
        `${where}: "${row.text}"`,
      ).toEqual([]);
      // Each relative's employer, as the reader says it, is in their sentence.
      for (const id of core.households.get(player.householdId)?.memberIds ??
        []) {
        const job = core.jobs.get(core.people.get(id)?.jobId ?? "");
        const org = job
          ? core.organizations.get(job.organizationId)
          : undefined;
        const name = core.people.get(id)?.givenName;
        const sentence = said.find(
          (text) => name && ` ${text} `.includes(` ${name} `),
        );
        if (!org || !sentence || org.kind === "outside-market") continue;
        // Someone who holds an office is told by the office alone.
        if (!sentence.includes(jobSaid(job!.title))) continue;
        expect(sentence, `${where}: ${id}`).toContain(
          employerSaid(properName(org.name), org),
        );
        parentJobs += 1;
      }
    }
    // A job title is said in lower case inside a sentence. It is matched as
    // whole words: a body's own name may hold it ("the Board of County
    // Commissioners of Hancock County", Winter Harbor, Maine, seed
    // aa73e37ebdc41b538771fe51249d8514cb45eea4:work:7), and that is a name.
    for (const id of core.households.get(player.householdId)?.memberIds ?? []) {
      const job = core.jobs.get(core.people.get(id)?.jobId ?? "");
      if (!job || jobSaid(job.title) === job.title) continue;
      const title = new RegExp(
        `\\b${job.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      );
      for (const row of lines)
        expect(
          row.text,
          `${where}: "${job.title}" in "${row.text}"`,
        ).not.toMatch(title);
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
