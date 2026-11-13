/**
 * The person card tells what happened in play (the life record, docs/design/life-record.md): in a
 * drawn place, after 60 days and a job lost and an illness recorded for a member of the player's
 * household, that member's card tells both as sentences on those records' ids, and every line of
 * the cards of the member and of the player opens a record in dev mode's Trace. The place and
 * seed are in every message; replay with LIFE_SEED and LIFE_PLACE_KEY.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { lifeOf } from "../core2/modules/people";
import { coreAPI } from "../core2/state";
import type { CoreEventInput, IsoDate } from "../core2/types";
import { inOrderParagraphs } from "./ui/strips.mjs";
import { knownCard } from "./card";
import { traceNode } from "./dev-trace";
import { buildBenchWorld } from "./world";

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(seed, "card-life");
const placeKey = process.env.LIFE_PLACE_KEY ?? drawn.key;

let built: ReturnType<typeof buildBenchWorld> | undefined;
/** One drawn world, played 60 days, shared by the tests of this file. */
function played() {
  if (!built) {
    setBookkeeping(false);
    built = buildBenchWorld(drawn.seed, gameStartDate(), {
      twoLevel: true,
      placeKey,
    });
    advanceCore(built.core, addDays(makeIsoDate(built.core.date), 60));
  }
  return {
    ...built,
    where: `${built.place.displayName} (${placeKey}), seed ${seed}`,
  };
}

it("a household member's card tells a job lost and an illness from play, and every line opens a record", () => {
  const world = played();
  const { core, director, playerId, where } = world;
  const player = core.people.get(playerId!)!;
  const member = [...(core.households.get(player.householdId)?.memberIds ?? [])]
    .map((id) => core.people.get(id))
    .find((row) => row && row.id !== playerId && row.alive);
  expect(member, `${where}: a living household member`).toBeDefined();
  const orgId = [...core.organizations.values()].find(
    (row) => row.name && row.kind !== "government",
  )!.id;
  const source = {
    tag: "ESTIMATED" as const,
    asOf: core.date as IsoDate,
    citation: "A test of the person card.",
    estimatedFrom: "card-life.test.ts",
  };
  const lost = `event:work.job-lost:${core.date}:card-life-${member!.id}`;
  const ill = `health.serious-illness:${member!.id}:${core.date}`;
  const common = {
    date: core.date as IsoDate,
    personIds: [member!.id],
    placeId: member!.placeId,
    source,
  };
  const api = coreAPI(core);
  api.emit({
    ...common,
    id: lost,
    kind: "work.job-lost",
    publicRecord: false,
    topic: orgId,
    facts: { decidedBy: orgId, organizationId: orgId },
  } as CoreEventInput);
  api.emit({
    ...common,
    id: ill,
    kind: "health.serious-illness",
    topic: "health:serious-illness",
    facts: { [`event:${ill}:condition`]: "serious-illness" },
  } as CoreEventInput);

  // Fixtures (hand-made events, shaped as wage-floor.ts and voting.ts write them): a raise the
  // minimum wage brought, and a primary the member was put out of.
  const raised = `minimum-wage-raise:fixture-${member!.id}:${core.date}`;
  const primary = `primary-result:fixture-${member!.id}`;
  api.emit({
    ...common,
    id: raised,
    kind: "pay-raised-to-minimum-wage",
    facts: {
      jobId: "fixture-job",
      fromMinor: "1000",
      toMinor: "1200",
      lawId: "fixture-law",
    },
  } as CoreEventInput);
  api.emit({
    ...common,
    id: primary,
    kind: "primary-result",
    publicRecord: true,
    facts: {
      contestId: "fixture-contest",
      office: "Council Member",
      outIds: JSON.stringify([member!.id]),
    },
  } as CoreEventInput);

  const card = knownCard(core, playerId!, member!.id);
  expect(
    card.history.find((line) => line.recordId === raised)?.text,
    `${where}: fixture raise`,
  ).toMatch(/got a raise when the minimum wage went up in \d{4}\./);
  expect(
    card.history.find((line) => line.recordId === primary)?.text,
    `${where}: fixture primary`,
  ).toMatch(/lost the primary for council member\./);
  const byRecord = new Map(card.history.map((line) => [line.recordId, line]));
  expect(byRecord.has(lost), `${where}: the job lost, ${lost}`).toBe(true);
  expect(byRecord.has(ill), `${where}: the illness, ${ill}`).toBe(true);
  expect(byRecord.get(lost)!.text, where).toContain(
    core.organizations.get(orgId)!.name,
  );
  expect(byRecord.get(lost)!.kind, where).toBe("work");
  expect(byRecord.get(ill)!.kind, where).toBe("health");

  // Every line of both cards opens a record in Trace.
  const mine = knownCard(core, playerId!, playerId!);
  const lines = [...card.history, ...mine.history];
  const missing = lines.filter(
    (line) =>
      traceNode(core, director, line.recordId).answer === "not-a-record",
  );
  expect(
    missing.map((line) => `${line.recordId}: ${line.text}`),
    where,
  ).toEqual([]);
  // The player's own life is told to them, in the second person.
  expect(mine.history.length, where).toBeGreaterThan(0);
  console.log(
    `card-life: ${where}; ${member!.id} told ${card.history.length} lines, the player ${mine.history.length}; all ${lines.length} open in Trace`,
  );
}, 600_000);

it("the player's own life is told in the first person, never repeats who they are, and no `.you` piece is left", () => {
  const { core, playerId, where } = played();
  const mine = knownCard(core, playerId!, playerId!);
  expect(mine.history.length, where).toBeGreaterThan(0);
  for (const line of mine.history) {
    expect(line.text, `${where}: ${line.recordId}`).not.toMatch(/^You\b/);
    expect(line.text, `${where}: ${line.recordId}`).not.toMatch(/\byou(r)?\b/);
  }
  expect(
    // After the time it opens on, when it opens on one ("In 2012, I ...").
    mine.history.some((line) =>
      /^(?:(?:(?:In|Back in|Then in|Later, in) \d{4}|At (?:age )?\d+|That same year), )?I\b/.test(
        line.text,
      ),
    ),
    where,
  ).toBe(true);
  // "Who I am" tells where they were born; the story does not tell it again.
  expect(mine.summaryFirst.join(" "), where).toMatch(/born/i);
  expect(
    mine.history.filter((line) => line.kind === "born"),
    where,
  ).toEqual([]);
  // Nothing says the story to the player any more: every `.you` piece of the story is gone.
  const bank = JSON.parse(
    readFileSync("data/english/parts/person-history.json", "utf8"),
  ) as { parts: { key: string }[] };
  expect(
    bank.parts.filter((part) =>
      /^person-history\.story\..+\.you$/.test(part.key),
    ),
    where,
  ).toEqual([]);
  // The same for someone else: their story does not open with where they were born.
  const other = [...core.people.values()].find(
    (row) => row.id !== playerId && row.alive && row.familyIds.has(playerId!),
  );
  if (other)
    expect(
      knownCard(core, playerId!, other.id).history.filter(
        (line) => line.kind === "born",
      ),
      where,
    ).toEqual([]);
});

it("three or more jobs are one sentence naming every employer, on every job's record", () => {
  const { core, playerId, where } = played();
  const spells = (id: string) =>
    lifeOf(core, id as never).filter(
      (event) => event.life === "work" && event.what === "job-started",
    );
  const worker = [...core.people.values()].find(
    (row) =>
      row.id !== playerId &&
      new Set(spells(row.id).map((event) => event.facts?.organizationId))
        .size >= 3,
  );
  if (!worker) {
    console.log(`card-life jobs: ${where}; no one with three employers`);
    return;
  }
  const card = knownCard(core, playerId!, worker.id);
  // The one sentence of several jobs, by the piece that worded it (its
  // wordings vary: "held jobs at A and B before C", "bounced from A to C").
  const jobs = card.history.filter((line) =>
    line.piece.startsWith("person-history.story.work.history."),
  );
  expect(jobs, `${where}: ${worker.id}`).toHaveLength(1);
  const employers = [
    ...new Set(
      spells(worker.id).map(
        (event) =>
          core.organizations.get(String(event.facts?.organizationId))!.name,
      ),
    ),
  ];
  for (const name of employers)
    expect(jobs[0]!.text, `${where}: ${name}`).toContain(name);
  for (const event of spells(worker.id))
    expect(jobs[0]!.records, `${where}: ${event.id}`).toContain(event.id);
  expect(
    card.history.filter((line) =>
      line.piece.startsWith("person-history.story.work.spell."),
    ),
    where,
  ).toEqual([]);
  console.log(`card-life jobs: ${where}; ${worker.id}: ${jobs[0]!.text}`);
});

it("a partner the person was made with is told before their children", () => {
  const { core, playerId, where } = played();
  // Someone whose partner fact is dated after a child's birth and whose card tells both.
  for (const person of core.people.values()) {
    if (person.id === playerId) continue;
    const life = lifeOf(core, person.id);
    const partner = life.find(
      (event) => event.from === "built" && event.life === "partner",
    );
    if (
      !partner ||
      !life.some((event) => event.life === "child" && event.date < partner.date)
    )
      continue;
    const lines = knownCard(core, playerId!, person.id).history;
    const at = lines.findIndex((line) => line.recordId === partner.id);
    const firstChild = lines.findIndex((line) => line.kind === "child");
    if (at < 0 || firstChild < 0) continue;
    expect(at, `${where}: ${person.id}`).toBeLessThan(firstChild);
    return;
  }
  console.log(`card-life order: ${where}; no partner dated after a child`);
});

it("My life and every card tell a life in the order it was lived, a new paragraph where the kind of thing changes (Fable A, Nov 13, rule 17)", () => {
  const groups: string[][] = JSON.parse(
    readFileSync(new URL("./data/controls.json", import.meta.url), "utf8"),
  ).lifeGroups;
  // P2, Fruitland, Idaho (Nov 13): My life opened "I separated from
  // Jeffrey Pennington in 2016." before "In 1979, I began school", and ended
  // a 2020 hospital stay before a 1989 arrest. The card's lines come oldest
  // first; the paragraphs keep them so.
  const lines = [
    { kind: "school", text: "In 1979, I began school.", recordId: "a" },
    { kind: "law", text: "I was arrested in 1989.", recordId: "b" },
    { kind: "law", text: "I was convicted of a crime in 1990.", recordId: "c" },
    { kind: "work", text: "I worked at the mill.", recordId: "d" },
    {
      kind: "partner",
      text: "I separated from Jeffrey Pennington in 2016.",
      recordId: "e",
    },
    {
      kind: "health",
      text: "I spent time in the hospital in 2020.",
      recordId: "f",
    },
  ];
  const paragraphs = inOrderParagraphs(lines, groups);
  expect(paragraphs.flat().map((line) => line.recordId)).toEqual(
    lines.map((line) => line.recordId),
  );
  // The arrest and the conviction, one after the other, share a paragraph.
  expect(paragraphs.map((rows) => rows.map((line) => line.recordId))).toEqual([
    ["a"],
    ["b", "c"],
    ["d"],
    ["e"],
    ["f"],
  ]);
});
